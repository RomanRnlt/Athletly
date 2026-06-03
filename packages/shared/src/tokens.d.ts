// SPDX-License-Identifier: MIT
/**
 * Type declarations for the plain-JS tokens module (tokens.js).
 * Keeps `Colors`/`BRAND_GRADIENT` strongly typed for TS consumers while the
 * runtime stays plain CJS (so tailwind configs can require it directly).
 */

export declare const Colors: {
  readonly background: string;
  readonly surface: string;
  readonly surfaceNested: string;
  readonly surfaceMuted: string;
  readonly primary: string;
  readonly primaryDark: string;
  readonly primaryLight: string;
  readonly primaryUltraLight: string;
  readonly gradientStart: string;
  readonly gradientMid: string;
  readonly gradientEnd: string;
  readonly textPrimary: string;
  readonly textSecondary: string;
  readonly textMuted: string;
  readonly textOnGradient: string;
  readonly textAccent: string;
  readonly success: string;
  readonly successLight: string;
  readonly warning: string;
  readonly warningLight: string;
  readonly error: string;
  readonly errorLight: string;
  readonly divider: string;
  readonly inputBg: string;
  readonly inputBorder: string;
  readonly inputFocusBorder: string;
  readonly cardBg: string;
  readonly tabActive: string;
  readonly tabInactive: string;
  readonly overlay: string;
  readonly ctaBg: string;
};

export declare const BRAND_GRADIENT: string;

export declare const tailwindColors: Record<string, string | Record<string, string>>;
