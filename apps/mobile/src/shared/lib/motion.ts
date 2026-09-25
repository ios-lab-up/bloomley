import { withDelay, withSpring } from 'react-native-reanimated';

export const SPRING = { damping: 18, stiffness: 200 };
export const STAGGER_MS = 100;

export function staggerEntering(delay: number) {
  return () => {
    'worklet';
    return {
      initialValues: { opacity: 0, transform: [{ translateY: 20 }] },
      animations: {
        opacity: withDelay(delay, withSpring(1, SPRING)),
        transform: [{ translateY: withDelay(delay, withSpring(0, SPRING)) }],
      },
    };
  };
}
