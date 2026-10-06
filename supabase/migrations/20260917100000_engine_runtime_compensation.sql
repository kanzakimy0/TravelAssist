-- TASK-064: additive local runtime delivery and compensating history.
-- Existing Trip/RLS/revision and merged migrations remain unchanged.
create function public.is_engine_preimage_v1(value jsonb) returns boolean
language plpgsql immutable set search_path = '' as $$
declare e jsonb; s jsonb; arr jsonb; k text; target_keys text[] := '{}'; keys text[];
begin
 if jsonb_typeof(value) is distinct from 'object' or octet_length(value::text)>262144
   or (value->>'version') is distinct from '4.23-preimage-1'
   or (select array_agg(x order by x) from jsonb_object_keys(value) x) is distinct from array['entries','version']
   or jsonb_typeof(value->'entries') is distinct from 'array' then return false; end if;
 if jsonb_array_length(value->'entries') not between 1 and 100 then return false; end if;
 for e in select * from jsonb_array_elements(value->'entries') loop
  if jsonb_typeof(e)<>'object' then return false; end if;
  select array_agg(x order by x) into keys from jsonb_object_keys(e) x;
  if e->>'op'='UPDATE_TIME' then
   if keys<>array['appliedSchedule','beforeSchedule','itemId','op'] then return false; end if;
   if jsonb_typeof(e->'itemId')<>'string' or (e->>'itemId') !~ '^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$' then return false; end if;
   k:='time:'||(e->>'itemId');
   for s in select v from (values (e->'beforeSchedule'),(e->'appliedSchedule')) t(v) loop
    if s='null'::jsonb then continue; end if;
    if jsonb_typeof(s)<>'object'
      or (select array_agg(x order by x) from jsonb_object_keys(s) x)<>array['end','endTimezone','start','startTimezone'] then return false; end if;
    if exists(select 1 from jsonb_each(s) x where jsonb_typeof(x.value)<>'string' or length(x.value#>>'{}') not between 1 and 100) then return false; end if;
    if length(s->>'start')>35 or length(s->>'end')>35
      or (s->>'start') !~ '^\d{4}-\d{2}-\d{2}T.*(Z|[+-]\d{2}:\d{2})$'
      or (s->>'end') !~ '^\d{4}-\d{2}-\d{2}T.*(Z|[+-]\d{2}:\d{2})$'
      or (s->>'end')::timestamptz <= (s->>'start')::timestamptz then return false; end if;
   end loop;
  elsif e->>'op'='REORDER_ITEMS' then
   if keys<>array['appliedOrder','beforeOrder','dayId','op'] then return false; end if;
   if jsonb_typeof(e->'dayId')<>'string' or (e->>'dayId') !~ '^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$' then return false; end if;
   k:='order:'||(e->>'dayId');
   for arr in select v from (values (e->'beforeOrder'),(e->'appliedOrder')) t(v) loop
    if jsonb_typeof(arr)<>'array' or jsonb_array_length(arr)>1000 then return false; end if;
    if exists(select 1 from jsonb_array_elements(arr) x where jsonb_typeof(x)<>'string' or (x#>>'{}') !~ '^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$') then return false; end if;
    if (select count(distinct x) from jsonb_array_elements(arr) x)<>jsonb_array_length(arr) then return false; end if;
   end loop;
   if (select coalesce(jsonb_agg(x order by x),'[]') from jsonb_array_elements(e->'beforeOrder') x)
     <> (select coalesce(jsonb_agg(x order by x),'[]') from jsonb_array_elements(e->'appliedOrder') x) then return false; end if;
  else return false; end if;
  if k=any(target_keys) then return false; end if;
  target_keys:=array_append(target_keys,k);
 end loop;
 return true;
exception when others then return false;
end $$;
revoke all on function public.is_engine_preimage_v1(jsonb) from public,anon,authenticated;
grant execute on function public.is_engine_preimage_v1(jsonb) to service_role;

create table public.engine_apply_preimages (
 receipt_id uuid primary key references public.engine_apply_audits(receipt_id) on delete cascade,
 preimage jsonb not null check (public.is_engine_preimage_v1(preimage) is true),
 created_at timestamptz not null default now()
);
create table public.engine_apply_compensations (
 original_receipt_id uuid primary key references public.engine_apply_preimages(receipt_id) on delete cascade,
 compensation_receipt_id uuid not null unique references public.engine_apply_audits(receipt_id) on delete cascade,
 created_at timestamptz not null default now(),
 check (original_receipt_id<>compensation_receipt_id)
);
-- Typed terminal rollback decisions; no request/context/snapshot JSON is retained.
create table public.engine_rollback_receipts (
 id uuid primary key default gen_random_uuid(),
 actor_user_id uuid not null references auth.users(id) on delete cascade,
 original_receipt_id uuid not null references public.engine_apply_receipts(id) on delete cascade,
 idempotency_key text not null check(length(idempotency_key) between 1 and 160 and idempotency_key !~ '\s'),
 request_id text not null check(length(request_id) between 1 and 160 and request_id !~ '\s'),
 payload_hash text not null check(payload_hash ~ '^[0-9a-f]{64}$'),
 outcome text not null check(outcome in ('accepted','blocked','unsupported','needsConfirmation')),
 issue_codes text[] not null check(cardinality(issue_codes)<=32 and array_to_string(issue_codes,',') !~ '[^A-Z0-9_,]'),
 observed_trip_revision bigint not null check(observed_trip_revision>0),
 observed_plan_revision bigint not null check(observed_plan_revision>0),
 resulting_trip_revision bigint, resulting_plan_revision bigint,
 apply_receipt_id uuid references public.engine_apply_receipts(id) on delete cascade,
 created_at timestamptz not null default now(),
 constraint engine_rollback_receipts_actor_key unique(actor_user_id,idempotency_key),
 check (((outcome='accepted' and apply_receipt_id is not null and resulting_trip_revision>observed_trip_revision and resulting_plan_revision>observed_plan_revision)
  or (outcome<>'accepted' and resulting_trip_revision is null and resulting_plan_revision is null)) is true)
);
alter table public.engine_apply_outbox drop constraint engine_apply_outbox_status_check;
alter table public.engine_apply_outbox
 add constraint engine_apply_outbox_status_check check(status in ('pending','processing','retryable_failure','processed','terminal_failure')),
 add column attempts integer not null default 0 check(attempts between 0 and 3),
 add column lease_token uuid,
 add column lease_expires_at timestamptz,
 add column available_at timestamptz not null default now(),
 add column failure_code text check(failure_code in ('CONTEXT_UNAVAILABLE','TARGET_UNAVAILABLE','RETRY_EXHAUSTED')),
 add column finished_at timestamptz,
 add constraint engine_apply_outbox_lease_check check(
  (status='processing' and lease_token is not null and lease_expires_at is not null)
  or (status<>'processing' and lease_token is null and lease_expires_at is null)),
 add constraint engine_apply_outbox_finish_check check(
  (status in ('processed','terminal_failure'))=(finished_at is not null));
create index engine_apply_outbox_work on public.engine_apply_outbox(status,available_at,lease_expires_at);
create table public.engine_runtime_results (
 receipt_id uuid primary key references public.engine_apply_outbox(receipt_id) on delete cascade,
 contract_version text not null default '4.23-runtime-1' check(contract_version='4.23-runtime-1'),
 observed_trip_revision bigint, observed_plan_revision bigint,
 recompute_status text not null check(recompute_status in ('accepted','blocked','unsupported','needsConfirmation','failed')),
 fingerprint text not null check(fingerprint ~ '^[0-9a-f]{64}$'),
 issue_codes text[] not null check(cardinality(issue_codes)<=32 and array_to_string(issue_codes,',') !~ '[^A-Z0-9_,]'),
 issues_truncated boolean not null default false,
 created_at timestamptz not null default now(),
 check ((observed_trip_revision is null)=(observed_plan_revision is null)),
 check (observed_trip_revision is null or (observed_trip_revision>0 and observed_plan_revision>0)),
 check (recompute_status='failed' or observed_trip_revision is not null)
);
alter table public.engine_apply_preimages enable row level security;
alter table public.engine_apply_compensations enable row level security;
alter table public.engine_rollback_receipts enable row level security;
alter table public.engine_runtime_results enable row level security;
revoke all on public.engine_apply_preimages,public.engine_apply_compensations,public.engine_rollback_receipts,public.engine_runtime_results from public,anon,authenticated,service_role;
grant select,insert on public.engine_apply_preimages,public.engine_apply_compensations,public.engine_rollback_receipts,public.engine_runtime_results to service_role;
-- Only the trusted server may claim/update delivery metadata. No browser policies.
grant update on public.engine_apply_outbox to service_role;
comment on table public.engine_apply_preimages is 'Minimal net before/applied schedules and orders; 100 targets, 256 KiB; no full snapshots; Auth cascade.';
comment on table public.engine_apply_compensations is 'At most one forward compensation per original accepted apply. Original records remain unchanged.';
comment on table public.engine_runtime_results is 'One minimal terminal local recompute per event; no provider payload or context.';
