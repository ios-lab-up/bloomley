import { useUser } from '@clerk/clerk-expo';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useCurrentUser } from '@/entities/user';
import {
  normalizeUsername,
  useEditProfile,
  validateDisplayName,
  validateUsername,
} from '@/features/edit-profile';
import { Button, ScreenHeader, TextField } from '@/shared/ui';

export function EditProfileScreen() {
  const router = useRouter();
  const { data: user, isPending, isError, refetch } = useCurrentUser();
  const { isLoaded: clerkLoaded, user: clerkUser } = useUser();

  return (
    <SafeAreaView className="flex-1 bg-bloom-bg">
      <ScreenHeader title="Nombre y usuario" />

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
  const { save, errors, isSaving } = useEditProfile();

  const nameChanged = displayName.trim() !== initialDisplayName.trim();
  const usernameChanged = normalizeUsername(username) !== initialUsername;
  const nameError = nameChanged ? validateDisplayName(displayName) : null;
  const usernameError = usernameChanged ? validateUsername(username) : null;
  const canSave = (nameChanged || usernameChanged) && !nameError && !usernameError;

  const handleSave = async () => {
    const ok = await save({
      displayName: nameChanged ? displayName.trim() : undefined,
      username: usernameChanged ? normalizeUsername(username) : undefined,
    });
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
