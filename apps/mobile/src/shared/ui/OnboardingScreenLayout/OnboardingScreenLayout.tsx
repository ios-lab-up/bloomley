import * as Haptics from 'expo-haptics';
import { Children, useEffect, type ReactNode } from 'react';
import { View } from 'react-native';
import Animated, {
  useAnimatedScrollHandler,
  useReducedMotion,
  useSharedValue,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { STAGGER_MS, staggerEntering } from '@/shared/lib/motion';
import { ScrollYContext } from '@/shared/lib/parallax';

type OnboardingScreenLayoutProps = {
  children: ReactNode;
  footer?: ReactNode;
};

export function OnboardingScreenLayout({ children, footer }: OnboardingScreenLayoutProps) {
  const reduceMotion = useReducedMotion();
  const scrollY = useSharedValue(0);

  useEffect(() => {
    void Haptics.selectionAsync();
  }, []);

  const onScroll = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
  });

  const items = Children.toArray(children);

  return (
    <SafeAreaView className="flex-1 bg-bloom-bg">
      <ScrollYContext.Provider value={scrollY}>
        <Animated.ScrollView
          onScroll={onScroll}
          scrollEventThrottle={16}
          style={{ flex: 1, paddingHorizontal: 20 }}
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 24, paddingTop: 16, gap: 24 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {items.map((child, index) => (
            <Animated.View
              key={index}
              entering={staggerEntering(Math.min(index, 4) * STAGGER_MS, reduceMotion)}
            >
              {child}
            </Animated.View>
          ))}
        </Animated.ScrollView>
      </ScrollYContext.Provider>
      {footer ? (
        <Animated.View entering={staggerEntering(STAGGER_MS, reduceMotion)}>
          <View className="gap-3 px-5 pb-4 pt-2">{footer}</View>
        </Animated.View>
      ) : null}
    </SafeAreaView>
  );
}
