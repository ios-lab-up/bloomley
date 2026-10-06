import { isClerkAPIResponseError } from '@clerk/clerk-expo';

const messageByCode: Record<string, string> = {
  form_identifier_exists: 'Ese correo ya está en uso.',
  form_param_format_invalid: 'Escribe un correo válido.',
  form_param_nil: 'Escribe tu correo.',
  form_code_incorrect: 'Código incorrecto. Revisa tu correo e intenta de nuevo.',
  verification_expired: 'El código expiró. Pide uno nuevo.',
  verification_failed: 'Demasiados intentos. Pide un código nuevo.',
  too_many_requests: 'Demasiados intentos. Espera un momento e intenta de nuevo.',
};

export function clerkErrorMessage(error: unknown, fallback: string): string {
  if (isClerkAPIResponseError(error)) {
    const code = error.errors[0]?.code;
    return (code && messageByCode[code]) || fallback;
  }
  return fallback;
}
