import type { ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import Animated, { Easing, FadeInDown, FadeInUp } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

type OnboardingScreenLayoutProps = {
  children: ReactNode;
  footer?: ReactNode;
};

export function OnboardingScreenLayout({ children, footer }: OnboardingScreenLayoutProps) {
  return (
    <SafeAreaView className="flex-1 bg-bloom-bg">
      <ScrollView
        className="flex-1 px-5"
        contentContainerClassName="grow pb-6 pt-4"
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View
          entering={FadeInDown.duration(500).delay(120).easing(Easing.out(Easing.cubic))}
          style={{ flexGrow: 1, gap: 24 }}
        >
          {children}
        </Animated.View>
      </ScrollView>
      {footer ? (
        <Animated.View
          entering={FadeInUp.duration(500).delay(260).easing(Easing.out(Easing.cubic))}
        >
          <View className="gap-3 px-5 pb-4 pt-2">{footer}</View>
        </Animated.View>
      ) : null}
    </SafeAreaView>
  );
}
