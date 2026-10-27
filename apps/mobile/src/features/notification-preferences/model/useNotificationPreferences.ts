import * as Notifications from 'expo-notifications';
import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { useNotificationSettings, useUpdateNotificationSettings } from '@/entities/user';

type SystemPermission = 'granted' | 'blocked' | 'unknown';

async function readSystemPermission(): Promise<SystemPermission> {
  const permission = await Notifications.getPermissionsAsync();
  if (permission.granted) return 'granted';
  // `blocked`: el usuario ya dijo que no y el sistema no deja volver a
  // preguntar; la unica salida es Configuracion. Si aun no se ha pedido
  // (`canAskAgain`), se pedira en contexto al prender el interruptor.
  return permission.canAskAgain ? 'unknown' : 'blocked';
}

export function useNotificationPreferences() {
  const settings = useNotificationSettings();
  const update = useUpdateNotificationSettings();
  const [permission, setPermission] = useState<SystemPermission>('unknown');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const refresh = () => readSystemPermission().then(setPermission, () => {});
    refresh();
    // Al volver de Configuracion hay que releer el permiso.
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });
    return () => subscription.remove();
  }, []);

  const setEnabled = useCallback(
    async (enabled: boolean) => {
      setError(null);
      if (enabled) {
        let next = await readSystemPermission();
        if (next === 'unknown') {
          const asked = await Notifications.requestPermissionsAsync();
          next = asked.granted ? 'granted' : 'blocked';
        }
        setPermission(next);
        if (next !== 'granted') return;
      }
      try {
        await update.mutateAsync({ enabled });
      } catch {
        // useUpdateNotificationSettings ya devolvio el interruptor a su valor.
        setError('No pudimos guardar tu preferencia. Intenta de nuevo.');
      }
    },
    [update],
  );

  return {
    isLoading: settings.isPending,
    isLoadError: settings.isError,
    reload: settings.refetch,
    enabled: settings.data?.enabled ?? false,
    isSaving: update.isPending,
    error,
    systemBlocked: permission === 'blocked',
    setEnabled,
  };
}
