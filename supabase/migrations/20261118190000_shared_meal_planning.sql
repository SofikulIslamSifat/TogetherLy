-- Phase 5: shared meal planning and ingredient-to-shopping-list transfer.
-- RPC is SECURITY INVOKER so table grants and RLS remain in force.

create table public.meals (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces(id) on delete cascade,
  planned_date date not null,
  meal_type text not null check (meal_type in ('Breakfast', 'Lunch', 'Dinner', 'Snack')),
  title text not null check (char_length(btrim(title)) between 1 and 100),
  description text check (description is null or char_length(description) <= 500),
  created_by uuid not null references auth.users(id) on delete restrict default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.meal_ingredients (
  id uuid primary key default gen_random_uuid(),
  meal_id uuid not null references public.meals(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 120),
  quantity numeric(10,2) not null default 1 check (quantity > 0 and quantity <= 100000),
  unit text not null default 'item' check (char_length(unit) between 1 and 24),
  category text not null default 'Other' check (category in ('Produce', 'Dairy', 'Bakery', 'Pantry', 'Meat & Fish', 'Household', 'Personal care', 'Other')),
  shopping_item_id uuid references public.shopping_items(id) on delete set null,
  created_by uuid not null references auth.users(id) on delete restrict default auth.uid(),
  created_at timestamptz not null default now()
);

create index meals_space_date_idx on public.meals(space_id, planned_date, meal_type);
create index meal_ingredients_meal_idx on public.meal_ingredients(meal_id, created_at);

alter table public.meals enable row level security;
alter table public.meal_ingredients enable row level security;

create policy "Space members can read meals" on public.meals
  for select to authenticated using ((select private.is_space_member(space_id)));
create policy "Space members can create meals" on public.meals
  for insert to authenticated with check (
    created_by = (select auth.uid()) and (select private.is_space_member(space_id))
  );
create policy "Space members can update meals" on public.meals
  for update to authenticated using ((select private.is_space_member(space_id)))
  with check ((select private.is_space_member(space_id)));
create policy "Space members can delete meals" on public.meals
  for delete to authenticated using ((select private.is_space_member(space_id)));

create policy "Space members can read meal ingredients" on public.meal_ingredients
  for select to authenticated using (exists (
    select 1 from public.meals m where m.id = meal_id
      and (select private.is_space_member(m.space_id))
  ));
create policy "Space members can create meal ingredients" on public.meal_ingredients
  for insert to authenticated with check (
    created_by = (select auth.uid()) and exists (
      select 1 from public.meals m where m.id = meal_id
        and (select private.is_space_member(m.space_id))
    )
  );
create policy "Space members can update meal ingredients" on public.meal_ingredients
  for update to authenticated using (exists (
    select 1 from public.meals m where m.id = meal_id
      and (select private.is_space_member(m.space_id))
  )) with check (exists (
    select 1 from public.meals m where m.id = meal_id
      and (select private.is_space_member(m.space_id))
  ));
create policy "Space members can delete meal ingredients" on public.meal_ingredients
  for delete to authenticated using (exists (
    select 1 from public.meals m where m.id = meal_id
      and (select private.is_space_member(m.space_id))
  ));

revoke all on public.meals, public.meal_ingredients from anon, authenticated;
grant select, insert, update, delete on public.meals, public.meal_ingredients to authenticated;

drop trigger if exists meals_set_updated_at on public.meals;
create trigger meals_set_updated_at before update on public.meals
  for each row execute function private.set_updated_at();

create or replace function private.prevent_meal_scope_change()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.created_by is distinct from old.created_by then
    raise exception 'The creator of a meal record cannot be changed';
  end if;
  if tg_table_name = 'meals' and new.space_id is distinct from old.space_id then
    raise exception 'A meal cannot be moved to another space';
  end if;
  if tg_table_name = 'meal_ingredients' and new.meal_id is distinct from old.meal_id then
    raise exception 'An ingredient cannot be moved to another meal';
  end if;
  return new;
end;
$$;
create trigger meals_prevent_scope_change before update on public.meals
  for each row execute function private.prevent_meal_scope_change();
create trigger meal_ingredients_prevent_scope_change before update on public.meal_ingredients
  for each row execute function private.prevent_meal_scope_change();
revoke all on function private.prevent_meal_scope_change() from public, anon, authenticated;

-- Atomic transfer: a failure rolls back every shopping item and link update.
create or replace function public.add_meal_ingredients_to_shopping_list(
  p_meal_id uuid,
  p_list_id uuid
)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_space_id uuid;
  v_list_space_id uuid;
  v_count integer := 0;
  v_ingredient record;
  v_item_id uuid;
begin
  if (select auth.uid()) is null then raise exception 'Authentication required'; end if;

  select m.space_id into v_space_id from public.meals m where m.id = p_meal_id;
  if v_space_id is null then raise exception 'Meal not found'; end if;
  select sl.space_id into v_list_space_id from public.shopping_lists sl
    where sl.id = p_list_id and sl.archived_at is null;
  if v_list_space_id is null or v_list_space_id <> v_space_id then
    raise exception 'Choose an active shopping list in the same space';
  end if;

  for v_ingredient in
    select mi.id, mi.name, mi.quantity, mi.unit, mi.category
    from public.meal_ingredients mi
    where mi.meal_id = p_meal_id and mi.shopping_item_id is null
    order by mi.created_at
    for update
  loop
    insert into public.shopping_items(list_id, name, quantity, unit, category, notes)
    values (p_list_id, v_ingredient.name, v_ingredient.quantity, v_ingredient.unit,
      v_ingredient.category, 'Added from meal plan')
    returning id into v_item_id;

    update public.meal_ingredients set shopping_item_id = v_item_id
      where id = v_ingredient.id;
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;
revoke all on function public.add_meal_ingredients_to_shopping_list(uuid, uuid) from public, anon;
grant execute on function public.add_meal_ingredients_to_shopping_list(uuid, uuid) to authenticated;

-- Add new tables to the existing Postgres Changes publication.
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'meals') then
    alter publication supabase_realtime add table public.meals;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'meal_ingredients') then
    alter publication supabase_realtime add table public.meal_ingredients;
  end if;
end;
$$;
