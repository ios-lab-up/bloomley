import { useState } from 'react';
import { Text, View } from 'react-native';

import { groupErrorMessage, useAddGroupMember, type Group } from '@/entities/group';
import { Button, TextField } from '@/shared/ui';

type AddMemberFormProps = {
  group: Group;
};

/** Owner-only. Design: frame 24 "Integrantes" (Invitar integrantes). */
export function AddMemberForm({ group }: AddMemberFormProps) {
  const [username, setUsername] = useState('');
  const [added, setAdded] = useState<string | null>(null);
  const addMember = useAddGroupMember();

  const handleSubmit = () => {
    // Usernames are stored lowercase; the API normalises too.
    const normalized = username.trim().replace(/^@/, '').toLowerCase();
    addMember.mutate(
      { groupId: group.id, username: normalized },
      {
        onSuccess: (member) => {
          setUsername('');
          setAdded(member.display_name);
        },
      },
    );
  };

  return (
    <View className="gap-3">
      <TextField
        label="Agregar por usuario"
        value={username}
        onChangeText={(value) => {
          setUsername(value);
          setAdded(null);
          addMember.reset();
        }}
        placeholder="@usuario"
        autoCapitalize="none"
        error={
          addMember.isError
            ? groupErrorMessage(addMember.error, {
                404: 'No encontramos a ese usuario.',
                409: 'Ya es parte del grupo.',
              })
            : undefined
        }
      />
      {added ? (
        <Text className="font-nunito text-sm text-bloom-text-secondary">
          {added} ya es parte del grupo.
        </Text>
      ) : null}
      <Button
        label="Agregar"
        variant="secondary"
        onPress={handleSubmit}
        disabled={username.trim().replace(/^@/, '').length === 0}
        loading={addMember.isPending}
      />
    </View>
  );
}
