import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { colors } from '@/shared/lib/theme';

import { providers, useConnectedAccounts } from '../model/useConnectedAccounts';

export function ConnectedAccountsSection() {
  const { isConnected, isLastMethod, connect, disconnect, busyProvider, error } =
    useConnectedAccounts();
  const anyLastMethod = providers.some(isLastMethod);

  return (
    <View className="gap-4">
      <Text accessibilityRole="header" className="font-nunito-bold text-[20px] text-bloom-ink">
        Cuentas conectadas
      </Text>
      {providers.map((provider) => {
        const connected = isConnected(provider);
        const blocked = isLastMethod(provider);
        const busy = busyProvider === provider.id;
        return (
          <View key={provider.id} className="min-h-[52px] flex-row items-center gap-3">
            <Ionicons name={provider.icon} size={22} color={colors.ink} />
            <View className="flex-1">
              <Text className="font-nunito-semibold text-[17px] text-bloom-ink">{provider.label}</Text>
              <Text className="font-nunito text-[13px] text-bloom-text-secondary">
                {connected ? 'Conectada' : 'No conectada'}
              </Text>
            </View>
            {busy ? (
              <ActivityIndicator color={colors.purpleDeep} />
            ) : (
              <Pressable
                onPress={() => (connected ? disconnect(provider) : connect(provider))}
                disabled={blocked || !!busyProvider}
                accessibilityRole="button"
                accessibilityLabel={`${connected ? 'Desconectar' : 'Conectar'} ${provider.label}`}
                accessibilityState={{ disabled: blocked || !!busyProvider }}
                hitSlop={8}
                className="min-h-[44px] justify-center px-2"
              >
                <Text
                  className={`font-nunito-bold text-[15px] ${
                    blocked ? 'text-bloom-text-secondary' : 'text-bloom-purple-deep'
                  }`}
                >
                  {connected ? 'Desconectar' : 'Conectar'}
                </Text>
              </Pressable>
            )}
          </View>
        );
      })}
      {anyLastMethod ? (
        <Text className="font-nunito text-[13px] text-bloom-text-secondary">
          Es tu único método de entrada. Crea una contraseña o conecta otra cuenta para poder
          desconectarla.
        </Text>
      ) : null}
      {error ? <Text className="font-nunito text-xs text-red-500">{error}</Text> : null}
    </View>
  );
}
