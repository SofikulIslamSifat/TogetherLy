begin;
select plan(12);

select has_table('public', 'shopping_lists', 'shopping_lists table exists');
select has_table('public', 'shopping_items', 'shopping_items table exists');
select ok(
  (select relrowsecurity from pg_class where oid = 'public.shopping_lists'::regclass),
  'shopping_lists has row level security enabled'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.shopping_items'::regclass),
  'shopping_items has row level security enabled'
);
select has_column('public', 'shopping_lists', 'space_id', 'lists are scoped to a space');
select has_column('public', 'shopping_items', 'list_id', 'items belong to a list');
select has_column('public', 'shopping_items', 'estimated_price', 'items support estimated prices');
select has_column('public', 'shopping_items', 'actual_price', 'items support actual prices');
select has_column('public', 'shopping_items', 'purchased_by', 'purchase attribution is stored');
select has_column('public', 'shopping_items', 'is_purchased', 'purchase state is stored');
select ok(
  exists (select 1 from pg_trigger where tgname = 'shopping_items_purchase_metadata' and not tgisinternal),
  'purchase metadata is maintained by a database trigger'
);
select ok(
  exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'shopping_items'),
  'shopping item changes are included in Supabase Realtime publication'
);

select * from finish();
rollback;
