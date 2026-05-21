-- Training plans. One row per generated plan; plan_data is opaque jsonb the
-- model produces (weeks -> days -> sessions). No domain constraints here on
-- purpose: plan quality is judged by the evaluator sub-agent, not the DB.

create table public.training_plans (
    id           uuid        primary key default gen_random_uuid(),
    account_id   uuid        not null references auth.users (id) on delete cascade,
    status       text        not null default 'draft',  -- draft | active | archived
    plan_data    jsonb       not null default '{}'::jsonb,
    rationale    text,
    created_at   timestamptz not null default now(),
    updated_at   timestamptz not null default now()
);

create index training_plans_account_status
    on public.training_plans (account_id, status, created_at desc);

alter table public.training_plans enable row level security;

create policy training_plans_owner_select on public.training_plans
    for select using (auth.uid() = account_id);
create policy training_plans_owner_insert on public.training_plans
    for insert with check (auth.uid() = account_id);
create policy training_plans_owner_update on public.training_plans
    for update using (auth.uid() = account_id);
create policy training_plans_owner_delete on public.training_plans
    for delete using (auth.uid() = account_id);
