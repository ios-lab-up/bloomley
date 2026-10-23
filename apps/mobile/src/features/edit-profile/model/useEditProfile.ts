import { useUser } from '@clerk/clerk-expo';
import { useCallback, useState } from 'react';

import { useUpdateMe } from '@/entities/user';

import { clerkErrorMessage } from './clerkErrors';
import { normalizeUsername } from './validation';

type Draft = { displayName: string; username: string };
type SaveErrors = { displayName?: string; username?: string };

export function useEditProfile(initial: Draft) {
  const { user: clerkUser } = useUser();
  const updateMe = useUpdateMe();
  const [errors, setErrors] = useState<SaveErrors>({});
  const [isSaving, setIsSaving] = useState(false);

  const save = useCallback(
    async (draft: Draft): Promise<boolean> => {
      const nextName = draft.displayName.trim();
      const nextUsername = normalizeUsername(draft.username);
      const nameChanged = nextName !== initial.displayName.trim();
      const usernameChanged = nextUsername !== initial.username;

      setErrors({});
      setIsSaving(true);
      try {
        // El username va primero: es lo que puede fallar por validacion de
        // Clerk (ocupado, formato). Asi un rechazo no deja el nombre a medias.
        if (usernameChanged) {
          if (!clerkUser) {
            setErrors({ username: 'No pudimos cargar tu cuenta. Intenta de nuevo.' });
            return false;
          }
          try {
            await clerkUser.update({ username: nextUsername });
          } catch (error) {
            setErrors({
              username: clerkErrorMessage(error, 'No pudimos guardar tu usuario. Intenta de nuevo.'),
            });
            return false;
          }
        }
        if (nameChanged) {
          try {
            // Optimista: useUpdateMe revierte solo si el PATCH falla.
            await updateMe.mutateAsync({ display_name: nextName });
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
    [clerkUser, updateMe, initial.displayName, initial.username],
  );

  return { save, errors, isSaving };
}
