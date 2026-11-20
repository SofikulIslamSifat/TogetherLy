import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { CalendarDays, ChevronLeft, ChevronRight, Plus, Trash2 } from 'lucide-react-native';
import { AppButton } from '@/components/common/AppButton';
import { Screen } from '@/components/common/Screen';
import { colors, radius } from '@/constants/theme';
import { useAuth } from '@/features/auth/AuthProvider';
import { useSpace } from '@/features/spaces/useSpace';
import { useCalendar } from '@/features/spaces/useCalendar';
import {
  createCalendarEvent,
  deleteCalendarEvent,
  getCalendarDateKey,
  getCalendarGridDates,
  isValidCalendarDate,
  type CalendarEventType,
  type CalendarItem,
} from '@/features/spaces/calendar';
import { useIsDesktop } from '@/lib/responsive';

const eventTypes: CalendarEventType[] = ['plan', 'important_date'];
const typeLabel = (type: CalendarEventType) => type === 'plan' ? 'Plan' : 'Important date';
const itemColor = (item: CalendarItem) => item.kind === 'meal'
  ? colors.accent
  : item.kind === 'task' ? colors.primaryPressed
    : item.kind === 'plan' ? '#7A91C2' : '#D58A48';

function monthLabel(date: Date) {
  return date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

function prettyDate(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function CalendarScreen() {
  const { user } = useAuth();
  const isDesktop = useIsDesktop();
  const { data: space } = useSpace(Boolean(user));
  const [selectedDate, setSelectedDate] = useState(() => getCalendarDateKey(new Date()));
  const [month, setMonth] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [eventDate, setEventDate] = useState(() => getCalendarDateKey(new Date()));
  const [eventType, setEventType] = useState<CalendarEventType>('plan');
  const [repeatsYearly, setRepeatsYearly] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const fromDate = getCalendarDateKey(new Date(month.getFullYear(), month.getMonth(), 1));
  const toDate = getCalendarDateKey(new Date(month.getFullYear(), month.getMonth() + 1, 0));
  const calendarQuery = useCalendar(space?.id, fromDate, toDate);
  const items = calendarQuery.data ?? [];
  const gridDates = useMemo(() => getCalendarGridDates(month), [month]);
  const selectedItems = items.filter((item) => item.date === selectedDate);

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setEventDate(selectedDate);
    setEventType('plan');
    setRepeatsYearly(false);
    setShowForm(false);
    setError('');
  };

  const saveEvent = async () => {
    if (!space?.id) return;
    if (!title.trim()) { setError('Enter an event name.'); return; }
    if (!isValidCalendarDate(eventDate)) { setError('Enter a valid date in YYYY-MM-DD format.'); return; }
    setBusy(true);
    setError('');
    try {
      await createCalendarEvent({
        spaceId: space.id,
        title,
        description,
        date: eventDate,
        type: eventType,
        repeatsYearly,
      });
      resetForm();
      await calendarQuery.refetch();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not save this event.');
    } finally {
      setBusy(false);
    }
  };

  const removeEvent = (item: CalendarItem) => {
    Alert.alert('Delete calendar event?', `Remove “${item.title}” from the shared calendar?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          setBusy(true);
          setError('');
          void deleteCalendarEvent(item.entityId)
            .then(() => calendarQuery.refetch())
            .catch((deleteError: unknown) => setError(deleteError instanceof Error ? deleteError.message : 'Could not delete this event.'))
            .finally(() => setBusy(false));
        },
      },
    ]);
  };

  const selectDate = (date: string) => {
    setSelectedDate(date);
    const parsedDate = new Date(`${date}T00:00:00`);
    if (parsedDate.getMonth() !== month.getMonth() || parsedDate.getFullYear() !== month.getFullYear()) {
      setMonth(new Date(parsedDate.getFullYear(), parsedDate.getMonth(), 1));
    }
  };

  const changeMonth = (amount: number) => {
    const next = new Date(month.getFullYear(), month.getMonth() + amount, 1);
    setMonth(next);
    setSelectedDate(getCalendarDateKey(next));
  };

  if (calendarQuery.isLoading) {
    return <Screen contentContainerStyle={styles.center}><ActivityIndicator color={colors.primaryPressed} /><Text style={styles.muted}>Loading your shared calendar…</Text></Screen>;
  }

  if (calendarQuery.isError) {
    return <Screen contentContainerStyle={styles.center}>
      <Text style={styles.title}>Calendar could not be loaded</Text>
      <Text style={styles.muted}>{calendarQuery.error.message}</Text>
      <AppButton title="Try again" onPress={() => { void calendarQuery.refetch(); }} />
    </Screen>;
  }

  return (
    <Screen contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View style={styles.headingCopy}>
          <Text style={styles.title}>Shared calendar</Text>
          <Text style={styles.subtitle}>Meals, plans, and important dates together</Text>
        </View>
        <View style={styles.headerIcon}><CalendarDays size={22} color={colors.primaryPressed} /></View>
      </View>

      <View style={[styles.calendarCard, isDesktop && styles.calendarCardDesktop]}>
        <View style={styles.monthNavigation}>
          <Pressable accessibilityRole="button" accessibilityLabel="Previous month" onPress={() => changeMonth(-1)} style={styles.navButton}>
            <ChevronLeft size={20} color={colors.text} />
          </Pressable>
          <Text style={styles.monthTitle}>{monthLabel(month)}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Next month" onPress={() => changeMonth(1)} style={styles.navButton}>
            <ChevronRight size={20} color={colors.text} />
          </Pressable>
        </View>
        <View style={styles.weekdays}>
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => <Text key={day} style={styles.weekday}>{day}</Text>)}
        </View>
        <View style={styles.grid}>
          {gridDates.map((date) => {
            const parsedDate = new Date(`${date}T00:00:00`);
            const inMonth = parsedDate.getMonth() === month.getMonth();
            const selected = date === selectedDate;
            const today = date === getCalendarDateKey(new Date());
            const dayItems = items.filter((item) => item.date === date);
            return (
              <Pressable
                key={date}
                accessibilityRole="button"
                accessibilityLabel={`${prettyDate(date)}${dayItems.length ? `, ${dayItems.length} events` : ''}`}
                accessibilityState={{ selected }}
                onPress={() => selectDate(date)}
                style={[styles.dayCell, selected && styles.daySelected, !inMonth && styles.dayOutside]}
              >
                <Text style={[styles.dayNumber, selected && styles.dayTextSelected, today && !selected && styles.dayToday]}>{parsedDate.getDate()}</Text>
                <View style={styles.dots}>
                  {dayItems.slice(0, 3).map((item) => <View key={item.id} style={[styles.dot, { backgroundColor: selected ? '#FFFFFF' : itemColor(item) }]} />)}
                  {dayItems.length > 3 ? <Text style={[styles.moreEvents, selected && styles.dayTextSelected]}>+</Text> : null}
                </View>
              </Pressable>
            );
          })}
        </View>
        <Pressable accessibilityRole="button" onPress={() => selectDate(getCalendarDateKey(new Date()))} style={styles.todayButton}>
          <Text style={styles.todayText}>Today</Text>
        </Pressable>
      </View>

      <View style={styles.legend}>
        {[
          { label: 'Meals', color: colors.accent },
          { label: 'Tasks', color: colors.primaryPressed },
          { label: 'Plans', color: '#7A91C2' },
          { label: 'Important dates', color: '#D58A48' },
        ].map((entry) => <View key={entry.label} style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: entry.color }]} /><Text style={styles.legendText}>{entry.label}</Text></View>)}
      </View>

      <View style={styles.sectionHeading}>
        <View style={styles.selectedDayCopy}>
          <Text style={styles.sectionTitle}>{prettyDate(selectedDate)}</Text>
          <Text style={styles.muted}>{selectedItems.length} shared item{selectedItems.length === 1 ? '' : 's'}</Text>
        </View>
        <Pressable accessibilityRole="button" onPress={() => { setEventDate(selectedDate); setShowForm((value) => !value); setError(''); }} style={styles.addButton}>
          <Plus size={17} color="#FFFFFF" /><Text style={styles.addButtonText}>{showForm ? 'Close' : 'Add event'}</Text>
        </Pressable>
      </View>

      {showForm ? (
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>Add a shared event</Text>
          <View style={styles.chips}>
            {eventTypes.map((type) => (
              <Pressable key={type} onPress={() => { setEventType(type); if (type !== 'important_date') setRepeatsYearly(false); }} style={[styles.chip, eventType === type && styles.chipSelected]}>
                <Text style={[styles.chipText, eventType === type && styles.chipTextSelected]}>{typeLabel(type)}</Text>
              </Pressable>
            ))}
          </View>
          <TextInput value={title} onChangeText={setTitle} placeholder="Event name" placeholderTextColor={colors.muted} style={styles.input} maxLength={120} />
          <TextInput value={eventDate} onChangeText={setEventDate} placeholder="YYYY-MM-DD" placeholderTextColor={colors.muted} style={styles.input} maxLength={10} />
          <TextInput value={description} onChangeText={setDescription} placeholder="Notes (optional)" placeholderTextColor={colors.muted} style={[styles.input, styles.multiline]} multiline maxLength={500} />
          {eventType === 'important_date' ? (
            <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: repeatsYearly }} onPress={() => setRepeatsYearly((value) => !value)} style={styles.repeatOption}>
              <View style={[styles.checkbox, repeatsYearly && styles.checkboxSelected]} />
              <Text style={styles.repeatLabel}>Repeat every year</Text>
            </Pressable>
          ) : null}
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <View style={styles.formActions}>
            <AppButton title="Cancel" variant="text" onPress={resetForm} />
            <View style={styles.saveButton}><AppButton title="Save event" onPress={() => { void saveEvent(); }} loading={busy} disabled={!title.trim()} /></View>
          </View>
        </View>
      ) : null}

      {selectedItems.length ? (
        <View style={styles.eventList}>
          {selectedItems.map((item) => (
            <View key={item.id} style={styles.eventCard}>
              <View style={[styles.eventAccent, { backgroundColor: itemColor(item) }]} />
              <View style={styles.eventCopy}>
                <Text style={styles.eventDetail}>{item.detail}</Text>
                <Text style={[styles.eventTitle, item.completed && styles.eventCompleted]}>{item.title}</Text>
                {item.description ? <Text style={styles.eventDescription}>{item.description}</Text> : null}
              </View>
              {item.kind === 'plan' || item.kind === 'important_date'
                ? <Pressable accessibilityRole="button" accessibilityLabel={`Delete ${item.title}`} onPress={() => removeEvent(item)} hitSlop={8} style={styles.deleteButton}><Trash2 size={17} color={colors.muted} /></Pressable>
                : null}
            </View>
          ))}
        </View>
      ) : (
        <View style={styles.emptyCard}>
          <CalendarDays size={24} color={colors.primaryPressed} />
          <Text style={styles.emptyTitle}>Nothing planned for this day</Text>
          <Text style={styles.muted}>Add a plan or important date, or schedule a meal or task for this date.</Text>
        </View>
      )}
      {error && !showForm ? <Text style={styles.error}>{error}</Text> : null}
      {busy ? <Text style={styles.muted}>Saving changes…</Text> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: 18, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  headingCopy: { flex: 1 },
  title: { color: colors.text, fontSize: 27, fontWeight: '800' },
  subtitle: { color: colors.muted, fontSize: 13, marginTop: 3 },
  headerIcon: { width: 44, height: 44, borderRadius: 15, backgroundColor: colors.secondaryBackground, alignItems: 'center', justifyContent: 'center' },
  calendarCard: { backgroundColor: colors.card, borderRadius: radius.lg, padding: 14, borderWidth: 1, borderColor: colors.border, gap: 12 },
  calendarCardDesktop: { maxWidth: 720, width: '100%', alignSelf: 'center' },
  monthNavigation: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  monthTitle: { color: colors.text, fontSize: 17, fontWeight: '800' },
  navButton: { width: 38, height: 38, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.subtle },
  weekdays: { flexDirection: 'row' },
  weekday: { flex: 1, color: colors.muted, textAlign: 'center', fontSize: 11, fontWeight: '700' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: { width: `${100 / 7}%`, minHeight: 48, alignItems: 'center', justifyContent: 'center', gap: 3, borderRadius: 12, paddingVertical: 5 },
  daySelected: { backgroundColor: colors.primaryPressed },
  dayOutside: { opacity: 0.4 },
  dayNumber: { color: colors.text, fontSize: 13, fontWeight: '700' },
  dayToday: { color: colors.primaryPressed, textDecorationLine: 'underline' },
  dayTextSelected: { color: '#FFFFFF' },
  dots: { height: 7, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 2 },
  dot: { width: 4, height: 4, borderRadius: 2 },
  moreEvents: { color: colors.muted, fontSize: 8, lineHeight: 8, fontWeight: '800' },
  todayButton: { alignSelf: 'center', paddingHorizontal: 13, paddingVertical: 6, backgroundColor: colors.secondaryBackground, borderRadius: radius.pill },
  todayText: { color: colors.primaryPressed, fontSize: 11, fontWeight: '700' },
  legend: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', columnGap: 14, rowGap: 7 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 7, height: 7, borderRadius: 4 },
  legendText: { color: colors.muted, fontSize: 10 },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  selectedDayCopy: { flex: 1, gap: 3 },
  sectionTitle: { color: colors.text, fontSize: 17, fontWeight: '800' },
  muted: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  addButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 9, paddingHorizontal: 13, backgroundColor: colors.primaryPressed, borderRadius: radius.pill },
  addButtonText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  formCard: { backgroundColor: colors.card, borderRadius: radius.md, padding: 16, borderWidth: 1, borderColor: colors.border, gap: 12 },
  formTitle: { color: colors.text, fontSize: 16, fontWeight: '800' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: radius.pill, backgroundColor: colors.subtle, borderWidth: 1, borderColor: colors.border },
  chipSelected: { backgroundColor: colors.secondaryBackground, borderColor: '#E8C3CC' },
  chipText: { color: colors.muted, fontSize: 12, fontWeight: '600' },
  chipTextSelected: { color: colors.primaryPressed, fontWeight: '800' },
  input: { minHeight: 44, paddingHorizontal: 13, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: '#FFFFFF', color: colors.text, fontSize: 14 },
  multiline: { minHeight: 76, textAlignVertical: 'top' },
  repeatOption: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingVertical: 2 },
  checkbox: { width: 18, height: 18, borderRadius: 5, borderWidth: 1, borderColor: colors.border, backgroundColor: '#FFFFFF' },
  checkboxSelected: { backgroundColor: colors.primaryPressed, borderColor: colors.primaryPressed },
  repeatLabel: { color: colors.text, fontSize: 13, fontWeight: '600' },
  error: { color: colors.danger, fontSize: 12, lineHeight: 18 },
  formActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  saveButton: { flex: 1 },
  eventList: { gap: 9 },
  eventCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: colors.border, borderRadius: radius.md },
  eventAccent: { width: 4, alignSelf: 'stretch', borderRadius: 2 },
  eventCopy: { flex: 1, gap: 3 },
  eventDetail: { color: colors.muted, fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6 },
  eventTitle: { color: colors.text, fontSize: 14, fontWeight: '700' },
  eventCompleted: { color: colors.muted, textDecorationLine: 'line-through' },
  eventDescription: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  deleteButton: { width: 32, height: 36, alignItems: 'center', justifyContent: 'center' },
  emptyCard: { alignItems: 'center', gap: 7, padding: 24, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: '#FFFFFF' },
  emptyTitle: { color: colors.text, fontSize: 14, fontWeight: '700' },
});
