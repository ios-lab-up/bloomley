import { useUser } from '@clerk/clerk-expo';
import { useState } from 'react';

import { clerkErrorMessage } from '@/shared/lib/clerkErrors';

const PASSWORD_ERRORS: Record<string, string> = {
  form_password_incorrect: 'La contraseña actual es incorrecta.',
  form_password_pwned: 'Esa contraseña apareció en una filtración. Elige otra.',
  form_password_not_strong_enough: 'Elige una contraseña más segura.',
  form_password_length_too_short: 'La contraseña es muy corta.',
  form_password_size_in_bytes_exceeded: 'La contraseña es demasiado larga.',
  too_many_requests: 'Demasiados intentos. Espera un momento e intenta de nuevo.',
  session_reverification_required: 'Por seguridad, vuelve a iniciar sesión para hacer este cambio.',
};

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
      setError(clerkErrorMessage(err, PASSWORD_ERRORS, 'No pudimos cambiar tu contraseña. Intenta de nuevo.'));
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  return { hasPassword, submit, error, isSubmitting };
}
