import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { getTasks } from './tasks';

export const tasksQueryKey = (spaceId: string) => ['shared-tasks', spaceId] as const;

export function useTasks(spaceId?: string) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: tasksQueryKey(spaceId ?? 'none'),
    queryFn: () => getTasks(spaceId!),
    enabled: Boolean(spaceId),
    staleTime: 10_000,
  });
  useEffect(() => {
    if (!spaceId) return;
    const channel = supabase.channel(`tasks:${spaceId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks', filter: `space_id=eq.${spaceId}` }, () => {
        void queryClient.invalidateQueries({ queryKey: tasksQueryKey(spaceId) });
      }).subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [queryClient, spaceId]);
  return query;
}
