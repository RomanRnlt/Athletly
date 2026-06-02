-- ---------------------------------------------------------------------------
-- user_consents
--
-- Append-only audit trail of GDPR consent decisions. Each grant OR withdrawal
-- is a new row; the current state for a (account_id, consent_type) pair is the
-- most recent row by created_at. This lets us demonstrate consent under
-- Art. 7(1) GDPR, including WHEN it was given and WHICH policy version applied.
--
-- Never UPDATE or DELETE rows here except on full account deletion (cascade).
-- ---------------------------------------------------------------------------

create table public.user_consents (
    id            uuid        primary key default gen_random_uuid(),
    account_id    uuid        not null references auth.users (id) on delete cascade,
    consent_type  text        not null,
    version       text        not null,
    granted       boolean     not null,
    created_at    timestamptz not null default now()
);

create index user_consents_account_type_idx
    on public.user_consents (account_id, consent_type, created_at desc);

alter table public.user_consents enable row level security;

-- Owner can read their own consent history. Writes go through the service-role
-- client in the backend (which scopes by the JWT-verified account_id), so no
-- insert/update/delete policies are exposed to the anon/auth roles.
create policy user_consents_owner_select on public.user_consents
    for select using (auth.uid() = account_id);
