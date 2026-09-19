-- TASK-063: Engine terminal receipts and minimal accepted audit/pending outbox.
-- Trip tables, RLS and revision triggers remain owned by the existing 8.5 migrations.
create table public.engine_apply_receipts (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid not null references auth.users(id) on delete cascade,
  idempotency_key text not null check (length(idempotency_key) between 1 and 160 and idempotency_key !~ '\s'),
  trip_id uuid not null,
  plan_id uuid not null,
  change_set_id text not null,
  payload_hash text not null check (payload_hash ~ '^[0-9a-f]{64}$'),
  outcome text not null check (outcome in ('accepted','blocked','unsupported','needsConfirmation')),
  result jsonb not null,
  created_at timestamptz not null default now(),
  constraint engine_apply_receipts_actor_key unique(actor_user_id,idempotency_key),
  constraint engine_apply_receipts_id_outcome unique(id,outcome),
  constraint engine_apply_receipts_result_check check (
    (jsonb_typeof(result) = 'object'
    and result->>'requestKind' = 'apply'
    and result->>'outcome' = outcome
    and result->>'changeSetId' = change_set_id
    and result->>'idempotencyKey' = idempotency_key
    and result->>'payloadHash' = payload_hash
    and result->'preview' = 'null'::jsonb
    and result->'replay' = '{"duplicate":false,"originalChangeSetId":null}'::jsonb
    and (case when outcome = 'accepted'
      then result->'transaction'->>'status' = 'committed' and jsonb_typeof(result->'resultingVersion') = 'object'
      else result->'transaction'->>'status' = 'not_started' and result->'resultingVersion' = 'null'::jsonb end)) is true
  )
);
-- Historical target refs intentionally survive Trip/Plan removal for original-key replay.
-- No snapshot is retained. Auth deletion cascades all three metadata tables.
comment on table public.engine_apply_receipts is 'Server-only apply terminal results, actor-global keys; historical Trip/Plan refs; no automatic expiry.';

create table public.engine_apply_audits (
  receipt_id uuid primary key,
  outcome text not null default 'accepted' check (outcome = 'accepted'),
  before_trip_revision bigint not null check (before_trip_revision > 0),
  before_plan_revision bigint not null check (before_plan_revision > 0),
  resulting_trip_revision bigint not null check (resulting_trip_revision > before_trip_revision),
  resulting_plan_revision bigint not null check (resulting_plan_revision > before_plan_revision),
  preview_hash text not null check (preview_hash ~ '^[0-9a-f]{64}$'),
  context_fingerprint text not null check (context_fingerprint ~ '^[0-9a-f]{64}$'),
  operation_refs jsonb not null check (jsonb_typeof(operation_refs) = 'array'),
  created_at timestamptz not null default now(),
  constraint engine_apply_audits_receipt_fkey foreign key(receipt_id,outcome)
    references public.engine_apply_receipts(id,outcome) on delete cascade
);
create table public.engine_apply_outbox (
  receipt_id uuid primary key references public.engine_apply_audits(receipt_id) on delete cascade,
  event_type text not null default 'engine.apply.accepted.v0.1' check (event_type = 'engine.apply.accepted.v0.1'),
  status text not null default 'pending' check (status = 'pending'),
  created_at timestamptz not null default now()
);

alter table public.engine_apply_receipts enable row level security;
alter table public.engine_apply_audits enable row level security;
alter table public.engine_apply_outbox enable row level security;
-- No browser/API role may read, forge or modify an Engine decision, even for its own Trip.
revoke all on public.engine_apply_receipts, public.engine_apply_audits, public.engine_apply_outbox from public, anon, authenticated, service_role;
grant select, insert on public.engine_apply_receipts, public.engine_apply_audits, public.engine_apply_outbox to service_role;
