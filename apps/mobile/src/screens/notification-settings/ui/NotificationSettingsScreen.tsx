import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ActivityIndicator, Linking, Pressable, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useNotificationPreferences } from '@/features/notification-preferences';
import { colors } from '@/shared/lib/theme';
import { Button } from '@/shared/ui';

export function NotificationSettingsScreen() {
  const router = useRouter();
  const prefs = useNotificationPreferences();

  return (
    <SafeAreaView className="flex-1 bg-bloom-bg">
      <View className="flex-row items-center gap-1 px-3 pb-2 pt-1">
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Volver"
          hitSlop={8}
          className="h-11 w-11 items-center justify-center"
        >
          <Ionicons name="chevron-back" size={26} color={colors.ink} />
        </Pressable>
        <Text accessibilityRole="header" className="font-nunito-bold text-[22px] text-bloom-ink">
          Notificaciones
        </Text>
      </View>

      {prefs.isLoadError ? (
        <View className="flex-1 items-center justify-center gap-4 px-6">
          <Text className="text-center font-nunito text-bloom-ink">
            No pudimos cargar tus preferencias.
          </Text>
          <Button label="Reintentar" onPress={() => prefs.reload()} />
        </View>
      ) : prefs.isLoading ? (
        <View className="flex-1 items-center justify-center gap-3">
          <ActivityIndicator />
          <Text className="font-nunito text-bloom-text-secondary">Cargando...</Text>
        </View>
      ) : (
        <View className="gap-4 px-6 pt-2">
          <View className="min-h-[64px] flex-row items-center gap-4 rounded-card border border-bloom-line bg-bloom-surface p-4">
            <View className="flex-1 gap-1">
              <Text className="font-nunito-bold text-[17px] text-bloom-ink">Recordatorios</Text>
              <Text className="font-nunito text-[14px] text-bloom-text-secondary">
                Bloom te acompaña con avisos suaves. Si hoy no puedes, no pasa nada.
              </Text>
            </View>
            <Switch
              value={prefs.enabled}
              onValueChange={prefs.setEnabled}
              disabled={prefs.isSaving}
              accessibilityLabel="Recordatorios"
              trackColor={{ true: colors.purple, false: colors.line }}
            />
          </View>

          {prefs.error ? (
            <Text accessibilityRole="alert" className="font-nunito text-red-500">
              {prefs.error}
            </Text>
          ) : null}

          {prefs.systemBlocked ? (
            <View
              accessibilityRole="alert"
              className="items-center gap-3 rounded-card bg-bloom-purple-soft p-4"
            >
              <Text className="text-center font-nunito text-bloom-ink">
                Las notificaciones están bloqueadas en tu teléfono. Actívalas en Configuración para
                recibir tus recordatorios.
              </Text>
              <Button
                label="Abrir Configuración"
                variant="secondary"
                onPress={() => Linking.openSettings()}
              />
            </View>
          ) : null}
        </View>
      )}
    </SafeAreaView>
  );
}
