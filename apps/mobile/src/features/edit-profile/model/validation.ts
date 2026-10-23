export const DISPLAY_NAME_MIN = 2;
export const DISPLAY_NAME_MAX = 40;
// Clerk acepta 4-64 por defecto; mantenemos un tope menor para que el
// username se vea bien en la lista de miembros de un grupo.
export const USERNAME_MIN = 4;
export const USERNAME_MAX = 30;

const USERNAME_FORMAT = /^[a-z0-9_]+$/;

export function normalizeUsername(raw: string): string {
  return raw.trim().toLowerCase();
}

export function validateDisplayName(raw: string): string | null {
  const name = raw.trim();
  if (name.length < DISPLAY_NAME_MIN) {
    return `Tu nombre debe tener al menos ${DISPLAY_NAME_MIN} caracteres.`;
  }
  if (name.length > DISPLAY_NAME_MAX) {
    return `Tu nombre puede tener máximo ${DISPLAY_NAME_MAX} caracteres.`;
  }
  return null;
}

export function validateUsername(raw: string): string | null {
  const username = normalizeUsername(raw);
  if (username.length < USERNAME_MIN || username.length > USERNAME_MAX) {
    return `El usuario debe tener entre ${USERNAME_MIN} y ${USERNAME_MAX} caracteres.`;
  }
  if (!USERNAME_FORMAT.test(username)) {
    return 'Usa solo letras minúsculas, números y guion bajo (_).';
  }
  return null;
}
