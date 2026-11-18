import React, { useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Check, ChevronDown, Circle, Plus, ShoppingBasket, Trash2 } from 'lucide-react-native';
import { Screen } from '@/components/common/Screen';
import { AppButton } from '@/components/common/AppButton';
import { StateView } from '@/components/common/StateView';
import { colors, radius } from '@/constants/theme';
import { useAuth } from '@/features/auth/AuthProvider';
import { useSpace } from '@/features/spaces/useSpace';
import { useShopping } from '@/features/spaces/useShopping';
import {
  addShoppingItem,
  archiveShoppingList,
  createShoppingList,
  deleteShoppingItem,
  setShoppingItemPurchased,
  updateShoppingItemActualPrice,
  type ShoppingCategory,
  type ShoppingItem,
} from '@/features/spaces/shopping';

const categories: ShoppingCategory[] = ['Produce', 'Dairy', 'Bakery', 'Pantry', 'Meat & Fish', 'Household', 'Personal care', 'Other'];
const money = (value: number | null) => value == null ? '—' : `৳${value.toLocaleString('en-BD', { maximumFractionDigits: 2 })}`;

export default function ShoppingScreen() {
  const { user } = useAuth();
  const { data: space } = useSpace(Boolean(user));
  const shopping = useShopping(space?.id);
  const lists = shopping.data ?? [];
  const [activeListId, setActiveListId] = useState<string | null>(null);
  const activeList = lists.find((list) => list.id === activeListId) ?? lists[0] ?? null;
  const [newListTitle, setNewListTitle] = useState('');
  const [showNewList, setShowNewList] = useState(false);
  const [itemName, setItemName] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [unit, setUnit] = useState('item');
  const [estimatedPrice, setEstimatedPrice] = useState('');
  const [category, setCategory] = useState<ShoppingCategory>('Other');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [editingPriceId, setEditingPriceId] = useState<string | null>(null);
  const [actualPrice, setActualPrice] = useState('');

  const pendingItems = useMemo(() => activeList?.items.filter((item) => !item.is_purchased) ?? [], [activeList]);
  const purchasedItems = useMemo(() => activeList?.items.filter((item) => item.is_purchased) ?? [], [activeList]);
  const estimatedTotal = useMemo(() => activeList?.items.reduce((sum, item) => sum + (item.estimated_price ?? 0), 0) ?? 0, [activeList]);
  const actualTotal = useMemo(() => activeList?.items.reduce((sum, item) => sum + (item.actual_price ?? 0), 0) ?? 0, [activeList]);

  const runAction = async (action: () => Promise<void>, success?: () => void) => {
    setBusy(true);
    setError('');
    try {
      await action();
      success?.();
      await shopping.refetch();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const handleCreateList = () => {
    if (!space?.id || newListTitle.trim().length < 1) return;
    void runAction(async () => {
      const id = await createShoppingList(space.id, newListTitle);
      setActiveListId(id);
    }, () => { setNewListTitle(''); setShowNewList(false); });
  };

  const handleAddItem = () => {
    if (!activeList || !itemName.trim()) return;
    const parsedQuantity = Number(quantity);
    const parsedPrice = estimatedPrice.trim() ? Number(estimatedPrice) : null;
    if (!Number.isFinite(parsedQuantity) || parsedQuantity <= 0) { setError('Enter a quantity greater than zero.'); return; }
    if (parsedPrice !== null && (!Number.isFinite(parsedPrice) || parsedPrice < 0)) { setError('Enter a valid estimated price.'); return; }
    void runAction(() => addShoppingItem({
      listId: activeList.id,
      name: itemName,
      quantity: parsedQuantity,
      unit,
      category,
      estimatedPrice: parsedPrice,
    }), () => { setItemName(''); setQuantity('1'); setUnit('item'); setEstimatedPrice(''); setCategory('Other'); });
  };

  const handleTogglePurchased = (item: ShoppingItem) => {
    void runAction(() => setShoppingItemPurchased(item.id, !item.is_purchased));
  };

  const handleSaveActualPrice = (item: ShoppingItem) => {
    const parsed = actualPrice.trim() ? Number(actualPrice) : null;
    if (parsed !== null && (!Number.isFinite(parsed) || parsed < 0)) { setError('Enter a valid actual price.'); return; }
    void runAction(() => updateShoppingItemActualPrice(item.id, parsed), () => setEditingPriceId(null));
  };

  const confirmDelete = (item: ShoppingItem) => Alert.alert('Remove item?', `Remove “${item.name}” from this list?`, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Remove', style: 'destructive', onPress: () => { void runAction(() => deleteShoppingItem(item.id)); } },
  ]);

  const confirmArchive = () => {
    if (!activeList) return;
    Alert.alert('Archive this list?', 'The list will be hidden from your active shopping lists.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Archive', style: 'destructive', onPress: () => { void runAction(() => archiveShoppingList(activeList.id), () => setActiveListId(null)); } },
    ]);
  };

  if (shopping.isLoading) return <Screen contentContainerStyle={styles.center}><StateView loading title="Loading shopping lists" description="Getting the latest shared list." /></Screen>;
  if (shopping.isError) return <Screen contentContainerStyle={styles.center}><StateView title="Shopping data could not be loaded" description={shopping.error.message} actionLabel="Try again" onAction={() => { void shopping.refetch(); }} /></Screen>;

  return <Screen contentContainerStyle={styles.content}>
    <View style={styles.headerRow}>
      <View style={styles.headerIcon}><ShoppingBasket color={colors.primaryPressed} size={22} /></View>
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>Shopping</Text>
        <Text style={styles.subtitle}>A shared list for everyday essentials</Text>
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel={showNewList ? 'Close new list form' : 'Create a shopping list'} hitSlop={8} onPress={() => setShowNewList((value) => !value)} style={styles.addListButton}>
        <Plus size={19} color="#FFFFFF" />
      </Pressable>
    </View>

    {showNewList ? <View style={styles.panel}>
      <Text style={styles.panelTitle}>Create a shopping list</Text>
      <TextInput value={newListTitle} onChangeText={setNewListTitle} placeholder="e.g. Weekly groceries" placeholderTextColor={colors.muted} style={styles.input} maxLength={80} />
      <View style={styles.inlineActions}>
        <AppButton title="Cancel" variant="text" onPress={() => setShowNewList(false)} />
        <AppButton title="Create list" onPress={handleCreateList} loading={busy} disabled={!newListTitle.trim()} />
      </View>
    </View> : null}

    {lists.length > 0 ? <>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.listChips}>
        {lists.map((list) => <Pressable key={list.id} onPress={() => setActiveListId(list.id)} style={[styles.listChip, activeList?.id === list.id && styles.listChipActive]}>
          <Text style={[styles.listChipText, activeList?.id === list.id && styles.listChipTextActive]}>{list.title}</Text>
        </Pressable>)}
      </ScrollView>
      {activeList ? <>
        <View style={styles.summaryCard}>
          <View style={styles.summaryTop}><View><Text style={styles.summaryTitle}>{activeList.title}</Text><Text style={styles.summaryMeta}>{pendingItems.length} remaining · {purchasedItems.length} purchased</Text></View>
            <Pressable onPress={confirmArchive} accessibilityRole="button" accessibilityLabel="Archive this list" hitSlop={8} style={styles.archiveButton}><ChevronDown size={17} color={colors.muted} /></Pressable>
          </View>
          <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${activeList.items.length ? (purchasedItems.length / activeList.items.length) * 100 : 0}%` }]} /></View>
          <View style={styles.totalRow}><View><Text style={styles.totalLabel}>Estimated total</Text><Text style={styles.totalValue}>{money(estimatedTotal)}</Text></View><View><Text style={styles.totalLabel}>Actual total</Text><Text style={styles.totalValue}>{money(actualTotal)}</Text></View></View>
        </View>

        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Add an item</Text>
          <TextInput value={itemName} onChangeText={setItemName} placeholder="What do you need?" placeholderTextColor={colors.muted} style={styles.input} maxLength={120} returnKeyType="done" />
          <View style={styles.fieldRow}>
            <TextInput value={quantity} onChangeText={setQuantity} keyboardType="decimal-pad" placeholder="Qty" placeholderTextColor={colors.muted} style={[styles.input, styles.quantityInput]} />
            <TextInput value={unit} onChangeText={setUnit} placeholder="Unit (kg, pack…)" placeholderTextColor={colors.muted} style={[styles.input, styles.unitInput]} maxLength={24} />
            <TextInput value={estimatedPrice} onChangeText={setEstimatedPrice} keyboardType="decimal-pad" placeholder="৳ Estimate" placeholderTextColor={colors.muted} style={[styles.input, styles.priceInput]} />
          </View>
          <Text style={styles.fieldLabel}>Category</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryChips}>
            {categories.map((value) => <Pressable key={value} onPress={() => setCategory(value)} style={[styles.categoryChip, category === value && styles.categoryChipActive]}><Text style={[styles.categoryText, category === value && styles.categoryTextActive]}>{value}</Text></Pressable>)}
          </ScrollView>
          <AppButton title="Add to list" onPress={handleAddItem} loading={busy} disabled={!itemName.trim()} />
        </View>

        <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>To buy</Text><Text style={styles.sectionCount}>{pendingItems.length}</Text></View>
        {pendingItems.length ? pendingItems.map((item) => <ShoppingItemRow key={item.id} item={item} onToggle={() => handleTogglePurchased(item)} onDelete={() => confirmDelete(item)} onEditPrice={() => { setEditingPriceId(item.id); setActualPrice(item.actual_price == null ? '' : String(item.actual_price)); }} />) : <View style={styles.emptyCard}><Check size={20} color={colors.success} /><Text style={styles.emptyTitle}>You're all caught up</Text><Text style={styles.muted}>Add something above when you need it.</Text></View>}

        {purchasedItems.length ? <>
          <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Purchased</Text><Text style={styles.sectionCount}>{purchasedItems.length}</Text></View>
          {purchasedItems.map((item) => <ShoppingItemRow key={item.id} item={item} onToggle={() => handleTogglePurchased(item)} onDelete={() => confirmDelete(item)} onEditPrice={() => { setEditingPriceId(item.id); setActualPrice(item.actual_price == null ? '' : String(item.actual_price)); }} />)}
        </> : null}
      </> : null}
    </> : <View style={styles.emptyState}>
      <View style={styles.emptyIcon}><ShoppingBasket size={27} color={colors.primaryPressed} /></View>
      <Text style={styles.emptyTitle}>Start your first list</Text>
      <Text style={styles.emptyCopy}>Create a shared shopping list and both members of your space can add items and mark purchases.</Text>
      <AppButton title="Create a shopping list" onPress={() => setShowNewList(true)} />
    </View>}

    {editingPriceId ? <View style={styles.priceEditor}>
      <Text style={styles.panelTitle}>Record actual price</Text>
      <TextInput value={actualPrice} onChangeText={setActualPrice} keyboardType="decimal-pad" placeholder="Actual price in ৳" placeholderTextColor={colors.muted} style={styles.input} />
      <View style={styles.inlineActions}><AppButton title="Cancel" variant="text" onPress={() => setEditingPriceId(null)} /><AppButton title="Save price" onPress={() => { const item = activeList?.items.find((entry) => entry.id === editingPriceId); if (item) handleSaveActualPrice(item); }} loading={busy} /></View>
    </View> : null}
    {error ? <Text style={styles.error}>{error}</Text> : null}
  </Screen>;
}

function ShoppingItemRow({ item, onToggle, onDelete, onEditPrice }: { item: ShoppingItem; onToggle: () => void; onDelete: () => void; onEditPrice: () => void }) {
  return <View style={[styles.itemCard, item.is_purchased && styles.itemPurchased]}>
    <Pressable accessibilityRole="checkbox" accessibilityLabel={`${item.name}, purchased`} accessibilityState={{ checked: item.is_purchased }} onPress={onToggle} style={styles.checkButton}>
      {item.is_purchased ? <View style={styles.checkedCircle}><Check size={13} color="#FFFFFF" /></View> : <Circle size={22} color={colors.muted} />}
    </Pressable>
    <View style={styles.itemMain}>
      <Text style={[styles.itemName, item.is_purchased && styles.itemNamePurchased]}>{item.name}</Text>
      <Text style={styles.itemMeta}>{item.quantity} {item.unit} · {item.category}</Text>
      <View style={styles.priceLine}><Text style={styles.itemPrice}>Est. {money(item.estimated_price)}</Text><Pressable accessibilityRole="button" accessibilityLabel={`Edit actual price for ${item.name}`} hitSlop={6} onPress={onEditPrice}><Text style={styles.actualPrice}>{item.actual_price == null ? 'Add actual price' : `Paid ${money(item.actual_price)}`}</Text></Pressable></View>
    </View>
    <Pressable accessibilityRole="button" accessibilityLabel={`Delete ${item.name}`} hitSlop={8} onPress={onDelete} style={styles.deleteButton}><Trash2 size={16} color={colors.muted} /></Pressable>
  </View>;
}

const styles = StyleSheet.create({
  content: { gap: 17, paddingBottom: 36 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerIcon: { width: 46, height: 46, borderRadius: 15, backgroundColor: colors.secondaryBackground, alignItems: 'center', justifyContent: 'center' },
  title: { color: colors.text, fontSize: 25, fontWeight: '800' },
  subtitle: { color: colors.muted, fontSize: 12, marginTop: 3 },
  addListButton: { width: 42, height: 42, borderRadius: 14, backgroundColor: colors.primaryPressed, alignItems: 'center', justifyContent: 'center' },
  panel: { backgroundColor: '#FFFFFF', borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: 16, gap: 12 },
  panelTitle: { color: colors.text, fontSize: 15, fontWeight: '800' },
  input: { minHeight: 48, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: '#FFFCFA', paddingHorizontal: 13, color: colors.text, fontSize: 13 },
  fieldRow: { flexDirection: 'row', gap: 7 },
  quantityInput: { width: 62, paddingHorizontal: 9 },
  unitInput: { flex: 1, minWidth: 80, paddingHorizontal: 9 },
  priceInput: { flex: 1, minWidth: 90, paddingHorizontal: 9 },
  fieldLabel: { color: colors.muted, fontSize: 11, fontWeight: '700' },
  categoryChips: { gap: 7, paddingBottom: 2 },
  categoryChip: { paddingHorizontal: 11, paddingVertical: 8, borderRadius: 999, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border },
  categoryChipActive: { backgroundColor: colors.secondaryBackground, borderColor: colors.primaryPressed },
  categoryText: { color: colors.muted, fontSize: 11, fontWeight: '600' },
  categoryTextActive: { color: colors.text },
  inlineActions: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 8 },
  listChips: { gap: 8 },
  listChip: { borderRadius: 999, borderWidth: 1, borderColor: colors.border, backgroundColor: '#FFFFFF', paddingHorizontal: 15, paddingVertical: 10 },
  listChipActive: { backgroundColor: colors.secondaryBackground, borderColor: colors.primaryPressed },
  listChipText: { color: colors.muted, fontSize: 12, fontWeight: '700' },
  listChipTextActive: { color: colors.text },
  summaryCard: { backgroundColor: colors.secondaryBackground, borderRadius: radius.md, padding: 17, gap: 13 },
  summaryTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  summaryTitle: { color: colors.text, fontSize: 17, fontWeight: '800' },
  summaryMeta: { color: colors.muted, fontSize: 11, marginTop: 4 },
  archiveButton: { width: 34, height: 34, borderRadius: 11, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  progressTrack: { height: 7, backgroundColor: '#FFFFFF', borderRadius: 99, overflow: 'hidden' },
  progressFill: { height: 7, borderRadius: 99, backgroundColor: colors.accent },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between' },
  totalLabel: { color: colors.muted, fontSize: 10, fontWeight: '600' },
  totalValue: { color: colors.text, fontSize: 16, fontWeight: '800', marginTop: 3 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 3 },
  sectionTitle: { color: colors.text, fontSize: 15, fontWeight: '800' },
  sectionCount: { color: colors.muted, fontSize: 11, fontWeight: '700', backgroundColor: colors.secondaryBackground, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 99 },
  itemCard: { flexDirection: 'row', alignItems: 'center', gap: 11, backgroundColor: '#FFFFFF', borderRadius: 15, borderWidth: 1, borderColor: colors.border, padding: 13 },
  itemPurchased: { opacity: 0.76 },
  checkButton: { width: 28, height: 32, alignItems: 'center', justifyContent: 'center' },
  checkedCircle: { width: 22, height: 22, borderRadius: 11, backgroundColor: colors.success, alignItems: 'center', justifyContent: 'center' },
  itemMain: { flex: 1, gap: 4 },
  itemName: { color: colors.text, fontSize: 13, fontWeight: '700' },
  itemNamePurchased: { textDecorationLine: 'line-through', color: colors.muted },
  itemMeta: { color: colors.muted, fontSize: 10 },
  priceLine: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 2 },
  itemPrice: { color: colors.muted, fontSize: 10 },
  actualPrice: { color: colors.primaryPressed, fontSize: 10, fontWeight: '700' },
  deleteButton: { padding: 7 },
  emptyCard: { alignItems: 'center', gap: 7, backgroundColor: '#FFFFFF', borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: 22 },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF', borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: 24, gap: 12, minHeight: 300 },
  emptyIcon: { width: 60, height: 60, borderRadius: 20, backgroundColor: colors.secondaryBackground, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { color: colors.text, fontSize: 16, fontWeight: '800' },
  emptyCopy: { color: colors.muted, fontSize: 12, lineHeight: 18, textAlign: 'center', marginBottom: 4 },
  muted: { color: colors.muted, fontSize: 12 },
  priceEditor: { backgroundColor: colors.secondaryBackground, borderRadius: radius.md, padding: 15, gap: 10 },
  error: { color: colors.danger, fontSize: 12, lineHeight: 18 },
});
