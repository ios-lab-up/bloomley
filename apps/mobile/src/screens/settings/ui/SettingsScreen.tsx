import { useRouter } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useSignOut } from '@/features/sign-out';
import { ScreenHeader } from '@/shared/ui';

import { settingsSections } from '../model/sections';
import { SettingsRow } from './SettingsRow';

export function SettingsScreen() {
  const router = useRouter();
  const { signOut, isSigningOut } = useSignOut();

  return (
    <SafeAreaView className="flex-1 bg-bloom-bg">
      <ScreenHeader title="Ajustes" />

      <ScrollView contentContainerClassName="gap-6 px-6 pb-8 pt-2">
        {settingsSections.map((section) => (
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
                    onPress={() => router.push(item.route)}
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
