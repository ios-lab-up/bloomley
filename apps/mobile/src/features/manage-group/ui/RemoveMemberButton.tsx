import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { groupErrorMessage, useRemoveGroupMember, type GroupMember } from '@/entities/group';

type RemoveMemberButtonProps = {
  groupId: string;
  member: GroupMember;
};

/** Owner-only, and never for the owner themselves (they leave instead). */
export function RemoveMemberButton({ groupId, member }: RemoveMemberButtonProps) {
  const removeMember = useRemoveGroupMember();

  return (
    <View className="items-end gap-1">
      <Pressable
        onPress={() => removeMember.mutate({ groupId, userId: member.user_id })}
        disabled={removeMember.isPending}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={`Quitar a ${member.display_name} del grupo`}
      >
        {removeMember.isPending ? (
          <ActivityIndicator />
        ) : (
          <Text className="font-nunito-bold text-sm text-bloom-coral">Quitar</Text>
        )}
      </Pressable>
      {removeMember.isError ? (
        <Text className="font-nunito text-xs text-red-500">
          {groupErrorMessage(removeMember.error, { 404: 'Ya no es parte del grupo.' })}
        </Text>
      ) : null}
    </View>
  );
}
