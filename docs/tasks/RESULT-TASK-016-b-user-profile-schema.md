# TASK-016-B — User / Profile Schema Result

## Status

**Completed. WBS 8.2 USER ACCEPTANCE: PASS.** The user explicitly accepted the result and authorized merging [PR #209](https://github.com/kanzakimy0/TravelAssist/pull/209), now merged into develop. WBS 8.2 is **已完成**. Full-format baseline exceptions remain reported below, not counted as PASS.

## Final user acceptance / merge closeout — 2026-09-08

- Accepted delivery: `2878399fdb708bc418b398844b3e8d22002710c0`. Final acceptance re-ran 507 full-suite tests and 25 actual Local database tests, lint/typecheck/build and 30 client JS checks, all passing. Fresh Local type generation matched the committed file exactly without writing it; all synthetic rows rolled back and Local stopped. No db:reset during acceptance or merge closeout.
- Before merge, develop advanced to `dcb7cbefcb53c2079351ab5f4b2cf6c33883741c`. Integration commit `0eab355e7344223d101eaa73b3d70f4df7d52885` retained both WBS histories; WBS was the sole conflict. Accepted DB schema/migration/types/tests were byte-identical to the accepted delivery. Planner/UI and other Owner files match the new develop base, not newly authored TASK-016 changes.
- Actual integration validation: full Node suite **565/565**, zero failures/skips; lint **0**, typecheck **0**, build **0** with no DB credentials; 21 generated pages; client leakage check **31** actual JS chunks PASS; diff-check PASS. The extra tests/chunk come from already merged upstream UI work. No need to repeat the unchanged database runtime; the final-acceptance 25/25 evidence remains applicable.
- [PR #209](https://github.com/kanzakimy0/TravelAssist/pull/209) merged at **2026-09-08T10:03:45Z**. Merge commit: **d118d4d0ad5b3b031e1bca6121f36b555c046216**. Verified the integrated TASK-016 head is an ancestor of origin/develop and the merge tree exactly equals the tested integration tree.
- The initial post-push head guard stopped before changing Draft while GitHub metadata had not yet caught up. A fresh Git/GitHub cross-check confirmed the exact integrated head and CLEAN/MERGEABLE state before the authorized ready/merge operation. No force push or unrelated PR merge was requested.
- WBS 8.2 updated from 待审查 to 已完成 only after verified merge and explicit user acceptance. Issue #200 closed as completed. TASK-017 / Authentication Core and all unrelated tasks were not started.
- Main `F:\TravelAssist` was safely fast-forwarded to merged develop for the two-document closeout; original untracked README.txt, asset-contact-sheet.jpg and publish_assets.py remain preserved. Runtime worktrees and local data volumes were retained.
- Additional real logs in `F:\TravelAssist-task016-evidence\`: merge-integration-tests.log, merge-integration-lint.log, merge-integration-typecheck.log, merge-integration-build.log. The earlier command logs below remain historical evidence, not overwritten.

## Prerequisite / source / tracking

- Owner B; WBS 8.2; [Issue #200](https://github.com/kanzakimy0/TravelAssist/issues/200), Closed / completed.
- [PR #186](https://github.com/kanzakimy0/TravelAssist/pull/186) was verified MERGED before creating the implementation branch; merged at 2026-09-08T08:06:08Z, commit `24dff4e3b74dfe01c369d2c149d37eba86ad6472`.
- Implementation-start origin/develop base: **eccfd9e81a66a099f73eea0154b329db2025695e**. Verified the prerequisite merge is an ancestor and all seven required foundation paths exist. Initial publication used this unchanged base; final integration is recorded above.
- Branch: `feature/b-user-profile-schema`; no duplicate implementation branch/PR existed at kickoff.
- Implementation commit: `27a7ba8ca675235aed6f5aacf8431511edf727bb`; [PR #209](https://github.com/kanzakimy0/TravelAssist/pull/209), `feature/b-user-profile-schema` → `develop`, Merged. It remained Draft until the user's explicit acceptance and merge authorization.
- Read the complete remote Task, Codex command and business schema roadmap on `origin/task/b-user-profile-schema`; read Issue #200 and all mandated architecture/UI/WBS/TASK-015 documents from the merged develop state. The task spec remains on its official spec branch, not overwritten by this result.
- Read the installed Next.js 16.3.4 client-boundary guides before code changes. No Next.js API/UI changes.

## Workspace / environment

- During implementation, original `F:\TravelAssist` remained develop at `b77e745342a91724c869887c1355a105c2b6397d`. It was subsequently fast-forwarded on user request and again after PR merge. README.txt, asset-contact-sheet.jpg and publish_assets.py were not edited, deleted or staged.
- Execution Worktree: `/home/oydl/TravelAssist-task016-b`, in `TravelAssist-Ubuntu` / Ubuntu 24.04.4 WSL2. Its independent common Git directory is `/home/oydl/.local/share/travelassist-db-acceptance/repository-bundle.git`.
- Publication Worktree: `F:\TravelAssist-task016-b`, checked out from a verified bundle of the exact tested implementation commit. Publication reused Windows Git credentials; no credentials were copied into WSL. Original develop Worktree remained untouched.
- The Worktree was created from the verified latest origin/develop using a verified incremental Git bundle, not from an unmerged foundation branch or cherry-picks. Previous runtime-acceptance Worktrees remain untouched.
- Ubuntu storage: `F:\WSL\TravelAssistUbuntu\ext4.vhdx`; Docker storage remains on F:. No new C: browser/runtime/database installation.
- Node v24.18.0; npm 11.16.0; Docker client/server 29.7.2; Supabase CLI 2.116.0; PostgreSQL 17.6. Reused previously verified Linux user-space Node and Unix socket `unix:///var/run/docker.sock`.
- npm ci: 394 packages installed / 395 audited / 0 vulnerabilities. Package manifest, lockfile and workflows unchanged.

## Migration / tables / ownership

Sole new migration: `supabase/migrations/20260908083000_create_user_profile_schema.sql`.
One additive transaction creates the User/Profile domain with RLS and explicit grants before commit. No old migration rewritten; no second migration history; no destructive production DDL or drizzle-kit push/migrate.

| Table              | Columns                                                                                                                           | Ownership / keys                                                                |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| profiles           | id, display_name, full_name, birth_date, gender_code, residence_country_code, residence_city, avatar_path, created_at, updated_at | id UUID PK and FK to auth.users(id), ON DELETE CASCADE                          |
| profile_settings   | user_id, locale, region_code, timezone, currency_code, distance_unit, temperature_unit, time_format, created_at, updated_at       | user_id UUID PK and FK to auth.users(id), ON DELETE CASCADE                     |
| emergency_contacts | id, user_id, name, relationship, phone_e164, country_code, email, note, created_at, updated_at                                    | generated UUID PK, user_id FK to auth.users(id), ON DELETE CASCADE; owner index |

Each domain references Auth identity directly. Settings and contacts do not require a fully populated profile first. Deleting an Auth identity cannot orphan any of these rows. This FK behavior is not an account-deletion API or lifecycle implementation.

### Checks and defaults

- 20 named checks, 3 PKs, 3 real FKs and `emergency_contacts_user_id_idx`; the PK indexes cover the other two ownership lookups.
- Profile fields may be NULL during progressive onboarding. Non-null display name max 100, full name/city max 200, gender representation max 64, provider-neutral avatar reference max 1024; bounded text rejects empty/space-only values. Date uses finite calendar range 0001–9999; no age or final gender enumeration is frozen.
- Optional settings: expandable language-tag shape (max 255), timezone identifier shape (max 100), uppercase alpha-2 country/region and alpha-3 currency formats. Stable units: km/mi, celsius/fahrenheit, 12h/24h. NULL means application fallback; settings are independent, not travel preferences.
- Contacts: name/relationship/phone required; 0..N rows. Name max 200, relationship max 100, canonical E.164-shaped phone, optional alpha-2 country, optional bounded email (254) and note (2000). No messaging, verification credential or Companion behavior.
- Both timestamps are timestamptz NOT NULL DEFAULT now(). Three table triggers use `public.set_profile_audit_timestamps()` (SECURITY INVOKER, fixed pg_catalog search path) to own insert/update clocks and preserve original created_at. Direct client function privileges revoked. No trigger on auth.users.

## RLS / grants

| Table              | Authenticated own SELECT | Own INSERT | Own UPDATE | Own DELETE |
| ------------------ | ------------------------ | ---------- | ---------- | ---------- |
| profiles           | Allowed                  | Allowed    | Allowed    | Denied     |
| profile_settings   | Allowed                  | Allowed    | Allowed    | Denied     |
| emergency_contacts | Allowed                  | Allowed    | Allowed    | Allowed    |

All three tables have RLS ON / default deny. Ten operation-specific policies use `(select auth.uid()) = owner`. UPDATE checks both existing and resulting ownership. Anon/PUBLIC grants are revoked; authenticated receives only the table operations above, not TRUNCATE or other broad privileges. The existing trusted service role receives CRUD grants and bypasses RLS as a backend responsibility; there is no permissive service-role policy or client credential exposure.

Real execution as authenticated User A and User B verified own reads/updates, cross-user empty reads/zero-row updates, rejected owner reassignment and foreign-owner insertion/upsert, own contact CRUD and foreign-contact delete denial. All four operations as anon were rejected. Authenticated without a subject saw no rows. Tests verify the actual current database role, not superuser queries pretending to demonstrate RLS.

## Drizzle / generated types

- Server-only mappings: `src/db/schema/profiles.ts`, `profile-settings.ts`, `emergency-contacts.ts`; narrowly shared checks/audit/policy helpers in `profile-common.ts`, three-table barrel in index.ts.
- Supabase's existing authUsers reference is imported, not defined/exported as a second application identity table. No credential fields in the three product tables.
- Catalog comparisons cover columns, SQL types/nullability/default presence, PK/FK/cascade, named checks, RLS, policy operations/roles and owner index. Invalid boundary values fail both real SQL constraints and evaluated Drizzle check expressions. A genuine Drizzle transaction inserts and reads all three mappings under authenticated RLS, then rolls back.
- `src/types/database.generated.ts` was actually regenerated by the unchanged db:types wrapper after Local reset. No manual edits. Public-only generation omits cross-schema Auth relationships in the TS Relationships arrays; the actual FKs are proven from PostgreSQL catalog and orphan tests.
- Generated SHA-256: **6db418ccc7c731c3324a6e69154d5af2ada678d50a933b9862caebeb2e806098**. Repeated generation returned identical content and unchanged mtime.

## Actual runtime / quality results

| Command / check                                                                                                        | Exit / result                                                        |
| ---------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| npm ci                                                                                                                 | 0 / PASS                                                             |
| npm run db:start                                                                                                       | 0 / PASS                                                             |
| npm run db:status                                                                                                      | 0 / PASS, including final repeat                                     |
| npm run db:reset                                                                                                       | 0 / PASS; final migration replay repeated from zero                  |
| npm run db:types                                                                                                       | 0 / PASS; real generation and deterministic repeat                   |
| node --test tests/task-015-db-foundation.test.mjs tests/task-016-user-profile.test.mjs                                 | 0 / 17 PASS                                                          |
| node --conditions=react-server --import ./tests/register-planner-ts.mjs --test tests/task-016-user-profile.runtime.mjs | 0 / 25 PASS, no skips                                                |
| node --experimental-strip-types --test tests/*.test.mjs                                                                | 0 / 507 PASS, no skips                                               |
| npm test --if-present                                                                                                  | 0 / NO-OP, no generic test script; not counted as test execution     |
| npm run lint                                                                                                           | 0 / PASS                                                             |
| npm run typecheck                                                                                                      | 0 / PASS                                                             |
| npm run build                                                                                                          | 0 / PASS with DB/key environment variables unset, 21 generated pages |
| node tests/task-016-client-bundle.mjs                                                                                  | 0 / PASS, 30 actual browser JS chunks                                |
| Changed-file Prettier check                                                                                            | 0 / PASS; WBS uses its existing repository exclusion                 |
| npm run format:check                                                                                                   | 1 / 27 existing document exceptions; not a full-format PASS          |
| Format baseline audit                                                                                                  | 0 / all 27 warning files byte-identical to base; zero new exceptions |
| git diff --check                                                                                                       | 0 / PASS                                                             |
| npm run db:stop                                                                                                        | 0 / PASS; zero containers afterward, data volumes preserved          |

Before reset the existing local stack had 0 public tables and 0 Auth users. After final tests the ledger records 20260908083000, all three tables exist, and Auth users/profile/settings/contact row counts are all 0: synthetic data was rolled back. Final Vector: running/healthy, 0 restarts; every health-checked service healthy. No insecure TCP 2375 or Docker configuration change. Supported db:stop preserved the three task-owned Supabase volumes.

All required Personal Center routes appear in the successful build, including home/account/security/privacy/preferences/companions/trips. Application UI, shared runtime, Planner, Start, package files, workflow files, DB connection/wrapper, Supabase config and seed are unchanged against the base.

## Historical test adaptation / failures retained

- The original TASK-015 foundation test asserted current schema barrel must remain empty and current SQL migration count must forever be zero. TASK-016 explicitly authorizes the first business domain, so those historical emptiness assertions now inspect TASK-015's merged commit `24dff4e`. Current local-command, empty-seed, unique SQL history, migration naming, secret environment and server-boundary tests remain active. No other historical tests or Owner Task/Result files were changed. This historical check requires the foundation merge in local Git history (as present in a normal full clone).
- Initial Linux formatting failed because Windows apply_patch created eight new files owned by root. Only those exact, resolved in-Worktree files were returned to oydl; no recursive/global permission change or system configuration change. Retry passed.
- First runtime attempt exposed an invalid test fixture: absent JWT sub was represented as an empty UUID; corrected by omitting the property. Second attempt exposed postgres.js date serialization rejecting infinity before SQL and unsupported direct drizzle(transactionClient) setup. Corrected tests use text-to-date casts and the official Drizzle transaction API. Final 25/25 passed; earlier failure logs retained. No production/RLS scope was relaxed.
- A final test-file formatting issue was corrected; full-format rerun now contains only the 27 unchanged upstream documents. npm deprecation/install-script warnings and Node's existing typeless-module warning remain visible; no package or project security settings changed to suppress them.

## Security / scope guard / limits

- Auth identity remains auth.users. No password, token, OAuth, verified email/phone identity truth or service Secret duplicated in profiles/settings. Emergency email/phone are contact details only.
- No actual keys/URLs/passwords copied from private env files or CLI credential output. Changed-file credential-pattern scan passed, including all 13 committed task files before publication; actual built client chunks contain no DB credential markers, DB driver or schema trigger code. The narrow scan is not presented as an exhaustive security audit.
- No Auth/Login/Session/Cookie, Profile API, Preference, Companion, Trip, POI, storage upload, notification, account deletion/export or UI implementation. No cloud/Staging/Production connection.
- Language/timezone/country/currency checks enforce bounded standard-shaped identifiers, not a frozen registry of all currently assigned codes. Full locale/IANA/number validation and fallback resolution belong to future API work. Gender choices and initialization/signup strategy remain unfrozen.
- This PR is additive but introduces private grants/policies and cascade behavior that require review. A shared/deployed migration is immutable; later fixes require a new forward migration, not editing this history. Do not reset a database containing valuable data.
- WBS 8.2 transitions 进行中 → 待审查 → 已完成, the final transition only after user acceptance and PR merge. 8.1/8.4 and all existing completed UI WBS remain unchanged; 8.3/5.3 and every unrelated task remain unstarted/unchanged by this task.
- Initial and integration publication used [skip ci] because the existing feature-push workflow attempts automatic PR merge. Draft was explicitly verified and retained until user authorization; skipped remote automation is not CI test evidence. No workflow edits or force push; the final merge was explicitly authorized by the user.

## Evidence and reproduction

Local evidence: `F:\TravelAssist-task016-evidence\` (not committed): npm-ci.log; db-start.log; db-status.log; pre-reset-counts.log; db-reset.log; db-reset-final.log; db-types.log; db-types-repeat.log; static-db-tests.log; runtime-tests.log; runtime-tests-retry.log; runtime-tests-final.log; all-node-tests.log; lint-final.log; typecheck-final.log; build.log; client-bundle.log; test-if-present.log; format-check.log; format-check-final.log; format-baseline-audit.log; final-db-state.log; db-status-final.log; db-stop.log; secret-scan.log.

Use Node 24 in TravelAssist-Ubuntu, with the existing user-space runtime on PATH if necessary. Do not run competing Worktrees for the shared travelassist project.

```bash
cd /home/oydl/TravelAssist-task016-b
export PATH=/home/oydl/.local/share/travelassist-db-acceptance/runtime/node-v24.18.0-linux-x64/bin:$PATH
export DOCKER_HOST=unix:///var/run/docker.sock
unset DOCKER_CONTEXT
npm ci
npm run db:start
npm run db:status
# Only after confirming this is disposable local data:
npm run db:reset
npm run db:types
node --conditions=react-server --import ./tests/register-planner-ts.mjs --test tests/task-016-user-profile.runtime.mjs
node --experimental-strip-types --test tests/*.test.mjs
npm run lint
npm run typecheck
npm run build
node tests/task-016-client-bundle.mjs
npm run db:status
npm run db:stop
```

Implementation follows the repository's frozen standards, with current primary references for [Supabase RLS grants/policies](https://supabase.com/docs/guides/database/postgres/row-level-security), [Drizzle Supabase mappings](https://orm.drizzle.team/docs/rls), and [PostgreSQL row security](https://www.postgresql.org/docs/17/ddl-rowsecurity.html).

TASK-016-B is accepted and merged. Stop after this closeout; do not start Authentication Core or TASK-017.
