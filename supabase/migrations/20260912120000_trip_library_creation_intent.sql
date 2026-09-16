-- TASK-049-B: retain original idempotency intent across later draft edits.
-- NULL is intentional for pre-gateway 5.18 records; never guess their original request.
begin;
alter table public.trip_library_records add column creation_intent_hash text
  constraint trip_library_creation_intent_check check (creation_intent_hash ~ '^[0-9a-f]{64}$');
comment on column public.trip_library_records.creation_intent_hash is
  'Server SHA-256 of versioned normalized original create/copy intent. Not client input or canonical Trip content. Immutable; legacy NULL cannot claim gateway idempotency.';
create function public.guard_trip_library_creation_intent_v1() returns trigger
language plpgsql security invoker set search_path = pg_catalog as $$
begin
  if new.creation_intent_hash is distinct from old.creation_intent_hash then
    raise exception using errcode='55000', message='IMMUTABLE_TRIP_CREATION_INTENT';
  end if;
  return new;
end $$;
create trigger trip_library_creation_intent_guard before update on public.trip_library_records
  for each row execute function public.guard_trip_library_creation_intent_v1();
revoke all on function public.guard_trip_library_creation_intent_v1() from public, anon, authenticated;
-- Match the bounded keyset query including ties; retain the previous index/history.
create index trip_library_records_owner_page_idx
  on public.trip_library_records(owner_user_id, updated_at desc, id desc);
commit;
