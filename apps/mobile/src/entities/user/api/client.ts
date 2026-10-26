/**
 * Shared HTTP client for the whole app -- every module's entity api layer
 * should call through this instead of reaching for `fetch` directly, so
 * auth headers and the API base URL live in exactly one place.
 *
 * The Clerk session token is injected via `setAuthTokenGetter`, wired up
 * once by `AuthTokenBridge` (see `src/app/providers`), so this file itself
 * stays a plain module with no React/hook dependency.
 */

import Constants from 'expo-constants';

const API_PORT = 8000;

/**
 * An explicit EXPO_PUBLIC_API_URL always wins (staging, production). Without
 * it, in development the API is assumed to run on the same machine as Metro,
 * so reuse the host the app was loaded from: the LAN IP then follows the
 * network without editing .env.
 */
function resolveApiBaseUrl(): string {
  const explicit = process.env.EXPO_PUBLIC_API_URL;
  if (explicit) {
    return explicit;
  }

  // `hostUri` looks like "172.25.27.169:8081" (Metro's address).
  const metroHost = Constants.expoConfig?.hostUri?.split(':')[0];
  if (__DEV__ && metroHost) {
    return `http://${metroHost}:${API_PORT}`;
  }

  return `http://localhost:${API_PORT}`;
}

const API_BASE_URL = resolveApiBaseUrl();
const API_PREFIX = '/api/v1';

// `fetch` in React Native has no timeout of its own: when packets get lost
// (flaky Wi-Fi) a request can hang for a minute or more. Fail fast instead.
const REQUEST_TIMEOUT_MS = 10_000;

type TokenGetter = (options?: { skipCache?: boolean }) => Promise<string | null>;

let getAuthToken: TokenGetter = async () => null;
let onUnauthorized: () => void = () => {};
let unauthorizedHandled = false;

function setAuthTokenGetter(getter: TokenGetter): void {
  getAuthToken = getter;
}

/** Called when the API still answers 401 after retrying with a fresh token,
 * i.e. the session itself is dead (revoked, expired for good, user deleted).
 * Wired up by `AuthTokenBridge` to sign the user out. */
function setUnauthorizedHandler(handler: () => void): void {
  onUnauthorized = handler;
}

/** Re-arms the 401 handler. Call when the Clerk user changes: the latch
 * would otherwise stay set until some request succeeds, so a new session
 * that is dead from its first call would never be signed out. */
function resetUnauthorized(): void {
  unauthorizedHandled = false;
}

class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function send(path: string, init: RequestInit, token: string | null): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set('Content-Type', 'application/json');
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(`${API_BASE_URL}${API_PREFIX}${path}`, {
      ...init,
      headers,
      signal: controller.signal,
    });
  } catch (err) {
    if (controller.signal.aborted) {
      // Status 0 = no HTTP response at all (distinguishes it from a real 4xx/5xx).
      throw new ApiError(
        0,
        `Timeout: la API no respondió en ${REQUEST_TIMEOUT_MS / 1000}s (${API_BASE_URL})`,
      );
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const firstToken = await getAuthToken();
  let response = await send(path, init, firstToken);

  // 401 = the token we sent was rejected. The usual cause is a short-lived
  // JWT that expired between getToken() and the server reading it, so ask
  // Clerk for a brand-new one and retry exactly once (never in a loop).
  if (response.status === 401) {
    let freshToken: string | null = null;
    try {
      freshToken = await getAuthToken({ skipCache: true });
    } catch {
      // Clerk itself refused to mint a token (session revoked/ended).
    }
    if (freshToken) {
      response = await send(path, init, freshToken);
    }

    // Dead session: we had a token but couldn't get a working one. (A
    // request made while signed out never had a token, so it isn't one.)
    // Fire the handler once even if several requests fail at the same time.
    const sessionIsDead = response.status === 401 && firstToken !== null;
    if (sessionIsDead && !unauthorizedHandled) {
      unauthorizedHandled = true;
      onUnauthorized();
    }
  }

  if (!response.ok) {
    const body = await response.text();
    throw new ApiError(response.status, body || response.statusText);
  }

  unauthorizedHandled = false;

  if (response.status === 204) {
    return undefined as T;
  }
  return (await response.json()) as T;
}

export const apiClient = {
  setAuthTokenGetter,
  setUnauthorizedHandler,
  resetUnauthorized,
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: 'POST',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: 'PATCH',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};

export { ApiError };
