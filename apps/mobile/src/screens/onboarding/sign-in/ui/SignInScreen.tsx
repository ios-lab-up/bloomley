import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { colors } from '@/shared/lib/theme';
import { Button, OnboardingScreenLayout, TextField } from '@/shared/ui';

export function SignInScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const canSubmit = email.trim().length > 0 && password.length > 0;

  return (
    <OnboardingScreenLayout
      footer={
        <>
          <Button
            label="Entrar"
            disabled={!canSubmit}
            onPress={() => router.replace('/')}
          />
          <View className="items-center gap-4 pt-2">
            <Text className="font-nunito text-[13px] text-bloom-text-secondary">
              o entra con
            </Text>
            <View className="w-full flex-row gap-3">
              <Pressable className="h-[52px] flex-1 items-center justify-center rounded-btn border border-bloom-line bg-bloom-surface">
                <Ionicons name="logo-apple" size={20} color={colors.ink} />
              </Pressable>
              <Pressable className="h-[52px] flex-1 items-center justify-center rounded-btn border border-bloom-line bg-bloom-surface">
                <Ionicons name="logo-google" size={20} color={colors.ink} />
              </Pressable>
            </View>
          </View>
        </>
      }
    >
      <Pressable onPress={() => router.back()} hitSlop={8} className="h-6 w-6 justify-center">
        <Ionicons name="arrow-back" size={22} color={colors.ink} />
      </Pressable>
      <View className="gap-2">
        <Text className="font-nunito-bold text-3xl text-bloom-ink">Entrar</Text>
        <Text className="font-nunito text-base text-bloom-text-secondary">
          Tu progreso sigue aquí.
        </Text>
      </View>
      <View className="gap-4">
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
          placeholder="Tu contraseña"
          secureTextEntry
          autoCapitalize="none"
        />
        <Text className="self-end font-nunito text-sm text-bloom-purple-deep">
          Olvidé mi contraseña
        </Text>
      </View>
    </OnboardingScreenLayout>
  );
}
