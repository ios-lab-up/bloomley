import { createContext, useContext } from 'react';
import { makeMutable, type SharedValue } from 'react-native-reanimated';

const idle = makeMutable(0);

export const ScrollYContext = createContext<SharedValue<number>>(idle);

export function useScrollY() {
  return useContext(ScrollYContext);
}
