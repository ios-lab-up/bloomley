import { Easing, withDelay, withTiming } from 'react-native-reanimated';

export const STAGGER_MS = 50;
export const easeOut = Easing.bezier(0.23, 1, 0.32, 1);

export function staggerEntering(delay: number, reduceMotion = false) {
  return () => {
    'worklet';
    const config = { duration: 340, easing: Easing.bezier(0.23, 1, 0.32, 1) };
    return {
      initialValues: { opacity: 0, transform: [{ translateY: reduceMotion ? 0 : 18 }] },
      animations: {
        opacity: withDelay(delay, withTiming(1, config)),
        transform: [{ translateY: withDelay(delay, withTiming(0, config)) }],
      },
    };
  };
}
