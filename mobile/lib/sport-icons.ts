import {
  Activity,
  Bike,
  Dumbbell,
  Footprints,
  Heart,
  Mountain,
  Waves,
  Moon,
} from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';

const SportIcons: Record<string, LucideIcon> = {
  running: Footprints,
  cycling: Bike,
  swimming: Waves,
  gym: Dumbbell,
  strength: Dumbbell,
  yoga: Heart,
  hiking: Mountain,
  rest: Moon,
  default: Activity,
};

export function getSportIcon(sport: string): LucideIcon {
  return SportIcons[sport.toLowerCase()] ?? SportIcons.default;
}

const SportLabels: Record<string, string> = {
  running: 'Laufen',
  cycling: 'Radfahren',
  swimming: 'Schwimmen',
  gym: 'Gym',
  strength: 'Kraft',
  yoga: 'Yoga',
  hiking: 'Wandern',
};

export function getSportLabel(sport: string): string {
  return SportLabels[sport.toLowerCase()] ?? sport;
}
