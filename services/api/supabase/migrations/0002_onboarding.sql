-- Add the onboarding_completed flag to athlete_profiles.
--
-- Default false so every new athlete starts in onboarding mode. The agent
-- sets it true via the mark_onboarding_complete tool once it has gathered
-- enough context (criteria defined in services/api/skills/onboarding.md).

alter table public.athlete_profiles
    add column if not exists onboarding_completed boolean not null default false;
