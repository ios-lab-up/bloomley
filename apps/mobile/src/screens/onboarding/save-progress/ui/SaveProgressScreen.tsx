import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { intentionOptions, pillars } from '@/entities/onboarding';
import { useOnboardingFlow } from '@/features/onboarding-flow';
import { useSocialAuth } from '@/features/social-auth';
import { bloomImages } from '@/shared/assets/bloom';
import { isClerkConfigured } from '@/shared/lib/clerk';
import { colors } from '@/shared/lib/theme';
import { BloomFrame, OnboardingScreenLayout } from '@/shared/ui';

// Only mounted when Clerk is configured -- isolates the useSSO() call so
// this screen doesn't crash in the no-Clerk dev fallback (AppProviders
// renders the tree without ClerkProvider in that case).
function SocialSignInButtons() {
  const { signInWithGoogle, signInWithApple, isGoogleLoading, isAppleLoading, error } =
    useSocialAuth();

  return (
    <>
      <Pressable
        onPress={signInWithApple}
        disabled={isAppleLoading || isGoogleLoading}
        className="h-14 w-full flex-row items-center justify-center gap-2 rounded-btn bg-bloom-ink"
      >
        {isAppleLoading ? (
          <ActivityIndicator color={colors.surface} />
        ) : (
          <>
            <Ionicons name="logo-apple" size={18} color={colors.surface} />
            <Text className="font-nunito-bold text-[17px] text-bloom-surface">
              Continuar con Apple
            </Text>
          </>
        )}
      </Pressable>
      <Pressable
        onPress={signInWithGoogle}
        disabled={isAppleLoading || isGoogleLoading}
        className="h-14 w-full flex-row items-center justify-center gap-2 rounded-btn border border-bloom-line bg-bloom-surface"
      >
        {isGoogleLoading ? (
          <ActivityIndicator color={colors.ink} />
        ) : (
          <>
            <Ionicons name="logo-google" size={18} color={colors.ink} />
            <Text className="font-nunito-bold text-[17px] text-bloom-ink">
              Continuar con Google
            </Text>
          </>
        )}
      </Pressable>
      {error ? (
        <Text className="text-center font-nunito text-xs text-red-500">{error}</Text>
      ) : null}
    </>
  );
}

export function SaveProgressScreen() {
  const router = useRouter();
  const { firstMission, selectedPillars, intention } = useOnboardingFlow();

  const presetLabel = intentionOptions.find((option) =>
    intention.presetIds.includes(option.id),
  )?.label;
  const intentionLabel = intention.customText.trim() || presetLabel || 'Sin definir';
  const pillarNames = selectedPillars
    .map((pillarId) => pillars.find((pillar) => pillar.id === pillarId)?.title)
    .filter(Boolean)
    .join(', ');

  return (
    <OnboardingScreenLayout
      footer={
        <>
          {isClerkConfigured ? <SocialSignInButtons /> : null}
          <Pressable onPress={() => router.push('/onboarding/email')}>
            <Text className="text-center font-nunito-bold text-[15px] text-bloom-purple-deep">
              Usar correo
            </Text>
          </Pressable>
          <Text className="text-center font-nunito text-xs text-bloom-text-secondary">
            Al continuar aceptas los Términos y la Política de privacidad.
          </Text>
        </>
      }
    >
      <View className="items-center gap-6 pt-4">
        <BloomFrame source={bloomImages.trophy} size={140} />
        <View className="w-full gap-2">
          <Text className="text-center font-nunito-bold text-[34px] text-bloom-ink">Guarda tu progreso</Text>
          <Text className="text-center font-nunito text-[17px] text-bloom-text-secondary">
            Crea tu cuenta en un toque para no perder lo que ya elegiste.
          </Text>
        </View>
      </View>

      <View className="w-full gap-3 rounded-card bg-bloom-purple-soft p-4">
        {firstMission ? (
          <View className="flex-row items-center gap-3">
            <Ionicons name="checkmark-circle" size={20} color={colors.purpleDeep} />
            <Text className="flex-1 font-nunito-bold text-[15px] text-bloom-purple-deep">
              {firstMission.title} · +{firstMission.xp} XP
            </Text>
          </View>
        ) : null}
        <View className="flex-row items-center gap-3">
          <Ionicons name="compass-outline" size={20} color={colors.ink} />
          <Text className="flex-1 font-nunito-bold text-[15px] text-bloom-ink">
            Intención: {intentionLabel}
            {pillarNames ? ` · ${pillarNames}` : ''}
          </Text>
        </View>
      </View>
    </OnboardingScreenLayout>
  );
}
