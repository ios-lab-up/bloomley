import { useQuery } from '@tanstack/react-query';

import { groupApi } from '../api/client';
import { groupKeys } from '../api/queryKeys';

export function useGroup(groupId: string | undefined) {
  return useQuery({
    queryKey: groupKeys.detail(groupId ?? ''),
    queryFn: () => groupApi.get(groupId as string),
    enabled: !!groupId,
  });
}
