import { useAuth } from '@clerk/clerk-expo';
import { useEffect, useState } from 'react';

import { userApi } from '../api/user';
import type { User } from '../model/types';

export function useCurrentUser() {
  const { isSignedIn } = useAuth();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!isSignedIn) {
      setUser(null);
      setError(null);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setError(null);
    userApi
      .me()
      .then((data) => {
        if (!cancelled) setUser(data);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err : new Error(String(err)));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isSignedIn]);

  return { user, isLoading, error };
}
