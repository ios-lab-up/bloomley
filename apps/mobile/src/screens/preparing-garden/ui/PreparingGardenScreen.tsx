import { ActivityIndicator, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { bloomImages } from '@/shared/assets/bloom';
import { colors } from '@/shared/lib/theme';
import { BloomFrame, Button } from '@/shared/ui';

type PreparingGardenScreenProps = {
  status: 'preparing' | 'error';
  onRetry: () => void;
};

// Covers the gap between Clerk activating the session and the backend
// creating the user (webhook `user.created`): /users/me answers 401 until
// then. The spinner is static-friendly, so reduced motion needs no variant.
export function PreparingGardenScreen({ status, onRetry }: PreparingGardenScreenProps) {
  if (status === 'error') {
    return (
      <SafeAreaView className="flex-1 items-center justify-center gap-6 bg-bloom-bg px-6">
        <BloomFrame source={bloomImages.sleep} size={140} />
        <View className="gap-2">
          <Text className="text-center font-nunito-bold text-[26px] text-bloom-ink">
            Tu jardín está tardando
          </Text>
          <Text className="text-center font-nunito text-[17px] text-bloom-text-secondary">
            Aún no está listo, pero tu cuenta está a salvo. Intenta de nuevo en un momento.
          </Text>
        </View>
        <Button label="Reintentar" onPress={onRetry} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 items-center justify-center gap-6 bg-bloom-bg px-6">
      <BloomFrame source={bloomImages.tea} size={140} />
      <View className="gap-2">
        <Text className="text-center font-nunito-bold text-[26px] text-bloom-ink">
          Preparando tu jardín
        </Text>
        <Text className="text-center font-nunito text-[17px] text-bloom-text-secondary">
          Estamos dejando todo listo para ti. Solo será un momento.
        </Text>
      </View>
      <ActivityIndicator color={colors.purpleDeep} />
    </SafeAreaView>
  );
}
