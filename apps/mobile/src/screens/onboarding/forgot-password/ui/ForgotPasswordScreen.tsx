import { isClerkAPIResponseError, useSignIn } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { colors } from '@/shared/lib/theme';
import { Button, OnboardingScreenLayout, TextField } from '@/shared/ui';

function firstClerkErrorMessage(error: unknown, fallback: string) {
  if (isClerkAPIResponseError(error)) {
    return error.errors[0]?.longMessage ?? error.errors[0]?.message ?? fallback;
  }
  return fallback;
}

// Two steps, same shape as the email sign-up flow: ask for the email and
// send a reset code, then take the code + new password and sign the user in.
export function ForgotPasswordScreen() {
  const router = useRouter();
  const { isLoaded, signIn, setActive } = useSignIn();

  const [step, setStep] = useState<'request' | 'reset'>('request');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canSubmit =
    step === 'request' ? email.trim().length > 0 : code.trim().length > 0 && password.length >= 8;

  const handleSubmit = async () => {
    if (!isLoaded || !canSubmit || isSubmitting) return;
    setError('');
    setIsSubmitting(true);
    try {
      if (step === 'request') {
        await signIn.create({ strategy: 'reset_password_email_code', identifier: email.trim() });
        setStep('reset');
      } else {
        const result = await signIn.attemptFirstFactor({
          strategy: 'reset_password_email_code',
          code: code.trim(),
          password,
        });
        if (result.status === 'complete') {
          await setActive({ session: result.createdSessionId });
          router.replace('/');
        } else {
          setError('No pudimos completar el cambio. Intenta de nuevo.');
        }
      }
    } catch (err) {
      setError(firstClerkErrorMessage(err, 'Algo salió mal. Intenta de nuevo.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <OnboardingScreenLayout
      footer={
        <>
          <Button
            label={step === 'request' ? 'Enviar código' : 'Cambiar contraseña'}
            disabled={!canSubmit}
            loading={isSubmitting}
            onPress={handleSubmit}
          />
          {error ? (
            <Text className="text-center font-nunito text-xs text-red-500">{error}</Text>
          ) : null}
        </>
      }
    >
      <Pressable onPress={() => router.back()} hitSlop={8} className="h-6 w-6 justify-center">
        <Ionicons name="arrow-back" size={22} color={colors.ink} />
      </Pressable>
      <View className="gap-2">
        <Text className="text-center font-nunito-bold text-[34px] text-bloom-ink">
          Recuperar acceso
        </Text>
        <Text className="text-center font-nunito text-[17px] text-bloom-text-secondary">
          {step === 'request'
            ? 'Escribe tu correo y te enviaremos un código.'
            : `Escribe el código que enviamos a ${email.trim()}.`}
        </Text>
      </View>
      <View className="gap-4">
        {step === 'request' ? (
          <TextField
            label="Correo"
            value={email}
            onChangeText={setEmail}
            placeholder="tu@correo.com"
            keyboardType="email-address"
            autoCapitalize="none"
          />
        ) : (
          <>
            <TextField
              label="Código"
              value={code}
              onChangeText={setCode}
              placeholder="123456"
              keyboardType="number-pad"
              autoCapitalize="none"
            />
            <TextField
              label="Nueva contraseña"
              value={password}
              onChangeText={setPassword}
              placeholder="Mínimo 8 caracteres"
              secureTextEntry
              autoCapitalize="none"
            />
          </>
        )}
      </View>
    </OnboardingScreenLayout>
  );
}
