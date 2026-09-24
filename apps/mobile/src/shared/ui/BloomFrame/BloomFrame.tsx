import type { ImageSourcePropType } from 'react-native';
import { Image, View } from 'react-native';

type BloomFrameProps = {
  source: ImageSourcePropType;
  size?: number;
};

export function BloomFrame({ source, size = 200 }: BloomFrameProps) {
  return (
    <View
      className="items-center justify-center overflow-hidden rounded-card bg-bloom-purple-soft"
      style={{ width: size, height: size }}
    >
      <Image source={source} style={{ width: size, height: size }} resizeMode="cover" />
    </View>
  );
}
