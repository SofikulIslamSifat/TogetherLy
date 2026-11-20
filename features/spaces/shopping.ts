import { supabase } from '@/lib/supabase';

export type ShoppingCategory =
  | 'Produce'
  | 'Dairy'
  | 'Bakery'
  | 'Pantry'
  | 'Meat & Fish'
  | 'Household'
  | 'Personal care'
  | 'Other';

export type ShoppingItem = {
  id: string;
  list_id: string;
  name: string;
  quantity: number;
  unit: string;
  category: ShoppingCategory;
  estimated_price: number | null;
  actual_price: number | null;
  notes: string | null;
  is_purchased: boolean;
  purchased_by: string | null;
  purchased_at: string | null;
  position: number;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export type ShoppingList = {
  id: string;
  space_id: string;
  title: string;
  list_date: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
  items: ShoppingItem[];
};

export function getLocalShoppingDate(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getIncompleteShoppingLists(lists: ShoppingList[], today: string): ShoppingList[] {
  return lists
    .filter((list) => list.list_date !== today)
    .map((list) => ({ ...list, items: list.items.filter((item) => !item.is_purchased) }))
    .filter((list) => list.items.length > 0);
}

export async function getShoppingLists(spaceId: string): Promise<ShoppingList[]> {
  const { data: lists, error } = await supabase
    .from('shopping_lists')
    .select('*')
    .eq('space_id', spaceId)
    .is('archived_at', null)
    .order('updated_at', { ascending: false });
  if (error) throw error;
  if (!lists?.length) return [];

  const listIds = lists.map((list: any) => list.id);
  const { data: items, error: itemsError } = await supabase
    .from('shopping_items')
    .select('*')
    .in('list_id', listIds)
    .order('position', { ascending: true })
    .order('created_at', { ascending: true });
  if (itemsError) throw itemsError;

  return lists.map((list: any) => ({
    ...list,
    items: (items ?? []).filter((item: any) => item.list_id === list.id) as ShoppingItem[],
  })) as ShoppingList[];
}

export async function createShoppingList(spaceId: string, title: string, listDate: string) {
  const { data, error } = await supabase
    .from('shopping_lists')
    .insert({ space_id: spaceId, title: title.trim(), list_date: listDate })
    .select('id')
    .single();
  if (error) throw error;
  return data.id as string;
}

export async function addShoppingItem(input: {
  listId: string;
  name: string;
  quantity: number;
  unit: string;
  category: ShoppingCategory;
  estimatedPrice: number | null;
}) {
  const { error } = await supabase.from('shopping_items').insert({
    list_id: input.listId,
    name: input.name.trim(),
    quantity: input.quantity,
    unit: input.unit.trim() || 'item',
    category: input.category,
    estimated_price: input.estimatedPrice,
  });
  if (error) throw error;
}

export async function setShoppingItemPurchased(itemId: string, purchased: boolean) {
  const { error } = await supabase
    .from('shopping_items')
    .update({ is_purchased: purchased })
    .eq('id', itemId);
  if (error) throw error;
}

export async function updateShoppingItemActualPrice(itemId: string, actualPrice: number | null) {
  const { error } = await supabase
    .from('shopping_items')
    .update({ actual_price: actualPrice })
    .eq('id', itemId);
  if (error) throw error;
}

export async function deleteShoppingItem(itemId: string) {
  const { error } = await supabase.from('shopping_items').delete().eq('id', itemId);
  if (error) throw error;
}

export async function archiveShoppingList(listId: string) {
  const { error } = await supabase
    .from('shopping_lists')
    .update({ archived_at: new Date().toISOString() })
    .eq('id', listId);
  if (error) throw error;
}
