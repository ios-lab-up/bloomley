/**
 * Worth retrying: the request never got an HTTP answer (fetch threw, e.g.
 * flaky Wi-Fi) or the API failed on its side (5xx). Not retried: 4xx (a
 * 401 is already refreshed/handled in the client) and our own 10 s timeout
 * (status 0), which has already waited long enough.
 *
 * Pure (duck-typed, no ApiError import) so it runs under `node --test`.
 */
export function isTransientError(error: unknown): boolean {
  const status = (error as { status?: unknown } | null)?.status;
  if (typeof status !== 'number') return true;
  return status >= 500;
}
