/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        'bloom-bg': '#FBFAF7',
        'bloom-surface': '#FFFFFF',
        'bloom-ink': '#1E1A2B',
        'bloom-text-secondary': '#6E6A7C',
        'bloom-line': '#E8E4EE',
        'bloom-purple': '#9161E8',
        'bloom-purple-deep': '#6E42C1',
        'bloom-purple-soft': '#9161E81A',
        'bloom-coral': '#E8836B',
        'bloom-sky': '#6FA3D9',
        'bloom-sun': '#E3B54A',
      },
      borderRadius: {
        card: '24px',
        btn: '16px',
      },
      fontFamily: {
        nunito: ['Nunito_400Regular'],
        'nunito-semibold': ['Nunito_600SemiBold'],
        'nunito-bold': ['Nunito_800ExtraBold'],
      },
    },
  },
  plugins: [],
};
