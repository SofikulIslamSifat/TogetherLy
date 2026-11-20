-- Phase 2: user-owned profile records and private avatar storage.
-- Space membership and shared-table policies are intentionally deferred to Phase 3.

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(btrim(display_name)) between 2 and 60),
  avatar_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "Profiles are readable by their owner" on public.profiles;
create policy "Profiles are readable by their owner"
  on public.profiles for select to authenticated
  using ((select auth.uid()) = id);

drop policy if exists "Profiles can be created by their owner" on public.profiles;
create policy "Profiles can be created by their owner"
  on public.profiles for insert to authenticated
  with check ((select auth.uid()) = id);

drop policy if exists "Profiles can be updated by their owner" on public.profiles;
create policy "Profiles can be updated by their owner"
  on public.profiles for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- The trigger runs for newly registered Auth users. The display name is profile
-- content only; it is never used as an authorization claim.
create or replace function private.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested_name text;
begin
  requested_name := nullif(btrim(coalesce(new.raw_user_meta_data ->> 'display_name', '')), '');
  insert into public.profiles (id, display_name)
  values (new.id, left(coalesce(requested_name, 'Togetherly member'), 60))
  on conflict (id) do nothing;
  return new;
end;
$$;

revoke all on function private.handle_new_auth_user() from public, anon, authenticated;
revoke all on function private.set_updated_at() from public, anon, authenticated;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function private.set_updated_at();

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_auth_user();

-- Avatars are private. Object names must start with the authenticated user's UUID.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('private-avatars', 'private-avatars', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Users can view their own avatar objects" on storage.objects;
create policy "Users can view their own avatar objects"
  on storage.objects for select to authenticated
  using (bucket_id = 'private-avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "Users can upload their own avatar objects" on storage.objects;
create policy "Users can upload their own avatar objects"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'private-avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "Users can update their own avatar objects" on storage.objects;
create policy "Users can update their own avatar objects"
  on storage.objects for update to authenticated
  using (bucket_id = 'private-avatars' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'private-avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "Users can delete their own avatar objects" on storage.objects;
create policy "Users can delete their own avatar objects"
  on storage.objects for delete to authenticated
  using (bucket_id = 'private-avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
