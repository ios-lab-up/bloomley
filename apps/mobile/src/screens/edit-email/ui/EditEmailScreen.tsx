import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useManageEmails } from '@/features/manage-email';
import { ScreenHeader } from '@/shared/ui';

import { AddEmailForm } from './AddEmailForm';
import { EmailList } from './EmailList';
import { VerifyEmailForm } from './VerifyEmailForm';

type View_ = { name: 'list' } | { name: 'add' } | { name: 'verify'; emailId: string };

export function EditEmailScreen() {
  const router = useRouter();
  const manager = useManageEmails();
  const [view, setView] = useState<View_>({ name: 'list' });

  const goBack = () => (view.name === 'list' ? router.back() : setView({ name: 'list' }));
  const title = view.name === 'add' ? 'Agregar correo' : view.name === 'verify' ? 'Verifica tu correo' : 'Correo';

  return (
    <SafeAreaView className="flex-1 bg-bloom-bg">
      <ScreenHeader title={title} onBack={goBack} />

      {!manager.isLoaded ? (
        <View className="flex-1 items-center justify-center gap-3">
          <ActivityIndicator />
          <Text className="font-nunito text-bloom-text-secondary">Cargando...</Text>
        </View>
      ) : view.name === 'list' ? (
        <EmailList
          emails={manager.emails}
          onAdd={() => setView({ name: 'add' })}
          onVerify={async (emailId) => {
            const error = await manager.sendCode(emailId);
            if (!error) setView({ name: 'verify', emailId });
            return error;
          }}
          onMakePrimary={manager.makePrimary}
          onRemove={manager.remove}
        />
      ) : view.name === 'add' ? (
        <AddEmailForm
          onSubmit={manager.addEmail}
          onCodeSent={(emailId) => setView({ name: 'verify', emailId })}
        />
      ) : (
        <VerifyEmailForm
          email={manager.emails.find((item) => item.id === view.emailId)?.email ?? ''}
          onVerify={(code) => manager.verify(view.emailId, code)}
          onResend={() => manager.sendCode(view.emailId)}
          onVerified={() => setView({ name: 'list' })}
        />
      )}
    </SafeAreaView>
  );
}
