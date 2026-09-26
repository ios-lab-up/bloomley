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
        <Text className="text-center font-nunito-bold text-[34px] text-bloom-ink">¿Cómo estás hoy?</Text>
        <Text className="text-center font-nunito text-[17px] text-bloom-text-secondary">
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
              <View className="h-16 w-16 overflow-hidden rounded-full bg-bloom-purple-soft">
                <Image
                  source={option.image}
                  style={{ width: 64, height: 64 }}
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
