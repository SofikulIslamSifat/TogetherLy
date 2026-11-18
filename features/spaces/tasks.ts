import { supabase } from '@/lib/supabase';

export type TaskPriority = 'Low' | 'Medium' | 'High';
export type SharedTask = {
  id: string;
  space_id: string;
  title: string;
  description: string | null;
  assigned_to: string | null;
  due_date: string | null;
  priority: TaskPriority;
  is_completed: boolean;
  completed_by: string | null;
  completed_at: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export async function getTasks(spaceId: string): Promise<SharedTask[]> {
  const { data, error } = await supabase.from('tasks').select('*').eq('space_id', spaceId)
    .order('is_completed', { ascending: true }).order('due_date', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as SharedTask[];
}

export async function createTask(input: {
  spaceId: string; title: string; description: string; assignedTo: string | null;
  dueDate: string | null; priority: TaskPriority;
}) {
  const { error } = await supabase.from('tasks').insert({
    space_id: input.spaceId, title: input.title.trim(), description: input.description.trim() || null,
    assigned_to: input.assignedTo, due_date: input.dueDate, priority: input.priority,
  });
  if (error) throw error;
}

export async function updateTask(taskId: string, input: {
  title: string; description: string; assignedTo: string | null; dueDate: string | null; priority: TaskPriority;
}) {
  const { error } = await supabase.from('tasks').update({
    title: input.title.trim(), description: input.description.trim() || null,
    assigned_to: input.assignedTo, due_date: input.dueDate, priority: input.priority,
  }).eq('id', taskId);
  if (error) throw error;
}

export async function setTaskCompleted(taskId: string, completed: boolean) {
  const { error } = await supabase.from('tasks').update({ is_completed: completed }).eq('id', taskId);
  if (error) throw error;
}

export async function deleteTask(taskId: string) {
  const { error } = await supabase.from('tasks').delete().eq('id', taskId);
  if (error) throw error;
}
