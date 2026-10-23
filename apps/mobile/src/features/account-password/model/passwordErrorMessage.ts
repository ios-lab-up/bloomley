import { isClerkAPIResponseError } from '@clerk/clerk-expo';

const SPANISH_BY_CODE: Record<string, string> = {
  form_password_incorrect: 'La contraseña actual es incorrecta.',
  form_password_pwned: 'Esa contraseña apareció en una filtración. Elige otra.',
  form_password_not_strong_enough: 'Elige una contraseña más segura.',
  form_password_length_too_short: 'La contraseña es muy corta.',
  form_password_size_in_bytes_exceeded: 'La contraseña es demasiado larga.',
  too_many_requests: 'Demasiados intentos. Espera un momento e intenta de nuevo.',
  session_reverification_required: 'Por seguridad, vuelve a iniciar sesión para hacer este cambio.',
};

const FALLBACK = 'No pudimos cambiar tu contraseña. Intenta de nuevo.';

export function passwordErrorMessage(error: unknown) {
  if (!isClerkAPIResponseError(error)) return FALLBACK;
  return SPANISH_BY_CODE[error.errors[0]?.code ?? ''] ?? FALLBACK;
}
