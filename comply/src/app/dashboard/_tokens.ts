// Dashboard design tokens — single source of truth
// See polish spec section 0, rule 2

export const colors = {
  plum: '#33063D',
  iris: '#8A63E6',
  lavender: '#DAC0FD',
  mint: '#C8F6C0',
  white: '#FFFFFF',
  surface: '#F8F7FA',
  surfaceHover: '#FAFAFB',
  border: 'rgba(51, 6, 61, 0.12)',
  borderEmphasis: 'rgba(51, 6, 61, 0.20)',
  muted: 'rgba(51, 6, 61, 0.65)',

  // Status
  statusRed: '#B42318',
  statusRedBg: '#FEF3F2',
  statusAmber: '#B54708',
  statusAmberBg: '#FFFAEB',
  statusAmberBorder: '#FEDF89',
  statusGreen: '#067647',
  statusGreenBg: '#ECFDF3',
} as const

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const

export const radius = {
  chip: 6,
  card: 12,
  surface: 16,
} as const

// Eyebrow label style — use sparingly, section labels only
export const eyebrow = {
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: '0.08em',
  textTransform: 'uppercase' as const,
  color: colors.muted,
}

// Hero number — one per page max
export const heroNumber = {
  fontSize: 48,
  fontWeight: 600,
  color: colors.plum,
}

// Metric tile number
export const metricNumber = {
  fontSize: 24,
  fontWeight: 600,
  color: colors.plum,
}
