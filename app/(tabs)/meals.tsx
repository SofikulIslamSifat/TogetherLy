import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { ChevronLeft, ChevronRight, Plus, Trash2, Utensils } from 'lucide-react-native';
import { Screen } from '@/components/common/Screen';
import { AppButton } from '@/components/common/AppButton';
import { colors, radius } from '@/constants/theme';
import { useAuth } from '@/features/auth/AuthProvider';
import { useSpace } from '@/features/spaces/useSpace';
import { useMeals } from '@/features/spaces/useMeals';
import { useShopping } from '@/features/spaces/useShopping';
import { addIngredientsToShoppingList, addMealIngredient, createMeal, deleteMeal, deleteMealIngredient, type Meal, type MealType } from '@/features/spaces/meals';
import type { ShoppingCategory } from '@/features/spaces/shopping';

const mealTypes: MealType[] = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];
const categories: ShoppingCategory[] = ['Produce', 'Dairy', 'Bakery', 'Pantry', 'Meat & Fish', 'Household', 'Personal care', 'Other'];
const dateKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const shiftDate = (date: Date, days: number) => { const next = new Date(date); next.setDate(next.getDate() + days); return next; };
const weekStart = (date: Date) => { const start = new Date(date); start.setHours(0, 0, 0, 0); start.setDate(start.getDate() - ((start.getDay() + 6) % 7)); return start; };
const prettyDate = (date: Date) => date.toLocaleDateString('en-BD', { weekday: 'long', day: 'numeric', month: 'short' });

export default function MealsScreen() {
  const { user } = useAuth();
  const { data: space } = useSpace(Boolean(user));
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const start = weekStart(selectedDate);
  const end = shiftDate(start, 6);
  const mealsQuery = useMeals(space?.id, dateKey(start), dateKey(end));
  const shopping = useShopping(space?.id);
  const lists = shopping.data ?? [];
  const [activeListId, setActiveListId] = useState<string | null>(null);
  const activeList = lists.find((list) => list.id === activeListId) ?? lists[0] ?? null;
  const [showMealForm, setShowMealForm] = useState(false);
  const [mealType, setMealType] = useState<MealType>('Dinner');
  const [mealTitle, setMealTitle] = useState('');
  const [mealDescription, setMealDescription] = useState('');
  const [ingredientMealId, setIngredientMealId] = useState<string | null>(null);
  const [ingredientName, setIngredientName] = useState('');
  const [ingredientQuantity, setIngredientQuantity] = useState('1');
  const [ingredientUnit, setIngredientUnit] = useState('item');
  const [ingredientCategory, setIngredientCategory] = useState<ShoppingCategory>('Other');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const meals = mealsQuery.data ?? [];
  const selectedMeals = useMemo(() => meals.filter((meal) => meal.planned_date === dateKey(selectedDate)), [meals, selectedDate]);
  const runAction = async (action: () => Promise<unknown>, after?: () => void) => {
    setBusy(true); setError('');
    try { await action(); after?.(); await mealsQuery.refetch(); await shopping.refetch(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Something went wrong. Please try again.'); }
    finally { setBusy(false); }
  };
  const handleCreateMeal = () => {
    if (!space?.id || !mealTitle.trim()) { setError('Enter a meal name first.'); return; }
    void runAction(() => createMeal({ spaceId: space.id, date: dateKey(selectedDate), type: mealType, title: mealTitle, description: mealDescription }), () => {
      setMealTitle(''); setMealDescription(''); setShowMealForm(false);
    });
  };
  const handleAddIngredient = (mealId: string) => {
    const qty = Number(ingredientQuantity);
    if (!ingredientName.trim()) { setError('Enter an ingredient name.'); return; }
    if (!Number.isFinite(qty) || qty <= 0) { setError('Enter a quantity greater than zero.'); return; }
    void runAction(() => addMealIngredient({ mealId, name: ingredientName, quantity: qty, unit: ingredientUnit, category: ingredientCategory }), () => {
      setIngredientName(''); setIngredientQuantity('1'); setIngredientUnit('item'); setIngredientCategory('Other'); setIngredientMealId(null);
    });
  };
  const handleTransfer = (meal: Meal) => {
    if (!activeList) { setError('Create an active shopping list in Shopping before transferring ingredients.'); return; }
    const pending = meal.ingredients.filter((item) => !item.shopping_item_id).length;
    if (!pending) { setError('All ingredients from this meal have already been added to a shopping list.'); return; }
    void runAction(async () => {
      const count = await addIngredientsToShoppingList(meal.id, activeList.id);
      Alert.alert('Shopping list updated', `${count} ingredient${count === 1 ? '' : 's'} added to “${activeList.title}”.`);
    });
  };
  const confirmDeleteMeal = (meal: Meal) => Alert.alert('Delete meal?', `Remove “${meal.title}” and its ingredients?`, [
    { text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: () => { void runAction(() => deleteMeal(meal.id)); } },
  ]);

  if (mealsQuery.isLoading) return <Screen contentContainerStyle={styles.center}><ActivityIndicator color={colors.primaryPressed} /><Text style={styles.muted}>Loading your shared meal plan…</Text></Screen>;

  return <Screen contentContainerStyle={styles.content}>
    <View style={styles.header}><View><Text style={styles.title}>Meal planner</Text><Text style={styles.subtitle}>Plan the week together</Text></View><View style={styles.headerIcon}><Utensils color={colors.primaryPressed} size={22} /></View></View>

    <View style={styles.weekCard}>
      <View style={styles.weekNav}><Pressable onPress={() => setSelectedDate(shiftDate(selectedDate, -7))} style={styles.navButton}><ChevronLeft color={colors.text} size={20} /></Pressable><Text style={styles.weekLabel}>{start.toLocaleDateString('en-BD', { month: 'short', day: 'numeric' })} – {end.toLocaleDateString('en-BD', { month: 'short', day: 'numeric' })}</Text><Pressable onPress={() => setSelectedDate(shiftDate(selectedDate, 7))} style={styles.navButton}><ChevronRight color={colors.text} size={20} /></Pressable></View>
      <View style={styles.days}>{Array.from({ length: 7 }, (_, index) => shiftDate(start, index)).map((day) => {
        const selected = dateKey(day) === dateKey(selectedDate);
        const hasMeals = meals.some((meal) => meal.planned_date === dateKey(day));
        return <Pressable key={dateKey(day)} onPress={() => setSelectedDate(day)} style={[styles.day, selected && styles.daySelected]}><Text style={[styles.dayName, selected && styles.dayTextSelected]}>{day.toLocaleDateString('en', { weekday: 'short' })}</Text><Text style={[styles.dayNumber, selected && styles.dayTextSelected]}>{day.getDate()}</Text><View style={[styles.dayDot, hasMeals && !selected && styles.dayDotActive, selected && styles.dayDotSelected]} /></Pressable>;
      })}</View>
    </View>

    <View style={styles.sectionHeading}><View><Text style={styles.sectionTitle}>{prettyDate(selectedDate)}</Text><Text style={styles.muted}>{selectedMeals.length} planned meal{selectedMeals.length === 1 ? '' : 's'}</Text></View><Pressable onPress={() => setShowMealForm((value) => !value)} style={styles.addButton}><Plus size={17} color="#FFFFFF" /><Text style={styles.addButtonText}>Add meal</Text></Pressable></View>

    {showMealForm && <View style={styles.formCard}>
      <Text style={styles.formTitle}>New meal</Text>
      <View style={styles.chips}>{mealTypes.map((type) => <Pressable key={type} onPress={() => setMealType(type)} style={[styles.chip, mealType === type && styles.chipSelected]}><Text style={[styles.chipText, mealType === type && styles.chipTextSelected]}>{type}</Text></Pressable>)}</View>
      <TextInput value={mealTitle} onChangeText={setMealTitle} placeholder="Meal name (e.g. Chicken khichuri)" placeholderTextColor={colors.muted} style={styles.input} />
      <TextInput value={mealDescription} onChangeText={setMealDescription} placeholder="Notes or recipe description (optional)" placeholderTextColor={colors.muted} style={[styles.input, styles.multiline]} multiline />
      <View style={styles.formActions}><Pressable onPress={() => setShowMealForm(false)}><Text style={styles.cancelText}>Cancel</Text></Pressable><AppButton title="Save meal" onPress={handleCreateMeal} loading={busy} /></View>
    </View>}

    {selectedMeals.length === 0 && <View style={styles.empty}><Utensils color={colors.primaryPressed} size={25} /><Text style={styles.emptyTitle}>Nothing planned yet</Text><Text style={styles.muted}>Add breakfast, lunch, dinner, or a snack for this day.</Text></View>}

    {mealTypes.map((type) => {
      const group = selectedMeals.filter((meal) => meal.meal_type === type);
      if (!group.length) return null;
      return <View key={type} style={styles.mealGroup}><Text style={styles.groupTitle}>{type}</Text>{group.map((meal) => <View key={meal.id} style={styles.mealCard}>
        <View style={styles.mealTop}><View style={styles.mealTitleWrap}><Text style={styles.mealTitle}>{meal.title}</Text>{meal.description ? <Text style={styles.mealDescription}>{meal.description}</Text> : null}</View><Pressable onPress={() => confirmDeleteMeal(meal)} hitSlop={8}><Trash2 size={17} color={colors.muted} /></Pressable></View>
        <View style={styles.ingredientHeading}><Text style={styles.ingredientHeadingText}>Ingredients ({meal.ingredients.length})</Text><Pressable onPress={() => setIngredientMealId(ingredientMealId === meal.id ? null : meal.id)}><Text style={styles.linkText}>{ingredientMealId === meal.id ? 'Close' : '+ Add ingredient'}</Text></Pressable></View>
        {meal.ingredients.map((ingredient) => <View key={ingredient.id} style={styles.ingredientRow}><View style={styles.ingredientInfo}><Text style={styles.ingredientName}>{ingredient.name}</Text><Text style={styles.ingredientMeta}>{ingredient.quantity} {ingredient.unit} · {ingredient.category}</Text></View><View style={styles.ingredientActions}>{ingredient.shopping_item_id ? <Text style={styles.addedTag}>In list</Text> : null}<Pressable onPress={() => Alert.alert('Remove ingredient?', `Remove ${ingredient.name}?`, [{ text: 'Cancel', style: 'cancel' }, { text: 'Remove', style: 'destructive', onPress: () => { void runAction(() => deleteMealIngredient(ingredient.id)); } }])} hitSlop={8}><Trash2 size={15} color={colors.muted} /></Pressable></View></View>)}
        {ingredientMealId === meal.id && <View style={styles.ingredientForm}><TextInput value={ingredientName} onChangeText={setIngredientName} placeholder="Ingredient name" placeholderTextColor={colors.muted} style={styles.input} /><View style={styles.inlineInputs}><TextInput value={ingredientQuantity} onChangeText={setIngredientQuantity} keyboardType="decimal-pad" placeholder="Qty" placeholderTextColor={colors.muted} style={[styles.input, styles.qtyInput]} /><TextInput value={ingredientUnit} onChangeText={setIngredientUnit} placeholder="Unit" placeholderTextColor={colors.muted} style={[styles.input, styles.unitInput]} /></View><View style={styles.chips}>{categories.map((item) => <Pressable key={item} onPress={() => setIngredientCategory(item)} style={[styles.chip, ingredientCategory === item && styles.chipSelected]}><Text style={[styles.chipText, ingredientCategory === item && styles.chipTextSelected]}>{item}</Text></Pressable>)}</View><AppButton title="Save ingredient" onPress={() => handleAddIngredient(meal.id)} loading={busy} /></View>}
        {meal.ingredients.length > 0 && <View style={styles.transferRow}><Text style={styles.transferHint}>{meal.ingredients.filter((item) => !item.shopping_item_id).length} not yet in shopping list</Text><Pressable onPress={() => handleTransfer(meal)} style={styles.transferButton}><Text style={styles.transferText}>Add to shopping</Text></Pressable></View>}
      </View>)}</View>;
    })}

    {lists.length > 0 && <View style={styles.listPicker}><Text style={styles.listPickerTitle}>Ingredient destination</Text><Text style={styles.muted}>Choose the active shared list for meal ingredients.</Text><View style={styles.chips}>{lists.map((list) => <Pressable key={list.id} onPress={() => setActiveListId(list.id)} style={[styles.chip, activeList?.id === list.id && styles.chipSelected]}><Text style={[styles.chipText, activeList?.id === list.id && styles.chipTextSelected]}>{list.title}</Text></Pressable>)}</View></View>}
    {lists.length === 0 && <Text style={styles.listNote}>To send ingredients to a shopping list, create one in the Shopping tab first.</Text>}
    {error ? <Text style={styles.error}>{error}</Text> : null}
    {busy && <Text style={styles.muted}>Saving changes…</Text>}
  </Screen>;
}

const styles = StyleSheet.create({
  content: { gap: 18, paddingBottom: 40 }, center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, title: { fontSize: 27, fontWeight: '800', color: colors.text }, subtitle: { color: colors.muted, marginTop: 3 }, headerIcon: { width: 44, height: 44, borderRadius: 15, backgroundColor: colors.secondaryBackground, alignItems: 'center', justifyContent: 'center' },
  weekCard: { backgroundColor: colors.card, borderRadius: radius.lg, padding: 14, borderWidth: 1, borderColor: colors.border, gap: 14 }, weekNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, navButton: { padding: 6 }, weekLabel: { color: colors.text, fontWeight: '700' }, days: { flexDirection: 'row', justifyContent: 'space-between' }, day: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 13, gap: 5 }, daySelected: { backgroundColor: colors.primaryPressed }, dayName: { color: colors.muted, fontSize: 11, fontWeight: '600' }, dayNumber: { color: colors.text, fontSize: 15, fontWeight: '800' }, dayTextSelected: { color: '#FFFFFF' }, dayDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: 'transparent' }, dayDotActive: { backgroundColor: colors.primaryPressed }, dayDotSelected: { backgroundColor: '#FFFFFF' },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, sectionTitle: { color: colors.text, fontSize: 18, fontWeight: '800' }, muted: { color: colors.muted, fontSize: 12, lineHeight: 18 }, addButton: { backgroundColor: colors.primaryPressed, borderRadius: radius.pill, paddingHorizontal: 13, paddingVertical: 9, flexDirection: 'row', alignItems: 'center', gap: 5 }, addButtonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 12 },
  formCard: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: 15, gap: 12 }, formTitle: { color: colors.text, fontWeight: '800', fontSize: 16 }, input: { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 11, color: colors.text, fontSize: 13 }, multiline: { minHeight: 68, textAlignVertical: 'top' }, chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 }, chip: { paddingHorizontal: 11, paddingVertical: 7, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: '#FFFFFF' }, chipSelected: { backgroundColor: colors.secondaryBackground, borderColor: colors.primary }, chipText: { color: colors.muted, fontSize: 11, fontWeight: '600' }, chipTextSelected: { color: colors.text }, formActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, cancelText: { color: colors.muted, fontWeight: '600' },
  empty: { alignItems: 'center', padding: 26, gap: 8, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg }, emptyTitle: { color: colors.text, fontWeight: '800', fontSize: 15 }, mealGroup: { gap: 9 }, groupTitle: { color: colors.text, fontSize: 15, fontWeight: '800' }, mealCard: { backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: 14, gap: 11 }, mealTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }, mealTitleWrap: { flex: 1, gap: 4 }, mealTitle: { color: colors.text, fontSize: 15, fontWeight: '800' }, mealDescription: { color: colors.muted, fontSize: 12, lineHeight: 17 }, ingredientHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, ingredientHeadingText: { color: colors.text, fontWeight: '700', fontSize: 12 }, linkText: { color: colors.primaryPressed, fontWeight: '700', fontSize: 12 }, ingredientRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 7, borderTopWidth: 1, borderTopColor: colors.border }, ingredientInfo: { flex: 1, gap: 2 }, ingredientName: { color: colors.text, fontWeight: '600', fontSize: 13 }, ingredientMeta: { color: colors.muted, fontSize: 11 }, ingredientActions: { flexDirection: 'row', alignItems: 'center', gap: 10 }, addedTag: { color: colors.success, fontSize: 10, fontWeight: '700' }, ingredientForm: { backgroundColor: colors.background, padding: 10, borderRadius: 13, gap: 9 }, inlineInputs: { flexDirection: 'row', gap: 8 }, qtyInput: { flex: 1 }, unitInput: { flex: 2 }, transferRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 10 }, transferHint: { color: colors.muted, fontSize: 11 }, transferButton: { backgroundColor: colors.secondaryBackground, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 8 }, transferText: { color: colors.text, fontWeight: '700', fontSize: 11 }, listPicker: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: 14, gap: 9 }, listPickerTitle: { color: colors.text, fontWeight: '800', fontSize: 14 }, listNote: { color: colors.muted, fontSize: 12 }, error: { color: colors.danger, fontSize: 12, lineHeight: 17 },
});
