import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useEffect } from 'react';
import { Text, View } from 'react-native';
import Animated, { useReducedMotion } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { bloomImages } from '@/shared/assets/bloom';
import { STAGGER_MS, staggerEntering } from '@/shared/lib/motion';
import { BloomFrame, Button } from '@/shared/ui';

export function WelcomeScreen() {
  const router = useRouter();
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    void Haptics.selectionAsync();
  }, []);

  return (
    <SafeAreaView className="flex-1 bg-bloom-bg" style={{ flex: 1 }}>
      <View style={{ flex: 1, justifyContent: 'space-between', paddingHorizontal: 20 }}>
        <View className="flex-1 items-center justify-center gap-8">
          <BloomFrame source={bloomImages.wave} size={200} />
          <Animated.View
            entering={staggerEntering(STAGGER_MS, reduceMotion)}
            className="w-full gap-3"
          >
            <Text className="text-center font-nunito-bold text-[38px] text-bloom-ink">
              Pequeñas acciones.{'\n'}Grandes cambios.
            </Text>
            <Text className="text-center font-nunito text-[17px] text-bloom-text-secondary">
              Bloomley convierte tus metas de bienestar en una acción de hoy.
            </Text>
          </Animated.View>
        </View>
        <Animated.View
          entering={staggerEntering(STAGGER_MS * 2, reduceMotion)}
          style={{ gap: 12, paddingBottom: 24 }}
        >
          <Button label="Empezar" onPress={() => router.push('/onboarding/pillars')} />
          <Button
            label="Ya tengo cuenta"
            variant="secondary"
            onPress={() => router.push('/onboarding/sign-in')}
          />
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}
