import { useUser } from '@clerk/clerk-expo';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';

export const DELETE_CONFIRMATION_WORD = 'BORRAR';

/**
 * Deletes the user in Clerk. The backend cleans up its own data (and
 * transfers or deletes the user's groups) from the `user.deleted` webhook,
 * so the client only needs to delete the Clerk user and leave.
 *
 * If Clerk rejects the deletion nothing has changed: the error is surfaced
 * and the user stays signed in with the account intact.
 */
export function useDeleteAccount() {
  const { user } = useUser();
  const queryClient = useQueryClient();
  const router = useRouter();
  const [error, setError] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const deleteAccount = useCallback(async () => {
    if (!user || isDeleting) return;
    setError('');
    setIsDeleting(true);
    try {
      await user.delete();
    } catch {
      setError('No pudimos borrar tu cuenta. Tu cuenta sigue intacta; intenta de nuevo.');
      setIsDeleting(false);
      return;
    }
    router.replace('/onboarding/welcome');
    // After the replace, same as sign-out: clearing earlier would refetch
    // the active queries of the screen that is still mounted.
    queryClient.clear();
  }, [user, isDeleting, router, queryClient]);

  return { deleteAccount, isDeleting, error };
}
