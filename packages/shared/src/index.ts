/**
 * @athletly/shared - platform-neutral code shared between web and mobile.
 *
 * Contains ONLY platform-neutral values and types:
 *   - design tokens (color values, brand gradient)
 *   - the shared API contract types (chat, plan)
 *
 * No react-native, no next/web, no DOM imports here.
 */

export { Colors, BRAND_GRADIENT, tailwindColors } from './tokens.js';

export * from './types/chat';
export * from './types/plan';
