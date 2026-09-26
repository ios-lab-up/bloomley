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
  keyboardType?: 'default' | 'email-address' | 'number-pad';
  autoCapitalize?: 'none' | 'words' | 'sentences';
  error?: string;
};

export function TextField({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  keyboardType = 'default',
  autoCapitalize = 'sentences',
  error,
}: TextFieldProps) {
  const [isRevealed, setIsRevealed] = useState(false);
  const hidesText = secureTextEntry && !isRevealed;

  return (
    <View className="w-full gap-2">
      <Text className="font-nunito-bold text-sm text-bloom-ink">{label}</Text>
      <View
        className={`h-[54px] w-full flex-row items-center rounded-btn border bg-bloom-surface px-4 ${
          error ? 'border-red-400' : 'border-bloom-line'
        }`}
      >
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
      {error ? <Text className="font-nunito text-xs text-red-500">{error}</Text> : null}
    </View>
  );
}
