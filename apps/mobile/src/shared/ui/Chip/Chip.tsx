import { Pressable, Text } from 'react-native';

type ChipProps = {
  label: string;
  selected: boolean;
  onPress: () => void;
};

export function Chip({ label, selected, onPress }: ChipProps) {
  return (
    <Pressable
      onPress={onPress}
      className={`min-h-12 flex-1 items-center justify-center rounded-btn border px-4 py-2 ${
        selected ? 'border-bloom-purple bg-bloom-purple' : 'border-bloom-line bg-bloom-surface'
      }`}
    >
      <Text
        className={`text-center font-nunito-bold text-[16px] ${
          selected ? 'text-bloom-surface' : 'text-bloom-ink'
        }`}
      >
        {label}
      </Text>
    </Pressable>
  );
}
