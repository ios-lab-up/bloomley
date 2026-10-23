import { isClerkAPIResponseError, useSSO } from '@clerk/clerk-expo';
import { useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import { useState } from 'react';

type SocialStrategy = 'oauth_google' | 'oauth_apple';

function firstClerkErrorMessage(error: unknown, fallback: string) {
  if (isClerkAPIResponseError(error)) {
    return error.errors[0]?.longMessage ?? error.errors[0]?.message ?? fallback;
  }
  return fallback;
}

type SocialAuthOptions = {
  /**
   * `signIn` is for "Ya tengo cuenta": Clerk still creates an account when
   * the Google/Apple identity is new, but the user is then sent through
   * onboarding instead of landing on an empty /home.
   */
  intent?: 'signUp' | 'signIn';
};

/** Google/Apple sign-in via Clerk's hosted OAuth flow (works for both sign-up and sign-in). */
export function useSocialAuth({ intent = 'signUp' }: SocialAuthOptions = {}) {
  const { startSSOFlow } = useSSO();
  const router = useRouter();
  const [error, setError] = useState('');
  const [loadingStrategy, setLoadingStrategy] = useState<SocialStrategy | null>(null);

  const signInWithStrategy = async (strategy: SocialStrategy) => {
    setError('');
    setLoadingStrategy(strategy);
    try {
      const { createdSessionId, setActive, authSessionResult, signIn, signUp } =
        await startSSOFlow({
          strategy,
          redirectUrl: Linking.createURL('/'),
        });

      if (createdSessionId && setActive) {
        await setActive({ session: createdSessionId });
        const isNewAccount = signUp?.status === 'complete';
        router.replace(intent === 'signIn' && isNewAccount ? '/onboarding/pillars' : '/');
        return;
      }

      // The user backed out of the browser -- not an error, stay quiet.
      if (authSessionResult?.type === 'cancel' || authSessionResult?.type === 'dismiss') {
        return;
      }

      // The browser flow completed but Clerk didn't hand back a session --
      // it needs another step (e.g. MFA, or an unverified email) that this
      // flow doesn't handle yet. Log the raw status so it's diagnosable
      // from Metro instead of failing silently.
      console.warn('[social-auth] SSO flow finished without a session', {
        strategy,
        authSessionResult,
        signInStatus: signIn?.status,
        signUpStatus: signUp?.status,
      });
      setError('No pudimos completar el inicio de sesión. Intenta de nuevo.');
    } catch (err) {
      setError(firstClerkErrorMessage(err, 'No pudimos completar el inicio de sesión. Intenta de nuevo.'));
    } finally {
      setLoadingStrategy(null);
    }
  };

  return {
    signInWithGoogle: () => signInWithStrategy('oauth_google'),
    signInWithApple: () => signInWithStrategy('oauth_apple'),
    isGoogleLoading: loadingStrategy === 'oauth_google',
    isAppleLoading: loadingStrategy === 'oauth_apple',
    error,
  };
}
