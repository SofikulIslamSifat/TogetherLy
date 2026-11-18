-- Phase 8: private, in-app activity notifications for the other space member.

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  event_type text not null check (event_type in (
    'task_created', 'task_completed', 'task_reopened', 'shopping_item_added',
    'shopping_item_purchased', 'meal_added', 'memory_added'
  )),
  title text not null check (char_length(title) between 1 and 100),
  body text not null check (char_length(body) between 1 and 240),
  entity_type text not null check (entity_type in ('task', 'shopping', 'meal', 'memory')),
  entity_id uuid not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_recipient_unread_idx
  on public.notifications(recipient_id, created_at desc) where read_at is null;
create index notifications_recipient_created_idx
  on public.notifications(recipient_id, created_at desc);

alter table public.notifications enable row level security;

create policy "Members can read their own space notifications"
  on public.notifications for select to authenticated
  using (
    recipient_id = (select auth.uid())
    and (select private.is_space_member(space_id))
  );

create policy "Members can update their own notification read state"
  on public.notifications for update to authenticated
  using (
    recipient_id = (select auth.uid())
    and (select private.is_space_member(space_id))
  )
  with check (
    recipient_id = (select auth.uid())
    and (select private.is_space_member(space_id))
  );

revoke all on public.notifications from anon, authenticated;
grant select, update on public.notifications to authenticated;

create or replace function private.protect_notification_fields()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.id is distinct from old.id
    or new.space_id is distinct from old.space_id
    or new.recipient_id is distinct from old.recipient_id
    or new.actor_id is distinct from old.actor_id
    or new.event_type is distinct from old.event_type
    or new.title is distinct from old.title
    or new.body is distinct from old.body
    or new.entity_type is distinct from old.entity_type
    or new.entity_id is distinct from old.entity_id
    or new.created_at is distinct from old.created_at then
    raise exception 'Only the notification read state can be changed';
  end if;
  return new;
end;
$$;

create trigger notifications_protect_fields
before update on public.notifications
for each row execute function private.protect_notification_fields();
revoke all on function private.protect_notification_fields() from public, anon, authenticated;

-- This trigger function is private and cannot be called directly by app users.
-- It inserts only for the other member of the actor's own space.
create or replace function private.create_space_activity_notification()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row jsonb;
  v_old jsonb;
  v_space_id uuid;
  v_entity_id uuid;
  v_actor_id uuid := auth.uid();
  v_event_type text;
  v_title text;
  v_body text;
  v_entity_type text;
  v_list_id uuid;
begin
  if v_actor_id is null then
    if tg_op = 'DELETE' then return old; else return new; end if;
  end if;

  v_row := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  if tg_op = 'UPDATE' then v_old := to_jsonb(old); end if;
  v_entity_id := (v_row ->> 'id')::uuid;

  if tg_table_name = 'tasks' then
    v_space_id := (v_row ->> 'space_id')::uuid;
    v_entity_type := 'task';
    if tg_op = 'INSERT' then
      v_event_type := 'task_created';
      v_title := 'New shared task';
      v_body := coalesce(nullif(v_row ->> 'title', ''), 'A task') || ' was added.';
    elsif (v_row ->> 'is_completed') is distinct from (v_old ->> 'is_completed') then
      if (v_row ->> 'is_completed')::boolean then
        v_event_type := 'task_completed';
        v_title := 'Task completed';
        v_body := coalesce(nullif(v_row ->> 'title', ''), 'A task') || ' was marked as done.';
      else
        v_event_type := 'task_reopened';
        v_title := 'Task reopened';
        v_body := coalesce(nullif(v_row ->> 'title', ''), 'A task') || ' was reopened.';
      end if;
    else
      return new;
    end if;
  elsif tg_table_name = 'shopping_items' then
    v_list_id := (v_row ->> 'list_id')::uuid;
    select sl.space_id into v_space_id from public.shopping_lists sl where sl.id = v_list_id;
    v_entity_type := 'shopping';
    if tg_op = 'INSERT' then
      v_event_type := 'shopping_item_added';
      v_title := 'Shopping list updated';
      v_body := coalesce(nullif(v_row ->> 'name', ''), 'An item') || ' was added.';
    elsif (v_row ->> 'is_purchased') is distinct from (v_old ->> 'is_purchased')
      and (v_row ->> 'is_purchased')::boolean then
      v_event_type := 'shopping_item_purchased';
      v_title := 'Item purchased';
      v_body := coalesce(nullif(v_row ->> 'name', ''), 'An item') || ' was marked as purchased.';
    else
      return new;
    end if;
  elsif tg_table_name = 'meals' then
    v_space_id := (v_row ->> 'space_id')::uuid;
    v_entity_type := 'meal';
    v_event_type := 'meal_added';
    v_title := 'Meal plan updated';
    v_body := coalesce(nullif(v_row ->> 'title', ''), 'A meal') || ' was added to the plan.';
  elsif tg_table_name = 'memories' then
    v_space_id := (v_row ->> 'space_id')::uuid;
    v_entity_type := 'memory';
    v_event_type := 'memory_added';
    v_title := 'New shared memory';
    v_body := coalesce(nullif(v_row ->> 'caption', ''), 'A new photo') || ' was added to your gallery.';
  else
    if tg_op = 'DELETE' then return old; else return new; end if;
  end if;

  if v_space_id is null or not private.is_space_member(v_space_id) then
    if tg_op = 'DELETE' then return old; else return new; end if;
  end if;

  insert into public.notifications (
    space_id, recipient_id, actor_id, event_type, title, body, entity_type, entity_id
  )
  select v_space_id, sm.user_id, v_actor_id, v_event_type, v_title, left(v_body, 240), v_entity_type, v_entity_id
  from public.space_members sm
  where sm.space_id = v_space_id and sm.user_id <> v_actor_id;

  if tg_op = 'DELETE' then return old; else return new; end if;
end;
$$;
revoke all on function private.create_space_activity_notification() from public, anon, authenticated;

drop trigger if exists tasks_activity_notification on public.tasks;
create trigger tasks_activity_notification
after insert or update on public.tasks
for each row execute function private.create_space_activity_notification();

drop trigger if exists shopping_items_activity_notification on public.shopping_items;
create trigger shopping_items_activity_notification
after insert or update on public.shopping_items
for each row execute function private.create_space_activity_notification();

drop trigger if exists meals_activity_notification on public.meals;
create trigger meals_activity_notification
after insert on public.meals
for each row execute function private.create_space_activity_notification();

drop trigger if exists memories_activity_notification on public.memories;
create trigger memories_activity_notification
after insert on public.memories
for each row execute function private.create_space_activity_notification();

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
end;
$$;
