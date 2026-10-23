import { Ionicons } from '@expo/vector-icons';
import { useUser } from '@clerk/clerk-expo';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useCurrentUser } from '@/entities/user';
import {
  normalizeUsername,
  useEditProfile,
  validateDisplayName,
  validateUsername,
} from '@/features/edit-profile';
import { colors } from '@/shared/lib/theme';
import { Button, TextField } from '@/shared/ui';

export function EditProfileScreen() {
  const router = useRouter();
  const { data: user, isPending, isError, refetch } = useCurrentUser();
  const { isLoaded: clerkLoaded, user: clerkUser } = useUser();

  return (
    <SafeAreaView className="flex-1 bg-bloom-bg">
      <View className="flex-row items-center gap-1 px-3 pb-2 pt-1">
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Volver"
          hitSlop={8}
          className="h-11 w-11 items-center justify-center"
        >
          <Ionicons name="chevron-back" size={26} color={colors.ink} />
        </Pressable>
        <Text accessibilityRole="header" className="font-nunito-bold text-[22px] text-bloom-ink">
          Nombre y usuario
        </Text>
      </View>

      {isError ? (
        <View className="flex-1 items-center justify-center gap-4 px-6">
          <Text className="text-center font-nunito text-bloom-ink">No pudimos cargar tu perfil.</Text>
          <Button label="Reintentar" onPress={() => refetch()} />
        </View>
      ) : isPending || !clerkLoaded || !user ? (
        <View className="flex-1 items-center justify-center gap-3">
          <ActivityIndicator />
          <Text className="font-nunito text-bloom-text-secondary">Cargando...</Text>
        </View>
      ) : (
        <EditProfileForm
          initialDisplayName={user.display_name}
          initialUsername={clerkUser?.username ?? ''}
          onSaved={() => router.back()}
        />
      )}
    </SafeAreaView>
  );
}

type FormProps = {
  initialDisplayName: string;
  initialUsername: string;
  onSaved: () => void;
};

function EditProfileForm({ initialDisplayName, initialUsername, onSaved }: FormProps) {
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [username, setUsername] = useState(initialUsername);
  const { save, errors, isSaving } = useEditProfile({
    displayName: initialDisplayName,
    username: initialUsername,
  });

  const nameChanged = displayName.trim() !== initialDisplayName.trim();
  const usernameChanged = normalizeUsername(username) !== initialUsername;
  const nameError = nameChanged ? validateDisplayName(displayName) : null;
  const usernameError = usernameChanged ? validateUsername(username) : null;
  const canSave = (nameChanged || usernameChanged) && !nameError && !usernameError;

  const handleSave = async () => {
    const ok = await save({ displayName, username });
    if (ok) onSaved();
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1 justify-between px-6 pb-6 pt-2"
    >
      <View className="gap-5">
        <TextField
          label="Nombre visible"
          value={displayName}
          onChangeText={setDisplayName}
          placeholder="Cómo te ven en tus grupos"
          autoCapitalize="words"
          error={nameError ?? errors.displayName}
        />
        <TextField
          label="Usuario"
          value={username}
          onChangeText={setUsername}
          placeholder="tu_usuario"
          autoCapitalize="none"
          error={usernameError ?? errors.username}
        />
      </View>
      <Button label="Guardar" onPress={handleSave} disabled={!canSave} loading={isSaving} />
    </KeyboardAvoidingView>
  );
}
