-- Phase 8 schema/security regression checks. Run with Supabase pgTAP.
begin;
select plan(13);

select has_table('public', 'notifications', 'notifications table exists');
select ok((select relrowsecurity from pg_class where oid = 'public.notifications'::regclass), 'RLS is enabled');
select has_column('public', 'notifications', 'recipient_id', 'recipient is recorded');
select has_column('public', 'notifications', 'read_at', 'read state is recorded');
select has_column('public', 'notifications', 'entity_type', 'entity type is recorded');
select has_index('public', 'notifications', 'notifications_recipient_unread_idx', 'unread index exists');
select has_trigger('public', 'notifications', 'notifications_protect_fields', 'notification fields are protected');
select has_trigger('public', 'tasks', 'tasks_activity_notification', 'task activity trigger exists');
select has_trigger('public', 'shopping_items', 'shopping_items_activity_notification', 'shopping activity trigger exists');
select has_trigger('public', 'meals', 'meals_activity_notification', 'meal activity trigger exists');
select has_trigger('public', 'memories', 'memories_activity_notification', 'memory activity trigger exists');
select ok(not has_table_privilege('authenticated', 'public.notifications', 'INSERT'), 'clients cannot insert notifications directly');
select ok((select count(*) = 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notifications'), 'notifications are in Realtime publication');

select * from finish();
rollback;
