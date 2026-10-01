import { useQuery } from '@tanstack/react-query';

import { groupApi } from '../api/client';
import { groupKeys } from '../api/queryKeys';

export function useGroupStreak(groupId: string | undefined) {
  return useQuery({
    queryKey: groupKeys.streak(groupId ?? ''),
    queryFn: () => groupApi.streak(groupId as string),
    enabled: !!groupId,
  });
}
