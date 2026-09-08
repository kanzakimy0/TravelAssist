-- TASK-016-B: product-owned private data; auth.users remains the identity source.
-- Additive only. Auth signup/profile initialization belongs to WBS 8.3.
begin;

create table public.profiles (
  id uuid primary key,
  display_name text,
  full_name text,
  birth_date date,
  gender_code text,
  residence_country_code text,
  residence_city text,
  avatar_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_auth_user_fk foreign key (id) references auth.users(id) on delete cascade,
  constraint profiles_display_name_check check (char_length(display_name) between 1 and 100 and btrim(display_name) <> ''),
  constraint profiles_full_name_check check (char_length(full_name) between 1 and 200 and btrim(full_name) <> ''),
  constraint profiles_birth_date_check check (birth_date between date '0001-01-01' and date '9999-12-31'),
  constraint profiles_gender_code_check check (char_length(gender_code) between 1 and 64 and btrim(gender_code) <> ''),
  constraint profiles_country_code_check check (residence_country_code ~ '^[A-Z]{2}$'),
  constraint profiles_city_check check (char_length(residence_city) between 1 and 200 and btrim(residence_city) <> ''),
  constraint profiles_avatar_path_check check (char_length(avatar_path) between 1 and 1024 and btrim(avatar_path) <> '')
);
alter table public.profiles enable row level security;

create table public.profile_settings (
  user_id uuid primary key,
  locale text,
  region_code text,
  timezone text,
  currency_code text,
  distance_unit text,
  temperature_unit text,
  time_format text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profile_settings_auth_user_fk foreign key (user_id) references auth.users(id) on delete cascade,
  constraint profile_settings_locale_check check (char_length(locale) between 1 and 255 and locale ~ '^[A-Za-z]{1,8}(-[A-Za-z0-9]{1,8})*$'),
  constraint profile_settings_region_check check (region_code ~ '^[A-Z]{2}$'),
  constraint profile_settings_timezone_check check (char_length(timezone) between 1 and 100 and timezone ~ '^[A-Za-z0-9_+-]+(/[A-Za-z0-9_+-]+)*$'),
  constraint profile_settings_currency_check check (currency_code ~ '^[A-Z]{3}$'),
  constraint profile_settings_distance_check check (distance_unit in ('km', 'mi')),
  constraint profile_settings_temperature_check check (temperature_unit in ('celsius', 'fahrenheit')),
  constraint profile_settings_time_format_check check (time_format in ('12h', '24h'))
);
alter table public.profile_settings enable row level security;

create table public.emergency_contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  name text not null,
  relationship text not null,
  phone_e164 text not null,
  country_code text,
  email text,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint emergency_contacts_auth_user_fk foreign key (user_id) references auth.users(id) on delete cascade,
  constraint emergency_contacts_name_check check (char_length(name) between 1 and 200 and btrim(name) <> ''),
  constraint emergency_contacts_relationship_check check (char_length(relationship) between 1 and 100 and btrim(relationship) <> ''),
  constraint emergency_contacts_phone_check check (phone_e164 ~ '^[+][1-9][0-9]{1,14}$'),
  constraint emergency_contacts_country_check check (country_code ~ '^[A-Z]{2}$'),
  constraint emergency_contacts_email_check check (char_length(email) between 3 and 254 and email ~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'),
  constraint emergency_contacts_note_check check (char_length(note) between 1 and 2000 and btrim(note) <> '')
);
alter table public.emergency_contacts enable row level security;
create index emergency_contacts_user_id_idx on public.emergency_contacts (user_id);

comment on table public.profiles is 'Private product profile; nullable fields support progressive onboarding. Authentication credentials remain in auth.users.';
comment on column public.profiles.gender_code is 'Bounded optional representation; no final product gender enumeration is frozen here.';
comment on column public.profiles.avatar_path is 'Provider-neutral reference/path only. Upload, URL resolution and access control belong to later API/storage work.';
comment on table public.profile_settings is 'Optional account display overrides. NULL means application fallback, not a stored travel preference.';
comment on column public.profile_settings.locale is 'Extensible language-tag shape, including private-use tags; registry-aware validation belongs to the future API.';
comment on column public.profile_settings.timezone is 'Timezone identifier shape; future API validates supported IANA timezone names. No timezone list frozen in SQL.';
comment on column public.profile_settings.region_code is 'ISO 3166-1 alpha-2 uppercase format; assigned-code validation is a future API responsibility.';
comment on column public.profile_settings.currency_code is 'ISO 4217 uppercase alpha-3 format; assigned-code validation is a future API responsibility.';
comment on table public.emergency_contacts is 'Zero or more private contacts, independent of companions. No messaging or notification side effects.';
comment on column public.emergency_contacts.phone_e164 is 'Canonical + followed by up to 15 digits; normalization and number validity belong to the future API.';
comment on column public.emergency_contacts.country_code is 'Optional ISO alpha-2 country/region; dialing prefix is already part of phone_e164.';

-- Explicit grants neutralize Supabase default grants without changing global defaults.
revoke all on public.profiles, public.profile_settings, public.emergency_contacts from public, anon, authenticated;
grant select, insert, update on public.profiles, public.profile_settings to authenticated;
grant select, insert, update, delete on public.emergency_contacts to authenticated;
-- Trusted backend role already bypasses RLS; never expose its credentials to clients.
grant select, insert, update, delete on public.profiles, public.profile_settings, public.emergency_contacts to service_role;

create policy profiles_select_own on public.profiles for select to authenticated using ((select auth.uid()) = id);
create policy profiles_insert_own on public.profiles for insert to authenticated with check ((select auth.uid()) = id);
create policy profiles_update_own on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
create policy profile_settings_select_own on public.profile_settings for select to authenticated using ((select auth.uid()) = user_id);
create policy profile_settings_insert_own on public.profile_settings for insert to authenticated with check ((select auth.uid()) = user_id);
create policy profile_settings_update_own on public.profile_settings for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy emergency_contacts_select_own on public.emergency_contacts for select to authenticated using ((select auth.uid()) = user_id);
create policy emergency_contacts_insert_own on public.emergency_contacts for insert to authenticated with check ((select auth.uid()) = user_id);
create policy emergency_contacts_update_own on public.emergency_contacts for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy emergency_contacts_delete_own on public.emergency_contacts for delete to authenticated using ((select auth.uid()) = user_id);

-- Database-owned audit fields, not an auth.users signup/lifecycle trigger.
create function public.set_profile_audit_timestamps()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog
as $$
begin
  if TG_OP = 'INSERT' then
    NEW.created_at := statement_timestamp();
  else
    NEW.created_at := OLD.created_at;
  end if;
  NEW.updated_at := statement_timestamp();
  return NEW;
end;
$$;
revoke all on function public.set_profile_audit_timestamps() from public, anon, authenticated;
create trigger profiles_audit_timestamps before insert or update on public.profiles for each row execute function public.set_profile_audit_timestamps();
create trigger profile_settings_audit_timestamps before insert or update on public.profile_settings for each row execute function public.set_profile_audit_timestamps();
create trigger emergency_contacts_audit_timestamps before insert or update on public.emergency_contacts for each row execute function public.set_profile_audit_timestamps();

commit;
