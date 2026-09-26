import { useRouter } from 'expo-router';
import { Text, View } from 'react-native';

import { pillars } from '@/entities/onboarding';
import { useOnboardingFlow } from '@/features/onboarding-flow';
import { Button, OnboardingScreenLayout, ProgressDots, SelectRow } from '@/shared/ui';

function helperLabel(count: number) {
  if (count === 0) return 'Elige al menos un pilar.';
  if (count === 1) return '1 pilar elegido';
  return `${count} pilares elegidos`;
}

export function PillarsScreen() {
  const router = useRouter();
  const { selectedPillars, togglePillar } = useOnboardingFlow();

  return (
    <OnboardingScreenLayout
      footer={
        <>
          <Text className="text-center font-nunito text-[15px] text-bloom-text-secondary">
            {helperLabel(selectedPillars.length)}
          </Text>
          <Button
            label="Continuar"
            disabled={selectedPillars.length === 0}
            onPress={() => router.push('/onboarding/intention')}
          />
        </>
      }
    >
      <ProgressDots current={1} total={4} />
      <View className="gap-2">
        <Text className="text-center font-nunito-bold text-[34px] text-bloom-ink">¿Qué quieres cuidar?</Text>
        <Text className="text-center font-nunito text-[17px] text-bloom-text-secondary">
          Elige uno o más. Puedes cambiarlo cuando quieras.
        </Text>
      </View>
      <View>
        {pillars.map((pillar, index) => (
          <SelectRow
            key={pillar.id}
            title={pillar.title}
            description={pillar.description}
            selected={selectedPillars.includes(pillar.id)}
            onPress={() => togglePillar(pillar.id)}
            showDivider={index < pillars.length - 1}
            leading={<View className={`h-2.5 w-2.5 rounded-full ${pillar.dotColorClassName}`} />}
          />
        ))}
      </View>
    </OnboardingScreenLayout>
  );
}
