import { useSignIn } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { isIdentifierNotFound, signInErrorMessage } from '@/shared/lib/clerkErrors';
import { colors } from '@/shared/lib/theme';
import { Button, OnboardingScreenLayout, TextField } from '@/shared/ui';

const RESET_STRATEGY = 'reset_password_email_code';

export function ForgotPasswordScreen() {
  const router = useRouter();
  const { isLoaded, signIn, setActive } = useSignIn();

  const [step, setStep] = useState<'email' | 'reset'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canSendCode = email.trim().length > 0;
  const canReset = code.trim().length > 0 && password.length > 0;

  const handleSendCode = async () => {
    if (!isLoaded || !canSendCode || isSubmitting) return;
    setError('');
    setIsSubmitting(true);
    try {
      await signIn.create({ strategy: RESET_STRATEGY, identifier: email.trim() });
      setStep('reset');
    } catch (err) {
      // Same screen whether or not the email exists, so this flow can't be
      // used to check who has an account. Resetting then fails generically.
      if (isIdentifierNotFound(err)) {
        setStep('reset');
      } else {
        setError(signInErrorMessage(err, 'No pudimos enviar el código. Intenta de nuevo.'));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = async () => {
    if (!isLoaded || !canReset || isSubmitting) return;
    setError('');
    setIsSubmitting(true);
    try {
      const result = await signIn.attemptFirstFactor({
        strategy: RESET_STRATEGY,
        code: code.trim(),
        password,
      });
      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId });
        router.replace('/');
      } else {
        setError('No pudimos cambiar tu contraseña. Intenta de nuevo.');
      }
    } catch (err) {
      setError(signInErrorMessage(err, 'No pudimos cambiar tu contraseña. Intenta de nuevo.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (step === 'reset') {
    return (
      <OnboardingScreenLayout
        footer={
          <>
            <Button
              label="Cambiar contraseña"
              disabled={!canReset}
              loading={isSubmitting}
              onPress={handleReset}
            />
            {error ? (
              <Text className="text-center font-nunito text-xs text-red-500">{error}</Text>
            ) : null}
          </>
        }
      >
        <Pressable
          onPress={() => {
            setError('');
            setStep('email');
          }}
          hitSlop={8}
          className="h-6 w-6 justify-center"
        >
          <Ionicons name="arrow-back" size={22} color={colors.ink} />
        </Pressable>
        <View className="gap-2">
          <Text className="text-center font-nunito-bold text-[34px] text-bloom-ink">Revisa tu correo</Text>
          <Text className="text-center font-nunito text-[17px] text-bloom-text-secondary">
            Si hay una cuenta con {email}, te enviamos un código.
          </Text>
        </View>
        <View className="gap-4">
          <TextField
            label="Código de verificación"
            value={code}
            onChangeText={setCode}
            placeholder="123456"
            keyboardType="number-pad"
          />
          <TextField
            label="Nueva contraseña"
            value={password}
            onChangeText={setPassword}
            placeholder="Tu nueva contraseña"
            secureTextEntry
            autoCapitalize="none"
          />
        </View>
      </OnboardingScreenLayout>
    );
  }

  return (
    <OnboardingScreenLayout
      footer={
        <>
          <Button
            label="Enviar código"
            disabled={!canSendCode}
            loading={isSubmitting}
            onPress={handleSendCode}
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
          Recupera tu contraseña
        </Text>
        <Text className="text-center font-nunito text-[17px] text-bloom-text-secondary">
          Te enviamos un código para elegir una nueva.
        </Text>
      </View>
      <TextField
        label="Correo"
        value={email}
        onChangeText={setEmail}
        placeholder="tu@correo.com"
        keyboardType="email-address"
        autoCapitalize="none"
      />
    </OnboardingScreenLayout>
  );
}
