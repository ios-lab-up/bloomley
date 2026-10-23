import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ChangePasswordSection } from '@/features/account-password';
import { ActiveSessionsSection } from '@/features/active-sessions';
import { ConnectedAccountsSection } from '@/features/connected-accounts';
import { colors } from '@/shared/lib/theme';

export function SecurityScreen() {
  const router = useRouter();

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
          Seguridad
        </Text>
      </View>
      <ScrollView
        contentContainerClassName="gap-8 px-6 pb-10 pt-2"
        keyboardShouldPersistTaps="handled"
      >
        <ChangePasswordSection />
        <ActiveSessionsSection />
        <ConnectedAccountsSection />
      </ScrollView>
    </SafeAreaView>
  );
}
