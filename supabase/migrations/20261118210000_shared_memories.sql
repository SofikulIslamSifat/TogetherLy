-- Phase 7: private shared memories and space-scoped photo storage.

create table public.memories (
  id uuid primary key,
  space_id uuid not null references public.spaces(id) on delete cascade,
  caption text check (caption is null or char_length(caption) <= 500),
  memory_date date not null default current_date,
  category text not null default 'Everyday'
    check (category in ('Everyday', 'Travel', 'Celebration', 'Food', 'Milestone', 'Other')),
  storage_path text not null unique,
  created_by uuid not null references auth.users(id) on delete restrict default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint memories_storage_path_scope check (
    storage_path like space_id::text || '/' || id::text || '/%'
  )
);

create index memories_space_date_idx on public.memories(space_id, memory_date desc, created_at desc);
create index memories_creator_idx on public.memories(created_by);

alter table public.memories enable row level security;

create policy "Space members can view memories"
  on public.memories for select to authenticated
  using ((select private.is_space_member(space_id)));

create policy "Space members can create their own memories"
  on public.memories for insert to authenticated
  with check (
    created_by = (select auth.uid())
    and (select private.is_space_member(space_id))
  );

create policy "Creators can update their memories"
  on public.memories for update to authenticated
  using (created_by = (select auth.uid()) and (select private.is_space_member(space_id)))
  with check (
    created_by = (select auth.uid())
    and (select private.is_space_member(space_id))
  );

create policy "Creators can delete their memories"
  on public.memories for delete to authenticated
  using (created_by = (select auth.uid()) and (select private.is_space_member(space_id)));

revoke all on public.memories from anon, authenticated;
grant select, insert, update, delete on public.memories to authenticated;

create or replace function private.enforce_memory_scope()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if new.created_by is distinct from auth.uid() then
      raise exception 'A memory must be created by the signed-in member';
    end if;
  else
    if new.created_by is distinct from old.created_by
      or new.space_id is distinct from old.space_id
      or new.id is distinct from old.id
      or new.storage_path is distinct from old.storage_path then
      raise exception 'Memory ownership, space, id and photo path cannot be changed';
    end if;
  end if;
  if new.storage_path not like new.space_id::text || '/' || new.id::text || '/%' then
    raise exception 'Memory photo path must match its space and memory';
  end if;
  return new;
end;
$$;

create trigger memories_enforce_scope
before insert or update on public.memories
for each row execute function private.enforce_memory_scope();
revoke all on function private.enforce_memory_scope() from public, anon, authenticated;

create trigger memories_set_updated_at
before update on public.memories
for each row execute function private.set_updated_at();

-- Storage uploads are allowed only under a valid space folder.
create or replace function private.is_space_member_folder(p_folder text)
returns boolean
language plpgsql
stable
security invoker
set search_path = ''
as $$
begin
  if p_folder is null or p_folder !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return false;
  end if;
  return private.is_space_member(p_folder::uuid);
end;
$$;
revoke all on function private.is_space_member_folder(text) from public, anon;
grant execute on function private.is_space_member_folder(text) to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('shared-memories', 'shared-memories', false, 10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic'])
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "Space members can view shared memory photos"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'shared-memories'
    and exists (
      select 1 from public.memories m
      where m.storage_path = storage.objects.name
        and (select private.is_space_member(m.space_id))
    )
  );

create policy "Space members can upload shared memory photos"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'shared-memories'
    and array_length(storage.foldername(name), 1) = 2
    and (select private.is_space_member_folder((storage.foldername(name))[1]))
  );

create policy "Space members can clean up orphaned photos and creators can delete their photos"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'shared-memories'
    and (select private.is_space_member_folder((storage.foldername(name))[1]))
    and (
      exists (
        select 1 from public.memories m
        where m.storage_path = storage.objects.name
          and m.created_by = (select auth.uid())
          and (select private.is_space_member(m.space_id))
      )
      or not exists (select 1 from public.memories m where m.storage_path = storage.objects.name)
    )
  );

-- Realtime is an invalidation signal; actual rows and files remain RLS-scoped.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'memories'
  ) then
    alter publication supabase_realtime add table public.memories;
  end if;
end;
$$;
