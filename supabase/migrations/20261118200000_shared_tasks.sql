-- Phase 6: shared tasks for members of a Togetherly space.

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces(id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 120),
  description text check (description is null or char_length(description) <= 500),
  assigned_to uuid references auth.users(id) on delete set null,
  due_date date,
  priority text not null default 'Medium' check (priority in ('Low', 'Medium', 'High')),
  is_completed boolean not null default false,
  completed_by uuid references auth.users(id) on delete set null,
  completed_at timestamptz,
  created_by uuid not null references auth.users(id) on delete restrict default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tasks_completion_state check (
    (is_completed = false and completed_by is null and completed_at is null)
    or (is_completed = true and completed_by is not null and completed_at is not null)
  )
);

create index tasks_space_status_due_idx
  on public.tasks(space_id, is_completed, due_date, created_at desc);
create index tasks_assigned_to_idx on public.tasks(assigned_to) where assigned_to is not null;

alter table public.tasks enable row level security;

create policy "Space members can read tasks"
  on public.tasks for select to authenticated
  using ((select private.is_space_member(space_id)));

create policy "Space members can create tasks"
  on public.tasks for insert to authenticated
  with check (
    created_by = (select auth.uid())
    and (select private.is_space_member(space_id))
    and (assigned_to is null or exists (
      select 1 from public.space_members sm
      where sm.space_id = tasks.space_id and sm.user_id = tasks.assigned_to
    ))
    and (not is_completed or (completed_by = (select auth.uid()) and completed_at is not null))
  );

create policy "Space members can update tasks"
  on public.tasks for update to authenticated
  using ((select private.is_space_member(space_id)))
  with check (
    (select private.is_space_member(space_id))
    and (assigned_to is null or exists (
      select 1 from public.space_members sm
      where sm.space_id = tasks.space_id and sm.user_id = tasks.assigned_to
    ))
    and (
      (is_completed = false and completed_by is null and completed_at is null)
      or (is_completed = true and completed_by is not null and completed_at is not null)
    )
  );

create policy "Space members can delete tasks"
  on public.tasks for delete to authenticated
  using ((select private.is_space_member(space_id)));

revoke all on public.tasks from anon, authenticated;
grant select, insert, update, delete on public.tasks to authenticated;

create or replace function private.enforce_task_scope_and_completion()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if new.created_by is distinct from auth.uid() then
      raise exception 'A task must be created by the signed-in member';
    end if;
  else
    if new.created_by is distinct from old.created_by then
      raise exception 'The task creator cannot be changed';
    end if;
    if new.space_id is distinct from old.space_id then
      raise exception 'A task cannot be moved to another space';
    end if;
  end if;

  if new.assigned_to is not null and not exists (
    select 1 from public.space_members sm
    where sm.space_id = new.space_id and sm.user_id = new.assigned_to
  ) then
    raise exception 'A task can only be assigned to a member of the same space';
  end if;

  if new.is_completed then
    if tg_op = 'INSERT' then
      new.completed_by := auth.uid();
      new.completed_at := now();
    elsif not old.is_completed then
      new.completed_by := auth.uid();
      new.completed_at := now();
    else
      new.completed_by := old.completed_by;
      new.completed_at := old.completed_at;
    end if;
  else
    new.completed_by := null;
    new.completed_at := null;
  end if;
  return new;
end;
$$;

create trigger tasks_enforce_scope_and_completion
before insert or update on public.tasks
for each row execute function private.enforce_task_scope_and_completion();
revoke all on function private.enforce_task_scope_and_completion() from public, anon, authenticated;

create trigger tasks_set_updated_at
before update on public.tasks
for each row execute function private.set_updated_at();

-- Realtime is used only as an invalidation signal; row visibility remains RLS-scoped.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'tasks'
  ) then
    alter publication supabase_realtime add table public.tasks;
  end if;
end;
$$;
