# SQL migration history

This is the sole formal migration directory; Supabase CLI is the runner.
The TASK-015 bootstrap intentionally has **zero SQL migrations** and no business
tables. Local Docker is unavailable; PostGIS SQL must not be committed as
verified until a real Local reset and extension check succeed.

Use `npx supabase migration new <snake_case_description>` for a reviewed change.
File names follow `YYYYMMDDHHMMSS_description.sql`. Never rewrite merged or
shared migrations; add a forward corrective migration. Rebuild Local, regenerate
types, and update Drizzle mappings with each schema change. Do not introduce a
second Drizzle history, Dashboard-only DDL, or remote push in this workflow.
