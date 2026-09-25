import type { ImageSourcePropType } from 'react-native';
import { Image, View } from 'react-native';

type BloomFrameProps = {
  source: ImageSourcePropType;
  size?: number;
};

export function BloomFrame({ source, size = 200 }: BloomFrameProps) {
  const blobSize = size * 0.82;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View
        className="bg-bloom-purple-soft"
        style={{
          position: 'absolute',
          width: blobSize,
          height: blobSize,
          borderRadius: blobSize / 2,
        }}
      />
      <Image source={source} style={{ width: size, height: size }} resizeMode="contain" />
    </View>
  );
}
