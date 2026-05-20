export interface PlannedSession {
  id: string;
  sport: string;
  session_type: string;
  intensity: string;
  duration_minutes: number;
  description: string;
}

export interface DayPlan {
  date: string;
  sessions: readonly PlannedSession[];
  rest_reason?: string;
}

export interface WeeklyPlan {
  weekStart: string;
  days: readonly DayPlan[];
  coachMessage?: string;
}
