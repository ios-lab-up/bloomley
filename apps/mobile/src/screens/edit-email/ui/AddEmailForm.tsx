import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Text, View } from 'react-native';

import { validateEmail } from '@/features/manage-email';
import { Button, TextField } from '@/shared/ui';

type Props = {
  onSubmit: (email: string) => Promise<{ id: string } | { error: string }>;
  onCodeSent: (emailId: string) => void;
};

export function AddEmailForm({ onSubmit, onCodeSent }: Props) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const formatError = email.trim().length > 0 ? validateEmail(email) : null;
  const canSubmit = email.trim().length > 0 && !formatError;

  const handleSubmit = async () => {
    setError(null);
    setIsSubmitting(true);
    const result = await onSubmit(email);
    setIsSubmitting(false);
    if ('error' in result) setError(result.error);
    else onCodeSent(result.id);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1 justify-between px-6 pb-6 pt-2"
    >
      <View className="gap-3">
        <Text className="font-nunito text-[15px] text-bloom-text-secondary">
          Te enviaremos un código para confirmar que es tuyo.
        </Text>
        <TextField
          label="Correo nuevo"
          value={email}
          onChangeText={setEmail}
          placeholder="tu@correo.com"
          keyboardType="email-address"
          autoCapitalize="none"
          error={formatError ?? error ?? undefined}
        />
      </View>
      <Button label="Enviar código" onPress={handleSubmit} disabled={!canSubmit} loading={isSubmitting} />
    </KeyboardAvoidingView>
  );
}
