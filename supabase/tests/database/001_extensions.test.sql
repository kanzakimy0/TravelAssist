begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(4);
select ok(
  exists(select 1 from pg_extension where extname = 'postgis'),
  'PostGIS extension is installed by the SQL migration'
);
select is(
  (select n.nspname::text from pg_extension e
   join pg_namespace n on n.oid = e.extnamespace where e.extname = 'postgis'),
  'extensions',
  'PostGIS is isolated in the extensions schema'
);
select ok(length(extensions.postgis_full_version()) > 0, 'PostGIS functions execute');
select is(
  extensions.st_srid(extensions.st_setsrid(extensions.st_makepoint(139.76, 35.68), 4326)),
  4326,
  'PostGIS geometry smoke query returns the expected SRID'
);

select * from finish();
rollback;
