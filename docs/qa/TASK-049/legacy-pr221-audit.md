# TASK-049-B — PR #221 file disposition

The unchanged PR head `929529be302b60c84ace3a580461de95e04de461` and all 23
changed paths were reverified against the prior [TASK-048 audit](../TASK-048/legacy-pr221-audit.md).
Execution baseline is `5ceffd8349ead5b5280029d2b344c23e9346e317`. Decisions below
apply specifically to the 5.19 API scope; the older model-stage audit is preserved.

| Legacy file                                                              | Disposition | TASK-049 decision                                                                             |
| ------------------------------------------------------------------------ | ----------- | --------------------------------------------------------------------------------------------- |
| `docs/architecture/step-preference-persistence.md`                       | SUPERSEDE   | 5.18 model and frozen 5.19 specification replace the old combined design.                     |
| `docs/project/WBS-TravelAssist.md`                                       | SUPERSEDE   | Use latest develop Master; change only current 5.19 status.                                   |
| `docs/tasks/RESULT-TASK-017-b-step-preference-trip-draft-persistence.md` | DEFER       | Preserve historical Partial evidence on its branch; not current acceptance.                   |
| `docs/tasks/TASK-017-b-step-preference-trip-draft-persistence.md`        | SUPERSEDE   | Execute TASK-049 exact API boundary instead.                                                  |
| `package.json`                                                           | SUPERSEDE   | Retain current dependencies; add only two dedicated test commands.                            |
| `src/app/api/travel-persistence/route.ts`                                | SUPERSEDE   | Dedicated resource routes replace the old action multiplexer; do not revive.                  |
| `src/db/schema/index.ts`                                                 | REUSE       | Current accepted aggregate export already exists; no change.                                  |
| `src/db/schema/travel-preferences.ts`                                    | SUPERSEDE   | Accepted 5.11/5.16 mirror is authoritative; never copy legacy multi-table design.             |
| `src/features/start-flow/model/server-draft-autosave.ts`                 | DEFER       | Start autosave and UI wiring are expressly outside 5.19.                                      |
| `src/server/preferences/http.ts`                                         | SUPERSEDE   | Keep current accepted 5.16 HTTP and shared verified Auth helper.                              |
| `src/server/preferences/repository.ts`                                   | REWORK      | Owner-scope and creation-key ideas only; new Trip gateway uses getDb with explicit owner/CAS. |
| `src/server/preferences/service.ts`                                      | SUPERSEDE   | New Trip transaction orchestration; do not replace accepted Preference service.               |
| `src/shared/contracts/preferences/drafts.ts`                             | REWORK      | Direct A-parser reuse is retained through accepted 5.18 validators; no duplicate Trip schema. |
| `src/shared/contracts/preferences/index.ts`                              | SUPERSEDE   | Current PreferenceV1/PreferencePatchV1 replace the legacy key vocabulary.                     |
| `src/types/database.generated.ts`                                        | SUPERSEDE   | Regenerate twice from real current Local Supabase.                                            |
| `supabase/migrations/20260908130000_create_trip_preference_drafts.sql`   | SUPERSEDE   | Use accepted single aggregate and one narrow additive intent hardening migration.             |
| `tests/register-preference-ts.mjs`                                       | SUPERSEDE   | Use accepted route/planner loaders; no new loader.                                            |
| `tests/task-016-user-profile.runtime.mjs`                                | REUSE       | Run current accepted Profile DB regression unchanged.                                         |
| `tests/task-016-user-profile.test.mjs`                                   | REUSE       | Run current accepted Profile and client boundary tests unchanged.                             |
| `tests/task-017-api.runtime.mjs`                                         | REWORK      | Scenario ideas only; new real HTTP tests cover exact 5.19 routes and semantics.               |
| `tests/task-017-local-db.mjs`                                            | SUPERSEDE   | Use existing localhost-only helpers and sanitized fixture cleanup.                            |
| `tests/task-017-persistence.runtime.mjs`                                 | REWORK      | Re-exercise owner/RLS/CAS/idempotency against the current aggregate.                          |
| `tests/task-017-persistence.test.mjs`                                    | REWORK      | Current canonical contracts and keys govern tests; autosave scenarios stay deferred.          |

No legacy source, migration or generated type was copied; no merge/cherry-pick.
Issue #207 remains Open and PR #221 remains Draft / Open, untouched by this task.
