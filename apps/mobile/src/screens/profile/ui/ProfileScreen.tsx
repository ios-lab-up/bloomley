import { useClerk } from '@clerk/clerk-expo';
import { useRouter } from 'expo-router';
import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { UserAvatar, useCurrentUser } from '@/entities/user';
import { PreparingGardenScreen } from '@/screens/preparing-garden';
import { Button } from '@/shared/ui';

export function ProfileScreen() {
  const router = useRouter();
  const { signOut } = useClerk();
  const { data: user, isPending, isError, refetch, isFetching, isSignedIn } = useCurrentUser();

  const handleSignOut = async () => {
    await signOut();
    router.replace('/');
  };

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
    return <PreparingGardenScreen status="preparing" onRetry={() => refetch()} />;
  }

  if (isError) {
    return <PreparingGardenScreen status="error" onRetry={() => refetch()} />;
  }

  if (!user) {
    return null;
  }

  return (
    <SafeAreaView className="flex-1 bg-bloom-bg px-6">
      <View className="flex-1 items-center justify-center gap-6">
        <UserAvatar displayName={user.display_name} />
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
        <Button label="Cerrar sesión" variant="secondary" onPress={handleSignOut} />
      </View>
    </SafeAreaView>
  );
}
