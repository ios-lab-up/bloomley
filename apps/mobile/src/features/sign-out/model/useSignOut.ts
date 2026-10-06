import { useClerk } from '@clerk/clerk-expo';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';

export function useSignOut() {
  const { signOut } = useClerk();
  const queryClient = useQueryClient();
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleSignOut = useCallback(async () => {
    setIsSigningOut(true);
    try {
      await signOut();
      router.replace('/onboarding/welcome');
      // Despues del replace: con la pantalla aun montada, vaciar la cache
      // dispararia refetch de las consultas activas. Sin esto, el siguiente
      // usuario veria brevemente los datos del anterior.
      queryClient.clear();
    } finally {
      setIsSigningOut(false);
    }
  }, [signOut, queryClient, router]);

  return { signOut: handleSignOut, isSigningOut };
}
