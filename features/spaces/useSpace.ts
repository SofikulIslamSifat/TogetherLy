import { useQuery } from '@tanstack/react-query';
import { getMySpace } from './api';

export const spaceQueryKey = ['my-space'] as const;

export function useSpace(enabled = true) {
  return useQuery({
    queryKey: spaceQueryKey,
    queryFn: getMySpace,
    enabled,
    staleTime: 15_000,
  });
}
