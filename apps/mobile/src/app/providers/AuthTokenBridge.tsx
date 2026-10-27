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
 * Also registers the 401 handler (see client.ts) and clears the whole Query cache on sign-out: query keys are scoped per
 * Clerk user id, but that alone still leaves cached data sitting around
 * until it's garbage-collected -- clearing it here closes that gap for
 * every entity, not just the ones whose keys we remembered to scope.
 */
export function AuthTokenBridge() {
  const { getToken, isSignedIn, signOut, userId } = useAuth();
  const queryClient = useQueryClient();

  // A different Clerk user is a different session: re-arm the 401 latch so
  // it can sign them out even if no request has succeeded since the last one.
  useEffect(() => {
    apiClient.resetUnauthorized();
  }, [userId]);

  useEffect(() => {
    apiClient.setAuthTokenGetter((options) => getToken(options));
  }, [getToken]);

  // The API kept answering 401 even with a fresh token: the session is dead.
  // Signing out flips `isSignedIn`, which the route guard in app/_layout.tsx
  // reacts to by sending the user back to the start.
  useEffect(() => {
    apiClient.setUnauthorizedHandler(() => {
      void signOut();
    });
  }, [signOut]);

  useEffect(() => {
    if (!isSignedIn) {
      queryClient.clear();
    }
  }, [isSignedIn, queryClient]);

  return null;
}
