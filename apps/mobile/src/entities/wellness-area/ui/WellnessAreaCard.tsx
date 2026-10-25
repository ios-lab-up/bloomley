import { Text, View } from 'react-native';

import type { WellnessArea } from '../model/types';

export function WellnessAreaCard({ area }: { area: WellnessArea }) {
  return (
    <View className="rounded-2xl bg-emerald-50 p-4">
      <Text className="text-base font-semibold text-emerald-900">{area.name}</Text>
      <Text className="mt-1 text-sm text-slate-600">{area.description}</Text>
    </View>
  );
}