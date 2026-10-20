import { useUser } from '@clerk/clerk-expo';
import { useRouter } from 'expo-router';
import { ActivityIndicator, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { UserAvatar, useCurrentUser } from '@/entities/user';
import { Button } from '@/shared/ui';

export function ProfileScreen() {
  const router = useRouter();
  const { user: clerkUser } = useUser();
  const { data: user, isPending, isError, refetch, isFetching, isSignedIn } = useCurrentUser();

  if (!isSignedIn) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-bloom-bg px-6">
        <Text className="text-center font-nunito text-bloom-text-secondary">
          Inicia sesión para ver tu perfil.
        </Text>
      </SafeAreaView>
    );
  }

  if (isPending) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center gap-3 bg-bloom-bg">
        <ActivityIndicator />
        <Text className="font-nunito text-bloom-text-secondary">Cargando...</Text>
      </SafeAreaView>
    );
  }

  if (isError) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center gap-4 bg-bloom-bg px-6">
        <Text className="text-center font-nunito text-bloom-ink">No pudimos cargar tu perfil.</Text>
        <Button label="Reintentar" onPress={() => refetch()} />
      </SafeAreaView>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <SafeAreaView className="flex-1 bg-bloom-bg px-6">
      <View className="flex-1 items-center justify-center gap-6">
        <UserAvatar
          displayName={user.display_name}
          imageUrl={clerkUser?.hasImage ? clerkUser.imageUrl : null}
          size={96}
        />
        <View className="items-center gap-1">
          <Text className="font-nunito-bold text-[22px] text-bloom-ink">{user.display_name}</Text>
          <Text className="font-nunito text-bloom-text-secondary">{user.email}</Text>
        </View>
        <View className="w-full flex-row items-center justify-center gap-8 rounded-card bg-bloom-purple-soft p-4">
          <View className="items-center">
            <Text className="font-nunito-bold text-[20px] text-bloom-purple-deep">
              {user.level}
            </Text>
            <Text className="font-nunito text-xs text-bloom-text-secondary">Nivel</Text>
          </View>
          <View className="h-8 w-px bg-bloom-line" />
          <View className="items-center">
            <Text className="font-nunito-bold text-[20px] text-bloom-purple-deep">
              {user.xp_total}
            </Text>
            <Text className="font-nunito text-xs text-bloom-text-secondary">XP</Text>
          </View>
        </View>
        {isFetching ? (
          <Text className="font-nunito text-xs text-bloom-text-secondary">Actualizando...</Text>
        ) : null}
      </View>
      <View className="pb-6">
        <Button label="Ajustes" variant="secondary" onPress={() => router.push('/settings')} />
      </View>
    </SafeAreaView>
  );
}
