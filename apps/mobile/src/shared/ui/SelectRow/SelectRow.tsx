import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';

import { colors } from '@/shared/lib/theme';

type SelectRowProps = {
  title: string;
  description: string;
  selected: boolean;
  onPress: () => void;
  leading: ReactNode;
  showDivider?: boolean;
};

export function SelectRow({
  title,
  description,
  selected,
  onPress,
  leading,
  showDivider = true,
}: SelectRowProps) {
  return (
    <Pressable onPress={onPress} className="w-full">
      <View className="w-full flex-row items-center gap-3 py-4">
        {leading}
        <View className="flex-1 gap-1">
          <Text className="font-nunito-bold text-[19px] text-bloom-ink">{title}</Text>
          <Text className="font-nunito text-[15px] text-bloom-text-secondary">{description}</Text>
        </View>
        <View
          className={`h-[26px] w-[26px] items-center justify-center rounded-full ${
            selected ? 'bg-bloom-purple' : 'border border-bloom-line bg-bloom-surface'
          }`}
        >
          {selected ? <Ionicons name="checkmark" size={15} color={colors.surface} /> : null}
        </View>
      </View>
      {showDivider ? <View className="h-px w-full bg-bloom-line" /> : null}
    </Pressable>
  );
}
