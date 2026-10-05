import { Image, Text, View } from 'react-native';

type UserAvatarProps = {
  displayName: string;
  imageUrl?: string | null;
  size?: number;
};

export function UserAvatar({ displayName, imageUrl, size = 40 }: UserAvatarProps) {
  const initials =
    displayName
      .trim()
      .split(/\s+/)
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || '?';

  if (imageUrl) {
    return (
      <Image
        source={{ uri: imageUrl }}
        accessibilityIgnoresInvertColors
        style={{ width: size, height: size, borderRadius: size / 2 }}
      />
    );
  }

  return (
    <View
      className="items-center justify-center rounded-full bg-emerald-500"
      style={{ width: size, height: size }}
    >
      <Text className="font-semibold text-white" style={{ fontSize: Math.round(size * 0.35) }}>
        {initials}
      </Text>
    </View>
  );
}
