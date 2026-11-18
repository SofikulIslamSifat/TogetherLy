import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { createMemory, deleteMemory, getMemories, updateMemory, type MemoryCategory, type SharedMemory } from './memories';
import type { ImagePickerAsset } from 'expo-image-picker';

export const memoriesQueryKey = (spaceId: string) => ['shared-memories', spaceId] as const;

export function useMemories(spaceId?: string) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: memoriesQueryKey(spaceId ?? 'none'),
    queryFn: () => getMemories(spaceId!),
    enabled: Boolean(spaceId),
    staleTime: 45 * 60 * 1000,
  });
  useEffect(() => {
    if (!spaceId) return;
    const channel = supabase.channel(`memories:${spaceId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'memories', filter: `space_id=eq.${spaceId}` }, () => {
        void queryClient.invalidateQueries({ queryKey: memoriesQueryKey(spaceId) });
      }).subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [queryClient, spaceId]);
  return query;
}

export function useCreateMemory(spaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { caption: string; memoryDate: string; category: MemoryCategory; asset: ImagePickerAsset }) =>
      createMemory({ ...input, spaceId }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: memoriesQueryKey(spaceId) }),
  });
}

export function useUpdateMemory(spaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: string; caption: string; memoryDate: string; category: MemoryCategory }) =>
      updateMemory(input.id, input.caption, input.memoryDate, input.category),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: memoriesQueryKey(spaceId) }),
  });
}

export function useDeleteMemory(spaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (memory: SharedMemory) => deleteMemory(memory),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: memoriesQueryKey(spaceId) }),
  });
}
