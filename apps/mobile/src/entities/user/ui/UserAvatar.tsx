import { Text, View } from 'react-native';

export function UserAvatar({ displayName }: { displayName: string }) {
  const initials =
    displayName
      .trim()
      .split(/\s+/)
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || '?';

  return (
    <View className="h-10 w-10 items-center justify-center rounded-full bg-emerald-500">
      <Text className="text-sm font-semibold text-white">{initials}</Text>
    </View>
  );
}
