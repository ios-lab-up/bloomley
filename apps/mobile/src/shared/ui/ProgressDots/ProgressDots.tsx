import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  Easing,
  interpolateColor,
  useAnimatedStyle,
  useReducedMotion,
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
  const reduceMotion = useReducedMotion();
  const width = useSharedValue(reduceMotion && isActive ? ACTIVE_WIDTH : DOT);
  const fill = useSharedValue(isActive ? 1 : 0);

  useEffect(() => {
    const duration = reduceMotion ? 0 : 400;
    const delay = reduceMotion ? 0 : 250;
    width.value = withDelay(
      delay,
      withTiming(isActive ? ACTIVE_WIDTH : DOT, { duration, easing: Easing.out(Easing.cubic) }),
    );
    fill.value = withDelay(delay, withTiming(isActive ? 1 : 0, { duration }));
  }, [isActive, reduceMotion, width, fill]);

  const style = useAnimatedStyle(() => ({
    width: width.value,
    backgroundColor: interpolateColor(fill.value, [0, 1], [colors.line, colors.purple]),
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
