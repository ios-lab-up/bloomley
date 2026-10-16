import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { colors } from '@/shared/lib/theme';
import { Button, TextField } from '@/shared/ui';

import { DELETE_CONFIRMATION_WORD, useDeleteAccount } from '../model/useDeleteAccount';

const consequences = [
  'Se borra tu perfil, tu progreso y tu XP.',
  'Dejas de pertenecer a tus grupos. Si eras dueño de uno, pasa a otro miembro; si estabas solo, se borra.',
  'Esta acción no se puede deshacer.',
];

export function DeleteAccountForm() {
  const { deleteAccount, isDeleting, error } = useDeleteAccount();
  const [confirmation, setConfirmation] = useState('');

  const canDelete = confirmation.trim() === DELETE_CONFIRMATION_WORD;

  return (
    <View className="gap-6">
      <View className="gap-3 rounded-card bg-bloom-purple-soft p-4">
        <Text accessibilityRole="header" className="font-nunito-bold text-[17px] text-bloom-ink">
          Qué pasa si borras tu cuenta
        </Text>
        {consequences.map((text) => (
          <View key={text} className="flex-row items-start gap-3">
            <Ionicons name="alert-circle-outline" size={20} color={colors.purpleDeep} />
            <Text className="flex-1 font-nunito text-[15px] text-bloom-ink">{text}</Text>
          </View>
        ))}
      </View>
      <TextField
        label={`Escribe ${DELETE_CONFIRMATION_WORD} para confirmar`}
        value={confirmation}
        onChangeText={setConfirmation}
        placeholder={DELETE_CONFIRMATION_WORD}
        autoCapitalize="none"
      />
      {error ? <Text className="font-nunito text-xs text-red-500">{error}</Text> : null}
      <Button
        label="Borrar mi cuenta"
        disabled={!canDelete}
        loading={isDeleting}
        onPress={deleteAccount}
      />
    </View>
  );
}
