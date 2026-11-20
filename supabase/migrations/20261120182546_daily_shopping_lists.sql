alter table public.shopping_lists
  add column list_date date;

alter table public.shopping_lists
  alter column list_date set default current_date;

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
    if new.list_date is distinct from old.list_date then
      raise exception 'The date of a shopping list cannot be changed';
    end if;
  elsif tg_table_name = 'shopping_items' then
    if new.list_id is distinct from old.list_id then
      raise exception 'A shopping item cannot be moved to another list';
    end if;
  end if;

  return new;
end;
$$;