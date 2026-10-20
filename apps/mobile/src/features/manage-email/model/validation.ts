const EMAIL_FORMAT = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

export function validateEmail(raw: string): string | null {
  return EMAIL_FORMAT.test(normalizeEmail(raw)) ? null : 'Escribe un correo válido.';
}
