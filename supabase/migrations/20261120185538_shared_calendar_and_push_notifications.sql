-- Shared calendar events and push delivery for space activity notifications.

alter table public.notifications
  drop constraint notifications_event_type_check,
  add constraint notifications_event_type_check check (event_type in (
    'task_created', 'task_assigned', 'task_completed', 'task_reopened',
    'shopping_item_added', 'shopping_item_purchased', 'meal_added',
    'memory_added', 'calendar_event_added', 'calendar_event_updated'
  ));

alter table public.notifications
  drop constraint notifications_entity_type_check,
  add constraint notifications_entity_type_check check (
    entity_type in ('task', 'shopping', 'meal', 'memory', 'calendar_event')
  );

create table public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces(id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 120),
  description text check (description is null or char_length(description) <= 500),
  event_date date not null,
  event_type text not null check (event_type in ('plan', 'important_date')),
  repeats_yearly boolean not null default false,
  created_by uuid not null references auth.users(id) on delete restrict default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint calendar_events_annual_only_for_important_dates
    check (not repeats_yearly or event_type = 'important_date')
);

create index calendar_events_space_date_idx
  on public.calendar_events(space_id, event_date);
create index calendar_events_recurring_idx
  on public.calendar_events(space_id, event_date)
  where repeats_yearly;
create index tasks_space_due_date_idx
  on public.tasks(space_id, due_date)
  where due_date is not null;

alter table public.calendar_events enable row level security;

create policy "Space members can read calendar events"
  on public.calendar_events for select to authenticated
  using ((select private.is_space_member(space_id)));

create policy "Space members can create calendar events"
  on public.calendar_events for insert to authenticated
  with check (
    created_by = (select auth.uid())
    and (select private.is_space_member(space_id))
  );

create policy "Space members can update calendar events"
  on public.calendar_events for update to authenticated
  using ((select private.is_space_member(space_id)))
  with check ((select private.is_space_member(space_id)));

create policy "Space members can delete calendar events"
  on public.calendar_events for delete to authenticated
  using ((select private.is_space_member(space_id)));

revoke all on public.calendar_events from anon, authenticated;
grant select, insert, update, delete on public.calendar_events to authenticated;

create trigger calendar_events_set_updated_at
  before update on public.calendar_events
  for each row execute function private.set_updated_at();

create or replace function private.prevent_calendar_event_scope_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.created_by is distinct from old.created_by then
    raise exception 'The creator of a calendar event cannot be changed';
  end if;
  if new.space_id is distinct from old.space_id then
    raise exception 'A calendar event cannot be moved to another space';
  end if;
  return new;
end;
$$;

create trigger calendar_events_prevent_scope_change
  before update on public.calendar_events
  for each row execute function private.prevent_calendar_event_scope_change();
revoke all on function private.prevent_calendar_event_scope_change() from public, anon, authenticated;

create table public.push_device_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  expo_push_token text not null check (char_length(expo_push_token) between 1 and 255),
  platform text not null check (platform in ('ios', 'android')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, expo_push_token)
);

create index push_device_tokens_user_idx on public.push_device_tokens(user_id);
alter table public.push_device_tokens enable row level security;

create policy "Users can read their own push tokens"
  on public.push_device_tokens for select to authenticated
  using (user_id = (select auth.uid()));

create policy "Users can register their own push tokens"
  on public.push_device_tokens for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "Users can update their own push tokens"
  on public.push_device_tokens for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "Users can delete their own push tokens"
  on public.push_device_tokens for delete to authenticated
  using (user_id = (select auth.uid()));

revoke all on public.push_device_tokens from anon, authenticated;
grant select, insert, update, delete on public.push_device_tokens to authenticated;

create trigger push_device_tokens_set_updated_at
  before update on public.push_device_tokens
  for each row execute function private.set_updated_at();

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
    if tg_op = 'INSERT' and (v_row ->> 'assigned_to') is not null
      and (v_row ->> 'assigned_to')::uuid <> v_actor_id then
      v_event_type := 'task_assigned';
      v_title := 'Task assigned to you';
      v_body := coalesce(nullif(v_row ->> 'title', ''), 'A task') || ' was assigned to you.';
    elsif tg_op = 'INSERT' then
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
    elsif (v_row ->> 'assigned_to') is distinct from (v_old ->> 'assigned_to')
      and (v_row ->> 'assigned_to') is not null
      and (v_row ->> 'assigned_to')::uuid <> v_actor_id then
      v_event_type := 'task_assigned';
      v_title := 'Task assigned to you';
      v_body := coalesce(nullif(v_row ->> 'title', ''), 'A task') || ' was assigned to you.';
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
  elsif tg_table_name = 'calendar_events' then
    v_space_id := (v_row ->> 'space_id')::uuid;
    v_entity_type := 'calendar_event';
    if tg_op = 'INSERT' then
      v_event_type := 'calendar_event_added';
      v_title := 'Calendar updated';
      v_body := coalesce(nullif(v_row ->> 'title', ''), 'An event') || ' was added to the calendar.';
    elsif (v_row ->> 'title') is distinct from (v_old ->> 'title')
      or (v_row ->> 'event_date') is distinct from (v_old ->> 'event_date')
      or (v_row ->> 'event_type') is distinct from (v_old ->> 'event_type')
      or (v_row ->> 'description') is distinct from (v_old ->> 'description')
      or (v_row ->> 'repeats_yearly') is distinct from (v_old ->> 'repeats_yearly') then
      v_event_type := 'calendar_event_updated';
      v_title := 'Calendar event updated';
      v_body := coalesce(nullif(v_row ->> 'title', ''), 'An event') || ' was updated.';
    else
      return new;
    end if;
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
  where sm.space_id = v_space_id
    and case
      when v_event_type = 'task_assigned' then sm.user_id = (v_row ->> 'assigned_to')::uuid
      else sm.user_id <> v_actor_id
    end;

  if tg_op = 'DELETE' then return old; else return new; end if;
end;
$$;
revoke all on function private.create_space_activity_notification() from public, anon, authenticated;

drop trigger if exists tasks_activity_notification on public.tasks;
create trigger tasks_activity_notification
  after insert or update on public.tasks
  for each row execute function private.create_space_activity_notification();

drop trigger if exists calendar_events_activity_notification on public.calendar_events;
create trigger calendar_events_activity_notification
  after insert or update on public.calendar_events
  for each row execute function private.create_space_activity_notification();

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'calendar_events'
  ) then
    alter publication supabase_realtime add table public.calendar_events;
  end if;
end;
$$;

-- Store `togetherly_project_url` and `togetherly_push_secret` in Supabase Vault.
-- The trigger remains harmless until both secrets are configured.
create extension if not exists pg_net with schema extensions;

create or replace function private.dispatch_push_notification()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_project_url text;
  v_secret text;
begin
  select decrypted_secret into v_project_url
    from vault.decrypted_secrets where name = 'togetherly_project_url';
  select decrypted_secret into v_secret
    from vault.decrypted_secrets where name = 'togetherly_push_secret';

  if v_project_url is null or v_secret is null then
    raise warning 'Push dispatch is inactive: configure the two Togetherly push secrets in Supabase Vault';
    return new;
  end if;

  perform net.http_post(
    url := rtrim(v_project_url, '/') || '/functions/v1/send-push-notification',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', v_secret
    ),
    body := jsonb_build_object(
      'type', 'INSERT',
      'schema', 'public',
      'table', 'notifications',
      'record', to_jsonb(new),
      'old_record', null
    ),
    timeout_milliseconds := 2000
  );
  return new;
end;
$$;
revoke all on function private.dispatch_push_notification() from public, anon, authenticated;

create trigger notifications_dispatch_push
  after insert on public.notifications
  for each row execute function private.dispatch_push_notification();