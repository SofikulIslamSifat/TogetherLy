begin;
select plan(7);

select ok(to_regclass('public.notifications') is not null, 'notification history is preserved');
select ok(to_regclass('public.push_device_tokens') is null, 'push device tokens are removed');
select ok(
  not exists (
    select 1
    from pg_trigger
    where not tgisinternal
      and tgname in (
        'tasks_activity_notification',
        'shopping_items_activity_notification',
        'meals_activity_notification',
        'memories_activity_notification',
        'calendar_events_activity_notification',
        'notifications_dispatch_push',
        'notifications_protect_fields'
      )
  ),
  'notification triggers are removed'
);
select ok(
  to_regprocedure('private.create_space_activity_notification()') is null
    and to_regprocedure('private.dispatch_push_notification()') is null
    and to_regprocedure('private.protect_notification_fields()') is null,
  'notification functions are removed'
);
select ok(not has_table_privilege('authenticated', 'public.notifications', 'SELECT'), 'authenticated users cannot read notification history');
select ok(not has_table_privilege('anon', 'public.notifications', 'SELECT'), 'anonymous users cannot read notification history');
select ok(
  not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'notifications'
  ),
  'notifications are removed from Realtime'
);

select * from finish();
rollback;
