-- Phase 3: private two-person spaces and single-use invitations.
-- Security-definer implementation functions live in the non-exposed `private` schema.

create extension if not exists pgcrypto with schema extensions;

create table public.spaces (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 2 and 50),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.space_members (
  space_id uuid not null references public.spaces(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  primary key (space_id, user_id),
  -- A user may belong to only one active space.
  constraint space_members_one_active_space unique (user_id)
);

create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces(id) on delete cascade,
  invited_by uuid not null references auth.users(id) on delete restrict,
  token_hash bytea not null unique,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  check (expires_at > created_at)
);

create index space_members_space_id_idx on public.space_members(space_id);
create index invitations_space_id_idx on public.invitations(space_id);
create unique index invitations_one_pending_per_space
  on public.invitations(space_id)
  where accepted_at is null and revoked_at is null;

alter table public.spaces enable row level security;
alter table public.space_members enable row level security;
alter table public.invitations enable row level security;

-- Private authorization helper avoids recursive membership-table RLS checks.
create or replace function private.is_space_member(p_space_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null
    and exists (
      select 1 from public.space_members sm
      where sm.space_id = p_space_id and sm.user_id = (select auth.uid())
    );
$$;

create policy "Members can read their space"
  on public.spaces for select to authenticated
  using ((select private.is_space_member(id)));

create policy "Owners can rename their space"
  on public.spaces for update to authenticated
  using (exists (
    select 1 from public.space_members sm
    where sm.space_id = id and sm.user_id = (select auth.uid()) and sm.role = 'owner'
  ))
  with check (exists (
    select 1 from public.space_members sm
    where sm.space_id = id and sm.user_id = (select auth.uid()) and sm.role = 'owner'
  ));

create policy "Members can see their space roster"
  on public.space_members for select to authenticated
  using ((select private.is_space_member(space_id)));

-- Partner profile visibility is limited to people in the same space.
create policy "Space members can view each other's profiles"
  on public.profiles for select to authenticated
  using (
    id = (select auth.uid())
    or exists (
      select 1
      from public.space_members mine
      join public.space_members theirs on theirs.space_id = mine.space_id
      where mine.user_id = (select auth.uid()) and theirs.user_id = profiles.id
    )
  );

-- Do not permit direct membership or invitation writes from the mobile client.
revoke all on public.spaces, public.space_members, public.invitations from anon, authenticated;
grant select on public.spaces, public.space_members to authenticated;
grant update (name) on public.spaces to authenticated;
grant select, insert, update on public.profiles to authenticated;

-- The private schema is not exposed through PostgREST. Its functions explicitly
-- validate auth.uid(); callers only receive execute on the specific RPC internals.
grant usage on schema private to authenticated;

create or replace function private.create_space(p_name text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_space_id uuid;
  v_name text := btrim(coalesce(p_name, ''));
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;
  if char_length(v_name) < 2 or char_length(v_name) > 50 then
    raise exception 'Space name must be between 2 and 50 characters';
  end if;
  if exists (select 1 from public.space_members where user_id = v_user_id) then
    raise exception 'This account already belongs to a Togetherly space';
  end if;

  insert into public.spaces(name, created_by) values (v_name, v_user_id)
  returning id into v_space_id;
  insert into public.space_members(space_id, user_id, role)
  values (v_space_id, v_user_id, 'owner');
  return v_space_id;
exception
  when unique_violation then
    raise exception 'This account already belongs to a Togetherly space';
end;
$$;

create or replace function private.create_space_invitation(p_space_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_token text;
  v_member_count integer;
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;
  perform 1 from public.spaces where id = p_space_id for update;
  if not found then raise exception 'Space not found'; end if;
  if not exists (
    select 1 from public.space_members
    where space_id = p_space_id and user_id = v_user_id and role = 'owner'
  ) then raise exception 'Only the space owner can invite a member'; end if;

  select count(*) into v_member_count from public.space_members where space_id = p_space_id;
  if v_member_count >= 2 then raise exception 'This space already has two members'; end if;

  update public.invitations
    set revoked_at = now()
    where space_id = p_space_id and accepted_at is null and revoked_at is null;

  v_token := encode(extensions.gen_random_bytes(32), 'hex');
  insert into public.invitations(space_id, invited_by, token_hash, expires_at)
  values (
    p_space_id,
    v_user_id,
    extensions.digest(convert_to(v_token, 'UTF8'), 'sha256'),
    now() + interval '7 days'
  );
  return v_token;
end;
$$;

create or replace function private.accept_space_invitation(p_token text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_invitation_id uuid;
  v_space_id uuid;
  v_expires_at timestamptz;
  v_accepted_at timestamptz;
  v_revoked_at timestamptz;
  v_member_count integer;
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;
  if p_token is null or p_token !~ '^[a-f0-9]{64}$' then
    raise exception 'Invitation is invalid or has expired';
  end if;

  select i.id, i.space_id into v_invitation_id, v_space_id
  from public.invitations i
  where i.token_hash = extensions.digest(convert_to(p_token, 'UTF8'), 'sha256');
  if not found then raise exception 'Invitation is invalid or has expired'; end if;

  -- Lock the space first in every invite mutation to serialize concurrent joins.
  perform 1 from public.spaces where id = v_space_id for update;
  if not found then raise exception 'Invitation is invalid or has expired'; end if;

  select expires_at, accepted_at, revoked_at
    into v_expires_at, v_accepted_at, v_revoked_at
    from public.invitations where id = v_invitation_id for update;
  if not found or v_accepted_at is not null or v_revoked_at is not null or v_expires_at <= now() then
    raise exception 'Invitation is invalid or has expired';
  end if;
  if exists (select 1 from public.space_members where user_id = v_user_id) then
    raise exception 'This account already belongs to a Togetherly space';
  end if;

  select count(*) into v_member_count from public.space_members where space_id = v_space_id;
  if v_member_count >= 2 then raise exception 'This space already has two members'; end if;

  insert into public.space_members(space_id, user_id, role)
  values (v_space_id, v_user_id, 'member');
  update public.invitations set accepted_at = now() where id = v_invitation_id;
  return v_space_id;
exception
  when unique_violation then
    raise exception 'This account already belongs to a Togetherly space or the space is full';
end;
$$;

-- Public RPC entry points are invoker-rights wrappers. Privileged code remains
-- in the private schema, checks the caller, and is not directly API-exposed.
create or replace function public.create_space(p_name text)
returns uuid language sql security invoker set search_path = ''
as $$ select private.create_space(p_name); $$;

create or replace function public.create_space_invitation(p_space_id uuid)
returns text language sql security invoker set search_path = ''
as $$ select private.create_space_invitation(p_space_id); $$;

create or replace function public.accept_space_invitation(p_token text)
returns uuid language sql security invoker set search_path = ''
as $$ select private.accept_space_invitation(p_token); $$;

revoke all on function private.is_space_member(uuid) from public, anon;
revoke all on function private.create_space(text) from public, anon;
revoke all on function private.create_space_invitation(uuid) from public, anon;
revoke all on function private.accept_space_invitation(text) from public, anon;
grant execute on function private.is_space_member(uuid) to authenticated;
grant execute on function private.create_space(text) to authenticated;
grant execute on function private.create_space_invitation(uuid) to authenticated;
grant execute on function private.accept_space_invitation(text) to authenticated;

revoke all on function public.create_space(text) from public, anon;
revoke all on function public.create_space_invitation(uuid) from public, anon;
revoke all on function public.accept_space_invitation(text) from public, anon;
grant execute on function public.create_space(text) to authenticated;
grant execute on function public.create_space_invitation(uuid) to authenticated;
grant execute on function public.accept_space_invitation(text) to authenticated;

-- Updated timestamp for editable space names.
create trigger spaces_set_updated_at
before update on public.spaces
for each row execute function private.set_updated_at();
