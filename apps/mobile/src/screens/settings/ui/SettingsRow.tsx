import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { Pressable, Text, View } from 'react-native';

import { colors } from '@/shared/lib/theme';

type SettingsRowProps = {
  label: string;
  icon: ComponentProps<typeof Ionicons>['name'];
  onPress: () => void;
  showChevron?: boolean;
  disabled?: boolean;
  showDivider?: boolean;
};

export function SettingsRow({
  label,
  icon,
  onPress,
  showChevron = true,
  disabled,
  showDivider = true,
}: SettingsRowProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      className="w-full"
    >
      <View className="min-h-[52px] w-full flex-row items-center gap-3 py-3">
        <Ionicons name={icon} size={22} color={colors.ink} />
        <Text className="flex-1 font-nunito-semibold text-[17px] text-bloom-ink">{label}</Text>
        {showChevron ? (
          <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
        ) : null}
      </View>
      {showDivider ? <View className="h-px w-full bg-bloom-line" /> : null}
    </Pressable>
  );
}
