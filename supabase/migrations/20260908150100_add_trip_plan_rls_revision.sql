-- TASK-019-A: owner-only, default deny; SQL owns audit/revision semantics.
begin;
alter table public.trips enable row level security;
alter table public.trip_plans enable row level security;
alter table public.trip_days enable row level security;
alter table public.itinerary_items enable row level security;
revoke all on public.trips,public.trip_plans,public.trip_days,public.itinerary_items from public,anon,authenticated;
grant select,insert,update,delete on public.trips,public.trip_plans,public.trip_days,public.itinerary_items to authenticated,service_role;

create policy trips_owner on public.trips for all to authenticated
  using (owner_user_id=(select auth.uid())) with check (owner_user_id=(select auth.uid()));
create policy trip_plans_owner on public.trip_plans for all to authenticated
  using (exists(select 1 from public.trips t where t.id=trip_id and t.owner_user_id=(select auth.uid())))
  with check (exists(select 1 from public.trips t where t.id=trip_id and t.owner_user_id=(select auth.uid())));
create policy trip_days_owner on public.trip_days for all to authenticated
  using (exists(select 1 from public.trip_plans p join public.trips t on t.id=p.trip_id where p.id=plan_id and t.owner_user_id=(select auth.uid())))
  with check (exists(select 1 from public.trip_plans p join public.trips t on t.id=p.trip_id where p.id=plan_id and t.owner_user_id=(select auth.uid())));
create policy itinerary_items_owner on public.itinerary_items for all to authenticated
  using (exists(select 1 from public.trip_days d join public.trip_plans p on p.id=d.plan_id join public.trips t on t.id=p.trip_id where d.id=day_id and t.owner_user_id=(select auth.uid())))
  with check (exists(select 1 from public.trip_days d join public.trip_plans p on p.id=d.plan_id join public.trips t on t.id=p.trip_id where d.id=day_id and t.owner_user_id=(select auth.uid())));

create function public.guard_trip_tree_row() returns trigger
language plpgsql security invoker set search_path=pg_catalog as $$
begin
  if TG_OP='INSERT' then
    NEW.created_at:=statement_timestamp();
    if TG_TABLE_NAME in ('trips','trip_plans') then
      if NEW.revision <> 1 then raise exception using errcode='PT409',message='TRIP_INITIAL_REVISION'; end if;
      NEW.revision_txid:=txid_current();
    end if;
  else
    if NEW.id is distinct from OLD.id then raise exception using errcode='PT409',message='TRIP_IMMUTABLE_ID'; end if;
    if (TG_TABLE_NAME='trips' and to_jsonb(NEW)->'owner_user_id' is distinct from to_jsonb(OLD)->'owner_user_id')
      or (TG_TABLE_NAME='trip_plans' and to_jsonb(NEW)->'trip_id' is distinct from to_jsonb(OLD)->'trip_id')
      or (TG_TABLE_NAME='trip_days' and to_jsonb(NEW)->'plan_id' is distinct from to_jsonb(OLD)->'plan_id')
      or (TG_TABLE_NAME='itinerary_items' and to_jsonb(NEW)->'day_id' is distinct from to_jsonb(OLD)->'day_id') then
      raise exception using errcode='PT409',message='TRIP_IMMUTABLE_PARENT';
    end if;
    NEW.created_at:=OLD.created_at;
    if TG_TABLE_NAME in ('trips','trip_plans') then
      -- UPDATE revision carries the expected current token, never the requested next token.
      if NEW.revision<>OLD.revision or NEW.revision_txid<>OLD.revision_txid then
        raise exception using errcode='PT409',message='TRIP_STALE_REVISION';
      end if;
      NEW.revision:=OLD.revision + case when OLD.revision_txid=txid_current() then 0 else 1 end;
      NEW.revision_txid:=txid_current();
    end if;
  end if;
  NEW.updated_at:=statement_timestamp();
  return NEW;
end;
$$;
revoke all on function public.guard_trip_tree_row() from public,anon,authenticated;
create trigger trips_guard before insert or update on public.trips for each row execute function public.guard_trip_tree_row();
create trigger trip_plans_guard before insert or update on public.trip_plans for each row execute function public.guard_trip_tree_row();
create trigger trip_days_guard before insert or update on public.trip_days for each row execute function public.guard_trip_tree_row();
create trigger itinerary_items_guard before insert or update on public.itinerary_items for each row execute function public.guard_trip_tree_row();

-- Auth account cascades run as supabase_auth_admin, which has no public table grants.
-- Narrow trigger-only definer: fixed ancestor UPDATEs; no arguments/dynamic SQL;
-- callers cannot EXECUTE it and row mutations still pass their own RLS first.
create function public.touch_trip_tree_ancestors() returns trigger
language plpgsql security definer set search_path=pg_catalog as $$
declare row_data jsonb;
begin
  if TG_OP='DELETE' then row_data:=to_jsonb(OLD); else row_data:=to_jsonb(NEW); end if;
  if TG_TABLE_NAME='trip_plans' then
    update public.trips set revision=revision where id=(row_data->>'trip_id')::uuid;
  elsif TG_TABLE_NAME='trip_days' then
    update public.trip_plans set revision=revision where id=(row_data->>'plan_id')::uuid;
  else
    update public.trip_plans set revision=revision where id=(select plan_id from public.trip_days where id=(row_data->>'day_id')::uuid);
  end if;
  return null;
end;
$$;
revoke all on function public.touch_trip_tree_ancestors() from public,anon,authenticated;
create trigger trip_plans_touch after insert or update or delete on public.trip_plans for each row execute function public.touch_trip_tree_ancestors();
create trigger trip_days_touch after insert or update or delete on public.trip_days for each row execute function public.touch_trip_tree_ancestors();
create trigger itinerary_items_touch after insert or update or delete on public.itinerary_items for each row execute function public.touch_trip_tree_ancestors();
comment on function public.guard_trip_tree_row() is 'Server CAS locks/checks expected revisions before mutations; SQL rejects revision jumps and maintains one increment per affected entity per transaction. Child writes invalidate ancestor tokens.';
commit;
