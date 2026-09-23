import { useAuth } from '@clerk/clerk-expo';
import { useEffect } from 'react';

import { apiClient } from '@/entities/user';

/**
 * Wires Clerk's session token into the plain-module `apiClient` so
 * non-hook call sites (services, entities/*\/api) can attach
 * `Authorization: Bearer <token>` without being inside a component.
 * Must render inside `<ClerkProvider>`.
 */
export function AuthTokenBridge() {
  const { getToken } = useAuth();

  useEffect(() => {
    apiClient.setAuthTokenGetter(() => getToken());
  }, [getToken]);

  return null;
}
