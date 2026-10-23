import { useAuth, useUser } from '@clerk/clerk-expo';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';

import { userKeys } from '@/entities/user';

import { clerkErrorMessage } from './clerkErrors';
import { normalizeEmail } from './validation';

export type ManagedEmail = {
  id: string;
  email: string;
  isVerified: boolean;
  isPrimary: boolean;
};

/** `null` = todo salio bien; si no, el mensaje en español para mostrar. */
type Outcome = string | null;

export function useManageEmails() {
  const { user } = useUser();
  const { userId } = useAuth();
  const queryClient = useQueryClient();
  const [, setVersion] = useState(0);

  const emails: ManagedEmail[] = (user?.emailAddresses ?? []).map((address) => ({
    id: address.id,
    email: address.emailAddress,
    isVerified: address.verification?.status === 'verified',
    isPrimary: address.id === user?.primaryEmailAddressId,
  }));

  // Despues de cada cambio: refrescar Clerk y pedir `/users/me` de nuevo.
  // El backend se entera por el webhook `user.updated`, asi que el correo
  // nuevo puede tardar unos segundos en aparecer ahi.
  const refresh = useCallback(async () => {
    await user?.reload();
    setVersion((version) => version + 1);
    if (userId) {
      await queryClient.invalidateQueries({ queryKey: userKeys.me(userId) });
    }
  }, [user, userId, queryClient]);

  const find = (id: string) => user?.emailAddresses.find((address) => address.id === id);

  const sendCode = useCallback(
    async (id: string): Promise<Outcome> => {
      const address = find(id);
      if (!address) return 'No encontramos ese correo. Intenta de nuevo.';
      try {
        await address.prepareVerification({ strategy: 'email_code' });
        return null;
      } catch (error) {
        return clerkErrorMessage(error, 'No pudimos enviar el código. Intenta de nuevo.');
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user],
  );

  const addEmail = useCallback(
    async (raw: string): Promise<{ id: string } | { error: string }> => {
      if (!user) return { error: 'No pudimos cargar tu cuenta. Intenta de nuevo.' };
      try {
        const address = await user.createEmailAddress({ email: normalizeEmail(raw) });
        await address.prepareVerification({ strategy: 'email_code' });
        await refresh();
        return { id: address.id };
      } catch (error) {
        return { error: clerkErrorMessage(error, 'No pudimos agregar ese correo. Intenta de nuevo.') };
      }
    },
    [user, refresh],
  );

  const verify = useCallback(
    async (id: string, code: string): Promise<Outcome> => {
      const address = find(id);
      if (!address) return 'No encontramos ese correo. Intenta de nuevo.';
      try {
        const result = await address.attemptVerification({ code: code.trim() });
        if (result.verification?.status !== 'verified') {
          return 'Código incorrecto. Revisa tu correo e intenta de nuevo.';
        }
        await refresh();
        return null;
      } catch (error) {
        return clerkErrorMessage(error, 'No pudimos verificar el código. Intenta de nuevo.');
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user, refresh],
  );

  const makePrimary = useCallback(
    async (id: string): Promise<Outcome> => {
      if (!user) return 'No pudimos cargar tu cuenta. Intenta de nuevo.';
      try {
        await user.update({ primaryEmailAddressId: id });
        await refresh();
        return null;
      } catch (error) {
        return clerkErrorMessage(error, 'No pudimos cambiar tu correo principal. Intenta de nuevo.');
      }
    },
    [user, refresh],
  );

  const remove = useCallback(
    async (id: string): Promise<Outcome> => {
      const address = find(id);
      if (!address) return 'No encontramos ese correo. Intenta de nuevo.';
      // Clerk tambien lo rechaza, pero asi el mensaje sale claro y sin viaje.
      if (id === user?.primaryEmailAddressId) {
        return 'No puedes quitar tu correo principal. Primero elige otro como principal.';
      }
      try {
        await address.destroy();
        await refresh();
        return null;
      } catch (error) {
        return clerkErrorMessage(error, 'No pudimos quitar ese correo. Intenta de nuevo.');
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user, refresh],
  );

  return { emails, isLoaded: !!user, addEmail, sendCode, verify, makePrimary, remove };
}
