import { ActivityIndicator, Text, View } from 'react-native';

import { isGroupOwner, useGroupMembers, type Group } from '@/entities/group';
import { AddMemberForm, RemoveMemberButton, RenameGroupForm } from '@/features/manage-group';
import { Button } from '@/shared/ui';

type GroupDetailSectionProps = {
  group: Group;
  currentUserId: string;
};

/** The selected group: info, members and, for its owner, the edit actions.
 * Design: frames 20 "Grupo · Activo" and 24 "Integrantes". */
export function GroupDetailSection({ group, currentUserId }: GroupDetailSectionProps) {
  const members = useGroupMembers(group.id);
  const isOwner = isGroupOwner(group, currentUserId);

  return (
    <View className="gap-4 rounded-card bg-bloom-surface p-4">
      <View className="gap-1">
        <Text className="font-nunito-bold text-[20px] text-bloom-ink">{group.name}</Text>
        <Text selectable className="font-nunito text-sm text-bloom-text-secondary">
          Código de invitación: {group.invite_code}
        </Text>
      </View>

      <View className="gap-2">
        <Text className="font-nunito-bold text-base text-bloom-ink">Integrantes</Text>
        {members.isPending ? <ActivityIndicator /> : null}
        {members.isError ? (
          <View className="gap-2">
            <Text className="font-nunito text-sm text-bloom-ink">
              No pudimos cargar a los integrantes.
            </Text>
            <Button label="Reintentar" variant="secondary" onPress={() => members.refetch()} />
          </View>
        ) : null}
        {members.data?.map((member) => {
          const isMe = member.user_id === currentUserId;
          const isGroupAdmin = member.user_id === group.created_by;
          return (
            <View
              key={member.membership_id}
              className="flex-row items-center justify-between border-t border-bloom-line pt-2"
            >
              <View className="flex-1 gap-0.5">
                <Text className="font-nunito-bold text-sm text-bloom-ink">
                  {member.display_name}
                  {isMe ? ' (tú)' : ''}
                </Text>
                <Text className="font-nunito text-xs text-bloom-text-secondary">
                  {member.username ? `@${member.username}` : 'Sin usuario'}
                  {isGroupAdmin ? ' · Administra el grupo' : ''}
                </Text>
              </View>
              {isOwner && !isMe ? <RemoveMemberButton groupId={group.id} member={member} /> : null}
            </View>
          );
        })}
      </View>

      {isOwner ? (
        <View className="gap-4 border-t border-bloom-line pt-4">
          <Text className="font-nunito-bold text-base text-bloom-ink">Editar grupo</Text>
          <RenameGroupForm key={group.id} group={group} />
          <AddMemberForm key={`add-${group.id}`} group={group} />
        </View>
      ) : null}
    </View>
  );
}
