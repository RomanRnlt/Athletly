-- ---------------------------------------------------------------------------
-- account_billing
--
-- One row per account. `tier` drives the monthly credit limit. RevenueCat is
-- the source of truth for paid status (tier='pro') via webhook; 'grandfather'
-- is set manually (unlimited) for the founder / testers / early adopters and
-- is never overwritten by RevenueCat downgrades.
-- ---------------------------------------------------------------------------

create table public.account_billing (
    account_id          uuid        primary key references auth.users (id) on delete cascade,
    tier                text        not null default 'free',
    source              text        not null default 'default',  -- default | revenuecat | manual
    rc_entitlement      text,                                    -- RevenueCat entitlement id, if any
    current_period_end  timestamptz,                             -- paid access valid until (RC)
    updated_at          timestamptz not null default now(),
    constraint account_billing_tier_chk
        check (tier in ('free', 'pro', 'grandfather'))
);

alter table public.account_billing enable row level security;

create policy account_billing_owner_select on public.account_billing
    for select using (auth.uid() = account_id);

-- ---------------------------------------------------------------------------
-- ai_usage_events
--
-- One row per metered user action (chat message or plan generation). `credits`
-- is what counts against the monthly limit; tokens + cost_usd are logged for
-- observability and for tuning the credit costs against real spend.
-- ---------------------------------------------------------------------------

create table public.ai_usage_events (
    id                 uuid        primary key default gen_random_uuid(),
    account_id         uuid        not null references auth.users (id) on delete cascade,
    kind               text        not null,            -- chat | plan
    model              text,
    prompt_tokens      integer     not null default 0,
    completion_tokens  integer     not null default 0,
    cached_tokens      integer     not null default 0,
    credits            integer     not null default 0,
    cost_usd           double precision,
    created_at         timestamptz not null default now()
);

create index ai_usage_events_account_created_idx
    on public.ai_usage_events (account_id, created_at desc);

alter table public.ai_usage_events enable row level security;

create policy ai_usage_events_owner_select on public.ai_usage_events
    for select using (auth.uid() = account_id);

-- ---------------------------------------------------------------------------
-- credits_used_since: atomic-read helper for the credit gate.
--
-- Sums credits consumed by an account since a period start. SECURITY DEFINER so
-- the backend (service role) can call it; callers always pass the JWT-verified
-- account_id.
-- ---------------------------------------------------------------------------

create or replace function public.credits_used_since(p_account_id uuid, p_since timestamptz)
returns integer
language sql
stable
security definer
set search_path = public
as $$
    select coalesce(sum(credits), 0)::integer
    from public.ai_usage_events
    where account_id = p_account_id
      and created_at >= p_since;
$$;
