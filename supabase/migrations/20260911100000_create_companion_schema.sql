-- TASK-044-B / WBS 5.12. SQL is the sole schema history.
begin;

create function public.is_companion_travel_profile_v1(payload jsonb) returns boolean
language plpgsql immutable set search_path = pg_catalog as $$
declare
  allowed constant jsonb := '{
    "mobilityNeeds":["reduce_walking","reduce_stairs","stroller","child_seat","accessible_route","more_rest"],
    "diningNeeds":["dietary_restriction","food_allergy_notice","vegetarian","child_meal","other_dietary_need"],
    "activityInterests":["animals","outdoor","museums","photography","rides"]
  }';
  item record;
begin
  if payload is null or jsonb_typeof(payload) <> 'object' then return false; end if;
  if octet_length(payload::text) > 8192 or
    not payload ?& array['schemaVersion','mobilityNeeds','diningNeeds','activityInterests'] or
    (select count(*) from jsonb_object_keys(payload)) <> 4 or
    payload->'schemaVersion' <> '"1.0"'::jsonb then return false; end if;
  for item in select * from jsonb_each(allowed) loop
    if jsonb_typeof(payload->item.key) <> 'array' then return false; end if;
    if jsonb_array_length(payload->item.key) > jsonb_array_length(item.value) or
      (select count(*) <> count(distinct value) from jsonb_array_elements(payload->item.key)) or
      exists (
        select 1 from jsonb_array_elements(payload->item.key) candidate
        where not exists (
          select 1 from jsonb_array_elements(item.value) permitted
          where permitted.value = candidate.value
        )
      ) then return false; end if;
  end loop;
  return true;
end $$;

create table public.companions (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null,
  display_name text not null,
  relationship_code text,
  relationship_label text,
  birth_date date,
  age_group_fallback text,
  gender_code text,
  avatar_path text,
  travel_profile jsonb not null default '{"schemaVersion":"1.0","mobilityNeeds":[],"diningNeeds":[],"activityInterests":[]}'::jsonb,
  revision integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint companions_auth_user_fk foreign key (owner_user_id) references auth.users(id) on delete cascade,
  constraint companions_id_owner_unique unique (id, owner_user_id),
  constraint companions_display_name_check check (char_length(display_name) between 1 and 100 and display_name = btrim(display_name)),
  constraint companions_relationship_code_check check (relationship_code in ('family','partner','friend','colleague','other')),
  constraint companions_relationship_label_check check (char_length(relationship_label) <= 100),
  constraint companions_age_source_check check ((birth_date is not null) <> (age_group_fallback is not null)),
  constraint companions_birth_date_check check (birth_date between date '0001-01-01' and date '9999-12-31'),
  constraint companions_age_group_check check (age_group_fallback in ('infant','child','adult','senior')),
  constraint companions_gender_check check (gender_code in ('female','male','other')),
  constraint companions_avatar_path_check check (
    char_length(avatar_path) between 1 and 1024 and avatar_path = btrim(avatar_path)
    and avatar_path !~ '(^/|:|(^|/)\.\.?(/|$))' and position(chr(92) in avatar_path) = 0
  ),
  constraint companions_travel_profile_check check (public.is_companion_travel_profile_v1(travel_profile)),
  constraint companions_revision_check check (revision > 0)
);

create table public.companion_groups (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null,
  name text not null,
  description text,
  includes_owner boolean not null default false,
  revision integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint companion_groups_auth_user_fk foreign key (owner_user_id) references auth.users(id) on delete cascade,
  constraint companion_groups_id_owner_unique unique (id, owner_user_id),
  constraint companion_groups_name_check check (char_length(name) between 1 and 100 and name = btrim(name)),
  constraint companion_groups_description_check check (char_length(description) <= 300),
  constraint companion_groups_revision_check check (revision > 0)
);

create table public.companion_group_members (
  owner_user_id uuid not null,
  group_id uuid not null,
  companion_id uuid not null,
  sort_order integer not null,
  created_at timestamptz not null default now(),
  constraint companion_group_members_pk primary key (group_id, companion_id),
  constraint companion_group_members_sort_unique unique (group_id, sort_order),
  constraint companion_group_members_sort_check check (sort_order >= 0),
  constraint companion_group_members_group_owner_fk foreign key (group_id, owner_user_id)
    references public.companion_groups(id, owner_user_id) on delete cascade,
  constraint companion_group_members_companion_owner_fk foreign key (companion_id, owner_user_id)
    references public.companions(id, owner_user_id) on delete cascade
);
-- Indexes support owner RLS and both cascade directions.
create index companions_owner_idx on public.companions(owner_user_id);
create index companion_groups_owner_idx on public.companion_groups(owner_user_id);
create index companion_group_members_owner_idx on public.companion_group_members(owner_user_id);
create index companion_group_members_companion_idx on public.companion_group_members(companion_id, owner_user_id);

-- One revision per master/group, with DB-owned audit fields.
-- Full group aggregate CAS belongs to 5.17, not this row-level guard.
create function public.guard_companion_revision() returns trigger
language plpgsql set search_path = pg_catalog as $$
begin
  if tg_op = 'INSERT' then
    if new.revision is distinct from 1 then
      raise exception using errcode = '23514', message = 'INITIAL_REVISION_MUST_BE_ONE';
    end if;
    new.created_at := clock_timestamp();
  else
    if new.owner_user_id is distinct from old.owner_user_id or new.id is distinct from old.id then
      raise exception using errcode = '55000', message = 'IMMUTABLE_COMPANION_IDENTITY';
    end if;
    if new.revision is distinct from old.revision + 1 then
      raise exception using errcode = '40001', message = 'STALE_COMPANION_REVISION';
    end if;
    new.created_at := old.created_at;
  end if;
  new.updated_at := clock_timestamp();
  return new;
end $$;

create function public.guard_companion_birth_date() returns trigger
language plpgsql set search_path = pg_catalog as $$
begin
  -- A stable write-time UTC calendar date; no volatile CHECK or session TZ drift.
  if new.birth_date > (statement_timestamp() at time zone 'UTC')::date then
    raise exception using errcode = '23514', message = 'FUTURE_COMPANION_BIRTH_DATE';
  end if;
  return new;
end $$;

create function public.guard_companion_member_audit() returns trigger
language plpgsql set search_path = pg_catalog as $$
begin
  if tg_op = 'INSERT' then
    new.created_at := clock_timestamp();
  else
    if new.owner_user_id is distinct from old.owner_user_id then
      raise exception using errcode = '55000', message = 'IMMUTABLE_COMPANION_MEMBER_OWNER';
    end if;
    new.created_at := old.created_at;
  end if;
  return new;
end $$;

create trigger companions_revision before insert or update on public.companions
  for each row execute function public.guard_companion_revision();
create trigger companions_birth_date before insert or update on public.companions
  for each row execute function public.guard_companion_birth_date();
create trigger companion_groups_revision before insert or update on public.companion_groups
  for each row execute function public.guard_companion_revision();
create trigger companion_group_members_audit before insert or update on public.companion_group_members
  for each row execute function public.guard_companion_member_audit();

alter table public.companions enable row level security;
revoke all on public.companions from public, anon, authenticated;
grant select, insert, update, delete on public.companions to authenticated, service_role;
create policy companions_select_own on public.companions
  for select to authenticated using ((select auth.uid()) = owner_user_id);
create policy companions_insert_own on public.companions
  for insert to authenticated with check ((select auth.uid()) = owner_user_id);
create policy companions_update_own on public.companions
  for update to authenticated using ((select auth.uid()) = owner_user_id)
  with check ((select auth.uid()) = owner_user_id);
create policy companions_delete_own on public.companions
  for delete to authenticated using ((select auth.uid()) = owner_user_id);

alter table public.companion_groups enable row level security;
revoke all on public.companion_groups from public, anon, authenticated;
grant select, insert, update, delete on public.companion_groups to authenticated, service_role;
create policy companion_groups_select_own on public.companion_groups
  for select to authenticated using ((select auth.uid()) = owner_user_id);
create policy companion_groups_insert_own on public.companion_groups
  for insert to authenticated with check ((select auth.uid()) = owner_user_id);
create policy companion_groups_update_own on public.companion_groups
  for update to authenticated using ((select auth.uid()) = owner_user_id)
  with check ((select auth.uid()) = owner_user_id);
create policy companion_groups_delete_own on public.companion_groups
  for delete to authenticated using ((select auth.uid()) = owner_user_id);

alter table public.companion_group_members enable row level security;
revoke all on public.companion_group_members from public, anon, authenticated;
grant select, insert, update, delete on public.companion_group_members to authenticated, service_role;
create policy companion_group_members_select_own on public.companion_group_members
  for select to authenticated using ((select auth.uid()) = owner_user_id);
create policy companion_group_members_insert_own on public.companion_group_members
  for insert to authenticated with check ((select auth.uid()) = owner_user_id);
create policy companion_group_members_update_own on public.companion_group_members
  for update to authenticated using ((select auth.uid()) = owner_user_id)
  with check ((select auth.uid()) = owner_user_id);
create policy companion_group_members_delete_own on public.companion_group_members
  for delete to authenticated using ((select auth.uid()) = owner_user_id);

revoke all on function public.is_companion_travel_profile_v1(jsonb),
 public.guard_companion_revision(), public.guard_companion_birth_date(), public.guard_companion_member_audit()
 from public, anon, authenticated;
grant execute on function public.is_companion_travel_profile_v1(jsonb) to authenticated, service_role;
comment on table public.companions is 'B-owned non-self reusable companions. No self row, medical notes or Trip snapshots.';
comment on column public.companions.travel_profile is 'Strict v1.0 functional stable codes only; no inference from age, gender or relationship.';
comment on column public.companion_groups.includes_owner is 'Virtual Profile owner membership; never a self Companion row.';
comment on table public.companion_group_members is 'Same-owner selection template. Direct owner CRUD exposed; aggregate transaction/CAS deferred to WBS 5.17.';
commit;
