import type { SessionWithActivitiesResource } from '@clerk/types';
import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { colors } from '@/shared/lib/theme';
import { Button } from '@/shared/ui';

import { useActiveSessions } from '../model/useActiveSessions';

function deviceLabel(session: SessionWithActivitiesResource) {
  const activity = session.latestActivity;
  const device = activity?.deviceType || (activity?.isMobile ? 'Móvil' : 'Dispositivo');
  return activity?.browserName ? `${device} · ${activity.browserName}` : device;
}

function placeLabel(session: SessionWithActivitiesResource) {
  const { city, country } = session.latestActivity ?? {};
  return [city, country].filter(Boolean).join(', ');
}

function lastActiveLabel(session: SessionWithActivitiesResource) {
  return `Última actividad: ${session.lastActiveAt.toLocaleString('es', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })}`;
}

export function ActiveSessionsSection() {
  const { sessions, currentSessionId, isLoading, isError, refetch, revoke, revokingId, revokeFailed } =
    useActiveSessions();

  return (
    <View className="gap-4">
      <Text accessibilityRole="header" className="font-nunito-bold text-[20px] text-bloom-ink">
        Sesiones activas
      </Text>
      {isLoading ? <ActivityIndicator color={colors.purpleDeep} /> : null}
      {isError ? (
        <View className="gap-3">
          <Text className="font-nunito text-[15px] text-bloom-text-secondary">
            No pudimos cargar tus sesiones.
          </Text>
          <Button label="Reintentar" variant="secondary" onPress={() => refetch()} />
        </View>
      ) : null}
      {sessions.map((session) => {
        const isCurrent = session.id === currentSessionId;
        const place = placeLabel(session);
        return (
          <View key={session.id} className="min-h-[52px] flex-row items-center gap-3">
            <Ionicons name="phone-portrait-outline" size={22} color={colors.ink} />
            <View className="flex-1">
              <Text className="font-nunito-semibold text-[17px] text-bloom-ink">
                {deviceLabel(session)}
                {isCurrent ? ' (este dispositivo)' : ''}
              </Text>
              {place ? (
                <Text className="font-nunito text-[13px] text-bloom-text-secondary">{place}</Text>
              ) : null}
              <Text className="font-nunito text-[13px] text-bloom-text-secondary">
                {lastActiveLabel(session)}
              </Text>
            </View>
            {isCurrent ? null : revokingId === session.id ? (
              <ActivityIndicator color={colors.purpleDeep} />
            ) : (
              <Pressable
                onPress={() => revoke(session.id)}
                accessibilityRole="button"
                accessibilityLabel={`Cerrar sesión en ${deviceLabel(session)}`}
                hitSlop={8}
                className="min-h-[44px] justify-center px-2"
              >
                <Text className="font-nunito-bold text-[15px] text-bloom-purple-deep">Cerrar</Text>
              </Pressable>
            )}
          </View>
        );
      })}
      {revokeFailed ? (
        <Text className="font-nunito text-xs text-red-500">
          No pudimos cerrar esa sesión. Intenta de nuevo.
        </Text>
      ) : null}
    </View>
  );
}
