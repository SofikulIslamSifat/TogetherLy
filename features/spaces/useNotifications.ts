import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { getNotifications, getUnreadNotificationsCount, markAllNotificationsRead, markNotificationRead } from './notifications';

export const notificationsQueryKey = ['activity-notifications'] as const;
export const unreadNotificationsQueryKey = ['activity-notifications-unread-count'] as const;

export function useNotifications(userId?: string) {
  const query = useQuery({
    queryKey: [...notificationsQueryKey, userId ?? 'none'],
    queryFn: getNotifications,
    enabled: Boolean(userId),
    staleTime: 15_000,
  });

  return query;
}

export function useUnreadNotificationsCount(userId?: string) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: [...unreadNotificationsQueryKey, userId ?? 'none'],
    queryFn: getUnreadNotificationsCount,
    enabled: Boolean(userId),
    staleTime: 15_000,
  });

  useEffect(() => {
    if (!userId) return;
    const channel = supabase.channel(`notifications-count:${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `recipient_id=eq.${userId}` }, () => {
        void queryClient.invalidateQueries({ queryKey: notificationsQueryKey });
        void queryClient.invalidateQueries({ queryKey: unreadNotificationsQueryKey });
      }).subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [queryClient, userId]);

  return query;
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: markNotificationRead,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: notificationsQueryKey });
      void queryClient.invalidateQueries({ queryKey: unreadNotificationsQueryKey });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: notificationsQueryKey });
      void queryClient.invalidateQueries({ queryKey: unreadNotificationsQueryKey });
    },
  });
}
