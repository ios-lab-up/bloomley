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

import { resolveApiBaseUrl } from '@/shared/lib/apiBaseUrl';

const API_BASE_URL = resolveApiBaseUrl({
  envUrl: process.env.EXPO_PUBLIC_API_URL,
  hostUri: Constants.expoConfig?.hostUri,
});
const API_PREFIX = '/api/v1';
// An unreachable host makes fetch hang with no error, freezing loading states
// forever. Abort so callers reach their error/retry UI instead.
const REQUEST_TIMEOUT_MS = 10_000;

type TokenGetter = () => Promise<string | null>;

let getAuthToken: TokenGetter = async () => null;

function setAuthTokenGetter(getter: TokenGetter): void {
  getAuthToken = getter;
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

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await getAuthToken();

  const headers = new Headers(init.headers);
  headers.set('Content-Type', 'application/json');
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  // ponytail: overrides any caller signal; none pass one today. Combine them
  // (AbortSignal.any) if a caller ever needs its own cancellation.
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${API_PREFIX}${path}`, {
      ...init,
      headers,
      signal: controller.signal,
    });
  } catch (error) {
    if (controller.signal.aborted) {
      throw new ApiError(0, `No response from ${API_BASE_URL} after ${REQUEST_TIMEOUT_MS / 1000}s`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    const body = await response.text();
    throw new ApiError(response.status, body || response.statusText);
  }

  if (response.status === 204) {
    return undefined as T;
  }
  return (await response.json()) as T;
}

export const apiClient = {
  setAuthTokenGetter,
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
