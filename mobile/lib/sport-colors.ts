// SPDX-License-Identifier: MIT
export const SportColors: Record<string, string> = {
  running: '#3B82F6',
  cycling: '#A855F7',
  swimming: '#06B6D4',
  gym: '#F59E0B',
  strength: '#F59E0B',
  yoga: '#EC4899',
  hiking: '#22C55E',
  rest: '#94A3B8',
  default: '#3B82F6',
};

export function getSportColor(sport: string): string {
  return SportColors[sport.toLowerCase()] || SportColors.default;
}
