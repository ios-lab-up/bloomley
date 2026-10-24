import { ApiError } from '@/entities/user';

/**
 * Spanish message for a failed group request. `byStatus` holds the messages
 * specific to one action (e.g. 404 means "unknown username" when adding a
 * member, but "invalid code" when joining).
 */
export function groupErrorMessage(
  error: unknown,
  byStatus: Partial<Record<number, string>> = {},
): string {
  if (error instanceof ApiError) {
    const specific = byStatus[error.status];
    if (specific) return specific;
    if (error.status === 403) return 'Solo quien administra el grupo puede hacer esto.';
    if (error.status === 422) return 'Revisa los datos e intenta de nuevo.';
  }
  return 'Algo salió mal. Intenta de nuevo.';
}
