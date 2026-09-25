// Raw v3 design tokens from bloomley.pen, for the rare spots NativeWind
// className can't reach (e.g. icon `color` props, expo-status-bar `style`).
// Prefer the matching `bloom-*` Tailwind classes (tailwind.config.js) in JSX.
export const colors = {
  bg: '#FBFAF7',
  surface: '#FFFFFF',
  ink: '#1E1A2B',
  textSecondary: '#6E6A7C',
  line: '#E8E4EE',
  purple: '#9161E8',
  purpleDeep: '#6E42C1',
  purpleSoft: '#9161E81A',
  coral: '#E8836B',
  sky: '#6FA3D9',
  sun: '#E3B54A',
} as const;

export const radius = {
  card: 24,
  btn: 16,
} as const;
