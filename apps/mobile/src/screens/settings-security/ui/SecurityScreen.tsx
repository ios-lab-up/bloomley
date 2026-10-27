import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ChangePasswordSection } from '@/features/account-password';
import { ActiveSessionsSection } from '@/features/active-sessions';
import { ConnectedAccountsSection } from '@/features/connected-accounts';
import { ScreenHeader } from '@/shared/ui';

export function SecurityScreen() {
  return (
    <SafeAreaView className="flex-1 bg-bloom-bg">
      <ScreenHeader title="Seguridad" />
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
