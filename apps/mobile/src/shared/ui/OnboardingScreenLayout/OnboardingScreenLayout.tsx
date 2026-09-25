import type { ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
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
        contentContainerClassName="grow gap-6 pb-6 pt-4"
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
      {footer ? <View className="gap-3 px-5 pb-4 pt-2">{footer}</View> : null}
    </SafeAreaView>
  );
}
