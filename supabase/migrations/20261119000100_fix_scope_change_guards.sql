-- Branch on the trigger table before accessing table-specific fields. Boolean
-- expressions are not guaranteed to short-circuit in SQL.
create or replace function private.prevent_shopping_scope_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.created_by is distinct from old.created_by then
    raise exception 'The creator of a shopping record cannot be changed';
  end if;

  if tg_table_name = 'shopping_lists' then
    if new.space_id is distinct from old.space_id then
      raise exception 'A shopping list cannot be moved to another space';
    end if;
  elsif tg_table_name = 'shopping_items' then
    if new.list_id is distinct from old.list_id then
      raise exception 'A shopping item cannot be moved to another list';
    end if;
  end if;

  return new;
end;
$$;

create or replace function private.prevent_meal_scope_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.created_by is distinct from old.created_by then
    raise exception 'The creator of a meal record cannot be changed';
  end if;

  if tg_table_name = 'meals' then
    if new.space_id is distinct from old.space_id then
      raise exception 'A meal cannot be moved to another space';
    end if;
  elsif tg_table_name = 'meal_ingredients' then
    if new.meal_id is distinct from old.meal_id then
      raise exception 'An ingredient cannot be moved to another meal';
    end if;
  end if;

  return new;
end;
$$;