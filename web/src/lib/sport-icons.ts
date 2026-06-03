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

const SportLabels: Record<string, string> = {
  running: 'Laufen',
  trail_running: 'Trail',
  treadmill_running: 'Laufband',
  track_running: 'Bahn',
  indoor_running: 'Laufband',
  cycling: 'Radfahren',
  road_biking: 'Rennrad',
  mountain_biking: 'Mountainbike',
  gravel_cycling: 'Gravel',
  indoor_cycling: 'Indoor Bike',
  virtual_ride: 'Virtual Ride',
  swimming: 'Schwimmen',
  lap_swimming: 'Bahnen',
  open_water_swimming: 'Freiwasser',
  gym: 'Gym',
  strength: 'Kraft',
  strength_training: 'Kraft',
  indoor_cardio: 'Cardio',
  yoga: 'Yoga',
  pilates: 'Pilates',
  hiking: 'Wandern',
  walking: 'Gehen',
};

function prettify(raw: string): string {
  return raw
    .split('_')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export function getSportLabel(sport: string): string {
  const key = sport.toLowerCase();
  return SportLabels[key] ?? prettify(sport);
}
