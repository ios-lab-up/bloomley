import { useAuth, useUser } from '@clerk/clerk-expo';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { userKeys } from '@/entities/user';
import { clerkErrorMessage } from '@/shared/lib/clerkErrors';

import { normalizeEmail } from './validation';

export type ManagedEmail = {
  id: string;
  email: string;
  isVerified: boolean;
  isPrimary: boolean;
};

const EMAIL_ERRORS: Record<string, string> = {
  form_identifier_exists: 'Ese correo ya está en uso.',
  form_param_format_invalid: 'Escribe un correo válido.',
  form_param_nil: 'Escribe tu correo.',
  form_code_incorrect: 'Código incorrecto. Revisa tu correo e intenta de nuevo.',
  verification_expired: 'El código expiró. Pide uno nuevo.',
  verification_failed: 'Demasiados intentos. Pide un código nuevo.',
  too_many_requests: 'Demasiados intentos. Espera un momento e intenta de nuevo.',
};

/** `null` = todo salio bien; si no, el mensaje en español para mostrar. */
export type Outcome = string | null;

export function useManageEmails() {
  const { user } = useUser();
  const { userId } = useAuth();
  const queryClient = useQueryClient();

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
    if (userId) {
      await queryClient.invalidateQueries({ queryKey: userKeys.me(userId) });
    }
  }, [user, userId, queryClient]);

  const sendCode = useCallback(
    async (id: string): Promise<Outcome> => {
      const address = user?.emailAddresses.find((item) => item.id === id);
      if (!address) return 'No encontramos ese correo. Intenta de nuevo.';
      try {
        await address.prepareVerification({ strategy: 'email_code' });
        return null;
      } catch (error) {
        return clerkErrorMessage(error, EMAIL_ERRORS, 'No pudimos enviar el código. Intenta de nuevo.');
      }
    },
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
        return { error: clerkErrorMessage(error, EMAIL_ERRORS, 'No pudimos agregar ese correo. Intenta de nuevo.') };
      }
    },
    [user, refresh],
  );

  const verify = useCallback(
    async (id: string, code: string): Promise<Outcome> => {
      const address = user?.emailAddresses.find((item) => item.id === id);
      if (!address) return 'No encontramos ese correo. Intenta de nuevo.';
      try {
        const result = await address.attemptVerification({ code: code.trim() });
        if (result.verification?.status !== 'verified') {
          return 'Código incorrecto. Revisa tu correo e intenta de nuevo.';
        }
        await refresh();
        return null;
      } catch (error) {
        return clerkErrorMessage(error, EMAIL_ERRORS, 'No pudimos verificar el código. Intenta de nuevo.');
      }
    },
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
        return clerkErrorMessage(error, EMAIL_ERRORS, 'No pudimos cambiar tu correo principal. Intenta de nuevo.');
      }
    },
    [user, refresh],
  );

  const remove = useCallback(
    async (id: string): Promise<Outcome> => {
      const address = user?.emailAddresses.find((item) => item.id === id);
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
        return clerkErrorMessage(error, EMAIL_ERRORS, 'No pudimos quitar ese correo. Intenta de nuevo.');
      }
    },
    [user, refresh],
  );

  return { emails, isLoaded: !!user, addEmail, sendCode, verify, makePrimary, remove };
}
