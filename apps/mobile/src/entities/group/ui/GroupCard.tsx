import { Text, View } from 'react-native';

import type { Group, GroupStreak } from '../model/types';

type GroupCardProps = {
  group: Group;
  streak?: GroupStreak;
};

export function GroupCard({ group, streak }: GroupCardProps) {
  return (
    <View className="rounded-2xl bg-white p-4 shadow-sm">
      <Text className="text-base font-semibold text-slate-900">{group.name}</Text>
      <Text className="text-sm text-slate-500">Invite code: {group.inviteCode}</Text>
      {streak ? (
        <Text className="mt-1 text-sm text-slate-500">
          🔥 {streak.currentStreak} day streak (best {streak.longestStreak})
        </Text>
      ) : null}
    </View>
  );
}
