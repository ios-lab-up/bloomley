import type { ReactNode } from 'react';
import { Pressable, Text } from 'react-native';

type ButtonVariant = 'primary' | 'secondary' | 'social';

type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  icon?: ReactNode;
};

const containerByVariant: Record<ButtonVariant, string> = {
  primary: 'h-14 w-full items-center justify-center rounded-full bg-bloom-purple',
  secondary:
    'h-14 w-full items-center justify-center rounded-full border border-bloom-line bg-bloom-surface',
  social:
    'h-[52px] w-full flex-row items-center justify-center gap-2 rounded-btn border border-bloom-line bg-bloom-surface',
};

const labelByVariant: Record<ButtonVariant, string> = {
  primary: 'font-nunito-bold text-[17px] text-bloom-surface',
  secondary: 'font-nunito-bold text-[17px] text-bloom-ink',
  social: 'font-nunito-bold text-[15px] text-bloom-ink',
};

export function Button({ label, onPress, variant = 'primary', disabled, icon }: ButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      className={`${containerByVariant[variant]} ${disabled ? 'opacity-40' : ''}`}
    >
      {icon}
      <Text className={labelByVariant[variant]}>{label}</Text>
    </Pressable>
  );
}
