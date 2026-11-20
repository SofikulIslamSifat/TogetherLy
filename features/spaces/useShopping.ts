import { useEffect, useId, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { getShoppingLists } from './shopping';

export const shoppingQueryKey = (spaceId: string) => ['shopping-lists', spaceId] as const;

export function useShopping(spaceId?: string) {
  const queryClient = useQueryClient();
  const channelInstanceId = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const channelGeneration = useRef(0);
  const query = useQuery({
    queryKey: shoppingQueryKey(spaceId ?? 'none'),
    queryFn: () => getShoppingLists(spaceId!),
    enabled: Boolean(spaceId),
    staleTime: 10_000,
  });

  useEffect(() => {
    if (!spaceId) return;
    const channel = supabase
      // Supabase returns an existing channel for duplicate topic names.
      .channel(`shopping:${spaceId}:${channelInstanceId}:${++channelGeneration.current}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shopping_lists' }, () => {
        void queryClient.invalidateQueries({ queryKey: shoppingQueryKey(spaceId) });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shopping_items' }, () => {
        void queryClient.invalidateQueries({ queryKey: shoppingQueryKey(spaceId) });
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [channelInstanceId, queryClient, spaceId]);

  return query;
}
