import { Text, View } from 'react-native';

import type { Streak } from '../model/types';

export function StreakBadge({ streak }: { streak: Streak }) {
  return (
    <View className="rounded-full bg-amber-100 px-4 py-2">
      <Text className="text-base font-bold text-amber-800">
        {streak.current_streak} d{' '}
        <Text className="font-medium text-amber-600">
          (récord {streak.longest_streak})
        </Text>
      </Text>
    </View>
  );
}