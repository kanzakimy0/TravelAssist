-- TASK-019-A: additive normalized current state only; no history or B draft tables.
begin;

create table public.trips (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200 and btrim(title) <> ''),
  status text not null check (status ~ '^[a-z][a-z0-9_]{0,63}$'),
  default_timezone text not null check (char_length(default_timezone) between 1 and 100 and btrim(default_timezone) <> ''),
  active_plan_id uuid,
  provenance text not null check (provenance in ('user','ai','import','fixture')),
  revision bigint not null default 1 check (revision between 1 and 9007199254740991),
  revision_txid bigint not null default txid_current(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index trips_owner_idx on public.trips(owner_user_id);

create table public.trip_plans (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200 and btrim(title) <> ''),
  position integer not null check (position >= 0),
  revision bigint not null default 1 check (revision between 1 and 9007199254740991),
  revision_txid bigint not null default txid_current(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint trip_plans_trip_id_id_key unique(trip_id,id),
  constraint trip_plans_position_key unique(trip_id,position) deferrable initially deferred
);
alter table public.trips add constraint trips_active_plan_fk
  foreign key(id,active_plan_id) references public.trip_plans(trip_id,id)
  on delete no action deferrable initially deferred;
create index trips_active_plan_idx on public.trips(active_plan_id) where active_plan_id is not null;

create table public.trip_days (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.trip_plans(id) on delete cascade,
  day_number integer not null check (day_number between 1 and 3660),
  local_date date not null check (local_date between date '0001-01-01' and date '9999-12-31'),
  timezone text not null check (char_length(timezone) between 1 and 100 and btrim(timezone) <> ''),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint trip_days_number_key unique(plan_id,day_number) deferrable initially deferred
);
create index trip_days_date_idx on public.trip_days(plan_id,local_date);

create table public.itinerary_items (
  id uuid primary key default gen_random_uuid(),
  day_id uuid not null references public.trip_days(id) on delete cascade,
  placement text not null check (placement in ('scheduled','alternative')),
  position integer not null check (position >= 0),
  kind text not null check (kind ~ '^[a-z][a-z0-9_]{0,63}$'),
  title text not null check (char_length(title) between 1 and 200 and btrim(title) <> ''),
  place_reference_id text check (char_length(place_reference_id) between 1 and 160 and place_reference_id !~ '[[:space:][:cntrl:]]'),
  place_name text check (char_length(place_name) between 1 and 200 and btrim(place_name) <> ''),
  latitude double precision check (latitude between -90 and 90),
  longitude double precision check (longitude between -180 and 180),
  start_at timestamptz,
  end_at timestamptz,
  start_timezone text check (char_length(start_timezone) between 1 and 100 and btrim(start_timezone) <> ''),
  end_timezone text check (char_length(end_timezone) between 1 and 100 and btrim(end_timezone) <> ''),
  lock_level text not null check (lock_level ~ '^[a-z][a-z0-9_]{0,63}$'),
  assessment text not null check (assessment ~ '^[a-z][a-z0-9_]{0,63}$'),
  booking_status text not null check (booking_status ~ '^[a-z][a-z0-9_]{0,63}$'),
  booking_reference_id text check (char_length(booking_reference_id) between 1 and 160 and booking_reference_id !~ '[[:space:][:cntrl:]]'),
  booking_verified_at timestamptz check (isfinite(booking_verified_at)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint itinerary_items_position_key unique(day_id,placement,position) deferrable initially deferred,
  constraint itinerary_items_place_check check (
    (place_name is not null or num_nonnulls(place_reference_id,latitude,longitude)=0)
    and num_nonnulls(latitude,longitude) in (0,2)),
  constraint itinerary_items_schedule_check check (
    num_nonnulls(start_at,end_at,start_timezone,end_timezone) in (0,4)
    and (start_at is null or (isfinite(start_at) and isfinite(end_at) and end_at > start_at))),
  constraint itinerary_items_booking_check check (
    booking_status <> 'confirmed' or (booking_reference_id is not null and booking_verified_at is not null))
);
create index itinerary_items_start_idx on public.itinerary_items(day_id,start_at);

comment on table public.trips is 'A-owned normalized current Trip state. Owner-only; no sharing, Saved Trips or history store.';
comment on table public.trip_plans is 'Candidate plans; active plan is exclusively trips.active_plan_id. position preserves contract array order.';
comment on table public.trip_days is 'Local calendar date and IANA zone, independent of UTC instants; repeated dates across dateline allowed.';
comment on table public.itinerary_items is 'Scheduled and alternative items share one table. Booking evidence, lock and assessment are independent facts.';
comment on column public.itinerary_items.place_reference_id is 'Opaque contract place reference, not an invented POI/provider FK.';
comment on column public.itinerary_items.booking_reference_id is 'Evidence reference only, not a Booking service, order or payment.';
comment on column public.trips.revision_txid is 'Internal DB-maintained transaction marker; coalesces all tree changes to one revision increment per transaction.';
comment on constraint trips_active_plan_fk on public.trips is 'Same-trip composite FK. Clear active_plan_id before deleting active plan; whole-trip/account deletion cascades.';

commit;
