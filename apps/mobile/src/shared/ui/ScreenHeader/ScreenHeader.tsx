import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { colors } from '@/shared/lib/theme';

type ScreenHeaderProps = {
  title: string;
  /** Defaults to router.back(); pass it for in-screen steps (e.g. edit-email). */
  onBack?: () => void;
};

// ponytail: hand-rolled to keep BLO-6's left-aligned 22px title. The native
// Stack header (headerShown + title) replaces this if design accepts iOS's
// centered title.
export function ScreenHeader({ title, onBack }: ScreenHeaderProps) {
  const router = useRouter();

  return (
    <View className="flex-row items-center gap-1 px-3 pb-2 pt-1">
      <Pressable
        onPress={onBack ?? (() => router.back())}
        accessibilityRole="button"
        accessibilityLabel="Volver"
        hitSlop={8}
        className="h-11 w-11 items-center justify-center"
      >
        <Ionicons name="chevron-back" size={26} color={colors.ink} />
      </Pressable>
      <Text accessibilityRole="header" className="font-nunito-bold text-[22px] text-bloom-ink">
        {title}
      </Text>
    </View>
  );
}
