import { useEffect } from 'react';
import type { ImageSourcePropType } from 'react-native';
import { Image, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  ZoomIn,
} from 'react-native-reanimated';

type BloomFrameProps = {
  source: ImageSourcePropType;
  size?: number;
};

export function BloomFrame({ source, size = 200 }: BloomFrameProps) {
  const offset = useSharedValue(0);

  useEffect(() => {
    offset.value = withRepeat(
      withSequence(
        withTiming(-6, { duration: 1800, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 1800, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
    );
  }, [offset]);

  const floatStyle = useAnimatedStyle(() => ({ transform: [{ translateY: offset.value }] }));

  return (
    <Animated.View entering={ZoomIn.duration(600).delay(150).springify().damping(14)}>
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
