// SPDX-License-Identifier: MIT
// Ported from mobile/lib/sport-icons.ts. Icons come from lucide-react (web)
// rather than lucide-react-native; the icon set + names are identical.
import {
  Activity,
  Bike,
  Dumbbell,
  Footprints,
  Heart,
  Mountain,
  Waves,
  Moon,
  type LucideIcon,
} from 'lucide-react';
import type { TranslateFn } from '@/i18n';

const SportIcons: Record<string, LucideIcon> = {
  running: Footprints,
  trail_running: Footprints,
  treadmill_running: Footprints,
  track_running: Footprints,
  indoor_running: Footprints,
  cycling: Bike,
  road_biking: Bike,
  mountain_biking: Bike,
  gravel_cycling: Bike,
  indoor_cycling: Bike,
  virtual_ride: Bike,
  swimming: Waves,
  lap_swimming: Waves,
  open_water_swimming: Waves,
  gym: Dumbbell,
  strength: Dumbbell,
  strength_training: Dumbbell,
  indoor_cardio: Dumbbell,
  yoga: Heart,
  pilates: Heart,
  hiking: Mountain,
  walking: Footprints,
  rest: Moon,
  default: Activity,
};

export function getSportIcon(sport: string): LucideIcon {
  return SportIcons[sport.toLowerCase()] ?? SportIcons.default;
}

// Sport keys that have a translated label (`sport.<key>` in the catalog). Kept
// as a set so getSportLabel can decide between a catalog lookup and a generic
// prettified fallback for unknown sports.
const KNOWN_SPORT_KEYS = new Set<string>([
  'running',
  'trail_running',
  'treadmill_running',
  'track_running',
  'indoor_running',
  'cycling',
  'road_biking',
  'mountain_biking',
  'gravel_cycling',
  'indoor_cycling',
  'virtual_ride',
  'swimming',
  'lap_swimming',
  'open_water_swimming',
  'gym',
  'strength',
  'strength_training',
  'indoor_cardio',
  'yoga',
  'pilates',
  'hiking',
  'walking',
]);

function prettify(raw: string): string {
  return raw
    .split('_')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/**
 * Translate a Garmin sport key. Pass the i18n `t`; unknown sports fall back to
 * a prettified version of the raw key (same behavior as before).
 */
export function getSportLabel(t: TranslateFn, sport: string): string {
  const key = sport.toLowerCase();
  if (KNOWN_SPORT_KEYS.has(key)) {
    return t(`sport.${key}` as Parameters<TranslateFn>[0]);
  }
  return prettify(sport);
}
