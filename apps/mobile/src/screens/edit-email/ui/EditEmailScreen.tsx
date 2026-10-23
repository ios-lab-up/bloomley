import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useManageEmails } from '@/features/manage-email';
import { colors } from '@/shared/lib/theme';

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
      <View className="flex-row items-center gap-1 px-3 pb-2 pt-1">
        <Pressable
          onPress={goBack}
          accessibilityRole="button"
          accessibilityLabel="Volver"
          hitSlop={8}
          className="h-11 w-11 items-center justify-center"
        >
          <Ionicons name="chevron-back" size={26} color={colors.ink} />
        </Pressable>
        <Text accessibilityRole="header" className="font-nunito-bold text-[22px] text-bloom-ink">
          {title}
        </Text>
      </View>

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
