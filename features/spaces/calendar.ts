import { supabase } from '@/lib/supabase';

export type CalendarEventType = 'plan' | 'important_date';

export type CalendarItem = {
  id: string;
  entityId: string;
  date: string;
  title: string;
  description: string | null;
  kind: 'meal' | 'task' | CalendarEventType;
  detail: string;
  completed?: boolean;
};

export function getCalendarDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function isValidCalendarDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const [, year, month, day] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  return date.getFullYear() === Number(year)
    && date.getMonth() === Number(month) - 1
    && date.getDate() === Number(day);
}

export function getCalendarGridDates(month: Date): string[] {
  const firstDay = new Date(month.getFullYear(), month.getMonth(), 1);
  firstDay.setDate(firstDay.getDate() - ((firstDay.getDay() + 6) % 7));
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(firstDay);
    date.setDate(firstDay.getDate() + index);
    return getCalendarDateKey(date);
  });
}

export function getAnnualOccurrenceDate(anchorDate: string, year: number): string | null {
  const occurrence = `${year}${anchorDate.slice(4)}`;
  return isValidCalendarDate(occurrence) ? occurrence : null;
}

export async function getCalendarItems(spaceId: string, fromDate: string, toDate: string): Promise<CalendarItem[]> {
  const [mealsResult, tasksResult, eventsResult, annualEventsResult] = await Promise.all([
    supabase.from('meals').select('id, planned_date, meal_type, title')
      .eq('space_id', spaceId).gte('planned_date', fromDate).lte('planned_date', toDate),
    supabase.from('tasks').select('id, title, description, due_date, is_completed')
      .eq('space_id', spaceId).not('due_date', 'is', null).gte('due_date', fromDate).lte('due_date', toDate),
    supabase.from('calendar_events').select('id, title, description, event_date, event_type, repeats_yearly')
      .eq('space_id', spaceId).eq('repeats_yearly', false).gte('event_date', fromDate).lte('event_date', toDate),
    supabase.from('calendar_events').select('id, title, description, event_date, event_type, repeats_yearly')
      .eq('space_id', spaceId).eq('repeats_yearly', true),
  ]);
  if (mealsResult.error) throw mealsResult.error;
  if (tasksResult.error) throw tasksResult.error;
  if (eventsResult.error) throw eventsResult.error;
  if (annualEventsResult.error) throw annualEventsResult.error;

  const items: CalendarItem[] = [
    ...(mealsResult.data ?? []).map((meal) => ({
      id: `meal:${meal.id}`,
      entityId: meal.id,
      date: meal.planned_date,
      title: meal.title,
      description: null,
      kind: 'meal' as const,
      detail: meal.meal_type,
    })),
    ...(tasksResult.data ?? []).flatMap((task) => task.due_date ? [{
      id: `task:${task.id}`,
      entityId: task.id,
      date: task.due_date,
      title: task.title,
      description: task.description,
      kind: 'task' as const,
      detail: task.is_completed ? 'Completed task' : 'Task due',
      completed: task.is_completed,
    }] : []),
    ...(eventsResult.data ?? []).map((event) => ({
      id: `event:${event.id}`,
      entityId: event.id,
      date: event.event_date,
      title: event.title,
      description: event.description,
      kind: event.event_type,
      detail: event.event_type === 'plan' ? 'Plan' : 'Important date',
    })),
    ...(annualEventsResult.data ?? []).flatMap((event) => {
      const occurrence = getAnnualOccurrenceDate(event.event_date, Number(fromDate.slice(0, 4)));
      if (!occurrence || occurrence < fromDate || occurrence > toDate) return [];
      return [{
        id: `event:${event.id}:${occurrence}`,
        entityId: event.id,
        date: occurrence,
        title: event.title,
        description: event.description,
        kind: event.event_type,
        detail: 'Repeats yearly',
      }];
    }),
  ];

  return items.sort((left, right) => left.date.localeCompare(right.date) || left.title.localeCompare(right.title));
}

export async function createCalendarEvent(input: {
  spaceId: string;
  title: string;
  description: string;
  date: string;
  type: CalendarEventType;
  repeatsYearly: boolean;
}) {
  const { error } = await supabase.from('calendar_events').insert({
    space_id: input.spaceId,
    title: input.title.trim(),
    description: input.description.trim() || null,
    event_date: input.date,
    event_type: input.type,
    repeats_yearly: input.type === 'important_date' && input.repeatsYearly,
  });
  if (error) throw error;
}

export async function deleteCalendarEvent(eventId: string) {
  const { error } = await supabase.from('calendar_events').delete().eq('id', eventId);
  if (error) throw error;
}
