import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { getMeals } from './meals';

export const mealsQueryKey = (spaceId: string, fromDate: string, toDate: string) => ['meals', spaceId, fromDate, toDate] as const;

export function useMeals(spaceId: string | undefined, fromDate: string, toDate: string) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: mealsQueryKey(spaceId ?? 'none', fromDate, toDate),
    queryFn: () => getMeals(spaceId!, fromDate, toDate),
    enabled: Boolean(spaceId), staleTime: 10_000,
  });
  useEffect(() => {
    if (!spaceId) return;
    const channel = supabase.channel(`meals:${spaceId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'meals' }, () => {
        void queryClient.invalidateQueries({ queryKey: ['meals', spaceId] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'meal_ingredients' }, () => {
        void queryClient.invalidateQueries({ queryKey: ['meals', spaceId] });
      }).subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [queryClient, spaceId]);
  return query;
}
