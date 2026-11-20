import { describe, expect, it, jest } from '@jest/globals';

import { getIncompleteShoppingLists, getLocalShoppingDate, type ShoppingItem, type ShoppingList } from '@/features/spaces/shopping';

jest.mock('@/lib/supabase', () => ({ supabase: {} }));

const item = (id: string, is_purchased: boolean): ShoppingItem => ({
  id,
  list_id: 'list',
  name: id,
  quantity: 1,
  unit: 'item',
  category: 'Other',
  estimated_price: null,
  actual_price: null,
  notes: null,
  is_purchased,
  purchased_by: null,
  purchased_at: null,
  position: 0,
  created_by: 'user',
  created_at: '',
  updated_at: '',
});

const list = (id: string, list_date: string | null, items: ShoppingItem[]): ShoppingList => ({
  id,
  space_id: 'space',
  title: id,
  list_date,
  created_by: 'user',
  created_at: '',
  updated_at: '',
  archived_at: null,
  items,
});

describe('daily shopping lists', () => {
  it('formats the calendar day in the device local timezone', () => {
    expect(getLocalShoppingDate(new Date(2026, 0, 2, 23, 30))).toBe('2026-01-02');
  });

  it('returns only unfinished items from previous or legacy undated lists', () => {
    const incomplete = getIncompleteShoppingLists([
      list('today', '2026-01-02', [item('today-item', false)]),
      list('yesterday', '2026-01-01', [item('unfinished', false), item('done', true)]),
      list('legacy', null, [item('legacy-item', false)]),
    ], '2026-01-02');

    expect(incomplete.map((entry) => entry.id)).toEqual(['yesterday', 'legacy']);
    expect(incomplete.flatMap((entry) => entry.items.map((entryItem) => entryItem.id))).toEqual(['unfinished', 'legacy-item']);
  });
});
