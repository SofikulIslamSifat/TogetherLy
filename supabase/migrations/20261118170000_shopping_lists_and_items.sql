-- Phase 4: shared shopping lists and item tracking.
-- Every read/write is scoped to a space membership through RLS.

create table public.shopping_lists (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces(id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 80),
  created_by uuid not null references auth.users(id) on delete restrict default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

create table public.shopping_items (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references public.shopping_lists(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 120),
  quantity numeric(10,2) not null default 1 check (quantity > 0 and quantity <= 100000),
  unit text not null default 'item' check (char_length(unit) between 1 and 24),
  category text not null default 'Other' check (category in ('Produce', 'Dairy', 'Bakery', 'Pantry', 'Meat & Fish', 'Household', 'Personal care', 'Other')),
  estimated_price numeric(12,2) check (estimated_price is null or estimated_price >= 0),
  actual_price numeric(12,2) check (actual_price is null or actual_price >= 0),
  notes text check (notes is null or char_length(notes) <= 500),
  is_purchased boolean not null default false,
  purchased_by uuid references auth.users(id) on delete set null,
  purchased_at timestamptz,
  position integer not null default 0,
  created_by uuid not null references auth.users(id) on delete restrict default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint shopping_items_purchase_state check (
    (is_purchased = false and purchased_by is null and purchased_at is null)
    or (is_purchased = true and purchased_by is not null and purchased_at is not null)
  )
);

create index shopping_lists_space_active_idx
  on public.shopping_lists(space_id, updated_at desc)
  where archived_at is null;
create index shopping_items_list_position_idx
  on public.shopping_items(list_id, is_purchased, position, created_at);

alter table public.shopping_lists enable row level security;
alter table public.shopping_items enable row level security;

create policy "Space members can read shopping lists"
  on public.shopping_lists for select to authenticated
  using ((select private.is_space_member(space_id)));

create policy "Space members can create shopping lists"
  on public.shopping_lists for insert to authenticated
  with check (
    created_by = (select auth.uid())
    and (select private.is_space_member(space_id))
  );

create policy "Space members can update shopping lists"
  on public.shopping_lists for update to authenticated
  using ((select private.is_space_member(space_id)))
  with check ((select private.is_space_member(space_id)));

create policy "Space members can delete shopping lists"
  on public.shopping_lists for delete to authenticated
  using ((select private.is_space_member(space_id)));

create policy "Space members can read shopping items"
  on public.shopping_items for select to authenticated
  using (exists (
    select 1 from public.shopping_lists sl
    where sl.id = list_id and (select private.is_space_member(sl.space_id))
  ));

create policy "Space members can create shopping items"
  on public.shopping_items for insert to authenticated
  with check (
    created_by = (select auth.uid())
    and exists (
      select 1 from public.shopping_lists sl
      where sl.id = list_id and (select private.is_space_member(sl.space_id))
    )
    and (not is_purchased or (purchased_by = (select auth.uid()) and purchased_at is not null))
  );

create policy "Space members can update shopping items"
  on public.shopping_items for update to authenticated
  using (exists (
    select 1 from public.shopping_lists sl
    where sl.id = list_id and (select private.is_space_member(sl.space_id))
  ))
  with check (
    exists (
      select 1 from public.shopping_lists sl
      where sl.id = list_id and (select private.is_space_member(sl.space_id))
    )
    and (
      (is_purchased = false and purchased_by is null and purchased_at is null)
      or (is_purchased = true and purchased_by is not null and purchased_at is not null)
    )
  );

create policy "Space members can delete shopping items"
  on public.shopping_items for delete to authenticated
  using (exists (
    select 1 from public.shopping_lists sl
    where sl.id = list_id and (select private.is_space_member(sl.space_id))
  ));

revoke all on public.shopping_lists, public.shopping_items from anon, authenticated;
grant select, insert, update, delete on public.shopping_lists, public.shopping_items to authenticated;

drop trigger if exists shopping_lists_set_updated_at on public.shopping_lists;
create trigger shopping_lists_set_updated_at
before update on public.shopping_lists
for each row execute function private.set_updated_at();

drop trigger if exists shopping_items_set_updated_at on public.shopping_items;
create trigger shopping_items_set_updated_at
before update on public.shopping_items
for each row execute function private.set_updated_at();


-- Creator and list ownership columns cannot be reassigned by client updates.
create or replace function private.prevent_shopping_scope_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.created_by is distinct from old.created_by then
    raise exception 'The creator of a shopping record cannot be changed';
  end if;
  if tg_table_name = 'shopping_lists' and new.space_id is distinct from old.space_id then
    raise exception 'A shopping list cannot be moved to another space';
  end if;
  return new;
end;
$$;

create trigger shopping_lists_prevent_scope_change
before update on public.shopping_lists
for each row execute function private.prevent_shopping_scope_change();
create trigger shopping_items_prevent_scope_change
before update on public.shopping_items
for each row execute function private.prevent_shopping_scope_change();
revoke all on function private.prevent_shopping_scope_change() from public, anon, authenticated;

-- Keep purchase metadata consistent when a member checks/unchecks an item.
create or replace function private.set_shopping_purchase_metadata()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.is_purchased and not old.is_purchased then
    new.purchased_by := auth.uid();
    new.purchased_at := now();
  elsif not new.is_purchased then
    new.purchased_by := null;
    new.purchased_at := null;
  elsif new.is_purchased and old.is_purchased then
    new.purchased_by := old.purchased_by;
    new.purchased_at := old.purchased_at;
  end if;
  return new;
end;
$$;

create trigger shopping_items_purchase_metadata
before update on public.shopping_items
for each row execute function private.set_shopping_purchase_metadata();
revoke all on function private.set_shopping_purchase_metadata() from public, anon, authenticated;

-- Realtime events are still filtered by table RLS on the subscribing user's JWT.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'shopping_lists'
  ) then
    alter publication supabase_realtime add table public.shopping_lists;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'shopping_items'
  ) then
    alter publication supabase_realtime add table public.shopping_items;
  end if;
end;
$$;
