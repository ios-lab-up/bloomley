import { ActivityIndicator, Linking, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { UserAvatar, useCurrentUser } from '@/entities/user';
import { useProfilePhoto } from '@/features/profile-photo';
import { Button, ScreenHeader } from '@/shared/ui';

const AVATAR_SIZE = 144;

export function ProfilePhotoScreen() {
  const { data: user } = useCurrentUser();
  const photo = useProfilePhoto();
  const shownImage = photo.previewUri ?? photo.currentImageUrl;
  const deniedLabel = photo.deniedSource === 'camera' ? 'la cámara' : 'tus fotos';

  return (
    <SafeAreaView className="flex-1 bg-bloom-bg">
      <ScreenHeader title="Foto de perfil" />

      <View className="flex-1 items-center gap-6 px-6 pt-6">
        <View accessibilityLabel={photo.isBusy ? 'Subiendo foto' : 'Tu foto de perfil'}>
          <UserAvatar
            displayName={user?.display_name ?? ''}
            imageUrl={shownImage}
            size={AVATAR_SIZE}
          />
          {photo.isBusy ? (
            <View
              className="absolute items-center justify-center rounded-full bg-black/40"
              style={{ width: AVATAR_SIZE, height: AVATAR_SIZE }}
            >
              <ActivityIndicator color="#fff" />
            </View>
          ) : null}
        </View>

        {photo.error ? (
          <View accessibilityRole="alert" className="w-full items-center gap-3">
            <Text className="text-center font-nunito text-red-500">{photo.error}</Text>
            {photo.canRetry ? <Button label="Reintentar" onPress={photo.retry} /> : null}
          </View>
        ) : null}

        {photo.deniedSource ? (
          <View accessibilityRole="alert" className="w-full items-center gap-3 rounded-card bg-bloom-purple-soft p-4">
            <Text className="text-center font-nunito text-bloom-ink">
              Necesitamos acceso a {deniedLabel} para cambiar tu foto. Puedes activarlo en
              Configuración.
            </Text>
            <Button label="Abrir Configuración" variant="secondary" onPress={() => Linking.openSettings()} />
          </View>
        ) : null}

        <View className="w-full gap-3">
          <Button label="Elegir de la galería" onPress={photo.pickFromLibrary} disabled={photo.isBusy} />
          <Button label="Tomar foto" variant="secondary" onPress={photo.takePhoto} disabled={photo.isBusy} />
          {photo.currentImageUrl ? (
            <Button label="Quitar foto" variant="secondary" onPress={photo.remove} disabled={photo.isBusy} />
          ) : null}
        </View>
      </View>
    </SafeAreaView>
  );
}
