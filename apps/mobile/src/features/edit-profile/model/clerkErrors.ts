import { isClerkAPIResponseError } from '@clerk/clerk-expo';

const messageByCode: Record<string, string> = {
  form_identifier_exists: 'Ese nombre de usuario ya está en uso.',
  form_username_invalid_length: 'La longitud del nombre de usuario no es válida.',
  form_username_invalid_character: 'Usa solo letras minúsculas, números y guion bajo (_).',
  form_param_format_invalid: 'El formato del nombre de usuario no es válido.',
  form_param_nil: 'Escribe un nombre de usuario.',
};

export function clerkErrorMessage(error: unknown, fallback: string): string {
  if (isClerkAPIResponseError(error)) {
    const code = error.errors[0]?.code;
    return (code && messageByCode[code]) || fallback;
  }
  return fallback;
}
