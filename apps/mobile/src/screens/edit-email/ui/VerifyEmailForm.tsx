import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, Text, View } from 'react-native';

import { Button, TextField } from '@/shared/ui';

type Outcome = string | null;

type Props = {
  email: string;
  onVerify: (code: string) => Promise<Outcome>;
  onResend: () => Promise<Outcome>;
  onVerified: () => void;
};

export function VerifyEmailForm({ email, onVerify, onResend, onVerified }: Props) {
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);

  const handleVerify = async () => {
    setError(null);
    setNotice(null);
    setIsSubmitting(true);
    const outcome = await onVerify(code);
    setIsSubmitting(false);
    if (outcome) setError(outcome);
    else onVerified();
  };

  const handleResend = async () => {
    setError(null);
    setNotice(null);
    setIsResending(true);
    const outcome = await onResend();
    setIsResending(false);
    if (outcome) setError(outcome);
    else setNotice('Te enviamos un código nuevo.');
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1 justify-between px-6 pb-6 pt-2"
    >
      <View className="gap-3">
        <Text className="font-nunito text-[15px] text-bloom-text-secondary">
          Escribe el código que enviamos a {email}.
        </Text>
        <TextField
          label="Código de verificación"
          value={code}
          onChangeText={setCode}
          placeholder="123456"
          keyboardType="number-pad"
          error={error ?? undefined}
        />
        {notice ? (
          <Text accessibilityRole="alert" className="font-nunito text-xs text-bloom-text-secondary">
            {notice}
          </Text>
        ) : null}
        <Pressable
          onPress={handleResend}
          disabled={isResending}
          accessibilityRole="button"
          accessibilityLabel="Reenviar código"
          accessibilityState={{ disabled: isResending }}
          className="min-h-[44px] justify-center self-start"
        >
          <Text className="font-nunito-bold text-[15px] text-bloom-purple-deep">Reenviar código</Text>
        </Pressable>
      </View>
      <Button
        label="Confirmar"
        onPress={handleVerify}
        disabled={code.trim().length === 0}
        loading={isSubmitting}
      />
    </KeyboardAvoidingView>
  );
}
