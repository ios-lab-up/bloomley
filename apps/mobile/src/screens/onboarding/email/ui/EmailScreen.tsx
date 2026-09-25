import { isClerkAPIResponseError, useSignUp } from '@clerk/clerk-expo';
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

export function EmailScreen() {
  const router = useRouter();
  const { isLoaded, signUp, setActive } = useSignUp();

  const [step, setStep] = useState<'details' | 'verify'>('details');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canSubmitDetails = name.trim().length > 0 && email.trim().length > 0 && password.length > 0;
  const canSubmitCode = code.trim().length > 0;

  const handleCreateAccount = async () => {
    if (!isLoaded || !canSubmitDetails || isSubmitting) return;
    setError('');
    setIsSubmitting(true);
    try {
      await signUp.create({
        emailAddress: email.trim(),
        password,
        firstName: name.trim(),
      });
      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
      setStep('verify');
    } catch (err) {
      setError(firstClerkErrorMessage(err, 'No pudimos crear tu cuenta. Intenta de nuevo.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!isLoaded || !canSubmitCode || isSubmitting) return;
    setError('');
    setIsSubmitting(true);
    try {
      const result = await signUp.attemptEmailAddressVerification({ code: code.trim() });
      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId });
        router.replace('/');
      } else {
        setError('Código incorrecto. Revisa tu correo e intenta de nuevo.');
      }
    } catch (err) {
      setError(firstClerkErrorMessage(err, 'Código incorrecto. Intenta de nuevo.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (step === 'verify') {
    return (
      <OnboardingScreenLayout
        footer={
          <>
            <Button
              label="Confirmar"
              disabled={!canSubmitCode}
              loading={isSubmitting}
              onPress={handleVerifyCode}
            />
            {error ? (
              <Text className="text-center font-nunito text-xs text-red-500">{error}</Text>
            ) : null}
          </>
        }
      >
        <Pressable onPress={() => setStep('details')} hitSlop={8} className="h-6 w-6 justify-center">
          <Ionicons name="arrow-back" size={22} color={colors.ink} />
        </Pressable>
        <View className="gap-2">
          <Text className="font-nunito-bold text-3xl text-bloom-ink">Revisa tu correo</Text>
          <Text className="font-nunito text-base text-bloom-text-secondary">
            Te enviamos un código a {email}.
          </Text>
        </View>
        <TextField
          label="Código de verificación"
          value={code}
          onChangeText={setCode}
          placeholder="123456"
          keyboardType="number-pad"
        />
      </OnboardingScreenLayout>
    );
  }

  return (
    <OnboardingScreenLayout
      footer={
        <>
          <Button
            label="Guardar y seguir"
            disabled={!canSubmitDetails}
            loading={isSubmitting}
            onPress={handleCreateAccount}
          />
          <Text className="text-center font-nunito text-xs text-bloom-text-secondary">
            Al continuar aceptas los Términos y la Política de privacidad.
          </Text>
        </>
      }
    >
      <Pressable onPress={() => router.back()} hitSlop={8} className="h-6 w-6 justify-center">
        <Ionicons name="arrow-back" size={22} color={colors.ink} />
      </Pressable>
      <View className="gap-2">
        <Text className="font-nunito-bold text-3xl text-bloom-ink">Con tu correo</Text>
        <Text className="font-nunito text-base text-bloom-text-secondary">
          Tu nombre es para que Bloom te hable. Nada más.
        </Text>
      </View>
      <View className="gap-4">
        <TextField label="Nombre" value={name} onChangeText={setName} placeholder="Tu nombre" />
        <TextField
          label="Correo"
          value={email}
          onChangeText={setEmail}
          placeholder="tu@correo.com"
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <TextField
          label="Contraseña"
          value={password}
          onChangeText={setPassword}
          placeholder="Mínimo 8 caracteres"
          secureTextEntry
          autoCapitalize="none"
        />
        {error ? <Text className="font-nunito text-xs text-red-500">{error}</Text> : null}
      </View>
    </OnboardingScreenLayout>
  );
}
