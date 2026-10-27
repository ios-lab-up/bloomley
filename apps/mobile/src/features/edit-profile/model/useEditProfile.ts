import { useUser } from '@clerk/clerk-expo';
import { useCallback, useState } from 'react';

import { useUpdateMe } from '@/entities/user';
import { clerkErrorMessage } from '@/shared/lib/clerkErrors';

const USERNAME_ERRORS: Record<string, string> = {
  form_identifier_exists: 'Ese nombre de usuario ya está en uso.',
  form_username_invalid_length: 'La longitud del nombre de usuario no es válida.',
  form_username_invalid_character: 'Usa solo letras minúsculas, números y guion bajo (_).',
  form_param_format_invalid: 'El formato del nombre de usuario no es válido.',
  form_param_nil: 'Escribe un nombre de usuario.',
};

/** Only the fields that changed, already trimmed/normalized by the form. */
type Changes = { displayName?: string; username?: string };
type SaveErrors = { displayName?: string; username?: string };

export function useEditProfile() {
  const { user: clerkUser } = useUser();
  const updateMe = useUpdateMe();
  const [errors, setErrors] = useState<SaveErrors>({});
  const [isSaving, setIsSaving] = useState(false);

  const save = useCallback(
    async ({ displayName, username }: Changes): Promise<boolean> => {
      setErrors({});
      setIsSaving(true);
      try {
        // El username va primero: es lo que puede fallar por validacion de
        // Clerk (ocupado, formato). Asi un rechazo no deja el nombre a medias.
        if (username !== undefined) {
          if (!clerkUser) {
            setErrors({ username: 'No pudimos cargar tu cuenta. Intenta de nuevo.' });
            return false;
          }
          try {
            await clerkUser.update({ username });
          } catch (error) {
            setErrors({
              username: clerkErrorMessage(error, USERNAME_ERRORS, 'No pudimos guardar tu usuario. Intenta de nuevo.'),
            });
            return false;
          }
        }
        if (displayName !== undefined) {
          try {
            // Optimista: useUpdateMe revierte solo si el PATCH falla.
            await updateMe.mutateAsync({ display_name: displayName });
          } catch {
            setErrors({ displayName: 'No pudimos guardar tu nombre. Intenta de nuevo.' });
            return false;
          }
        }
        return true;
      } finally {
        setIsSaving(false);
      }
    },
    [clerkUser, updateMe],
  );

  return { save, errors, isSaving };
}
