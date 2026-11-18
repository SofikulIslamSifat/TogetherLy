import { supabase } from '@/lib/supabase';

export type ActivityNotification = {
  id: string;
  space_id: string;
  recipient_id: string;
  actor_id: string | null;
  event_type: 'task_created' | 'task_completed' | 'task_reopened' | 'shopping_item_added' | 'shopping_item_purchased' | 'meal_added' | 'memory_added';
  title: string;
  body: string;
  entity_type: 'task' | 'shopping' | 'meal' | 'memory';
  entity_id: string;
  read_at: string | null;
  created_at: string;
};

export async function getNotifications(): Promise<ActivityNotification[]> {
  const { data, error } = await supabase.from('notifications').select('*')
    .order('created_at', { ascending: false }).limit(100);
  if (error) throw error;
  return (data ?? []) as ActivityNotification[];
}

export async function getUnreadNotificationsCount(): Promise<number> {
  const { count, error } = await supabase.from('notifications').select('id', { count: 'exact', head: true }).is('read_at', null);
  if (error) throw error;
  return count ?? 0;
}

export async function markNotificationRead(notificationId: string) {
  const { error } = await supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('id', notificationId);
  if (error) throw error;
}

export async function markAllNotificationsRead() {
  const { error } = await supabase.from('notifications').update({ read_at: new Date().toISOString() }).is('read_at', null);
  if (error) throw error;
}
