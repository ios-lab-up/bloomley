import * as Haptics from 'expo-haptics';
import { usePathname } from 'expo-router';
import { Children, useEffect, type ReactNode } from 'react';
import { View } from 'react-native';
import Animated, {
  Easing,
  interpolateColor,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { STAGGER_MS, staggerEntering } from '@/shared/lib/motion';
import { ScrollYContext } from '@/shared/lib/parallax';

type OnboardingScreenLayoutProps = {
  children: ReactNode;
  footer?: ReactNode;
};

const backgroundByRoute: Record<string, string> = {
  welcome: '#FBFAF7',
  pillars: '#F8F4FF',
  intention: '#F3F6FF',
  energy: '#FFF6F1',
  'first-mission': '#F4FAF6',
  'save-progress': '#F8F4FF',
  email: '#FBFAF7',
  'sign-in': '#FBFAF7',
};

let previousBackground = backgroundByRoute.welcome;

export function OnboardingScreenLayout({ children, footer }: OnboardingScreenLayoutProps) {
  const reduceMotion = useReducedMotion();
  const pathname = usePathname();
  const route = pathname.split('/').filter(Boolean).pop() ?? 'welcome';
  const targetBackground = backgroundByRoute[route] ?? backgroundByRoute.welcome;

  const scrollY = useSharedValue(0);
  const backgroundProgress = useSharedValue(reduceMotion ? 1 : 0);
  const fromBackground = previousBackground;

  useEffect(() => {
    previousBackground = targetBackground;
    backgroundProgress.value = reduceMotion
      ? 1
      : withTiming(1, { duration: 600, easing: Easing.inOut(Easing.cubic) });
    void Haptics.selectionAsync();
  }, [targetBackground, reduceMotion, backgroundProgress]);

  const onScroll = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
  });

  const backgroundStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      backgroundProgress.value,
      [0, 1],
      [fromBackground, targetBackground],
    ),
  }));

  const items = Children.toArray(children);

  return (
    <Animated.View style={[{ flex: 1 }, backgroundStyle]}>
      <SafeAreaView style={{ flex: 1 }}>
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
                entering={reduceMotion ? undefined : staggerEntering(index * STAGGER_MS)}
              >
                {child}
              </Animated.View>
            ))}
          </Animated.ScrollView>
        </ScrollYContext.Provider>
        {footer ? (
          <Animated.View
            entering={
              reduceMotion ? undefined : staggerEntering(Math.min(items.length, 2) * STAGGER_MS + STAGGER_MS)
            }
          >
            <View className="gap-3 px-5 pb-4 pt-2">{footer}</View>
          </Animated.View>
        ) : null}
      </SafeAreaView>
    </Animated.View>
  );
}
