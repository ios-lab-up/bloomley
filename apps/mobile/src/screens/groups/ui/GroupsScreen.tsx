import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GroupCard, useMyGroups } from '@/entities/group';
import { useCurrentUser } from '@/entities/user';
import { CreateGroupForm } from '@/features/create-group';
import { JoinGroupForm } from '@/features/join-group';
import { Button } from '@/shared/ui';

import { GroupDetailSection } from './GroupDetailSection';

/**
 * Functional base for the Groups tab: every Groups action the API offers,
 * with minimal styling. The designed version (frames 20-24 in bloomley.pen)
 * is meant to restyle and rearrange these pieces, not rewrite them: each
 * action lives in its own feature slice.
 */
export function GroupsScreen() {
  const { data: user, isSignedIn } = useCurrentUser();
  const groups = useMyGroups();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  if (!isSignedIn) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-bloom-bg px-6">
        <Text className="text-center font-nunito text-bloom-text-secondary">
          Inicia sesión para ver tus grupos.
        </Text>
      </SafeAreaView>
    );
  }

  // Falls back to the first group, and drops a selection the user is no
  // longer part of (left, removed, or the group was deleted).
  const selected =
    groups.data?.find((group) => group.id === selectedId) ?? groups.data?.[0] ?? null;

  return (
    <SafeAreaView className="flex-1 bg-bloom-bg">
      <ScrollView contentContainerClassName="gap-8 px-6 py-6" keyboardShouldPersistTaps="handled">
        <Text className="font-nunito-bold text-[28px] text-bloom-ink">Grupos</Text>

        <View className="gap-3">
          <Text className="font-nunito-bold text-lg text-bloom-ink">Mis grupos</Text>
          {groups.isPending ? <ActivityIndicator /> : null}
          {groups.isError ? (
            <View className="gap-2">
              <Text className="font-nunito text-bloom-ink">No pudimos cargar tus grupos.</Text>
              <Button label="Reintentar" variant="secondary" onPress={() => groups.refetch()} />
            </View>
          ) : null}
          {groups.data?.length === 0 ? (
            <Text className="font-nunito text-bloom-text-secondary">
              Aún no estás en ningún grupo. Crea uno o únete con un código.
            </Text>
          ) : null}
          {groups.data?.map((group) => (
            <Pressable
              key={group.id}
              onPress={() => setSelectedId(group.id)}
              accessibilityRole="button"
              accessibilityState={{ selected: group.id === selected?.id }}
              className={`rounded-card border-2 ${
                group.id === selected?.id ? 'border-bloom-purple' : 'border-transparent'
              }`}
            >
              <GroupCard group={group} />
            </Pressable>
          ))}
        </View>

        {selected && user ? <GroupDetailSection group={selected} currentUserId={user.id} /> : null}

        <View className="gap-3">
          <Text className="font-nunito-bold text-lg text-bloom-ink">Crear un grupo</Text>
          <CreateGroupForm onCreated={(group) => setSelectedId(group.id)} />
        </View>

        <View className="gap-3">
          <Text className="font-nunito-bold text-lg text-bloom-ink">Unirme a un grupo</Text>
          <JoinGroupForm onJoined={(group) => setSelectedId(group.id)} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
