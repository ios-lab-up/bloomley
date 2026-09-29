import { useAuth } from '@clerk/clerk-expo';
import { useQuery } from '@tanstack/react-query';

import { userApi } from '../api/user';
import { userKeys } from '../api/queryKeys';

export function useCurrentUser() {
  const { isSignedIn, userId } = useAuth();

  const query = useQuery({
    queryKey: userKeys.me(userId ?? 'anonymous'),
    queryFn: userApi.me,
    enabled: !!isSignedIn,
  });

  // While the query is disabled (signed out), it never leaves `pending` on
  // its own -- callers must check `isSignedIn` before trusting `isPending`.
  return { ...query, isSignedIn: !!isSignedIn };
}
