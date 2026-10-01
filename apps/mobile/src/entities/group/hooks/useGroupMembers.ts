import { useQuery } from '@tanstack/react-query';

import { groupApi } from '../api/client';
import { groupKeys } from '../api/queryKeys';

export function useGroupMembers(groupId: string | undefined) {
  return useQuery({
    queryKey: groupKeys.members(groupId ?? ''),
    queryFn: () => groupApi.members(groupId as string),
    enabled: !!groupId,
  });
}
