export const colors = {
  bg: '#F3F6FC',
  card: '#FFFFFF',
  border: '#E2E8F5',
  ink: '#1A1D2E',
  inkMuted: '#7C84A3',
  original: '#AEB6D4',
  pronunciation: '#5B5FEF',
  primary: '#5B5FEF',
  primaryText: '#FFFFFF',
  danger: '#E23B5C',
  chip: '#EEF1FD',
  sky: '#4FB6F7',
  indigo: '#5B5FEF',
  violet: '#8B5CF6',
  sakura: '#FF7FA8',
  glow: 'rgba(91, 95, 239, 0.35)',
};

export const gradients = {
  brand: ['#4FB6F7', '#5B5FEF', '#8B5CF6'] as const,
  brandSoft: ['#EAF3FF', '#EEF0FE', '#F5EEFE'] as const,
  sakura: ['#FF9FBE', '#FF7FA8'] as const,
};

export const type = {
  hint: 13,
  body: 15,
  translated: 21,
  japanese: 27,
  title: 20,
  display: 30,
};

export const radius = {
  sm: 12,
  md: 18,
  lg: 26,
  pill: 999,
};

export const shadow = {
  shadowColor: '#3742A8',
  shadowOpacity: 0.14,
  shadowRadius: 18,
  shadowOffset: { width: 0, height: 8 },
  elevation: 6,
};

export const glowShadow = {
  shadowColor: '#5B5FEF',
  shadowOpacity: 0.4,
  shadowRadius: 16,
  shadowOffset: { width: 0, height: 6 },
  elevation: 8,
};
