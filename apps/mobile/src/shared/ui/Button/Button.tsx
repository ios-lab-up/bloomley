import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, Text } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

type ButtonVariant = 'primary' | 'secondary' | 'social';

type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  icon?: ReactNode;
};

const containerByVariant: Record<ButtonVariant, string> = {
  primary: 'h-14 w-full items-center justify-center rounded-btn bg-bloom-purple',
  secondary:
    'h-14 w-full items-center justify-center rounded-btn border border-bloom-line bg-bloom-surface',
  social:
    'h-[52px] w-full flex-row items-center justify-center gap-2 rounded-btn border border-bloom-line bg-bloom-surface',
};

const labelByVariant: Record<ButtonVariant, string> = {
  primary: 'font-nunito-bold text-[17px] text-bloom-surface',
  secondary: 'font-nunito-bold text-[17px] text-bloom-ink',
  social: 'font-nunito-bold text-[15px] text-bloom-ink',
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled,
  loading,
  icon,
}: ButtonProps) {
  const isDisabled = disabled || loading;
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View style={[{ width: '100%' }, animatedStyle]}>
      <Pressable
        onPress={onPress}
        onPressIn={() => {
          scale.value = withSpring(0.97, { damping: 15, stiffness: 300 });
        }}
        onPressOut={() => {
          scale.value = withSpring(1, { damping: 12, stiffness: 250 });
        }}
        disabled={isDisabled}
        className={`${containerByVariant[variant]} ${isDisabled ? 'opacity-40' : ''}`}
      >
        {loading ? (
          <ActivityIndicator color={variant === 'primary' ? '#fff' : undefined} />
        ) : (
          <>
            {icon}
            <Text className={labelByVariant[variant]}>{label}</Text>
          </>
        )}
      </Pressable>
    </Animated.View>
  );
}
