import { Text, View } from 'react-native';

import type { Checkin } from '../model/types';

export function CheckinCard({ checkin }: { checkin: Checkin }) {
  return (
    <View className="rounded-2xl bg-sky-50 p-4">
      <Text className="text-sm font-semibold capitalize text-sky-900">
        Energy: {checkin.energy_level}
      </Text>
      {checkin.intention ? (
        <Text className="mt-1 text-sm text-slate-700">{checkin.intention}</Text>
      ) : null}
      <Text className="mt-2 text-xs text-slate-400">
        {new Date(checkin.created_at).toLocaleString()}
      </Text>
    </View>
  );
}