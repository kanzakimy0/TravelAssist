-- TASK-017-B. SQL is the only migration truth. No itinerary/day/item tables.
begin;

create function public.is_travel_preference_v1(payload jsonb) returns boolean
language plpgsql immutable set search_path=pg_catalog as $$
declare
  rules constant jsonb := '{"mobility.fewerTransfers":"boolean","mobility.lessWalking":"boolean","mobility.noPublicTransit":"boolean","mobility.noBus":"boolean","mobility.noFerry":"boolean","experience.photoExperience":"boolean","budget.prioritizeAccommodation":"boolean","budget.prioritizeExperience":"boolean","mobility.preset":["relaxed","balanced","efficient"],"attractions.nature":["veryLike","like","neutral","dislike","unset"],"attractions.history":["veryLike","like","neutral","dislike","unset"],"attractions.culture":["veryLike","like","neutral","dislike","unset"],"attractions.art":["veryLike","like","neutral","dislike","unset"],"attractions.photography":["veryLike","like","neutral","dislike","unset"],"attractions.activityExperience":["veryLike","like","neutral","dislike","unset"],"dining.localCuisine":["priority","neutral","notSpecial"],"dining.smallShops":["like","neutral","notSpecial"],"dining.queueTolerance":["low","medium","high"],"accommodation.transportConvenience":["value","neutral","notSpecial"],"accommodation.comfort":["value","neutral","notSpecial"],"accommodation.fewerHotelChanges":["value","neutral","notSpecial"],"budget.spendingTendency":["economical","moderate","flexible"],"style.pace":[1,2,3,4,5],"style.depth":[1,2,3,4,5],"style.discovery":[1,2,3,4,5],"style.movement":[1,2,3,4,5],"style.coverage":[1,2,3,4,5],"style.priority":[1,2,3,4,5],"interests.likes":"interests","interests.dislikes":"interests"}'::jsonb;
  interest_options constant jsonb := '["自然风景","历史文化","美食","摄影","温泉疗愈","艺术展馆","动漫娱乐","购物","城市探索","户外活动","夜间体验","亲子体验","传统体验","主题乐园","乡村小镇","季节限定"]'::jsonb;
  item record; rule jsonb;
begin
  if payload is null or jsonb_typeof(payload) <> 'object' or
    payload->>'schemaVersion' is distinct from '1.0' or
    jsonb_typeof(payload->'values') is distinct from 'object' or
    (payload - 'schemaVersion' - 'values') <> '{}'::jsonb or
    octet_length(payload::text)>65536 then return false; end if;
  for item in select * from jsonb_each(payload->'values') loop
    rule := rules->item.key;
    if rule is null then return false;
    elsif rule='"boolean"'::jsonb then
      if jsonb_typeof(item.value)<>'boolean' then return false; end if;
    elsif rule='"interests"'::jsonb then
      if jsonb_typeof(item.value)<>'array' then return false; end if;
      if jsonb_array_length(item.value)>16 or
        (select count(*)<>count(distinct value) from jsonb_array_elements(item.value)) or
        exists(select 1 from jsonb_array_elements(item.value) x where not interest_options @> jsonb_build_array(x.value))
        then return false; end if;
    elsif not rule @> jsonb_build_array(item.value) then return false;
    end if;
  end loop;
  if exists(select 1 from jsonb_array_elements(coalesce(payload#>'{values,interests.likes}','[]')) x
    where coalesce(payload#>'{values,interests.dislikes}','[]') @> jsonb_build_array(x.value)) then return false; end if;
  return true;
end $$;

create table public.travel_preferences (
  owner_user_id uuid primary key references auth.users(id) on delete cascade,
  payload jsonb not null default '{"schemaVersion":"1.0","values":{}}',
  revision integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint travel_preferences_payload_check check(public.is_travel_preference_v1(payload)),
  constraint travel_preferences_revision_check check(revision>0)
);
create table public.trip_drafts (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  creation_key uuid not null,
  status text not null default 'active',
  facts jsonb not null,
  progress jsonb not null,
  revision integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint trip_drafts_owner_id_unique unique(owner_user_id,id),
  constraint trip_drafts_creation_unique unique(owner_user_id,creation_key),
  constraint trip_drafts_status_check check(status in ('active','archived')),
  constraint trip_drafts_revision_check check(revision>0),
  constraint trip_drafts_facts_check check(
    jsonb_typeof(facts)='object' and facts->>'contractVersion' is not distinct from '1.0' and
    jsonb_typeof(facts->'destinations') is not distinct from 'array' and
    jsonb_typeof(facts->'participants') is not distinct from 'object' and
    jsonb_typeof(facts->'dates') is not distinct from 'object' and octet_length(facts::text)<=131072),
  constraint trip_drafts_progress_check check(
    jsonb_typeof(progress)='object' and progress->>'contractVersion' is not distinct from '1.0' and
    coalesce(progress->>'phase' in ('familiarity','preferences','trip_basics','generating','plan_selection'),false) and
    jsonb_typeof(progress->'completedPhases') is not distinct from 'array' and octet_length(progress::text)<=2048)
);
create index trip_drafts_owner_updated_idx on public.trip_drafts(owner_user_id,updated_at desc);
create table public.trip_preference_snapshots (
  trip_draft_id uuid primary key,
  owner_user_id uuid not null,
  payload jsonb not null,
  source_preference_revision integer not null,
  created_at timestamptz not null default now(),
  constraint trip_preference_snapshots_draft_fk foreign key(owner_user_id,trip_draft_id)
    references public.trip_drafts(owner_user_id,id) on delete cascade,
  constraint trip_preference_snapshots_payload_check check(public.is_travel_preference_v1(payload)),
  constraint trip_preference_snapshots_source_check check(source_preference_revision>=0)
);
create table public.trip_preference_overrides (
  trip_draft_id uuid primary key,
  owner_user_id uuid not null,
  payload jsonb not null default '{"schemaVersion":"1.0","values":{}}',
  revision integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint trip_preference_overrides_draft_fk foreign key(owner_user_id,trip_draft_id)
    references public.trip_drafts(owner_user_id,id) on delete cascade,
  constraint trip_preference_overrides_payload_check check(public.is_travel_preference_v1(payload)),
  constraint trip_preference_overrides_revision_check check(revision>0)
);

-- No grants to anon; RLS still protects the authenticated transaction used by Drizzle.

alter table public.travel_preferences enable row level security;
revoke all on public.travel_preferences from public,anon,authenticated;
grant select,insert,update on public.travel_preferences to authenticated;
grant select,insert,update,delete on public.travel_preferences to service_role;
create policy travel_preferences_select_own on public.travel_preferences for select to authenticated using ((select auth.uid())=owner_user_id);
create policy travel_preferences_insert_own on public.travel_preferences for insert to authenticated with check ((select auth.uid())=owner_user_id);
create policy travel_preferences_update_own on public.travel_preferences for update to authenticated using ((select auth.uid())=owner_user_id) with check ((select auth.uid())=owner_user_id);


alter table public.trip_drafts enable row level security;
revoke all on public.trip_drafts from public,anon,authenticated;
grant select,insert,update on public.trip_drafts to authenticated;
grant select,insert,update,delete on public.trip_drafts to service_role;
create policy trip_drafts_select_own on public.trip_drafts for select to authenticated using ((select auth.uid())=owner_user_id);
create policy trip_drafts_insert_own on public.trip_drafts for insert to authenticated with check ((select auth.uid())=owner_user_id);
create policy trip_drafts_update_own on public.trip_drafts for update to authenticated using ((select auth.uid())=owner_user_id) with check ((select auth.uid())=owner_user_id);


alter table public.trip_preference_snapshots enable row level security;
revoke all on public.trip_preference_snapshots from public,anon,authenticated;
grant select,insert on public.trip_preference_snapshots to authenticated;
grant select,insert,update,delete on public.trip_preference_snapshots to service_role;
create policy trip_preference_snapshots_select_own on public.trip_preference_snapshots for select to authenticated using ((select auth.uid())=owner_user_id);
create policy trip_preference_snapshots_insert_own on public.trip_preference_snapshots for insert to authenticated with check ((select auth.uid())=owner_user_id);



alter table public.trip_preference_overrides enable row level security;
revoke all on public.trip_preference_overrides from public,anon,authenticated;
grant select,insert,update on public.trip_preference_overrides to authenticated;
grant select,insert,update,delete on public.trip_preference_overrides to service_role;
create policy trip_preference_overrides_select_own on public.trip_preference_overrides for select to authenticated using ((select auth.uid())=owner_user_id);
create policy trip_preference_overrides_insert_own on public.trip_preference_overrides for insert to authenticated with check ((select auth.uid())=owner_user_id);
create policy trip_preference_overrides_update_own on public.trip_preference_overrides for update to authenticated using ((select auth.uid())=owner_user_id) with check ((select auth.uid())=owner_user_id);

create function public.guard_trip_preference_revision() returns trigger
language plpgsql set search_path=pg_catalog as $$
begin
  if tg_op='INSERT' then
    new.revision:=1;
    new.created_at:=clock_timestamp();
  else
    if tg_table_name='trip_drafts' then
      if new.id<>old.id or new.creation_key<>old.creation_key then
        raise exception using errcode='55000', message='IMMUTABLE_DRAFT_IDENTITY';
      end if;
    elsif tg_table_name='trip_preference_overrides' then
      if new.trip_draft_id<>old.trip_draft_id then
        raise exception using errcode='55000', message='IMMUTABLE_OVERRIDE_IDENTITY';
      end if;
    end if;
    if new.owner_user_id<>old.owner_user_id or new.revision<>old.revision+1 then
      raise exception using errcode='40001', message='STALE_REVISION_OR_OWNER_CHANGE';
    end if;
    new.created_at:=old.created_at;
  end if;
  new.updated_at:=clock_timestamp();
  return new;
end $$;
create trigger travel_preferences_revision before insert or update on public.travel_preferences for each row execute function public.guard_trip_preference_revision();
create trigger trip_drafts_revision before insert or update on public.trip_drafts for each row execute function public.guard_trip_preference_revision();
create trigger trip_preference_overrides_revision before insert or update on public.trip_preference_overrides for each row execute function public.guard_trip_preference_revision();

create function public.initialize_trip_preference_snapshot() returns trigger
language plpgsql set search_path=pg_catalog as $$
declare source public.travel_preferences%rowtype;
begin
  -- Invoker privileges and RLS. One MVCC read copies payload AND source revision.
  select * into source from public.travel_preferences where owner_user_id=new.owner_user_id;
  insert into public.trip_preference_snapshots(trip_draft_id,owner_user_id,payload,source_preference_revision)
    values(new.id,new.owner_user_id,coalesce(source.payload,'{"schemaVersion":"1.0","values":{}}'),coalesce(source.revision,0));
  insert into public.trip_preference_overrides(trip_draft_id,owner_user_id) values(new.id,new.owner_user_id);
  return new;
end $$;
create trigger trip_drafts_initialize_snapshot after insert on public.trip_drafts
  for each row execute function public.initialize_trip_preference_snapshot();
create function public.reject_trip_snapshot_update() returns trigger
language plpgsql set search_path=pg_catalog as $$
begin
  raise exception using errcode='55000', message='IMMUTABLE_PREFERENCE_SNAPSHOT';
end $$;
create trigger trip_preference_snapshots_immutable before update on public.trip_preference_snapshots
  for each row execute function public.reject_trip_snapshot_update();

revoke all on function public.is_travel_preference_v1(jsonb),public.guard_trip_preference_revision(),
  public.initialize_trip_preference_snapshot(),public.reject_trip_snapshot_update() from public,anon;
grant execute on function public.is_travel_preference_v1(jsonb) to authenticated,service_role;
comment on table public.travel_preferences is 'Versioned category.item preference values. Missing means unset; not a UI state dump.';
comment on table public.trip_drafts is 'B input draft envelope consuming A TripDraftFactsV1/WizardProgressV1. Not TripPlan or itinerary history.';
comment on table public.trip_preference_snapshots is 'Immutable creation-time baseline; revision 0 denotes no saved long-term preference.';
comment on table public.trip_preference_overrides is 'Sparse trip-only category.item values. Never writes long-term preferences.';
commit;
