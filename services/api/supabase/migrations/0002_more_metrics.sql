-- Additional daily health metrics columns (SpO2, respiration).
-- vo2max + intensity_minutes already exist in 0001; the sync now fills them.

alter table public.health_daily_metrics
    add column if not exists spo2_avg          double precision,
    add column if not exists respiration_avg   double precision;
