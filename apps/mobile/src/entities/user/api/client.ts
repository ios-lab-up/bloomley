/**
 * Shared HTTP client for the whole app -- every module's entity api layer
 * should call through this instead of reaching for `fetch` directly, so
 * auth headers and the API base URL live in exactly one place.
 *
 * The Clerk session token is injected via `setAuthTokenGetter`, wired up
 * once by `AuthTokenBridge` (see `src/app/providers`), so this file itself
 * stays a plain module with no React/hook dependency.
 */

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000';
const API_PREFIX = '/api/v1';

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

  const response = await fetch(`${API_BASE_URL}${API_PREFIX}${path}`, {
    ...init,
    headers,
  });

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
