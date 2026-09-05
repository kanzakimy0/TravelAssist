# Database development — TASK-009

The foundation is Supabase PostgreSQL 17 + PostGIS. **The only schema history is
`supabase/migrations/*.sql`; the only migration runner is Supabase CLI.** Drizzle
is a trusted server query/transaction layer, not another migration system.

## Prerequisites

- Node 24 (`.nvmrc`); verified workstation Node 24.19.0 / npm 11.17.0.
- Docker Desktop or an already configured Docker-compatible local runtime.
  Windows requires the supported virtualization/WSL setup described by Docker.
- `npm ci`; the repository pins Supabase CLI 2.116.0, not a global installation.

No cloud project, login, linking or Production credential is needed. Do not
install an unknown runtime to bypass a missing Docker installation. If Docker
is unavailable, file/unit/build checks are not a substitute for DB verification.

## Local commands (from the repository root)

```bash
npm ci
npm run db:start
npm run db:status
npm run db:reset
npm run db:lint
npm run db:test
npm run db:types
npm run db:types:check
npm run db:stop
```

`db:reset` is destructive **only to this local project's database**: it rebuilds
from migrations + the deliberately empty seed, then regenerates types. Save
valuable local data first. Project/container identity is `travelassist`, shared
by checkouts using this config; do not run competing checkouts simultaneously.
`db:stop` preserves volumes and never uses `--no-backup`.

Scripts reject extra flags (including `--linked`, `--db-url`, project refs and
arbitrary paths) and remote Docker endpoints. They never load `.env.local` or
pass cloud Supabase/PG credentials to the CLI. Do not expose Docker or the local
stack on an untrusted network. Logs redact connection URLs, JWTs and API keys.

## Migration workflow

```bash
npm run db:migration:new -- add_descriptive_change
```

Edit the CLI-created timestamped SQL, reset from scratch, test, and update both
the corresponding Drizzle mapping and generated Supabase types in the same PR.
Once merged/shared, migrations are immutable: add a forward corrective migration.
The first migration only enables PostGIS in `extensions`, outside the Data API's
`public` schema. The pgTAP test queries the extension catalog, version and geometry
functions in a rolled-back transaction. No application tables are created.

Forbidden: Dashboard edits to Production schema, remote `drizzle-kit push`,
`drizzle-kit migrate`, a `drizzle/*.sql` history, or cloud `supabase db push` in
this workflow. `drizzle.config.ts` has no credentials; its ignored tooling output
is not migration history. The Supabase CLI's declarative schema paths remain empty.

## Server and browser boundaries

- `src/db/index.ts`: `server-only`, lazy `getDb()` / `closeDb()`, postgres.js with
  prepared statements disabled for transaction pooler compatibility. No network
  connection or environment requirement on import. Missing `DATABASE_URL` throws
  only when used. Query modules must authorize their callers and return safe DTOs.
- `src/db/schema/index.ts`: intentionally no business table mappings yet.
- `src/lib/supabase/browser.ts`: public user client, cookie-based SSR helper.
- `src/lib/supabase/server.ts`: a fresh user client per request, async Next cookies.
  RSC default is read-only and fails explicitly on cookie writes. Future Route
  Handlers must provide an adapter that persists **both cookies and SDK cache
  headers** to the actual response. No singleton, silent cookie-write catch,
  session validation, auth proxy, redirect or login flow is added here.
- `src/lib/supabase/admin.ts`: lazy server-only secret-key client. Session
  persistence, refresh and URL detection are disabled. This bypasses user RLS;
  future callers must perform explicit authorization before privileged work.

Build must remain possible with all database variables unset. No existing page
imports these factories; DB infrastructure does not change Planner/Personal Center.

## Environment variables and keys

`.env.example` contains **empty placeholders only**:

```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
DATABASE_URL=
SUPABASE_SECRET_KEY=
```

The installed CLI/SDK support the current `sb_publishable_` / `sb_secret_` key
pair. This project chooses that naming once; it does not add ambiguous parallel
ANON_KEY / SERVICE_ROLE_KEY aliases. A secret key is privileged service-role
access regardless of its newer name. User factories reject non-publishable keys;
the admin factory rejects non-secret keys. Never paste real keys in Git, logs,
Result, Issue or PR. Never put secrets or connection strings in `NEXT_PUBLIC_*`.

Configure values locally through Supabase's local tooling after installing
Docker; credentials are deliberately not printed by `db:status`. Do not commit
`.env.local`, signing keys, container volumes or Supabase temporary project links.
Mapbox environment semantics are unchanged. Production creation/linking is a
separate authorized task, not a way to unblock this foundation.

## Generated types and CI

`db:types` runs the pinned CLI against **Local** `public`, then formats its output
at `src/types/database.generated.ts`. Failed generation never overwrites a valid
file. Never hand-maintain its fields or substitute a handwritten empty schema.
The extensions schema is intentionally excluded from application API types.

`.github/workflows/database.yml` uses an ephemeral GitHub-hosted Linux Docker
stack for DB-related PRs to develop: install, boundary tests, start, full reset,
lint, pgTAP, generation/drift check, app checks, and cleanup. It has read-only
repository permissions, no production secrets, and uploads only generated types.
The committed file must exist and match regenerated bytes; new untracked output
does not silently pass drift checking.

Bootstrap on a machine without Docker: keep the PR Draft, collect the CI CLI
artifact, commit that exact generated output, then rerun checks. An initial run
may fail the committed-types check while producing the artifact; that is not an
acceptance pass. The Result separately records local runtime and CI evidence.

Repository automatic merge workflows are unchanged. First publish with `[skip ci]`
and create a Draft PR. A subsequent DB change without that marker can run DB CI
while the existing Draft prevents merging. Verify Draft before every push; never
mark Ready or auto-merge as part of TASK-009. CI success is not merge authorization.

## Tests and dependency safety

```bash
npm run db:foundation:test
npm run lint
npm run typecheck
npm run format:check
npm run build
git diff --check
```

Small Node tests verify lazy factories, request isolation, server-only markers,
cookie/header forwarding, local-only command guards and redaction without a DB.
They complement, not replace, real reset and pgTAP checks. The targeted
`@esbuild-kit/core-utils` override uses esbuild 0.25.12 to fix the old development
server advisory brought in by stable drizzle-kit; no unrelated framework update.

## Ownership and stop boundary

A owns shared infra / migrations and future main-trip schema. B owns User/Profile,
authentication user flows, preferences, companions and saved-trip persistence.
Both must submit SQL + mappings/types + reset/test evidence together. TASK-009
stops before 8.2, 8.3, 8.5 and all business tables, payments or memberships.

## Official references

- [Supabase CLI / Docker](https://supabase.com/docs/guides/local-development/cli/getting-started)
- [SQL migrations](https://supabase.com/docs/guides/local-development/database-migrations)
- [PostGIS](https://supabase.com/docs/guides/database/extensions/postgis)
- [Database tests](https://supabase.com/docs/guides/database/testing)
- [CLI types](https://supabase.com/docs/reference/cli/supabase-gen-types)
- [Supabase keys](https://supabase.com/docs/guides/getting-started/api-keys)
- [SSR factories](https://supabase.com/docs/guides/auth/server-side/creating-a-client)
- [Drizzle / Supabase](https://orm.drizzle.team/docs/connect-supabase)
