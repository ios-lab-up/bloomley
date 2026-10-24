import { useState } from 'react';
import { View } from 'react-native';

import { groupErrorMessage, useCreateGroup, type Group } from '@/entities/group';
import { Button, TextField } from '@/shared/ui';

type CreateGroupFormProps = {
  onCreated?: (group: Group) => void;
};

/** Design: frames 21 "Sin grupo" (Crear grupo) and 22 "Crear". */
export function CreateGroupForm({ onCreated }: CreateGroupFormProps) {
  const [name, setName] = useState('');
  const createGroup = useCreateGroup();

  const handleSubmit = () => {
    createGroup.mutate(name.trim(), {
      onSuccess: (group) => {
        setName('');
        onCreated?.(group);
      },
    });
  };

  return (
    <View className="gap-3">
      <TextField
        label="Nombre del grupo"
        value={name}
        onChangeText={(value) => {
          setName(value);
          createGroup.reset();
        }}
        placeholder="Ej. Las del gym"
        error={createGroup.isError ? groupErrorMessage(createGroup.error) : undefined}
      />
      <Button
        label="Crear grupo"
        onPress={handleSubmit}
        disabled={name.trim().length === 0}
        loading={createGroup.isPending}
      />
    </View>
  );
}
