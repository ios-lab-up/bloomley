import { useSession, useUser } from '@clerk/clerk-expo';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

/** Lists the user's active devices and lets them revoke any but the current one. */
export function useActiveSessions() {
  const { user } = useUser();
  const { session: currentSession } = useSession();
  const queryClient = useQueryClient();
  const queryKey = ['account-security', 'sessions', user?.id ?? 'anonymous'];

  const query = useQuery({
    queryKey,
    queryFn: async () => {
      const sessions = await user!.getSessions();
      return sessions
        .filter((session) => session.status === 'active')
        .sort((a, b) => b.lastActiveAt.getTime() - a.lastActiveAt.getTime());
    },
    enabled: !!user,
  });

  const revoke = useMutation({
    mutationFn: async (sessionId: string) => {
      if (sessionId === currentSession?.id) return;
      const target = query.data?.find((session) => session.id === sessionId);
      await target?.revoke();
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  });

  return {
    sessions: query.data ?? [],
    currentSessionId: currentSession?.id,
    isLoading: query.isPending,
    isError: query.isError,
    refetch: query.refetch,
    revoke: revoke.mutate,
    revokingId: revoke.isPending ? revoke.variables : undefined,
    revokeFailed: revoke.isError,
  };
}
