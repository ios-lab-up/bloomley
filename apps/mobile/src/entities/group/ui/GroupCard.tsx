import { Text, View } from 'react-native';

import type { Group, GroupStreak } from '../model/types';

type GroupCardProps = {
  group: Group;
  streak?: GroupStreak;
};

export function GroupCard({ group, streak }: GroupCardProps) {
  return (
    <View className="gap-1 rounded-card bg-bloom-surface p-4">
      <Text className="font-nunito-bold text-base text-bloom-ink">{group.name}</Text>
      <Text className="font-nunito text-sm text-bloom-text-secondary">
        Código: {group.invite_code}
      </Text>
      {streak ? (
        <Text className="font-nunito text-sm text-bloom-text-secondary">
          🔥 Racha de {streak.current_streak} días (mejor: {streak.longest_streak})
        </Text>
      ) : null}
    </View>
  );
}
