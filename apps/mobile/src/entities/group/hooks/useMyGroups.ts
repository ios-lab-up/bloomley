import { useQuery } from '@tanstack/react-query';

import { groupApi } from '../api/client';
import { groupKeys } from '../api/queryKeys';

export function useMyGroups() {
  return useQuery({
    queryKey: groupKeys.lists(),
    queryFn: groupApi.myGroups,
  });
}
