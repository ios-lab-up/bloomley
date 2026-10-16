import { isClerkAPIResponseError } from '@clerk/clerk-expo';

const GENERIC_CREDENTIALS_ERROR = 'Correo o contraseña incorrectos.';

// Clerk answers differently for "no such account" and "wrong password";
// both map to the same message so the form never reveals whether an email
// is registered.
const CREDENTIAL_ERROR_CODES = new Set([
  'form_identifier_not_found',
  'form_password_incorrect',
  'form_password_pwned',
  'strategy_for_user_invalid',
]);

const SPANISH_BY_CODE: Record<string, string> = {
  too_many_requests: 'Demasiados intentos. Espera un momento e intenta de nuevo.',
  form_code_incorrect: 'Código incorrecto. Revisa tu correo e intenta de nuevo.',
  verification_expired: 'El código expiró. Pide uno nuevo.',
  form_password_length_too_short: 'La contraseña es muy corta.',
  form_password_not_strong_enough: 'Elige una contraseña más segura.',
};

export function signInErrorMessage(error: unknown, fallback = GENERIC_CREDENTIALS_ERROR) {
  if (!isClerkAPIResponseError(error)) return fallback;
  const code = error.errors[0]?.code ?? '';
  if (CREDENTIAL_ERROR_CODES.has(code)) return GENERIC_CREDENTIALS_ERROR;
  return SPANISH_BY_CODE[code] ?? fallback;
}

export function isIdentifierNotFound(error: unknown) {
  return isClerkAPIResponseError(error) && error.errors[0]?.code === 'form_identifier_not_found';
}
