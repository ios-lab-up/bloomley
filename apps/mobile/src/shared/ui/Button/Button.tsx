import { useEffect, useRef, type ReactNode } from 'react';
import { ActivityIndicator, Pressable } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

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
  const reduceMotion = useReducedMotion();
  const scale = useSharedValue(1);
  const hasMounted = useRef(false);

  useEffect(() => {
    hasMounted.current = true;
  }, []);
  const enabled = useSharedValue(isDisabled ? 0 : 1);

  useEffect(() => {
    enabled.value = withTiming(isDisabled ? 0 : 1, { duration: reduceMotion ? 0 : 250 });
  }, [isDisabled, reduceMotion, enabled]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: 0.4 + enabled.value * 0.6,
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[{ width: '100%' }, animatedStyle]}>
      <Pressable
        onPress={onPress}
        onPressIn={() => {
          if (!reduceMotion) scale.value = withTiming(0.97, { duration: 100 });
        }}
        onPressOut={() => {
          if (!reduceMotion) scale.value = withTiming(1, { duration: 160 });
        }}
        disabled={isDisabled}
        className={containerByVariant[variant]}
      >
        {loading ? (
          <ActivityIndicator color={variant === 'primary' ? '#fff' : undefined} />
        ) : (
          <>
            {icon}
            <Animated.Text
              key={label}
              entering={reduceMotion || !hasMounted.current ? undefined : FadeIn.duration(200)}
              exiting={reduceMotion ? undefined : FadeOut.duration(120)}
              className={labelByVariant[variant]}
            >
              {label}
            </Animated.Text>
          </>
        )}
      </Pressable>
    </Animated.View>
  );
}
