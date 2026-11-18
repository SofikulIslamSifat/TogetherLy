begin;
select plan(10);

select has_table('public', 'meals', 'meals table exists');
select has_table('public', 'meal_ingredients', 'meal ingredients table exists');
select ok((select relrowsecurity from pg_class where oid = 'public.meals'::regclass), 'meals has row level security enabled');
select ok((select relrowsecurity from pg_class where oid = 'public.meal_ingredients'::regclass), 'meal ingredients has row level security enabled');
select has_column('public', 'meals', 'space_id', 'meals are scoped to a shared space');
select has_column('public', 'meals', 'planned_date', 'meals have a planned date');
select has_column('public', 'meals', 'meal_type', 'meals have a meal type');
select has_column('public', 'meal_ingredients', 'shopping_item_id', 'ingredient transfer is tracked');
select ok(
  exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'add_meal_ingredients_to_shopping_list'
      and p.prosecdef = false),
  'ingredient transfer RPC runs as invoker'
);
select ok(
  (select count(*) = 2 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public'
      and tablename in ('meals', 'meal_ingredients')),
  'meal and ingredient changes are included in Supabase Realtime publication'
);

select * from finish();
rollback;
