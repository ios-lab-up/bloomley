import { ActivityIndicator, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { bloomImages } from '@/shared/assets/bloom';
import { colors } from '@/shared/lib/theme';
import { BloomFrame, Button } from '@/shared/ui';

type PreparingGardenScreenProps = {
  status: 'preparing' | 'error';
  onRetry: () => void;
};

// Shown while /users/me loads (the API provisions the user on that first
// call) and if it still fails after retries. The spinner is static-friendly,
// so reduced motion needs no variant.
export function PreparingGardenScreen({ status, onRetry }: PreparingGardenScreenProps) {
  const isError = status === 'error';

  return (
    <SafeAreaView className="flex-1 items-center justify-center gap-6 bg-bloom-bg px-6">
      <BloomFrame source={isError ? bloomImages.sleep : bloomImages.tea} size={140} />
      <View className="gap-2">
        <Text className="text-center font-nunito-bold text-[26px] text-bloom-ink">
          {isError ? 'Tu jardín está tardando' : 'Preparando tu jardín'}
        </Text>
        <Text className="text-center font-nunito text-[17px] text-bloom-text-secondary">
          {isError
            ? 'Aún no está listo, pero tu cuenta está a salvo. Intenta de nuevo en un momento.'
            : 'Estamos dejando todo listo para ti. Solo será un momento.'}
        </Text>
      </View>
      {isError ? (
        <Button label="Reintentar" onPress={onRetry} />
      ) : (
        <ActivityIndicator color={colors.purpleDeep} />
      )}
    </SafeAreaView>
  );
}
