import { useAuth } from '@clerk/clerk-expo';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { apiClient } from '@/entities/user';

/**
 * Wires Clerk's session token into the plain-module `apiClient` so
 * non-hook call sites (services, entities/*\/api) can attach
 * `Authorization: Bearer <token>` without being inside a component.
 * Must render inside `<ClerkProvider>`.
 *
 * Also clears the whole Query cache on sign-out: query keys are scoped per
 * Clerk user id, but that alone still leaves cached data sitting around
 * until it's garbage-collected -- clearing it here closes that gap for
 * every entity, not just the ones whose keys we remembered to scope.
 */
export function AuthTokenBridge() {
  const { getToken, isSignedIn } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    apiClient.setAuthTokenGetter(() => getToken());
  }, [getToken]);

  useEffect(() => {
    if (!isSignedIn) {
      queryClient.clear();
    }
  }, [isSignedIn, queryClient]);

  return null;
}
