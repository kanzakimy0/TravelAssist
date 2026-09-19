-- TASK-042-B / WBS 5.11 only. SQL is the authoritative schema history.
begin;

create function public.is_travel_preference_v1(payload jsonb) returns boolean
language plpgsql immutable set search_path = pg_catalog as $$
declare
  rules constant jsonb := '{
  "mobility.fewerTransfers": "boolean",
  "mobility.walkingTolerance": [
    "veryLow",
    "low",
    "standard",
    "high",
    "veryHigh"
  ],
  "mobility.noPublicTransit": "boolean",
  "mobility.noBus": "boolean",
  "mobility.noFerry": "boolean",
  "dining.localCuisine": [
    "deprioritize",
    "neutral",
    "prioritize"
  ],
  "dining.smallShops": [
    "deprioritize",
    "neutral",
    "prioritize"
  ],
  "dining.queueTolerance": [
    "low",
    "medium",
    "high"
  ],
  "accommodation.transportConvenience": [
    "deprioritize",
    "neutral",
    "prioritize"
  ],
  "accommodation.comfort": [
    "deprioritize",
    "neutral",
    "prioritize"
  ],
  "accommodation.fewerHotelChanges": [
    "deprioritize",
    "neutral",
    "prioritize"
  ],
  "budget.spendingTendency": [
    "economical",
    "moderate",
    "flexible"
  ],
  "budget.prioritizeAccommodation": "boolean",
  "budget.prioritizeExperience": "boolean",
  "interests.preferences": "signals",
  "interests.details": "details",
  "style.pace": [
    1,
    2,
    3,
    4,
    5
  ],
  "style.depth": [
    1,
    2,
    3,
    4,
    5
  ],
  "style.discovery": [
    1,
    2,
    3,
    4,
    5
  ],
  "style.movement": [
    1,
    2,
    3,
    4,
    5
  ],
  "style.coverage": [
    1,
    2,
    3,
    4,
    5
  ],
  "style.priority": [
    1,
    2,
    3,
    4,
    5
  ],
  "style.planning": [
    1,
    2,
    3,
    4,
    5
  ]
}'::jsonb;
  detail_options constant jsonb := '{
  "nature_scenery": [
    "mountain",
    "coast",
    "lake",
    "forest",
    "flower_field"
  ],
  "history_culture": [
    "shrine_temple",
    "castle",
    "museum",
    "historic_district"
  ],
  "food": [
    "sushi",
    "ramen",
    "regional_cuisine",
    "dessert",
    "sake"
  ],
  "photography": [
    "street_photography",
    "landscape",
    "nightscape",
    "architecture",
    "people_culture"
  ],
  "onsen_wellness": [
    "ryokan_onsen",
    "open_air_bath",
    "forest_wellness",
    "sea_view_onsen"
  ],
  "art_museums": [
    "contemporary_art",
    "traditional_crafts",
    "architecture",
    "design_exhibition"
  ],
  "anime_entertainment": [
    "anime_pilgrimage",
    "gaming",
    "themed_cafe",
    "merchandise"
  ],
  "shopping": [
    "department_store",
    "vintage",
    "drugstore",
    "local_specialties"
  ],
  "urban_exploration": [
    "distinctive_neighborhood",
    "architecture_walk",
    "cafe",
    "city_nightscape"
  ],
  "outdoor_activity": [
    "hiking",
    "cycling",
    "skiing",
    "water_activity"
  ],
  "night_experience": [
    "izakaya",
    "nightscape",
    "performance",
    "night_walk"
  ],
  "family_activity": [
    "zoo",
    "science_museum",
    "family_crafts",
    "park"
  ],
  "traditional_experience": [
    "tea_ceremony",
    "kimono",
    "crafts",
    "traditional_performance"
  ],
  "theme_parks": [
    "major_theme_park",
    "character_park",
    "aquarium",
    "immersive_exhibition"
  ],
  "rural_towns": [
    "historic_town",
    "fishing_village",
    "countryside",
    "local_market"
  ],
  "seasonal_events": [
    "cherry_blossom",
    "autumn_leaves",
    "snow_scenery",
    "festival",
    "fireworks"
  ]
}'::jsonb;
  item record;
  parent record;
  rule jsonb;
begin
  if payload is null or jsonb_typeof(payload) <> 'object' or
    payload->'schemaVersion' is distinct from '"1.0"'::jsonb or
    jsonb_typeof(payload->'values') is distinct from 'object' or
    (payload - 'schemaVersion' - 'values') <> '{}'::jsonb or
    octet_length(payload::text) > 65536 then return false; end if;

  for item in select * from jsonb_each(payload->'values') loop
    rule := rules->item.key;
    if rule is null then return false;
    elsif rule = '"boolean"'::jsonb then
      if jsonb_typeof(item.value) <> 'boolean' then return false; end if;
    elsif rule = '"signals"'::jsonb or rule = '"details"'::jsonb then
      if jsonb_typeof(item.value) <> 'object' then return false; end if;
      for parent in select * from jsonb_each(item.value) loop
        if not detail_options ? parent.key then return false; end if;
        if rule = '"signals"'::jsonb then
          if parent.value not in ('"like"'::jsonb, '"dislike"'::jsonb) then return false; end if;
        else
          if jsonb_typeof(parent.value) <> 'array' then return false; end if;
          if jsonb_array_length(parent.value) > jsonb_array_length(detail_options->parent.key) or
            (select count(*) <> count(distinct value) from jsonb_array_elements(parent.value)) or
            exists (
              select 1 from jsonb_array_elements(parent.value) child
              where not exists (
                select 1 from jsonb_array_elements(detail_options->parent.key) allowed
                where allowed.value = child.value
              )
            ) then return false; end if;
          if jsonb_array_length(parent.value) > 0 and
            payload->'values'->'interests.preferences'->parent.key = '"dislike"'::jsonb
            then return false; end if;
        end if;
      end loop;
    -- Exact scalar membership, not JSON containment (which can accept nested arrays).
    elsif not exists (select 1 from jsonb_array_elements(rule) allowed where allowed.value = item.value)
      then return false;
    end if;
  end loop;
  return true;
end $$;

create table public.travel_preferences (
  owner_user_id uuid primary key,
  payload jsonb not null default '{"schemaVersion":"1.0","values":{}}'::jsonb,
  revision integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint travel_preferences_auth_user_fk foreign key (owner_user_id)
    references auth.users(id) on delete cascade,
  constraint travel_preferences_payload_check check (public.is_travel_preference_v1(payload)),
  constraint travel_preferences_revision_check check (revision > 0)
);

-- Readiness for the later 5.16 CAS API: one revision, no second lock mechanism.
-- Caller updates with revision = prior + 1; a stale/no-op revision is rejected.
create function public.guard_travel_preference_revision() returns trigger
language plpgsql set search_path = pg_catalog as $$
begin
  if tg_op = 'INSERT' then
    if new.revision is distinct from 1 then
      raise exception using errcode = '23514', message = 'INITIAL_REVISION_MUST_BE_ONE';
    end if;
    new.created_at := clock_timestamp();
  else
    if new.owner_user_id is distinct from old.owner_user_id then
      raise exception using errcode = '55000', message = 'IMMUTABLE_PREFERENCE_OWNER';
    end if;
    if new.revision is distinct from old.revision + 1 then
      raise exception using errcode = '40001', message = 'STALE_PREFERENCE_REVISION';
    end if;
    new.created_at := old.created_at;
  end if;
  new.updated_at := clock_timestamp();
  return new;
end $$;

create trigger travel_preferences_revision before insert or update on public.travel_preferences
  for each row execute function public.guard_travel_preference_revision();

alter table public.travel_preferences enable row level security;
revoke all on public.travel_preferences from public, anon, authenticated;
grant select, insert, update on public.travel_preferences to authenticated;
grant select, insert, update, delete on public.travel_preferences to service_role;
create policy travel_preferences_select_own on public.travel_preferences
  for select to authenticated using ((select auth.uid()) = owner_user_id);
create policy travel_preferences_insert_own on public.travel_preferences
  for insert to authenticated with check ((select auth.uid()) = owner_user_id);
create policy travel_preferences_update_own on public.travel_preferences
  for update to authenticated using ((select auth.uid()) = owner_user_id)
  with check ((select auth.uid()) = owner_user_id);

revoke all on function public.is_travel_preference_v1(jsonb),
  public.guard_travel_preference_revision() from public, anon, authenticated;
grant execute on function public.is_travel_preference_v1(jsonb) to authenticated, service_role;
comment on table public.travel_preferences is
  'B-owned long-term Preference v1: 23 sparse dotted keys. Missing is unset; reset writes an empty envelope. No client DELETE.';
comment on column public.travel_preferences.revision is
  'Starts at 1; each update must advance exactly one. HTTP compare-and-swap belongs to WBS 5.16.';
commit;
