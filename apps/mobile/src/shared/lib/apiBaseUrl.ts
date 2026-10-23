/**
 * Picks the API base URL so local dev survives network changes.
 *
 * 1. `EXPO_PUBLIC_API_URL` set -> use it as-is (staging, a remote API, tunnels).
 * 2. Otherwise, reuse the host Metro is served from (`Constants.expoConfig.hostUri`,
 *    e.g. "172.25.223.47:8081"): the device already reaches the Mac there, so
 *    the API on the same Mac answers on that host at `apiPort`.
 * 3. No usable host (production build, `--tunnel`) -> localhost.
 *
 * Pure (no expo imports) so it runs under `node --test`.
 */

const LOCAL_HOST = /^(localhost|\d{1,3}(\.\d{1,3}){3})$/;

type ResolveApiBaseUrlInput = {
  envUrl?: string;
  hostUri?: string | null;
  apiPort?: number;
};

export function resolveApiBaseUrl({ envUrl, hostUri, apiPort = 8000 }: ResolveApiBaseUrlInput): string {
  const explicit = envUrl?.trim();
  if (explicit) {
    return explicit.replace(/\/+$/, '');
  }

  // ponytail: IPv4/localhost only. A tunnel host (*.exp.direct) only proxies
  // Metro, not the API, so it falls through to localhost; set the env var then.
  const host = hostUri?.split(':')[0] ?? '';
  if (LOCAL_HOST.test(host)) {
    return `http://${host}:${apiPort}`;
  }

  return `http://localhost:${apiPort}`;
}
