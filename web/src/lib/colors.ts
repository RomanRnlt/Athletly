/**
 * Ported 1:1 from mobile/lib/colors.ts. Used for inline styles (gradients,
 * dynamic colors) where a Tailwind class is not convenient. The same values
 * also live in tailwind.config.ts as class colors.
 */
export const Colors = {
  background: '#F0F2F5',
  surface: '#FFFFFF',
  surfaceNested: '#F5F6F8',
  surfaceMuted: '#E8EBF0',

  primary: '#2563EB',
  primaryDark: '#1D4ED8',
  primaryLight: '#DBEAFE',
  primaryUltraLight: '#EFF6FF',

  gradientStart: '#2563EB',
  gradientMid: '#4F46E5',
  gradientEnd: '#7C3AED',

  textPrimary: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#94A3B8',
  textOnGradient: '#FFFFFF',
  textAccent: '#2563EB',

  success: '#22C55E',
  successLight: '#DCFCE7',
  warning: '#F59E0B',
  warningLight: '#FEF3C7',
  error: '#EF4444',
  errorLight: '#FEE2E2',

  divider: '#E2E8F0',
  inputBg: '#FFFFFF',
  inputBorder: '#E2E8F0',
  inputFocusBorder: '#2563EB',
  cardBg: '#FFFFFF',
  tabActive: '#2563EB',
  tabInactive: '#94A3B8',

  overlay: 'rgba(0,0,0,0.4)',
  ctaBg: '#1E293B',
} as const;

/** The brand gradient, ported from the LinearGradient usage across screens. */
export const BRAND_GRADIENT =
  'linear-gradient(135deg, #2563EB 0%, #4F46E5 50%, #7C3AED 100%)';
