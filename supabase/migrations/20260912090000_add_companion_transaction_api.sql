-- TASK-047-B: transaction/CAS helpers over the frozen 5.12 tables.
-- SECURITY INVOKER preserves the authenticated caller's RLS on every statement.
begin;
create function public.mutate_companion_v1(p_action text, p_id uuid default null, p_expected_revision integer default null, p_input jsonb default null)
returns jsonb language plpgsql security invoker set search_path = pg_catalog as $$
declare
  actor uuid := auth.uid();
  saved public.companions;
  current_revision integer;
begin
  if actor is null then raise exception 'AUTH_REQUIRED'; end if;
  perform pg_advisory_xact_lock(hashtextextended(actor::text, 517));
  if p_action not in ('create','update','delete') or p_action is null then raise exception 'INVALID_REQUEST'; end if;
  if p_action <> 'create' then
    if p_expected_revision is null or p_expected_revision < 1 then raise exception 'INVALID_REQUEST'; end if;
    select revision into current_revision from public.companions where id = p_id and owner_user_id = actor for update;
    if not found then raise exception 'COMPANION_NOT_FOUND'; end if;
    if current_revision <> p_expected_revision then raise exception 'STALE_COMPANION_REVISION'; end if;
  elsif p_id is not null or p_expected_revision is not null then
    raise exception 'INVALID_REQUEST';
  end if;
  if p_action = 'delete' then
    -- Cascade changes the aggregate snapshot: invalidate every affected group
    -- revision in the same transaction so an old editor cannot resurrect it.
    update public.companion_groups g set revision = g.revision + 1
      where g.owner_user_id = actor and exists (
        select 1 from public.companion_group_members m
        where m.group_id = g.id and m.owner_user_id = actor and m.companion_id = p_id);
    delete from public.companions where id = p_id and owner_user_id = actor and revision = p_expected_revision;
    return null;
  end if;
  if p_input is null or jsonb_typeof(p_input) <> 'object' or
     not p_input ?& array['display_name','relationship_code','relationship_label','birth_date','age_group_fallback','gender_code','avatar_path','travel_profile'] or
     (select count(*) from jsonb_object_keys(p_input)) <> 8 then raise exception 'INVALID_COMPANION_INPUT'; end if;
  if p_action = 'create' then
    -- Count limits mirror the sole domain constants; TASK-047 tests check parity.
    if (select count(*) from public.companions where owner_user_id = actor) >= 100 then raise exception 'COMPANION_LIMIT_REACHED'; end if;
    insert into public.companions(owner_user_id, display_name, relationship_code, relationship_label, birth_date, age_group_fallback, gender_code, avatar_path, travel_profile)
      values(actor, p_input->>'display_name', p_input->>'relationship_code', p_input->>'relationship_label', (p_input->>'birth_date')::date, p_input->>'age_group_fallback', p_input->>'gender_code', p_input->>'avatar_path', p_input->'travel_profile')
      returning * into saved;
  else
    update public.companions set
      display_name = p_input->>'display_name', relationship_code = p_input->>'relationship_code',
      relationship_label = p_input->>'relationship_label', birth_date = (p_input->>'birth_date')::date,
      age_group_fallback = p_input->>'age_group_fallback', gender_code = p_input->>'gender_code',
      avatar_path = p_input->>'avatar_path', travel_profile = p_input->'travel_profile', revision = revision + 1
      where id = p_id and owner_user_id = actor and revision = p_expected_revision returning * into saved;
    if not found then raise exception 'STALE_COMPANION_REVISION'; end if;
  end if;
  return to_jsonb(saved);
end $$;

create function public.mutate_companion_group_v1(p_action text, p_id uuid default null, p_expected_revision integer default null, p_name text default null, p_includes_owner boolean default null, p_member_ids uuid[] default null)
returns jsonb language plpgsql security invoker set search_path = pg_catalog as $$
declare
  actor uuid := auth.uid();
  saved public.companion_groups;
  current_revision integer;
  members jsonb;
begin
  if actor is null then raise exception 'AUTH_REQUIRED'; end if;
  perform pg_advisory_xact_lock(hashtextextended(actor::text, 517));
  if p_action not in ('create','update','delete') or p_action is null then raise exception 'INVALID_REQUEST'; end if;
  if p_action <> 'create' then
    if p_expected_revision is null or p_expected_revision < 1 then raise exception 'INVALID_REQUEST'; end if;
    select revision into current_revision from public.companion_groups where id = p_id and owner_user_id = actor for update;
    if not found then raise exception 'COMPANION_GROUP_NOT_FOUND'; end if;
    if current_revision <> p_expected_revision then raise exception 'STALE_COMPANION_GROUP_REVISION'; end if;
  elsif p_id is not null or p_expected_revision is not null then
    raise exception 'INVALID_REQUEST';
  end if;
  if p_action = 'delete' then
    delete from public.companion_groups where id = p_id and owner_user_id = actor and revision = p_expected_revision;
    return null;
  end if;
  if p_member_ids is null or cardinality(p_member_ids) > 20 or
     (select count(*) <> count(distinct member) from unnest(p_member_ids) member) then raise exception 'INVALID_COMPANION_GROUP_INPUT'; end if;
  if exists(select 1 from unnest(p_member_ids) member where member is null or not exists(
    select 1 from public.companions c where c.id = member and c.owner_user_id = actor)) then raise exception 'COMPANION_GROUP_MEMBER_INVALID'; end if;
  if p_action = 'create' then
    if (select count(*) from public.companion_groups where owner_user_id = actor) >= 20 then raise exception 'COMPANION_GROUP_LIMIT_REACHED'; end if;
    insert into public.companion_groups(owner_user_id, name, includes_owner) values(actor, p_name, p_includes_owner) returning * into saved;
  else
    update public.companion_groups set name = p_name, includes_owner = p_includes_owner, revision = revision + 1
      where id = p_id and owner_user_id = actor and revision = p_expected_revision returning * into saved;
    if not found then raise exception 'STALE_COMPANION_GROUP_REVISION'; end if;
    delete from public.companion_group_members where group_id = p_id and owner_user_id = actor;
  end if;
  insert into public.companion_group_members(owner_user_id,group_id,companion_id,sort_order)
    select actor,saved.id,member,(ordinality-1)::integer from unnest(p_member_ids) with ordinality as x(member,ordinality);
  select coalesce(jsonb_agg(to_jsonb(m) order by m.sort_order),'[]'::jsonb) into members
    from public.companion_group_members m where m.group_id = saved.id and m.owner_user_id = actor;
  return jsonb_build_object('group',to_jsonb(saved),'members',members);
end $$;
revoke all on function public.mutate_companion_v1(text,uuid,integer,jsonb), public.mutate_companion_group_v1(text,uuid,integer,text,boolean,uuid[]) from public, anon;
grant execute on function public.mutate_companion_v1(text,uuid,integer,jsonb), public.mutate_companion_group_v1(text,uuid,integer,text,boolean,uuid[]) to authenticated;
comment on function public.mutate_companion_group_v1 is '5.17 owner-scoped group CAS and ordered membership snapshot transaction; invoker RLS.';
commit;
