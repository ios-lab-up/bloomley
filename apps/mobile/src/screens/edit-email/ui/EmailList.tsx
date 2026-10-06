import { useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';

import type { ManagedEmail } from '@/features/manage-email';
import { Button } from '@/shared/ui';

type Outcome = string | null;

type Props = {
  emails: ManagedEmail[];
  onAdd: () => void;
  onVerify: (id: string) => Promise<Outcome>;
  onMakePrimary: (id: string) => Promise<Outcome>;
  onRemove: (id: string) => Promise<Outcome>;
};

export function EmailList({ emails, onAdd, onVerify, onMakePrimary, onRemove }: Props) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async (id: string, action: (id: string) => Promise<Outcome>) => {
    setError(null);
    setBusyId(id);
    const outcome = await action(id);
    setBusyId(null);
    if (outcome) setError(outcome);
  };

  const confirmRemove = (item: ManagedEmail) =>
    Alert.alert('¿Quitar este correo?', item.email, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Quitar', style: 'destructive', onPress: () => run(item.id, onRemove) },
    ]);

  return (
    <View className="flex-1 justify-between px-6 pb-6">
      <ScrollView contentContainerClassName="gap-3 pt-2">
        {error ? (
          <Text accessibilityRole="alert" className="font-nunito text-red-500">
            {error}
          </Text>
        ) : null}
        {emails.map((item) => (
          <View key={item.id} className="gap-1 rounded-card border border-bloom-line bg-bloom-surface p-4">
            <Text className="font-nunito-bold text-[17px] text-bloom-ink">{item.email}</Text>
            <Text className="font-nunito text-[13px] text-bloom-text-secondary">
              {item.isPrimary ? 'Principal' : item.isVerified ? 'Verificado' : 'Sin verificar'}
            </Text>
            {!item.isPrimary ? (
              <View className="flex-row flex-wrap gap-x-5">
                {item.isVerified ? (
                  <RowAction
                    label="Hacer principal"
                    disabled={busyId === item.id}
                    onPress={() => run(item.id, onMakePrimary)}
                  />
                ) : (
                  <RowAction
                    label="Verificar"
                    disabled={busyId === item.id}
                    onPress={() => run(item.id, onVerify)}
                  />
                )}
                <RowAction label="Quitar" disabled={busyId === item.id} onPress={() => confirmRemove(item)} />
              </View>
            ) : null}
          </View>
        ))}
      </ScrollView>
      <Button label="Agregar correo" onPress={onAdd} />
    </View>
  );
}

function RowAction({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      className="min-h-[44px] justify-center"
    >
      <Text className="font-nunito-bold text-[15px] text-bloom-purple-deep">{label}</Text>
    </Pressable>
  );
}
