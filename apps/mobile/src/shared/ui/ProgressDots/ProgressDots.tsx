import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { colors } from '@/shared/lib/theme';

type ProgressDotsProps = {
  current: number;
  total: number;
};

const DOT = 8;
const ACTIVE_WIDTH = 24;

function Dot({ isActive }: { isActive: boolean }) {
  const width = useSharedValue(DOT);
  const fill = useSharedValue(isActive ? 1 : 0);

  useEffect(() => {
    width.value = withDelay(
      250,
      withTiming(isActive ? ACTIVE_WIDTH : DOT, { duration: 400, easing: Easing.out(Easing.cubic) }),
    );
    fill.value = withDelay(250, withTiming(isActive ? 1 : 0, { duration: 400 }));
  }, [isActive, width, fill]);

  const style = useAnimatedStyle(() => ({
    width: width.value,
    backgroundColor: fill.value > 0.5 ? colors.purple : colors.line,
  }));

  return <Animated.View style={[{ height: DOT, borderRadius: DOT / 2 }, style]} />;
}

export function ProgressDots({ current, total }: ProgressDotsProps) {
  return (
    <View className="flex-row items-center justify-center gap-1.5 self-center">
      {Array.from({ length: total }, (_, index) => (
        <Dot key={index} isActive={index === current - 1} />
      ))}
    </View>
  );
}
