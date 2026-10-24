import { useState } from 'react';
import { View } from 'react-native';

import { groupErrorMessage, useJoinGroup, type Group } from '@/entities/group';
import { Button, TextField } from '@/shared/ui';

type JoinGroupFormProps = {
  onJoined?: (group: Group) => void;
};

/** Design: frames 21 "Sin grupo" (Unirme con código) and 23 "Unirme". */
export function JoinGroupForm({ onJoined }: JoinGroupFormProps) {
  const [code, setCode] = useState('');
  const joinGroup = useJoinGroup();

  const handleSubmit = () => {
    // The API uppercases codes itself, so lowercase input still matches.
    joinGroup.mutate(code.trim(), {
      onSuccess: (group) => {
        setCode('');
        onJoined?.(group);
      },
    });
  };

  return (
    <View className="gap-3">
      <TextField
        label="Código de invitación"
        value={code}
        onChangeText={(value) => {
          setCode(value);
          joinGroup.reset();
        }}
        placeholder="Ej. K7Q2M9XA"
        autoCapitalize="none"
        error={
          joinGroup.isError
            ? groupErrorMessage(joinGroup.error, {
                404: 'Ese código no existe.',
                409: 'Ya eres parte de ese grupo.',
              })
            : undefined
        }
      />
      <Button
        label="Unirme"
        variant="secondary"
        onPress={handleSubmit}
        disabled={code.trim().length === 0}
        loading={joinGroup.isPending}
      />
    </View>
  );
}
