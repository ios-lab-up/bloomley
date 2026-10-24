import { useState } from 'react';
import { View } from 'react-native';

import { groupErrorMessage, useRenameGroup, type Group } from '@/entities/group';
import { Button, TextField } from '@/shared/ui';

type RenameGroupFormProps = {
  group: Group;
};

/** Owner-only. Render it with `key={group.id}` so switching groups resets it. */
export function RenameGroupForm({ group }: RenameGroupFormProps) {
  const [name, setName] = useState(group.name);
  const renameGroup = useRenameGroup();
  const trimmed = name.trim();

  return (
    <View className="gap-3">
      <TextField
        label="Nombre del grupo"
        value={name}
        onChangeText={(value) => {
          setName(value);
          renameGroup.reset();
        }}
        error={renameGroup.isError ? groupErrorMessage(renameGroup.error) : undefined}
      />
      <Button
        label="Guardar nombre"
        variant="secondary"
        onPress={() => renameGroup.mutate({ groupId: group.id, name: trimmed })}
        disabled={trimmed.length === 0 || trimmed === group.name}
        loading={renameGroup.isPending}
      />
    </View>
  );
}
