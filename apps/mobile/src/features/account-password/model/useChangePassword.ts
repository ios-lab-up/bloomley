import { useUser } from '@clerk/clerk-expo';
import { useState } from 'react';

import { passwordErrorMessage } from './passwordErrorMessage';

type ChangePasswordInput = {
  currentPassword: string;
  newPassword: string;
  signOutOfOtherSessions: boolean;
};

/**
 * Changes the password, or creates one for users who signed up with
 * Google/Apple (`passwordEnabled === false`) -- Clerk then doesn't ask for
 * the current one.
 */
export function useChangePassword() {
  const { user } = useUser();
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const hasPassword = !!user?.passwordEnabled;

  const submit = async ({ currentPassword, newPassword, signOutOfOtherSessions }: ChangePasswordInput) => {
    if (!user || isSubmitting) return false;
    setError('');
    setIsSubmitting(true);
    try {
      await user.updatePassword({
        newPassword,
        signOutOfOtherSessions,
        ...(hasPassword ? { currentPassword } : {}),
      });
      await user.reload();
      return true;
    } catch (err) {
      setError(passwordErrorMessage(err));
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  return { hasPassword, submit, error, isSubmitting };
}
