drop trigger if exists tasks_activity_notification on public.tasks;
drop trigger if exists shopping_items_activity_notification on public.shopping_items;
drop trigger if exists meals_activity_notification on public.meals;
drop trigger if exists memories_activity_notification on public.memories;
drop trigger if exists calendar_events_activity_notification on public.calendar_events;
drop trigger if exists notifications_dispatch_push on public.notifications;
drop trigger if exists notifications_protect_fields on public.notifications;

drop function if exists private.create_space_activity_notification();
drop function if exists private.dispatch_push_notification();
drop function if exists private.protect_notification_fields();

drop table if exists public.push_device_tokens;

drop policy if exists "Members can read their own space notifications" on public.notifications;
drop policy if exists "Members can update their own notification read state" on public.notifications;
revoke all on table public.notifications from public, anon, authenticated;

do $$
begin
  if exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'notifications'
  ) then
    alter publication supabase_realtime drop table public.notifications;
  end if;
end;
$$;