begin;
select plan(9);

select has_table('public', 'calendar_events', 'calendar events table exists');
select ok((select relrowsecurity from pg_class where oid = 'public.calendar_events'::regclass), 'calendar event RLS is enabled');
select has_column('public', 'calendar_events', 'event_date', 'calendar events have a date');
select has_column('public', 'calendar_events', 'repeats_yearly', 'important dates can recur yearly');
select has_index('public', 'calendar_events', 'calendar_events_space_date_idx', 'calendar events are indexed by space and date');
select has_trigger('public', 'calendar_events', 'calendar_events_prevent_scope_change', 'calendar event scope is protected');
select ok(not has_table_privilege('anon', 'public.calendar_events', 'SELECT'), 'anonymous users cannot read calendar events');
select ok(
  (select count(*) = 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'calendar_events'),
  'calendar events are in the Realtime publication'
);
select has_index('public', 'tasks', 'tasks_space_due_date_idx', 'calendar task lookups are indexed by space and due date');

select * from finish();
rollback;
