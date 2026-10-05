import { useUser } from '@clerk/clerk-expo';
import * as ImagePicker from 'expo-image-picker';
import { useCallback, useState } from 'react';

type Source = 'camera' | 'library';

type PendingUpload = { uri: string; dataUri: string };

const pickerOptions: ImagePicker.ImagePickerOptions = {
  mediaTypes: ['images'],
  allowsEditing: true,
  aspect: [1, 1],
  quality: 0.7,
  base64: true,
};

export function useProfilePhoto() {
  const { user: clerkUser } = useUser();
  const [pending, setPending] = useState<PendingUpload | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deniedSource, setDeniedSource] = useState<Source | null>(null);

  const upload = useCallback(
    async (next: PendingUpload) => {
      if (!clerkUser) return;
      setPending(next);
      setError(null);
      setIsBusy(true);
      try {
        await clerkUser.setProfileImage({ file: next.dataUri });
        await clerkUser.reload();
        setPending(null);
      } catch {
        // Se conserva `pending` para poder reintentar, pero la pantalla
        // vuelve a mostrar la foto anterior (clerkUser.imageUrl no cambio).
        setError('No pudimos subir tu foto. Intenta de nuevo.');
      } finally {
        setIsBusy(false);
      }
    },
    [clerkUser],
  );

  const pick = useCallback(
    async (source: Source) => {
      setError(null);
      setDeniedSource(null);

      const permission =
        source === 'camera'
          ? await ImagePicker.requestCameraPermissionsAsync()
          : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setDeniedSource(source);
        return;
      }

      const result =
        source === 'camera'
          ? await ImagePicker.launchCameraAsync(pickerOptions)
          : await ImagePicker.launchImageLibraryAsync(pickerOptions);
      if (result.canceled) return;

      const asset = result.assets[0];
      if (!asset?.base64) {
        setError('No pudimos leer esa foto. Prueba con otra.');
        return;
      }
      await upload({ uri: asset.uri, dataUri: `data:image/jpeg;base64,${asset.base64}` });
    },
    [upload],
  );

  const retry = useCallback(async () => {
    if (pending) await upload(pending);
  }, [pending, upload]);

  const remove = useCallback(async () => {
    if (!clerkUser) return;
    setError(null);
    setPending(null);
    setIsBusy(true);
    try {
      await clerkUser.setProfileImage({ file: null });
      await clerkUser.reload();
    } catch {
      setError('No pudimos quitar tu foto. Intenta de nuevo.');
    } finally {
      setIsBusy(false);
    }
  }, [clerkUser]);

  return {
    // Mientras sube se muestra la foto nueva; si falla, `error` convive con
    // la foto anterior y `canRetry` ofrece reintentar la misma imagen.
    previewUri: isBusy ? (pending?.uri ?? null) : null,
    currentImageUrl: clerkUser?.hasImage ? clerkUser.imageUrl : null,
    isBusy,
    error,
    canRetry: !!pending && !!error && !isBusy,
    deniedSource,
    pickFromLibrary: () => pick('library'),
    takePhoto: () => pick('camera'),
    retry,
    remove,
  };
}
