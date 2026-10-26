/**
 * Dev-only session inspector -- not part of the product UI. Lets you see the
 * Clerk session + JWT, force a refresh, call the API and sign out, to test
 * the auth lifecycle without building real screens. Reachable at /debug-auth.
 */
import { useAuth, useClerk } from '@clerk/clerk-expo';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ApiError, apiClient } from '@/entities/user';
import { isClerkConfigured } from '@/shared/lib/clerk';

type JwtClaims = { sub?: string; iat?: number; exp?: number; [key: string]: unknown };

function decodeJwt(token: string): JwtClaims | null {
  try {
    const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(payload)) as JwtClaims;
  } catch {
    return null;
  }
}

// Never render the whole bearer credential; the decoded claims are shown separately.
function maskToken(token: string): string {
  return `${token.slice(0, 12)}…${token.slice(-6)} (${token.length} chars)`;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value} selectable>
        {value}
      </Text>
    </View>
  );
}

function Action({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.button}>
      <Text style={styles.buttonText}>{label}</Text>
    </Pressable>
  );
}

// Split out so the Clerk hooks only run when ClerkProvider is mounted.
function DebugAuthInner() {
  const router = useRouter();
  const { isLoaded, isSignedIn, userId, sessionId, getToken } = useAuth();
  const { signOut } = useClerk();

  const [token, setToken] = useState<string | null>(null);
  const [apiResult, setApiResult] = useState('(sin llamar)');
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));

  useEffect(() => {
    const id = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(id);
  }, []);

  const loadToken = async (skipCache: boolean) => {
    setToken(await getToken({ skipCache }));
  };

  const callMe = async () => {
    setApiResult('...');
    try {
      const me = await apiClient.get<unknown>('/users/me');
      setApiResult(`200 OK\n${JSON.stringify(me, null, 2)}`);
    } catch (err) {
      setApiResult(
        err instanceof ApiError ? `${err.status}\n${err.message}` : `Error de red: ${String(err)}`,
      );
    }
  };

  const claims = token ? decodeJwt(token) : null;
  const secondsLeft = claims?.exp ? claims.exp - now : null;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.title}>Debug de sesión</Text>
      <Row label="isLoaded" value={String(isLoaded)} />
      <Row label="isSignedIn" value={String(isSignedIn)} />
      <Row label="userId (Clerk)" value={userId ?? '-'} />
      <Row label="sessionId" value={sessionId ?? '-'} />

      <Text style={styles.section}>JWT</Text>
      <Row
        label="expira en"
        value={secondsLeft === null ? '-' : secondsLeft > 0 ? `${secondsLeft}s` : 'EXPIRADO'}
      />
      <Row label="iat" value={claims?.iat ? new Date(claims.iat * 1000).toISOString() : '-'} />
      <Row label="exp" value={claims?.exp ? new Date(claims.exp * 1000).toISOString() : '-'} />
      <Row label="token" value={token ? maskToken(token) : '-'} />
      <Action label="Obtener token (cache)" onPress={() => loadToken(false)} />
      <Action label="Forzar refresh (skipCache)" onPress={() => loadToken(true)} />

      <Text style={styles.section}>API</Text>
      <Action label="GET /users/me" onPress={callMe} />
      <Text style={styles.value} selectable>
        {apiResult}
      </Text>

      <Text style={styles.section}>Sesión</Text>
      <Action
        label="Cerrar sesión"
        onPress={async () => {
          await signOut();
          router.replace('/');
        }}
      />
    </ScrollView>
  );
}

export function DebugAuthScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      {isClerkConfigured ? (
        <DebugAuthInner />
      ) : (
        <Text style={styles.content}>
          Clerk no está configurado (falta EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY).
        </Text>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FBFAF7' },
  content: { padding: 16, gap: 8 },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 8 },
  section: { fontSize: 16, fontWeight: '700', marginTop: 16 },
  row: { gap: 2 },
  label: { fontSize: 12, color: '#6B6B6B' },
  value: { fontSize: 13, fontFamily: 'Courier' },
  button: { backgroundColor: '#5B3FD4', padding: 12, borderRadius: 10, marginTop: 4 },
  buttonText: { color: 'white', textAlign: 'center', fontWeight: '600' },
});
