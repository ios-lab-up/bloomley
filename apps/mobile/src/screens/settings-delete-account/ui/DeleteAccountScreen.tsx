import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DeleteAccountForm } from '@/features/delete-account';
import { colors } from '@/shared/lib/theme';

export function DeleteAccountScreen() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-bloom-bg">
      <View className="flex-row items-center gap-1 px-3 pb-2 pt-1">
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Volver"
          hitSlop={8}
          className="h-11 w-11 items-center justify-center"
        >
          <Ionicons name="chevron-back" size={26} color={colors.ink} />
        </Pressable>
        <Text accessibilityRole="header" className="font-nunito-bold text-[22px] text-bloom-ink">
          Borrar mi cuenta
        </Text>
      </View>
      <ScrollView contentContainerClassName="px-6 pb-10 pt-2" keyboardShouldPersistTaps="handled">
        <DeleteAccountForm />
      </ScrollView>
    </SafeAreaView>
  );
}
