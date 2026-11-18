import React, { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Check, Circle, ClipboardList, Pencil, Plus, Trash2 } from 'lucide-react-native';
import { Screen } from '@/components/common/Screen';
import { AppButton } from '@/components/common/AppButton';
import { StateView } from '@/components/common/StateView';
import { colors, radius } from '@/constants/theme';
import { useAuth } from '@/features/auth/AuthProvider';
import { useSpace } from '@/features/spaces/useSpace';
import { useTasks } from '@/features/spaces/useTasks';
import { createTask, deleteTask, setTaskCompleted, updateTask, type SharedTask, type TaskPriority } from '@/features/spaces/tasks';

const priorities: TaskPriority[] = ['Low', 'Medium', 'High'];
const validDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00`));
const prettyDate = (value: string | null) => value ? new Date(`${value}T00:00:00`).toLocaleDateString('en-BD', { day: 'numeric', month: 'short', year: 'numeric' }) : 'No due date';

export default function TasksScreen() {
  const { user } = useAuth();
  const { data: space } = useSpace(Boolean(user));
  const tasksQuery = useTasks(space?.id);
  const tasks = tasksQuery.data ?? [];
  const members = space?.members ?? [];
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<SharedTask | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assignedTo, setAssignedTo] = useState<string | null>(user?.id ?? null);
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('Medium');
  const [filter, setFilter] = useState<'All' | 'Open' | 'Done'>('Open');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const openTasks = useMemo(() => tasks.filter((task) => !task.is_completed), [tasks]);
  const completedTasks = useMemo(() => tasks.filter((task) => task.is_completed), [tasks]);
  const visibleTasks = filter === 'Open' ? openTasks : filter === 'Done' ? completedTasks : tasks;
  const memberName = (id: string | null) => {
    if (!id) return 'Unassigned';
    const member = members.find((item) => item.user_id === id);
    return member?.profile?.display_name || (id === user?.id ? 'You' : 'Space member');
  };

  const runAction = async (action: () => Promise<void>, after?: () => void) => {
    setBusy(true); setError('');
    try { await action(); after?.(); await tasksQuery.refetch(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Something went wrong. Please try again.'); }
    finally { setBusy(false); }
  };

  const resetForm = () => { setTitle(''); setDescription(''); setAssignedTo(user?.id ?? null); setDueDate(''); setPriority('Medium'); setEditing(null); setShowForm(false); };
  const startEdit = (task: SharedTask) => {
    setEditing(task); setTitle(task.title); setDescription(task.description ?? ''); setAssignedTo(task.assigned_to);
    setDueDate(task.due_date ?? ''); setPriority(task.priority); setShowForm(true); setError('');
  };
  const saveTask = () => {
    if (!space?.id || !title.trim()) { setError('Enter a task title.'); return; }
    if (dueDate.trim() && !validDate(dueDate.trim())) { setError('Use a valid date in YYYY-MM-DD format.'); return; }
    const input = { title, description, assignedTo, dueDate: dueDate.trim() || null, priority };
    void runAction(() => editing ? updateTask(editing.id, input) : createTask({ spaceId: space.id, ...input }), resetForm);
  };
  const confirmDelete = (task: SharedTask) => Alert.alert('Delete task?', `Remove “${task.title}” from the shared list?`, [
    { text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: () => { void runAction(() => deleteTask(task.id)); } },
  ]);

  if (tasksQuery.isLoading) return <Screen contentContainerStyle={styles.center}><StateView loading title="Loading shared tasks" description="Getting the latest list for your space." /></Screen>;
  if (tasksQuery.isError) return <Screen contentContainerStyle={styles.center}><StateView title="Tasks could not be loaded" description={tasksQuery.error.message} actionLabel="Try again" onAction={() => { void tasksQuery.refetch(); }} /></Screen>;

  return <Screen contentContainerStyle={styles.content}>
    <View style={styles.header}>
      <View style={styles.headerIcon}><ClipboardList size={22} color={colors.primaryPressed} /></View>
      <View style={{ flex: 1 }}><Text style={styles.title}>Tasks</Text><Text style={styles.subtitle}>Plan together and keep things moving</Text></View>
      <Pressable accessibilityRole="button" accessibilityLabel={showForm ? 'Close task form' : 'Create a task'} hitSlop={8} onPress={() => { if (showForm) resetForm(); else { setEditing(null); setShowForm(true); } }} style={styles.addButton}><Plus size={20} color="#FFFFFF" /></Pressable>
    </View>

    <View style={styles.statsRow}>
      <View style={styles.statCard}><Text style={styles.statNumber}>{openTasks.length}</Text><Text style={styles.statLabel}>To do</Text></View>
      <View style={styles.statCard}><Text style={styles.statNumber}>{completedTasks.length}</Text><Text style={styles.statLabel}>Completed</Text></View>
      <View style={styles.statCard}><Text style={styles.statNumber}>{tasks.length}</Text><Text style={styles.statLabel}>Total tasks</Text></View>
    </View>

    {showForm ? <View style={styles.panel}>
      <Text style={styles.panelTitle}>{editing ? 'Edit task' : 'Create a task'}</Text>
      <TextInput value={title} onChangeText={setTitle} placeholder="What needs to be done?" placeholderTextColor={colors.muted} style={styles.input} maxLength={120} />
      <TextInput value={description} onChangeText={setDescription} placeholder="Details (optional)" placeholderTextColor={colors.muted} style={[styles.input, styles.multiline]} multiline maxLength={500} />
      <Text style={styles.fieldLabel}>Assign to</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        <ChoiceChip label="Unassigned" active={assignedTo === null} onPress={() => setAssignedTo(null)} />
        {members.map((member) => <ChoiceChip key={member.user_id} label={member.user_id === user?.id ? 'You' : member.profile?.display_name || 'Partner'} active={assignedTo === member.user_id} onPress={() => setAssignedTo(member.user_id)} />)}
      </ScrollView>
      <Text style={styles.fieldLabel}>Due date (YYYY-MM-DD)</Text>
      <TextInput value={dueDate} onChangeText={setDueDate} placeholder="2026-11-25" placeholderTextColor={colors.muted} style={styles.input} maxLength={10} />
      <Text style={styles.fieldLabel}>Priority</Text>
      <View style={styles.chips}>{priorities.map((value) => <ChoiceChip key={value} label={value} active={priority === value} onPress={() => setPriority(value)} />)}</View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <View style={styles.formActions}><AppButton title="Cancel" variant="text" onPress={resetForm} /><View style={{ flex: 1 }}><AppButton title={editing ? 'Save changes' : 'Add task'} onPress={saveTask} loading={busy} disabled={!title.trim()} /></View></View>
    </View> : null}

    <View style={styles.filters}>{(['Open', 'All', 'Done'] as const).map((value) => <ChoiceChip key={value} label={value} active={filter === value} onPress={() => setFilter(value)} />)}</View>
    {error && !showForm ? <Text style={styles.error}>{error}</Text> : null}
    {visibleTasks.length ? visibleTasks.map((task) => <TaskCard key={task.id} task={task} assignee={memberName(task.assigned_to)} onToggle={() => runAction(() => setTaskCompleted(task.id, !task.is_completed))} onEdit={() => startEdit(task)} onDelete={() => confirmDelete(task)} />) : <StateView icon={<ClipboardList size={26} color={colors.primaryPressed} />} title={filter === 'Done' ? 'No completed tasks yet' : 'Nothing on the list'} description="Add a task and assign it to either member of your space." actionLabel="Create a task" onAction={() => setShowForm(true)} />}
    {busy && !showForm ? <Text style={styles.muted}>Saving…</Text> : null}
  </Screen>;
}

function ChoiceChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return <Pressable onPress={onPress} style={[styles.chip, active && styles.chipActive]}><Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text></Pressable>;
}

function TaskCard({ task, assignee, onToggle, onEdit, onDelete }: { task: SharedTask; assignee: string; onToggle: () => void; onEdit: () => void; onDelete: () => void }) {
  const priorityStyle = task.priority === 'High' ? styles.high : task.priority === 'Low' ? styles.low : styles.medium;
  return <View style={[styles.taskCard, task.is_completed && styles.taskDone]}>
    <Pressable accessibilityRole="checkbox" accessibilityLabel={`Mark ${task.title} ${task.is_completed ? 'open' : 'complete'}`} accessibilityState={{ checked: task.is_completed }} onPress={onToggle} style={styles.checkButton}>{task.is_completed ? <Check size={20} color={colors.success} /> : <Circle size={20} color={colors.muted} />}</Pressable>
    <View style={styles.taskMain}>
      <Text style={[styles.taskTitle, task.is_completed && styles.completedTitle]}>{task.title}</Text>
      {task.description ? <Text style={styles.taskDescription}>{task.description}</Text> : null}
      <Text style={styles.taskMeta}>{assignee} · {prettyDate(task.due_date)}</Text>
      <View style={[styles.priorityBadge, priorityStyle]}><Text style={styles.priorityText}>{task.priority} priority</Text></View>
    </View>
    <View style={styles.taskActions}><Pressable accessibilityRole="button" accessibilityLabel={`Edit ${task.title}`} onPress={onEdit} hitSlop={10}><Pencil size={17} color={colors.muted} /></Pressable><Pressable accessibilityRole="button" accessibilityLabel={`Delete ${task.title}`} onPress={onDelete} hitSlop={10}><Trash2 size={17} color={colors.danger} /></Pressable></View>
  </View>;
}

const styles = StyleSheet.create({
  content: { gap: 18 }, center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 10 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 }, headerIcon: { width: 46, height: 46, borderRadius: 15, backgroundColor: colors.secondaryBackground, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 27, fontWeight: '800', color: colors.text }, subtitle: { color: colors.muted, fontSize: 13, marginTop: 2 }, addButton: { width: 42, height: 42, borderRadius: 14, backgroundColor: colors.primaryPressed, alignItems: 'center', justifyContent: 'center' },
  statsRow: { flexDirection: 'row', gap: 10 }, statCard: { flex: 1, backgroundColor: colors.card, borderRadius: radius.md, padding: 14, borderWidth: 1, borderColor: colors.border }, statNumber: { fontSize: 22, fontWeight: '800', color: colors.text }, statLabel: { color: colors.muted, fontSize: 12, marginTop: 2 },
  panel: { backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: 16, gap: 12 }, panelTitle: { fontSize: 17, fontWeight: '800', color: colors.text }, input: { minHeight: 48, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: 13, color: colors.text, backgroundColor: '#FFFEFD' }, multiline: { minHeight: 76, paddingTop: 12, textAlignVertical: 'top' }, fieldLabel: { fontSize: 13, fontWeight: '700', color: colors.text, marginBottom: -5 }, chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, chip: { borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: '#FFFFFF', paddingHorizontal: 13, paddingVertical: 9 }, chipActive: { backgroundColor: colors.secondaryBackground, borderColor: colors.primaryPressed }, chipText: { fontSize: 12, color: colors.muted, fontWeight: '600' }, chipTextActive: { color: colors.text }, formActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  filters: { flexDirection: 'row', gap: 8 }, error: { color: colors.danger, fontSize: 13 }, taskCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 11, padding: 15, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md }, taskDone: { opacity: 0.78 }, checkButton: { paddingTop: 2, minWidth: 24, minHeight: 28 }, taskMain: { flex: 1, gap: 5 }, taskTitle: { fontSize: 15, fontWeight: '700', color: colors.text }, completedTitle: { textDecorationLine: 'line-through', color: colors.muted }, taskDescription: { color: colors.muted, fontSize: 13, lineHeight: 18 }, taskMeta: { color: colors.muted, fontSize: 11 }, priorityBadge: { alignSelf: 'flex-start', borderRadius: radius.pill, paddingHorizontal: 9, paddingVertical: 4, marginTop: 2 }, high: { backgroundColor: '#FCE8E8' }, medium: { backgroundColor: '#F8F0DE' }, low: { backgroundColor: '#EAF2E9' }, priorityText: { color: colors.text, fontSize: 10, fontWeight: '700' }, taskActions: { flexDirection: 'row', gap: 13, paddingTop: 3 }, muted: { color: colors.muted, fontSize: 13, textAlign: 'center' },
});
