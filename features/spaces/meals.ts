import { supabase } from '@/lib/supabase';
import type { ShoppingCategory } from './shopping';

export type MealType = 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack';
export type MealIngredient = {
  id: string; meal_id: string; name: string; quantity: number; unit: string;
  category: ShoppingCategory; shopping_item_id: string | null; created_by: string; created_at: string;
};
export type Meal = {
  id: string; space_id: string; planned_date: string; meal_type: MealType;
  title: string; description: string | null; created_by: string; created_at: string;
  updated_at: string; ingredients: MealIngredient[];
};

export async function getMeals(spaceId: string, fromDate: string, toDate: string): Promise<Meal[]> {
  const { data, error } = await supabase.from('meals').select('*, meal_ingredients(*)')
    .eq('space_id', spaceId).gte('planned_date', fromDate).lte('planned_date', toDate)
    .order('planned_date').order('created_at');
  if (error) throw error;
  return (data ?? []).map((row: any) => ({
    ...row,
    ingredients: [...(row.meal_ingredients ?? [])].sort((a: MealIngredient, b: MealIngredient) => a.created_at.localeCompare(b.created_at)),
  })) as Meal[];
}

export async function createMeal(input: { spaceId: string; date: string; type: MealType; title: string; description: string }) {
  const { error } = await supabase.from('meals').insert({
    space_id: input.spaceId, planned_date: input.date, meal_type: input.type,
    title: input.title.trim(), description: input.description.trim() || null,
  });
  if (error) throw error;
}

export async function addMealIngredient(input: { mealId: string; name: string; quantity: number; unit: string; category: ShoppingCategory }) {
  const { error } = await supabase.from('meal_ingredients').insert({
    meal_id: input.mealId, name: input.name.trim(), quantity: input.quantity,
    unit: input.unit.trim() || 'item', category: input.category,
  });
  if (error) throw error;
}

export async function deleteMeal(mealId: string) {
  const { error } = await supabase.from('meals').delete().eq('id', mealId);
  if (error) throw error;
}
export async function deleteMealIngredient(ingredientId: string) {
  const { error } = await supabase.from('meal_ingredients').delete().eq('id', ingredientId);
  if (error) throw error;
}
export async function addIngredientsToShoppingList(mealId: string, listId: string): Promise<number> {
  const { data, error } = await supabase.rpc('add_meal_ingredients_to_shopping_list', {
    p_meal_id: mealId, p_list_id: listId,
  });
  if (error) throw error;
  return Number(data ?? 0);
}
