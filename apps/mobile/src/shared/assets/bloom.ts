// Central place for the mascot image requires (apps/mobile/assets/bloom),
// so slices only ever import via `@/shared/assets/bloom` instead of
// threading fragile relative paths through the tree.
export const bloomImages = {
  wave: require('../../../assets/bloom/BloomWave.png'),
  happy: require('../../../assets/bloom/BloomHappy.png'),
  trophy: require('../../../assets/bloom/BloomTrophy.png'),
  sleep: require('../../../assets/bloom/bloom-sleep.png'),
  tea: require('../../../assets/bloom/bloom-tea.png'),
  cheer: require('../../../assets/bloom/bloom-cheer.png'),
};
