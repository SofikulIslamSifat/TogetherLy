begin;
select plan(10);

select has_table('public', 'tasks', 'tasks table exists');
select ok((select relrowsecurity from pg_class where oid = 'public.tasks'::regclass), 'RLS is enabled');
select has_column('public', 'tasks', 'space_id', 'tasks are space scoped');
select has_column('public', 'tasks', 'assigned_to', 'tasks support member assignment');
select has_column('public', 'tasks', 'due_date', 'tasks support due dates');
select has_column('public', 'tasks', 'priority', 'tasks support priority');
select has_column('public', 'tasks', 'is_completed', 'tasks support completion');
select has_trigger('public', 'tasks', 'tasks_enforce_scope_and_completion', 'scope and completion trigger exists');
select has_trigger('public', 'tasks', 'tasks_set_updated_at', 'updated_at trigger exists');
select ok((select count(*) = 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'tasks'), 'tasks are in Realtime publication');

select * from finish();
rollback;
