import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, Text } from 'react-native';

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

  return (
    <Pressable
      onPress={onPress}
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
  );
}
