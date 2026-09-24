import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { colors } from '@/shared/lib/theme';
import { Button, OnboardingScreenLayout, TextField } from '@/shared/ui';

export function EmailScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const canSubmit = name.trim().length > 0 && email.trim().length > 0 && password.length > 0;

  return (
    <OnboardingScreenLayout
      footer={
        <>
          <Button
            label="Guardar y seguir"
            disabled={!canSubmit}
            onPress={() => router.replace('/')}
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
      </View>
    </OnboardingScreenLayout>
  );
}
