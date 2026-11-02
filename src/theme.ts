// Design language: a travel-notebook sticker sheet. Light, airy ground; sakura pink is the
// one loud colour (primary actions); sky and highlighter-yellow tint the secondary stickers
// (pronunciation / price). Rounded and friendly, never heavy.
export const colors = {
  bg: '#F4F7FE',
  card: '#FFFFFF',
  border: '#E7EBF5',
  ink: '#1C2038',
  inkMuted: '#6F7694',
  original: '#A3AAC4',
  pronunciation: '#E0336A',
  primary: '#FF4D82',
  primaryText: '#FFFFFF',
  danger: '#D23B4B',
  chip: '#ECF0FA',
  pink: '#FF4D82',
  pinkSoft: '#FFE4EC',
  pinkDeep: '#E0336A',
  sky: '#35B6F5',
  skySoft: '#DDF3FE',
  skyDeep: '#1B86BE',
  yellow: '#FFD93D',
  yellowSoft: '#FFF1B8',
  // legacy keys kept so untouched call sites keep compiling
  indigo: '#E0336A',
  violet: '#E0336A',
  sakura: '#FF4D82',
  glow: 'rgba(255, 77, 130, 0.25)',
};

// Flat on purpose (no gradient washes); kept as pairs so existing imports still work.
export const gradients = {
  brand: ['#FF4D82', '#FF4D82'] as const,
  brandSoft: ['#F4F7FE', '#F4F7FE'] as const,
  sakura: ['#FF4D82', '#FF4D82'] as const,
};

export const type = {
  hint: 13,
  body: 15,
  translated: 21,
  japanese: 32,
  title: 20,
  display: 34,
};

export const radius = {
  sm: 12,
  md: 20,
  lg: 28,
  pill: 999,
};

// Stickers sit flat; separation comes from tint and radius, not shadow.
export const shadow = {};
export const glowShadow = {};
