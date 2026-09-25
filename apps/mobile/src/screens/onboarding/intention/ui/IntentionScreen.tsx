import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Text, TextInput, View } from 'react-native';

import { intentionOptions, pillars } from '@/entities/onboarding';
import { useOnboardingFlow } from '@/features/onboarding-flow';
import { colors } from '@/shared/lib/theme';
import { chunk } from '@/shared/lib/array';
import { Button, Chip, OnboardingScreenLayout, ProgressDots } from '@/shared/ui';

export function IntentionScreen() {
  const router = useRouter();
  const { selectedPillars, intention, toggleIntentionPreset, setIntentionCustomText } =
    useOnboardingFlow();

  const groups = pillars
    .filter((pillar) => selectedPillars.includes(pillar.id))
    .map((pillar) => ({
      pillar,
      options: intentionOptions.filter((option) => option.pillarId === pillar.id),
    }))
    .filter((group) => group.options.length > 0);

  const hasIntention = intention.presetIds.length > 0 || intention.customText.trim().length > 0;

  return (
    <OnboardingScreenLayout
      footer={
        <Button
          label="Continuar"
          disabled={!hasIntention}
          onPress={() => router.push('/onboarding/energy')}
        />
      }
    >
      <ProgressDots current={2} total={4} />
      <View className="gap-2">
        <Text className="text-center font-nunito-bold text-[34px] text-bloom-ink">
          ¿Qué quieres lograr esta semana?
        </Text>
        <Text className="text-center font-nunito text-[17px] text-bloom-text-secondary">
          Una sola intención. Bloom la convierte en misiones pequeñas.
        </Text>
      </View>

      {groups.map(({ pillar, options }) => (
        <View key={pillar.id} className="gap-3">
          <View className="flex-row items-center gap-2">
            <View className={`h-2.5 w-2.5 rounded-full ${pillar.dotColorClassName}`} />
            <Text className="text-center font-nunito text-[15px] text-bloom-text-secondary">{pillar.title}</Text>
          </View>
          <View className="gap-3">
            {chunk(options, 2).map((row) => (
              <View key={row.map((option) => option.id).join('-')} className="flex-row gap-3">
                {row.map((option) => (
                  <Chip
                    key={option.id}
                    label={option.label}
                    selected={intention.presetIds.includes(option.id)}
                    onPress={() => toggleIntentionPreset(option.id)}
                  />
                ))}
              </View>
            ))}
          </View>
        </View>
      ))}

      <View className="gap-3">
        <View className="flex-row items-center gap-2">
          <Ionicons name="create-outline" size={16} color={colors.textSecondary} />
          <Text className="text-center font-nunito text-[15px] text-bloom-text-secondary">O escribe la tuya</Text>
        </View>
        <View className="w-full flex-row items-center gap-2 rounded-btn border border-bloom-line bg-bloom-surface px-4 py-3">
          <TextInput
            value={intention.customText}
            onChangeText={setIntentionCustomText}
            placeholder="Ej. Caminar con mi perro cada tarde"
            placeholderTextColor={colors.textSecondary}
            className="flex-1 font-nunito text-[15px] text-bloom-ink"
          />
          <Ionicons name="sparkles" size={18} color={colors.purple} />
        </View>
        <Text className="font-nunito text-xs text-bloom-text-secondary">
          Bloom la convierte en misiones de 5 a 20 minutos.
        </Text>
      </View>
    </OnboardingScreenLayout>
  );
}
