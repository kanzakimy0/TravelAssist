-- TASK-048-B. Additive B persistence aggregate; canonical Trip semantic validation stays in A TypeScript.
begin;

create function public.is_trip_library_envelope_v1(payload jsonb, version_key text, max_bytes integer)
returns boolean language sql immutable security invoker set search_path = pg_catalog as $$
  select coalesce(jsonb_typeof(payload) = 'object'
    and payload->version_key = '"1.0"'::jsonb
    and octet_length(payload::text) <= max_bytes, false)
$$;

-- Only B party fields are enumerated here. Reuse the accepted Companion profile validator.
create function public.is_trip_party_snapshot_v1(payload jsonb) returns boolean
language plpgsql immutable security invoker set search_path = pg_catalog as $$
declare member jsonb; reference_date text; parsed_date date;
begin
  if not public.is_trip_library_envelope_v1(payload, 'schemaVersion', 131072)
    or (payload - 'schemaVersion' - 'includesOwner' - 'ageReferenceDate' - 'members') <> '{}'::jsonb
    or jsonb_typeof(payload->'includesOwner') is distinct from 'boolean'
    or jsonb_typeof(payload->'ageReferenceDate') is distinct from 'string'
    or jsonb_typeof(payload->'members') is distinct from 'array'
    then return false; end if;
  reference_date := payload->>'ageReferenceDate';
  if reference_date !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then return false; end if;
  parsed_date := make_date(substring(reference_date,1,4)::integer,
    substring(reference_date,6,2)::integer,substring(reference_date,9,2)::integer);
  if extract(year from parsed_date) < 1 or extract(year from parsed_date) > 9999 then return false; end if;
  -- MAX_COMPANIONS_PER_USER, reused from accepted Companion v1; trace IDs have no FK.
  if jsonb_array_length(payload->'members') > 100 then return false; end if;
  for member in select value from jsonb_array_elements(payload->'members') loop
    if jsonb_typeof(member) <> 'object'
      or (member - 'sourceCompanionId' - 'displayName' - 'planningAgeGroup' - 'travelProfile') <> '{}'::jsonb
      or jsonb_typeof(member->'sourceCompanionId') is distinct from 'string'
      or coalesce(member->>'sourceCompanionId' !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$', true)
      or jsonb_typeof(member->'displayName') is distinct from 'string'
      or coalesce(char_length(member->>'displayName') not between 1 and 100, true)
      or member->>'displayName' <> btrim(member->>'displayName', E' \t\n\r\f\v')
      or coalesce(member->>'planningAgeGroup' not in ('infant','child','adult','senior'), true)
      or not public.is_companion_travel_profile_v1(member->'travelProfile') then return false; end if;
  end loop;
  if (select count(*) <> count(distinct value->>'sourceCompanionId') from jsonb_array_elements(payload->'members'))
    then return false; end if;
  return true;
exception when datetime_field_overflow or invalid_datetime_format then return false;
end $$;

create table public.trip_library_records (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null,
  creation_key uuid not null,
  library_state text not null default 'draft',
  canonical_trip_id text,
  draft_facts jsonb not null,
  wizard_progress jsonb not null,
  plan_snapshot jsonb,
  preference_snapshot jsonb not null,
  preference_source_revision integer not null,
  preference_override_patch jsonb not null default '{"schemaVersion":"1.0","set":{},"unset":[]}'::jsonb,
  party_snapshot jsonb not null,
  storage_revision integer not null default 1,
  frozen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint trip_library_records_owner_fk foreign key(owner_user_id) references auth.users(id) on delete cascade,
  constraint trip_library_records_creation_unique unique(owner_user_id, creation_key),
  constraint trip_library_records_state_check check(library_state in ('draft','saved','history')),
  constraint trip_library_records_lifecycle_check check(
    (library_state = 'draft' and canonical_trip_id is null and plan_snapshot is null and frozen_at is null) or
    (library_state = 'saved' and canonical_trip_id is not null and plan_snapshot is not null and frozen_at is null) or
    (library_state = 'history' and canonical_trip_id is not null and plan_snapshot is not null and frozen_at is not null)),
  constraint trip_library_records_canonical_id_check check(canonical_trip_id is null or
    (char_length(canonical_trip_id) between 1 and 160 and canonical_trip_id !~ '[[:space:][:cntrl:]]'
     and jsonb_typeof(plan_snapshot#>'{trip,id}') is not distinct from 'string'
     and (canonical_trip_id = plan_snapshot#>>'{trip,id}') is true)),
  -- Mirrors TRIP_PERSISTENCE_MAX_BYTES. JSONB envelopes only, not another itinerary parser.
  constraint trip_library_records_draft_check check(public.is_trip_library_envelope_v1(draft_facts,'contractVersion',262144)),
  constraint trip_library_records_progress_check check(public.is_trip_library_envelope_v1(wizard_progress,'contractVersion',4096)),
  constraint trip_library_records_plan_check check(plan_snapshot is null or public.is_trip_library_envelope_v1(plan_snapshot,'contractVersion',4194304)),
  constraint trip_library_records_preference_check check(public.is_travel_preference_v1(preference_snapshot)),
  constraint trip_library_records_source_revision_check check(preference_source_revision >= 0 and
    (preference_source_revision <> 0 or preference_snapshot = '{"schemaVersion":"1.0","values":{}}'::jsonb)),
  constraint trip_library_records_patch_check check(
    public.is_trip_library_envelope_v1(preference_override_patch,'schemaVersion',65536)
    and (preference_override_patch - 'schemaVersion' - 'set' - 'unset') = '{}'::jsonb
    and public.is_travel_preference_v1(jsonb_build_object('schemaVersion','1.0','values',preference_override_patch->'set'))
    and jsonb_typeof(preference_override_patch->'unset') is not distinct from 'array'),
  constraint trip_library_records_party_check check(public.is_trip_party_snapshot_v1(party_snapshot)),
  constraint trip_library_records_storage_revision_check check(storage_revision > 0),
  constraint trip_library_records_timestamps_check check(isfinite(created_at) and isfinite(updated_at) and
    (frozen_at is null or isfinite(frozen_at)))
);
create unique index trip_library_records_canonical_unique
  on public.trip_library_records(owner_user_id, canonical_trip_id) where canonical_trip_id is not null;
create index trip_library_records_owner_updated_idx
  on public.trip_library_records(owner_user_id, updated_at desc, id);

create function public.guard_trip_library_record_v1() returns trigger
language plpgsql security invoker set search_path = pg_catalog as $$
declare write_time timestamptz := clock_timestamp();
begin
  if tg_op = 'INSERT' then
    if new.storage_revision is distinct from 1 then
      raise exception using errcode='23514', message='INITIAL_STORAGE_REVISION_MUST_BE_ONE';
    end if;
    -- Creation may start as draft or saved. History is entered only from an existing saved row.
    if new.library_state = 'history' then
      raise exception using errcode='23514', message='HISTORY_REQUIRES_SAVED_TRANSITION';
    end if;
    new.created_at := write_time;
  else
    if old.library_state = 'history' then
      raise exception using errcode='55000', message='IMMUTABLE_TRIP_HISTORY';
    end if;
    if new.id is distinct from old.id or new.owner_user_id is distinct from old.owner_user_id
      or new.creation_key is distinct from old.creation_key
      or new.preference_snapshot is distinct from old.preference_snapshot
      or new.preference_source_revision is distinct from old.preference_source_revision then
      raise exception using errcode='55000', message='IMMUTABLE_TRIP_CREATION';
    end if;
    if old.storage_revision = 2147483647 or new.storage_revision is distinct from old.storage_revision + 1 then
      raise exception using errcode='40001', message='STALE_STORAGE_REVISION';
    end if;
    if not ((old.library_state='draft' and new.library_state in ('draft','saved'))
      or (old.library_state='saved' and new.library_state in ('saved','history'))) then
      raise exception using errcode='23514', message='INVALID_TRIP_LIBRARY_TRANSITION';
    end if;
    new.created_at := old.created_at;
    if new.library_state = 'history' then
      -- One DB-owned instant, ignoring caller-supplied freeze time; never date-driven.
      new.frozen_at := write_time;
    end if;
  end if;
  new.updated_at := write_time;
  return new;
end $$;
create trigger trip_library_records_guard before insert or update on public.trip_library_records
  for each row execute function public.guard_trip_library_record_v1();

alter table public.trip_library_records enable row level security;
revoke all on public.trip_library_records from public, anon, authenticated;
grant select on public.trip_library_records to authenticated;
grant select, insert, update, delete on public.trip_library_records to service_role;
create policy trip_library_records_select_own on public.trip_library_records
  for select to authenticated using ((select auth.uid()) = owner_user_id);
revoke all on function public.is_trip_library_envelope_v1(jsonb,text,integer),
  public.is_trip_party_snapshot_v1(jsonb), public.guard_trip_library_record_v1() from public, anon, authenticated;
grant execute on function public.is_trip_library_envelope_v1(jsonb,text,integer),
  public.is_trip_party_snapshot_v1(jsonb) to service_role;
comment on table public.trip_library_records is
  'B Trip Library aggregate: canonical A facts/progress/plan snapshots, immutable creation preference, trip-only patch and minimized party. No public writes before WBS 5.19.';
comment on column public.trip_library_records.storage_revision is
  'Aggregate storage revision, distinct from canonical Trip/Plan revisions. Insert 1, mutable update exactly old+1.';
comment on column public.trip_library_records.frozen_at is
  'DB clock_timestamp on saved->history, same as that update timestamp. History rejects every UPDATE; privileged hard delete remains possible.';
comment on column public.trip_library_records.party_snapshot is
  'Detached functional facts; sourceCompanionId is trace-only with no Companion FK. No DOB, gender, avatar, relationship or private/free-text needs.';
commit;
