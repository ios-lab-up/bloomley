import { useAuth } from '@clerk/clerk-expo';
import { useEffect, useState } from 'react';

import { userApi } from '../api/user';
import type { User } from '../model/types';

export function useCurrentUser() {
  const { isSignedIn } = useAuth();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isSignedIn) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    userApi
      .me()
      .then((data) => {
        if (!cancelled) setUser(data);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isSignedIn]);

  return { user, isLoading };
}
