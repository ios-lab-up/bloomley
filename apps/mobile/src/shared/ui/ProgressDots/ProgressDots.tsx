import { View } from 'react-native';

type ProgressDotsProps = {
  current: number;
  total: number;
};

export function ProgressDots({ current, total }: ProgressDotsProps) {
  return (
    <View className="flex-row gap-1.5">
      {Array.from({ length: total }, (_, index) => {
        const isActive = index === current - 1;
        return (
          <View
            key={index}
            className={`h-2 rounded-full ${
              isActive ? 'w-6 bg-bloom-purple' : 'w-2 bg-bloom-line'
            }`}
          />
        );
      })}
    </View>
  );
}
