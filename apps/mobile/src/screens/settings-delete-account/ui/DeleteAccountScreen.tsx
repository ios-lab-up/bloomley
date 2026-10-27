import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DeleteAccountForm } from '@/features/delete-account';
import { ScreenHeader } from '@/shared/ui';

export function DeleteAccountScreen() {
  return (
    <SafeAreaView className="flex-1 bg-bloom-bg">
      <ScreenHeader title="Borrar mi cuenta" />
      <ScrollView contentContainerClassName="px-6 pb-10 pt-2" keyboardShouldPersistTaps="handled">
        <DeleteAccountForm />
      </ScrollView>
    </SafeAreaView>
  );
}
