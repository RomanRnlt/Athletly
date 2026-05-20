import type { WeeklyPlan } from '@/types/plan';
import type { ChatMessage } from '@/types/chat';

function toLocalISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function getCurrentMonday(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return toLocalISO(new Date(d.getFullYear(), d.getMonth(), diff));
}

function getDateOffset(weekStart: string, dayOffset: number): string {
  const d = new Date(weekStart + 'T12:00:00');
  d.setDate(d.getDate() + dayOffset);
  return toLocalISO(d);
}

const weekStart = getCurrentMonday();

export const mockWeeklyPlan: WeeklyPlan = {
  weekStart,
  coachMessage:
    'Solide Woche mit Fokus auf Grundlagenausdauer. Donnerstag ist Intervalltag, am Wochenende der lange Lauf.',
  days: [
    {
      date: getDateOffset(weekStart, 0),
      sessions: [
        {
          id: 'mo-1',
          sport: 'running',
          session_type: 'easy_run',
          intensity: 'easy',
          duration_minutes: 45,
          description: 'Lockerer Dauerlauf im Wohlfühltempo. Atmung tief und ruhig halten.',
        },
      ],
    },
    {
      date: getDateOffset(weekStart, 1),
      sessions: [
        {
          id: 'di-1',
          sport: 'gym',
          session_type: 'strength',
          intensity: 'moderate',
          duration_minutes: 60,
          description: 'Ganzkörper-Kraft: Kniebeugen, Kreuzheben, Klimmzüge, Plank.',
        },
      ],
    },
    {
      date: getDateOffset(weekStart, 2),
      sessions: [],
      rest_reason: 'Aktive Erholung. Spaziergang oder leichte Mobility ist ideal.',
    },
    {
      date: getDateOffset(weekStart, 3),
      sessions: [
        {
          id: 'do-1',
          sport: 'running',
          session_type: 'intervals',
          intensity: 'high',
          duration_minutes: 50,
          description: '15 Min Warmup, 6x 800m in 3:30/km mit 2 Min Trabpause, 10 Min Cooldown.',
        },
      ],
    },
    {
      date: getDateOffset(weekStart, 4),
      sessions: [
        {
          id: 'fr-1',
          sport: 'cycling',
          session_type: 'endurance',
          intensity: 'moderate',
          duration_minutes: 75,
          description: 'Hügelige Tour in Zone 2. Trittfrequenz um 90 rpm.',
        },
      ],
    },
    {
      date: getDateOffset(weekStart, 5),
      sessions: [
        {
          id: 'sa-1',
          sport: 'swimming',
          session_type: 'endurance',
          intensity: 'moderate',
          duration_minutes: 40,
          description: '8x 200m Kraul mit 30s Pause. Sauberer Zug, ruhige Atmung.',
        },
      ],
    },
    {
      date: getDateOffset(weekStart, 6),
      sessions: [
        {
          id: 'so-1',
          sport: 'running',
          session_type: 'long_run',
          intensity: 'easy',
          duration_minutes: 90,
          description: 'Langer Lauf bei niedriger Intensität. Hydration nicht vergessen.',
        },
      ],
    },
  ],
};

export const mockChatMessages: ChatMessage[] = [
  {
    id: 'm1',
    role: 'assistant',
    content:
      'Servus Roman, schön dass du da bist. Wie war dein Training gestern? Hast du dich erholt gefühlt?',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 4),
  },
  {
    id: 'm2',
    role: 'user',
    content:
      'War gut, aber die letzten Intervalle haben gezogen. Beine fühlen sich heute schwer an.',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 3.8),
  },
  {
    id: 'm3',
    role: 'assistant',
    content:
      'Verstehe. Heute steht ein lockerer Lauf an. Wenn die Beine schwer sind, dreh das Tempo bewusst runter und bleib in Zone 1-2. Lieber 5 Sekunden langsamer als geplant.',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 3.7),
  },
  {
    id: 'm4',
    role: 'system',
    content: 'Plan für diese Woche aktualisiert.',
    timestamp: new Date(Date.now() - 1000 * 60 * 30),
  },
  {
    id: 'm5',
    role: 'user',
    content: 'Passt. Wann ist nochmal der nächste Intervalltag?',
    timestamp: new Date(Date.now() - 1000 * 60 * 20),
  },
  {
    id: 'm6',
    role: 'assistant',
    content:
      'Donnerstag. 6x 800m in 3:30/km mit 2 Minuten Trabpause. Wir wärmen 15 Minuten auf und laufen 10 Minuten aus.',
    timestamp: new Date(Date.now() - 1000 * 60 * 18),
  },
];

export const mockUser = {
  email: 'roman.rnlt@gmail.com',
  createdAt: '2026-01-15',
};
