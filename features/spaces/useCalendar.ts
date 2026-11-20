import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { getCalendarItems } from './calendar';

export const calendarQueryKey = (spaceId: string, fromDate: string, toDate: string) =>
  ['shared-calendar', spaceId, fromDate, toDate] as const;

export function useCalendar(spaceId: string | undefined, fromDate: string, toDate: string) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: calendarQueryKey(spaceId ?? 'none', fromDate, toDate),
    queryFn: () => getCalendarItems(spaceId!, fromDate, toDate),
    enabled: Boolean(spaceId),
    staleTime: 10_000,
  });

  useEffect(() => {
    if (!spaceId) return;
    const channel = supabase.channel(`calendar:${spaceId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'calendar_events', filter: `space_id=eq.${spaceId}` }, () => {
        void queryClient.invalidateQueries({ queryKey: ['shared-calendar', spaceId] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'meals', filter: `space_id=eq.${spaceId}` }, () => {
        void queryClient.invalidateQueries({ queryKey: ['shared-calendar', spaceId] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks', filter: `space_id=eq.${spaceId}` }, () => {
        void queryClient.invalidateQueries({ queryKey: ['shared-calendar', spaceId] });
      })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [queryClient, spaceId]);

  return query;
}
