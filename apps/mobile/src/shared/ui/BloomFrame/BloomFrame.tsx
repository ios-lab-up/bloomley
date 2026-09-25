import { useEffect } from 'react';
import type { ImageSourcePropType } from 'react-native';
import { Image, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  ZoomIn,
} from 'react-native-reanimated';

import { useScrollY } from '@/shared/lib/parallax';

type BloomFrameProps = {
  source: ImageSourcePropType;
  size?: number;
};

export function BloomFrame({ source, size = 200 }: BloomFrameProps) {
  const reduceMotion = useReducedMotion();
  const scrollY = useScrollY();
  const offset = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) return;
    offset.value = withRepeat(
      withSequence(
        withTiming(-6, { duration: 1800, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 1800, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
    );
  }, [offset, reduceMotion]);

  // Content scrolls at 1x; pushing the image down by 0.5x of the scroll makes it move at 0.5x.
  const parallaxStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: reduceMotion ? 0 : scrollY.value * 0.5 }],
  }));
  const floatStyle = useAnimatedStyle(() => ({ transform: [{ translateY: offset.value }] }));

  return (
    <Animated.View
      entering={reduceMotion ? undefined : ZoomIn.duration(600).delay(150).springify().damping(14)}
      style={parallaxStyle}
    >
      <Animated.View style={floatStyle}>
        <View
          className="items-center justify-center overflow-hidden rounded-full bg-bloom-purple-soft"
          style={{ width: size, height: size }}
        >
          <Image source={source} style={{ width: size, height: size }} resizeMode="cover" />
        </View>
      </Animated.View>
    </Animated.View>
  );
}
