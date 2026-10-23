import { useState } from 'react';
import { Switch, Text, View } from 'react-native';

import { colors } from '@/shared/lib/theme';
import { Button, TextField } from '@/shared/ui';

import { useChangePassword } from '../model/useChangePassword';

export function ChangePasswordSection() {
  const { hasPassword, submit, error, isSubmitting } = useChangePassword();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [signOutOfOtherSessions, setSignOutOfOtherSessions] = useState(false);
  const [didSucceed, setDidSucceed] = useState(false);

  const canSubmit = newPassword.length > 0 && (!hasPassword || currentPassword.length > 0);

  const handleSubmit = async () => {
    setDidSucceed(false);
    const ok = await submit({ currentPassword, newPassword, signOutOfOtherSessions });
    if (ok) {
      setCurrentPassword('');
      setNewPassword('');
      setDidSucceed(true);
    }
  };

  return (
    <View className="gap-4">
      <Text accessibilityRole="header" className="font-nunito-bold text-[20px] text-bloom-ink">
        {hasPassword ? 'Cambiar contraseña' : 'Crear contraseña'}
      </Text>
      {!hasPassword ? (
        <Text className="font-nunito text-[15px] text-bloom-text-secondary">
          Entraste con Google o Apple. Puedes crear una contraseña para también entrar con tu correo.
        </Text>
      ) : null}
      {hasPassword ? (
        <TextField
          label="Contraseña actual"
          value={currentPassword}
          onChangeText={setCurrentPassword}
          placeholder="Tu contraseña actual"
          secureTextEntry
          autoCapitalize="none"
        />
      ) : null}
      <TextField
        label="Nueva contraseña"
        value={newPassword}
        onChangeText={setNewPassword}
        placeholder="Tu nueva contraseña"
        secureTextEntry
        autoCapitalize="none"
      />
      <View className="min-h-[44px] flex-row items-center justify-between gap-3">
        <Text className="flex-1 font-nunito text-[15px] text-bloom-ink">
          Cerrar sesión en mis otros dispositivos
        </Text>
        <Switch
          value={signOutOfOtherSessions}
          onValueChange={setSignOutOfOtherSessions}
          trackColor={{ true: colors.purple }}
          accessibilityLabel="Cerrar sesión en mis otros dispositivos"
        />
      </View>
      {error ? <Text className="font-nunito text-xs text-red-500">{error}</Text> : null}
      {didSucceed ? (
        <Text className="font-nunito text-[15px] text-bloom-purple-deep">
          Listo, tu contraseña quedó guardada.
        </Text>
      ) : null}
      <Button
        label={hasPassword ? 'Cambiar contraseña' : 'Crear contraseña'}
        disabled={!canSubmit}
        loading={isSubmitting}
        onPress={handleSubmit}
      />
    </View>
  );
}
