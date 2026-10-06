import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useSignOut } from '@/features/sign-out';
import { colors } from '@/shared/lib/theme';

import { settingsSections, visibleSections } from '../model/sections';
import { SettingsRow } from './SettingsRow';

export function SettingsScreen() {
  const router = useRouter();
  const { signOut, isSigningOut } = useSignOut();
  const sections = visibleSections(settingsSections);

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
          Ajustes
        </Text>
      </View>

      <ScrollView contentContainerClassName="gap-6 px-6 pb-8 pt-2">
        {sections.map((section) => (
          <View key={section.id} className="gap-1">
            <Text
              accessibilityRole="header"
              className="font-nunito-bold text-[13px] uppercase tracking-wide text-bloom-text-secondary"
            >
              {section.title}
            </Text>
            <View>
              {section.items.map((item, index) => {
                const isLast = index === section.items.length - 1;
                if ('action' in item) {
                  return (
                    <SettingsRow
                      key={item.id}
                      label={item.label}
                      icon={item.icon}
                      onPress={signOut}
                      disabled={isSigningOut}
                      showChevron={false}
                      showDivider={!isLast}
                    />
                  );
                }
                return (
                  <SettingsRow
                    key={item.id}
                    label={item.label}
                    icon={item.icon}
                    onPress={() => router.push(item.route!)}
                    showDivider={!isLast}
                  />
                );
              })}
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
