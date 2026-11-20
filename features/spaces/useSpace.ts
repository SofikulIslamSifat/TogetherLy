import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/features/auth/AuthProvider';
import { getMySpace } from './api';

export const spaceQueryKey = ['my-space'] as const;

export function useSpace(enabled = true) {
  const { user } = useAuth();
  return useQuery({
    queryKey: [...spaceQueryKey, user?.id ?? 'none'],
    queryFn: getMySpace,
    enabled: enabled && Boolean(user),
    staleTime: 15_000,
  });
}
