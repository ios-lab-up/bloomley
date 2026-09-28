import { QueryClient } from '@tanstack/react-query';

/**
 * Single QueryClient for the app. React Native has no window-focus event,
 * so we lean on `refetchOnReconnect` instead, and keep a short default
 * staleTime so remounted screens don't show a spinner for data that's
 * still fresh.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 2,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 0,
    },
  },
});
