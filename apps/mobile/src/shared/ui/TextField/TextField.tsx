import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { colors } from '@/shared/lib/theme';

type TextFieldProps = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address';
  autoCapitalize?: 'none' | 'words' | 'sentences';
};

export function TextField({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  keyboardType = 'default',
  autoCapitalize = 'sentences',
}: TextFieldProps) {
  const [isRevealed, setIsRevealed] = useState(false);
  const hidesText = secureTextEntry && !isRevealed;

  return (
    <View className="w-full gap-2">
      <Text className="font-nunito-bold text-sm text-bloom-ink">{label}</Text>
      <View className="h-[54px] w-full flex-row items-center rounded-btn border border-bloom-line bg-bloom-surface px-4">
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textSecondary}
          secureTextEntry={hidesText}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          className="flex-1 font-nunito text-base text-bloom-ink"
        />
        {secureTextEntry ? (
          <Pressable onPress={() => setIsRevealed((revealed) => !revealed)} hitSlop={8}>
            <Ionicons
              name={isRevealed ? 'eye-off' : 'eye'}
              size={20}
              color={colors.textSecondary}
            />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}
