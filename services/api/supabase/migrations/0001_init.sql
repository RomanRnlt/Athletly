-- athletly_v2 initial schema
--
-- Wipes ALL existing tables in public (legacy athletly artefacts) and creates
-- a fresh per-account schema. auth.* is untouched: Supabase Auth keeps owning
-- auth.users, auth.sessions, providers config etc.
--
-- All app tables are scoped by account_id (uuid) referencing auth.users(id)
-- ON DELETE CASCADE: deleting the auth user wipes everything (true erasure).
-- RLS is enabled with owner-only policies. The backend uses the service-role
-- key, which bypasses RLS - it scopes by account_id explicitly. The mobile
-- client uses the anon key with the user's JWT and is RLS-bound.

begin;

-- Drop every table in public so the wipe is total.
do $$
declare
  r record;
begin
  for r in
    select tablename from pg_tables where schemaname = 'public'
  loop
    execute format('drop table if exists public.%I cascade', r.tablename);
  end loop;
end$$;

-- ---------------------------------------------------------------------------
-- athlete_profiles
-- One row per account. Sections kept as jsonb array of {name, content} so
-- the closed skeleton remains structural but content stays free prose.
-- ---------------------------------------------------------------------------

create table public.athlete_profiles (
    account_id            uuid        primary key references auth.users (id) on delete cascade,
    sections              jsonb       not null default '[]'::jsonb,
    onboarding_completed  boolean     not null default false,
    updated_at            timestamptz not null default now()
);

alter table public.athlete_profiles enable row level security;

create policy athlete_profiles_owner_select on public.athlete_profiles
    for select using (auth.uid() = account_id);
create policy athlete_profiles_owner_insert on public.athlete_profiles
    for insert with check (auth.uid() = account_id);
create policy athlete_profiles_owner_update on public.athlete_profiles
    for update using (auth.uid() = account_id);
create policy athlete_profiles_owner_delete on public.athlete_profiles
    for delete using (auth.uid() = account_id);

-- ---------------------------------------------------------------------------
-- garmin_tokens
-- One row per account. tokens_json is the opaque garth client.dumps() output.
-- ---------------------------------------------------------------------------

create table public.garmin_tokens (
    account_id        uuid        primary key references auth.users (id) on delete cascade,
    tokens_json       text        not null,
    email             text        not null,
    display_name      text        not null,
    connected_since   timestamptz not null default now()
);

alter table public.garmin_tokens enable row level security;

create policy garmin_tokens_owner_select on public.garmin_tokens
    for select using (auth.uid() = account_id);
create policy garmin_tokens_owner_insert on public.garmin_tokens
    for insert with check (auth.uid() = account_id);
create policy garmin_tokens_owner_update on public.garmin_tokens
    for update using (auth.uid() = account_id);
create policy garmin_tokens_owner_delete on public.garmin_tokens
    for delete using (auth.uid() = account_id);

-- ---------------------------------------------------------------------------
-- activities (Garmin-synced workouts)
-- ---------------------------------------------------------------------------

create table public.activities (
    id                    uuid        primary key default gen_random_uuid(),
    account_id            uuid        not null references auth.users (id) on delete cascade,
    garmin_activity_id    text        not null,
    sport                 text,
    start_time            timestamptz,
    duration_seconds      integer,
    distance_meters       double precision,
    avg_hr                integer,
    max_hr                integer,
    calories              integer,
    training_effect       double precision,
    vo2max_activity       double precision,
    avg_pace_min_km       double precision,
    elevation_gain_m      double precision,
    raw_data              jsonb       not null default '{}'::jsonb,
    synced_at             timestamptz not null default now(),

    unique (account_id, garmin_activity_id)
);

create index activities_account_start on public.activities (account_id, start_time desc);
create index activities_account_sport on public.activities (account_id, sport);

alter table public.activities enable row level security;

create policy activities_owner_select on public.activities
    for select using (auth.uid() = account_id);
create policy activities_owner_insert on public.activities
    for insert with check (auth.uid() = account_id);
create policy activities_owner_update on public.activities
    for update using (auth.uid() = account_id);
create policy activities_owner_delete on public.activities
    for delete using (auth.uid() = account_id);

-- ---------------------------------------------------------------------------
-- health_daily_metrics
-- ---------------------------------------------------------------------------

create table public.health_daily_metrics (
    id                       uuid        primary key default gen_random_uuid(),
    account_id               uuid        not null references auth.users (id) on delete cascade,
    date                     date        not null,
    resting_heart_rate       integer,
    hrv_avg                  double precision,
    sleep_score              integer,
    sleep_duration_minutes   double precision,
    sleep_deep_minutes       double precision,
    sleep_light_minutes      double precision,
    sleep_rem_minutes        double precision,
    sleep_awake_minutes      double precision,
    stress_avg               integer,
    body_battery_high        integer,
    body_battery_low         integer,
    recovery_score           integer,
    steps                    integer,
    active_calories          integer,
    total_calories           integer,
    vo2max                   double precision,
    intensity_minutes        integer,
    raw_data                 jsonb       not null default '{}'::jsonb,
    synced_at                timestamptz not null default now(),

    unique (account_id, date)
);

create index health_account_date on public.health_daily_metrics (account_id, date desc);

alter table public.health_daily_metrics enable row level security;

create policy health_metrics_owner_select on public.health_daily_metrics
    for select using (auth.uid() = account_id);
create policy health_metrics_owner_insert on public.health_daily_metrics
    for insert with check (auth.uid() = account_id);
create policy health_metrics_owner_update on public.health_daily_metrics
    for update using (auth.uid() = account_id);
create policy health_metrics_owner_delete on public.health_daily_metrics
    for delete using (auth.uid() = account_id);

-- ---------------------------------------------------------------------------
-- sync_state (per-account key/value for last_sync_at etc.)
-- ---------------------------------------------------------------------------

create table public.sync_state (
    account_id  uuid       not null references auth.users (id) on delete cascade,
    key         text       not null,
    value       text,
    updated_at  timestamptz not null default now(),
    primary key (account_id, key)
);

alter table public.sync_state enable row level security;

create policy sync_state_owner_select on public.sync_state
    for select using (auth.uid() = account_id);
create policy sync_state_owner_insert on public.sync_state
    for insert with check (auth.uid() = account_id);
create policy sync_state_owner_update on public.sync_state
    for update using (auth.uid() = account_id);
create policy sync_state_owner_delete on public.sync_state
    for delete using (auth.uid() = account_id);

commit;
