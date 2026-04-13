export const Colors = {
  // Base
  background: '#0a0a0a',
  surface: '#141414',
  surfaceElevated: '#1e1e1e',
  border: '#2a2a2a',

  // Text
  textPrimary: '#f5f5f5',
  textSecondary: '#8a8a8a',
  textTertiary: '#4a4a4a',

  // Brand
  accent: '#ff3b30', // RELENTLESS red — urgent by default
  accentMuted: '#3d1410',

  // Status
  success: '#30d158',
  warning: '#ffd60a',
  danger: '#ff3b30',

  // Escalation levels (tonal feedback in the UI)
  level0: '#30d158', // friendly
  level1: '#ffd60a', // direct
  level2: '#ff9f0a', // urgent
  level3: '#ff3b30', // serious
  level4: '#ff2d55', // cannot be ignored

  // Goal health
  onTrack: '#30d158',
  atRisk: '#ffd60a',
  behind: '#ff3b30',
} as const;
