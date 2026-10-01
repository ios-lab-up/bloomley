import { Text, View } from 'react-native';

import type { Mission } from '../model/types';

export function MissionCard({ mission }: { mission: Mission }) {
  return (
    <View className="rounded-2xl bg-white p-4 shadow-sm">
      <Text className="text-base font-semibold text-slate-900">{mission.title}</Text>
      <Text className="mt-1 text-sm text-slate-600">{mission.description}</Text>
      <View className="mt-3 flex-row gap-3">
        <Text className="text-xs font-medium text-emerald-700">
          {mission.duration_minutes} min
        </Text>
        <Text className="text-xs font-medium text-amber-600">
          +{mission.xp_reward} XP
        </Text>
      </View>
    </View>
  );
}