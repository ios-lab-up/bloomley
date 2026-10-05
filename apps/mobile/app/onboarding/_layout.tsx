import { Stack } from 'expo-router';

export default function OnboardingLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        animationDuration: 350,
        gestureEnabled: true,
        contentStyle: { backgroundColor: '#FBFAF7' },
      }}
    >
      <Stack.Screen name="welcome" options={{ animation: 'fade', animationDuration: 400 }} />
    </Stack>
  );
}
