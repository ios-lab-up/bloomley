import { useUser } from '@clerk/clerk-expo';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';

export type Provider = {
  id: 'google' | 'apple';
  strategy: 'oauth_google' | 'oauth_apple';
  label: string;
  icon: 'logo-google' | 'logo-apple';
};

export const providers: Provider[] = [
  { id: 'google', strategy: 'oauth_google', label: 'Google', icon: 'logo-google' },
  { id: 'apple', strategy: 'oauth_apple', label: 'Apple', icon: 'logo-apple' },
];

const FALLBACK = 'No pudimos completar el cambio. Intenta de nuevo.';

/** Connect/disconnect Google and Apple, never leaving the account without a way in. */
export function useConnectedAccounts() {
  const { user } = useUser();
  const [busyProvider, setBusyProvider] = useState<Provider['id'] | null>(null);
  const [error, setError] = useState('');

  const linked = (user?.externalAccounts ?? []).filter(
    (account) => account.verification?.status === 'verified',
  );
  // Sign-in methods: the password (if any) plus every verified social account.
  const signInMethodCount = (user?.passwordEnabled ? 1 : 0) + linked.length;

  const isConnected = (provider: Provider) => linked.some((account) => account.provider === provider.id);
  const isLastMethod = (provider: Provider) => isConnected(provider) && signInMethodCount <= 1;

  const connect = async (provider: Provider) => {
    if (!user || busyProvider) return;
    setError('');
    setBusyProvider(provider.id);
    try {
      const redirectUrl = Linking.createURL('/settings/security');
      const account = await user.createExternalAccount({ strategy: provider.strategy, redirectUrl });
      const authUrl = account.verification?.externalVerificationRedirectURL;
      if (authUrl) {
        await WebBrowser.openAuthSessionAsync(authUrl.toString(), redirectUrl);
      }
      await user.reload();
    } catch {
      setError(FALLBACK);
    } finally {
      setBusyProvider(null);
    }
  };

  const disconnect = async (provider: Provider) => {
    if (!user || busyProvider || isLastMethod(provider)) return;
    setError('');
    setBusyProvider(provider.id);
    try {
      await linked.find((account) => account.provider === provider.id)?.destroy();
      await user.reload();
    } catch {
      setError(FALLBACK);
    } finally {
      setBusyProvider(null);
    }
  };

  return { isConnected, isLastMethod, connect, disconnect, busyProvider, error };
}
