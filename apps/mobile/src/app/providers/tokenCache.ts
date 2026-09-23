import * as SecureStore from 'expo-secure-store';

/** Clerk's recommended Expo token cache: persists the session in SecureStore. */
export const tokenCache = {
  async getToken(key: string) {
    try {
      return await SecureStore.getItemAsync(key);
    } catch {
      return null;
    }
  },
  async saveToken(key: string, value: string) {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch {
      // SecureStore unavailable (e.g. web) -- session just won't persist.
    }
  },
};
