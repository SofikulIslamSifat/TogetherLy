begin;
select plan(12);

select has_table('public', 'memories', 'memories table exists');
select ok((select relrowsecurity from pg_class where oid = 'public.memories'::regclass), 'RLS is enabled');
select has_column('public', 'memories', 'space_id', 'memories are space scoped');
select has_column('public', 'memories', 'memory_date', 'memories store the event date');
select has_column('public', 'memories', 'category', 'memories support categories');
select has_column('public', 'memories', 'storage_path', 'photo object path is stored');
select has_trigger('public', 'memories', 'memories_enforce_scope', 'memory ownership and storage scope are immutable');
select ok((select count(*) = 1 from storage.buckets where id = 'shared-memories' and public = false), 'shared memory bucket is private');
select ok((select count(*) = 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'Space members can view shared memory photos'), 'shared photo read policy exists');
select ok((select count(*) = 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'Space members can upload shared memory photos'), 'shared photo upload policy exists');
select ok((select count(*) = 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'Space members can clean up orphaned photos and creators can delete their photos'), 'creator-only photo deletion policy exists');
select ok((select count(*) = 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'memories'), 'memories are in Realtime publication');

select * from finish();
rollback;
