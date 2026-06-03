// SPDX-License-Identifier: MIT
/**
 * Platform-neutral design tokens (single source of truth).
 *
 * Authored as plain JS (CommonJS) on purpose so it can be consumed three ways
 * without a build step:
 *   1. TypeScript app code (web + mobile) via the typed `Colors` export.
 *   2. The web Tailwind config (web/tailwind.config.ts).
 *   3. The mobile Tailwind config (mobile/tailwind.config.js, plain Node CJS).
 *
 * Color VALUES only. No react-native, no next/web, no DOM imports.
 */

/** Semantic color palette. Hex/rgba string values only. */
const Colors = {
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
};

/** The brand gradient (CSS string), ported from the LinearGradient usage. */
const BRAND_GRADIENT =
  'linear-gradient(135deg, #2563EB 0%, #4F46E5 50%, #7C3AED 100%)';

/**
 * Tailwind-class color map (kebab-case keys + sport palette). Mirrors `Colors`
 * for the class names both apps already use (bg-primary, text-text-primary,
 * bg-error-light, ...). Consumed by both tailwind.config files.
 */
const tailwindColors = {
  background: Colors.background,
  surface: Colors.surface,
  'surface-nested': Colors.surfaceNested,
  'surface-muted': Colors.surfaceMuted,
  primary: Colors.primary,
  'primary-dark': Colors.primaryDark,
  'primary-light': Colors.primaryLight,
  'primary-ultra-light': Colors.primaryUltraLight,
  'text-primary': Colors.textPrimary,
  'text-secondary': Colors.textSecondary,
  'text-muted': Colors.textMuted,
  divider: Colors.divider,
  success: Colors.success,
  'success-light': Colors.successLight,
  warning: Colors.warning,
  'warning-light': Colors.warningLight,
  error: Colors.error,
  'error-light': Colors.errorLight,
  sport: {
    running: '#3B82F6',
    cycling: '#A855F7',
    swimming: '#06B6D4',
    gym: '#F59E0B',
    rest: '#6B7280',
  },
};

module.exports = { Colors, BRAND_GRADIENT, tailwindColors };
