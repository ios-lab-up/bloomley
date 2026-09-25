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
      className={`h-11 flex-1 items-center justify-center rounded-btn border px-3 ${
        selected ? 'border-bloom-purple bg-bloom-purple' : 'border-bloom-line bg-bloom-surface'
      }`}
    >
      <Text
        className={`font-nunito-bold text-[15px] ${
          selected ? 'text-bloom-surface' : 'text-bloom-ink'
        }`}
      >
        {label}
      </Text>
    </Pressable>
  );
}
