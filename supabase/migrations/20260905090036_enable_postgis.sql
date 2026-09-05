-- TASK-009: extension infrastructure only; no application tables or auth flows.
-- Keep PostGIS out of public, so it does not become an application Data API.
create schema if not exists extensions;
create extension if not exists postgis with schema extensions;
