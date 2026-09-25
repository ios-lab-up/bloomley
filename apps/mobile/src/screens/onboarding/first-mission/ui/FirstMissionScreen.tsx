import { useRouter } from 'expo-router';
import { Text, View } from 'react-native';

import { pillars } from '@/entities/onboarding';
import { useOnboardingFlow } from '@/features/onboarding-flow';
import { bloomImages } from '@/shared/assets/bloom';
import { BloomFrame, Button, OnboardingScreenLayout, ProgressDots } from '@/shared/ui';

export function FirstMissionScreen() {
  const router = useRouter();
  const { firstMission } = useOnboardingFlow();

  const pillarTitle = pillars.find((pillar) => pillar.id === firstMission?.pillarId)?.title ?? '';

  const goToSaveProgress = () => router.push('/onboarding/save-progress');

  return (
    <OnboardingScreenLayout
      footer={
        <>
          <Button label="La hago ahora" onPress={goToSaveProgress} />
          <Button label="Después" variant="secondary" onPress={goToSaveProgress} />
        </>
      }
    >
      <ProgressDots current={4} total={4} />
      <View className="items-center gap-8 pt-4">
        <BloomFrame source={bloomImages.happy} size={200} />
        <View className="w-full gap-2">
          <Text className="text-center font-nunito-bold text-[38px] text-bloom-ink">{firstMission?.title}</Text>
          <Text className="text-center font-nunito text-[17px] text-bloom-text-secondary">
            {firstMission?.description}
          </Text>
          {firstMission ? (
            <Text className="text-center font-nunito text-[15px] text-bloom-text-secondary">
              {pillarTitle} · {firstMission.durationMinutes} min · +{firstMission.xp} XP
            </Text>
          ) : null}
        </View>
      </View>
    </OnboardingScreenLayout>
  );
}
