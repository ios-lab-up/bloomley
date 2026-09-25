import { useRouter } from 'expo-router';
import { Image, Text, View } from 'react-native';

import { energyOptions } from '@/entities/onboarding';
import { useOnboardingFlow } from '@/features/onboarding-flow';
import { Button, OnboardingScreenLayout, ProgressDots, SelectRow } from '@/shared/ui';

export function EnergyScreen() {
  const router = useRouter();
  const { energyLevel, setEnergyLevel } = useOnboardingFlow();

  return (
    <OnboardingScreenLayout
      footer={
        <Button
          label="Ver mi primera misión"
          disabled={!energyLevel}
          onPress={() => router.push('/onboarding/first-mission')}
        />
      }
    >
      <ProgressDots current={3} total={4} />
      <View className="gap-2">
        <Text className="font-nunito-bold text-3xl text-bloom-ink">¿Cómo estás hoy?</Text>
        <Text className="font-nunito text-base text-bloom-text-secondary">
          Sin respuesta correcta. Solo ajusta el tamaño de tu misión.
        </Text>
      </View>
      <View>
        {energyOptions.map((option, index) => (
          <SelectRow
            key={option.id}
            title={option.title}
            description={option.description}
            selected={energyLevel === option.id}
            onPress={() => setEnergyLevel(option.id)}
            showDivider={index < energyOptions.length - 1}
            leading={
              <View className="h-14 w-14 overflow-hidden rounded-2xl bg-bloom-purple-soft">
                <Image
                  source={option.image}
                  style={{ width: 56, height: 56 }}
                  resizeMode="cover"
                />
              </View>
            }
          />
        ))}
      </View>
    </OnboardingScreenLayout>
  );
}
