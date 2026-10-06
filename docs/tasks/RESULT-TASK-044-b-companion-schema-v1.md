# RESULT — TASK-044-B / WBS 5.12 Companion Schema v1

- Date: 2026-09-11
- Result: **PASS — implementation and mandatory real Local Supabase QA complete**
- Ready for User Acceptance: **Yes**
- WBS 5.12: **待审查**; not 已完成
- Issue: [#312](https://github.com/kanzakimy0/TravelAssist/issues/312), **OPEN**
- Branch: `codex/b-account-wbs-5-12-companion-schema`
- Target: `develop`; Draft PR only; no auto-merge
- Latest clean execution baseline: `f10aded716719eabc94b81d9a3104b386c640946`
- Verified implementation / deployment artifact HEAD: `aa7cbc5745661888cfd5d5c4f1990c515142b05d`
- Subsequent delivery commits contain only this Result and the WBS status/link update. Final delivery HEAD is available in the PR commit list.
- Spec branch HEAD: `74cc16227f464526af1ca79be8486d025e3e88fc`
- Frozen design source blob: `d7db47d6991e88e9cb520c43e1e7ae493dec9bd3`
- Worktree: `C:\Users\Administrator\Documents\ChatGPT\TravelAssist-TASK-044-B`

## 1. Start gate and scope

Executed the requested `git status --short`, `git branch --show-current`, `git fetch --all --prune`, `git rev-parse origin/develop`, and `git log --oneline -15 origin/develop` before implementation.

The original checkout on `fix/quality-gate-baseline-repair` was clean and preserved. The independent implementation worktree/branch was created directly from the execution-time latest `origin/develop`, not the spec or PR #221 branch.

Read the remote official Task, design, freeze record and launcher; latest WBS, UI design, migration standards, contract handoff, current Companion UI/domain storage and Profile/Preference schema patterns, plus A Trip contract boundaries. Dependency 1.26 is 已完成; 8.1 is 已完成 for its accepted DB foundation scope. Issue #312 was OPEN and no canonical 5.12 schema existed on develop.

Only the 5.12 WBS row changes: 未开始 → 进行中 at actual development start → 待审查 after real DB QA and quality gates. No other WBS row is repaired or advanced.

PR #221 and Issue #207 were read-only checks and remain untouched. No merge/cherry-pick/reuse from their unmerged implementation was performed. The accepted, merged audit/policy patterns were used from develop.

## 2. Delivered schema

Exactly one new authoritative migration:

`supabase/migrations/20260911100000_create_companion_schema.sql`

Previous migrations are unchanged. Exactly three new business tables:

| Table                            | Columns                                                                                                                                                                              |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `public.companions`              | `id, owner_user_id, display_name, relationship_code, relationship_label, birth_date, age_group_fallback, gender_code, avatar_path, travel_profile, revision, created_at, updated_at` |
| `public.companion_groups`        | `id, owner_user_id, name, description, includes_owner, revision, created_at, updated_at`                                                                                             |
| `public.companion_group_members` | `owner_user_id, group_id, companion_id, sort_order, created_at`                                                                                                                      |

Companion/Group IDs are UUIDs with `gen_random_uuid()` defaults. Auth owner FKs cascade deletion. Required names are nonempty, trimmed with PostgreSQL `btrim`, max 100 characters; relationship labels max 100; group description max 300. Optional avatar storage paths max 1024, excluding URI schemes, browser blob URLs, absolute paths, backslashes and traversal segments.

No `is_self`, self fixture, duplicated Profile/Preference truth, medical/free-note column or snapshot table exists. Account self remains a future virtual Profile/Preference/Trip projection. Group self selection is only `includes_owner`, default false.

Parent tables expose `UNIQUE(id, owner_user_id)`. Membership has:

- primary key `(group_id, companion_id)`;
- unique `(group_id, sort_order)`;
- integer `sort_order >= 0`;
- composite FK `(group_id, owner_user_id)` → Group;
- composite FK `(companion_id, owner_user_id)` → Companion;
- both FKs `ON DELETE CASCADE`.

Indexes cover owner lookups and the Companion membership cascade direction. Empty groups are valid.

## 3. Domain, strict JSON and age

B-internal registry/parser: `src/features/companions/domain/companion-v1.ts`. No shared Companion contract or public persistence API was added.

Relationship: `family | partner | friend | colleague | other`.

Optional display-only gender: `female | male | other`.

Exact required travel profile:

```json
{
  "schemaVersion": "1.0",
  "mobilityNeeds": [],
  "diningNeeds": [],
  "activityInterests": []
}
```

| Mobility code      | Frozen metadata                     |
| ------------------ | ----------------------------------- |
| `reduce_walking`   | `soft_constraint_input`             |
| `reduce_stairs`    | `soft_constraint_input`             |
| `stroller`         | `equipment_context`                 |
| `child_seat`       | `conditional_hard_when_car_applies` |
| `accessible_route` | `hard_functional_requirement`       |
| `more_rest`        | `soft_constraint_input`             |

Dining codes: `dietary_restriction, food_allergy_notice, vegetarian, child_meal, other_dietary_need`.

Activity codes: `animals, outdoor, museums, photography, rides`; all `soft_positive_signal`, no dislike model.

`food_allergy_notice` records only an explicitly entered notice; it stores no specific allergen. `diningNote`, `privateNote`, diagnoses, medication and other extra fields are rejected.

The parser accepts exact plain JSON structure and stable scalar codes only; rejects unknown/missing keys, wrong version/type, localized labels, duplicates, wrapped/nested values, null, sparse/accessor/symbol/hidden-property objects and non-JSON structures tested by the suite. It returns independent arrays; no identity-to-needs inference occurs. Registries/metadata are frozen.

SQL `is_companion_travel_profile_v1(jsonb)` independently validates exact keys, version, array element equality, uniqueness and an 8192-byte JSONB text bound. It avoids permissive containment matching. Both implementations use the same independent frozen-design acceptance vectors.

**8 KiB interpretation:** with exactly 6/5/5 unique allowlisted ASCII codes and no free text, the largest canonical compact profile is only **310 UTF-8 bytes**. It is mathematically impossible to construct an 8 KiB semantic profile under this design. The shared near-limit fixture is a legal **8191-byte JSON serialization** of the full profile padded with JSON whitespace; JSON parsing / PostgreSQL JSONB normalize that whitespace. All individual codes, full category arrays, all-code profile, empty profile, this near-limit serialization and oversized invalid payloads are covered. No invented padding field or duplicate code weakens the strict schema.

DOB and fallback are SQL-XOR sources of truth. Fallback allows only `infant | child | adult | senior`. DOB must be a finite date within 0001–9999, and a write-time trigger rejects dates after the current UTC calendar date independently of SQL session timezone.

`derivePlanningAgeGroup(birthDate, referenceDate)` uses explicit strict Gregorian `YYYY-MM-DD` dates and no JS clock/timezone conversion:

| Age   | Planning band |
| ----- | ------------- |
| 0–2   | infant        |
| 3–17  | child         |
| 18–64 | adult         |
| 65+   | senior        |

Tests cover birthday eve/day, 2→3, 17→18, 64→65, invalid/future dates, century leap rules and four process timezones. Feb-29 birthdays advance on March 1 in a non-leap year for this **planning-only** helper; this is not a legal/booking/fare rule. No numeric age is persisted.

## 4. Revision, RLS and lifecycle

Companion/Group inserts require revision exactly 1; every update requires old + 1. Null, stale/same and jump revisions fail. Owner and master ID changes fail. The DB generates insert timestamps, preserves created_at on update and generates updated_at using its clock. Membership has immutable owner/created_at guards and no second revision system.

All three tables have RLS enabled with authenticated owner-only SELECT/INSERT/UPDATE/DELETE policies. Anon has no CRUD grants. The service role follows the existing trusted-backend CRUD convention; constraints still reject malformed data and cross-owner composite membership even through direct trusted SQL.

Functions use explicit `search_path = pg_catalog` and remain invoker functions. Trigger functions are not granted as client RPCs; the profile validator has only required authenticated/service-role execution grants.

Real tests prove:

- two temporary real Auth users independently create/sign in/read/update their own data;
- cross-user reads/updates/deletes return no visible rows and spoofed inserts fail;
- anon SELECT/INSERT/UPDATE/DELETE all fail for each table;
- both composite FK directions reject cross-owner INSERT and UPDATE under direct SQL;
- duplicate member/sort-order, negative/null sort order fail;
- initial/update revisions, identity and audit guards work;
- a Companion deletion removes its memberships in multiple groups, preserving groups and other Companions;
- Group deletion removes only its memberships;
- Auth User A deletion removes all A Companion/Group/Member data while B retains one row in each table;
- all temporary Auth users and Companion fixtures are removed in finally cleanup.

Direct authenticated membership CRUD is intentionally exposed at this schema stage. Full **group aggregate transaction/CAS** across name/description/includes_owner/members remains deferred to **5.17**.

## 5. Drizzle and real generated types

`src/db/schema/companions.ts` mirrors the three tables, constraints, composite FKs, indexes and owner policies. `src/db/schema/index.ts` exports them. Drizzle is query-only; there is no Drizzle migration history.

Actual Local Supabase generated `src/types/database.generated.ts`; no manual edits. Real tests inspect SQL columns/nullability, constraints/FKs/indexes/policies/grants and invoker configuration against the mirror, then exercise actual Drizzle insert/read/delete.

A second `npm run db:types` generation produced byte-identical output:

```text
SHA256 2A7D374BE90755CAE372F566947A21834028A51D226D8BC74F9F97E76193CB26
```

## 6. Current 5.6 UI audit

Existing UI, components, fixtures and localStorage behavior are unchanged.

| Current field/behavior                   | Decision   | Canonical interpretation / deferred work                                                                  |
| ---------------------------------------- | ---------- | --------------------------------------------------------------------------------------------------------- |
| string / Date.now IDs                    | ADAPT      | UUID; no automatic legacy import                                                                          |
| displayName                              | REUSE      | Same semantic, DB max/trim bounds                                                                         |
| free relationship                        | ADAPT      | Stable code plus optional display label                                                                   |
| dateOfBirth                              | REUSE      | Strict calendar DOB in XOR mode                                                                           |
| ageGroup / calculateCurrentAge           | ADAPT      | Derived planning band when DOB exists, fallback only otherwise; current UI clock helper is not canonical  |
| Chinese gender                           | ADAPT      | Optional stable display code, never a recommendation signal                                               |
| avatarUrl / blob preview                 | SUPERSEDED | Storage path for persistence; upload/delete API deferred                                                  |
| Chinese mobilityNeeds                    | ADAPT      | Six explicit stable functional codes                                                                      |
| Chinese diningNeeds                      | ADAPT      | Frozen five-code registry; current UI has four options and does not separately expose food_allergy_notice |
| activityPreferences                      | ADAPT      | Five positive activityInterests codes, no dislike                                                         |
| diningNote                               | DEFER      | Not persisted in v1; no substitute free-note field                                                        |
| privateNote                              | DEFER      | Not persisted in v1                                                                                       |
| isSelf / self-yuki mock                  | SUPERSEDED | Virtual Profile/Preference owner; no Companion row                                                        |
| group companionIds containing self ID    | SUPERSEDED | includes_owner plus non-self UUID memberships                                                             |
| group name / description                 | REUSE      | Semantic only; apply DB bounds later                                                                      |
| group member ordering                    | ADAPT      | sort_order and unique group ordering                                                                      |
| current UI minimum-one-member validation | DEFER      | DB allows empty groups; 5.17 owns aggregate transaction rule                                              |
| createTripCompanionSnapshot local helper | DEFER      | Not canonical historical DB snapshot persistence                                                          |
| localStorage library                     | DEFER      | Retained unchanged; no 5.6 DB wiring                                                                      |

A's existing `participants` counts and `participantNeeds` contract are unchanged. No child→child seat or senior→limited walking adapter was added.

## 7. Executed acceptance and quality gates

Environment: Windows, Node **v24.18.0**, Docker **29.7.2**, repository-pinned Supabase CLI **2.116.0**, actual localhost Supabase/PostgreSQL/Auth. No remote project was targeted.

| Command / check                                                                                                          | Actual outcome                                                                                      |
| ------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------- |
| `npm ci`                                                                                                                 | PASS, 395 packages, 0 reported vulnerabilities                                                      |
| `npm run db:start`                                                                                                       | PASS, real Local stack                                                                              |
| `npm run db:status`                                                                                                      | PASS, localhost API 54321 / Studio 54323 / Mail 54324                                               |
| `npm run db:reset`                                                                                                       | PASS, all migrations replayed from empty DB                                                         |
| `npm run db:types` twice                                                                                                 | PASS, deterministic SHA-256 above                                                                   |
| `npm run test:companions`                                                                                                | **163/163 PASS**, no skipped tests                                                                  |
| `npm run test:companions:db`                                                                                             | **147/147 PASS**, no skipped tests, two real Auth users and full cleanup                            |
| `node --conditions=react-server --import ./tests/register-planner-ts.mjs --test tests/task-016-user-profile.runtime.mjs` | Profile real DB regression **25/25 PASS**                                                           |
| `npm run test:preferences:db`                                                                                            | Preference real DB regression **505/505 PASS**                                                      |
| `node --import ./tests/register-route-ts.mjs --test "tests/*.test.mjs"`                                                  | Full repository **1495/1495 PASS**, including Profile/Preference pure regressions; no skipped tests |
| `npm run lint`                                                                                                           | PASS                                                                                                |
| `npm run typecheck`                                                                                                      | PASS                                                                                                |
| `npm run build`                                                                                                          | PASS                                                                                                |
| `npm run deploy:validate:local`                                                                                          | PASS, local development target; external integrations disabled                                      |
| `npm run deploy:build:local`                                                                                             | PASS, standalone artifact from implementation HEAD                                                  |
| `npm run deploy:verify-artifact`                                                                                         | PASS, **1730 files**, no failures                                                                   |
| `npm run format:check:deploy`                                                                                            | PASS                                                                                                |
| Changed/new formatted TS/MJS/JSON/Markdown                                                                               | PASS; WBS baseline-only exception below                                                             |
| `git diff --check`                                                                                                       | PASS                                                                                                |
| `npm run db:stop`                                                                                                        | PASS, actual Local stack stopped                                                                    |
| `npm run format:check`                                                                                                   | **63 existing baseline document failures; 0 added**                                                 |

The first DB test run exposed test-fixture issues: an existing unique pair was hit before the intended FK assertion, and the dynamic SQL identifier helper used the wrong signature. Fixtures/queries were corrected without relaxing constraints; the final complete DB rerun is 147/147 PASS.

Full-format debt was audited against `f10aded7`: all 63 warned files already fail Prettier at the baseline; 62 are byte-equivalent after line-ending normalization, and WBS differs only in the authorized 5.12 status. WBS was not globally reformatted. Every new/changed code file and newly delivered document passes changed-file format checks. No gate or assertion was disabled.

Non-blocking existing tool messages: deprecated transitive package/install-script notices from npm; module-type warning from the existing deployment environment contract. No related dependency or package-mode changes were made.

Local command logs and baseline format audit are in ignored `.artifacts/task044/`; deployment manifest/artifact are under ignored `.artifacts/task-025/`. No credentials/tokens/passwords are included in this Result or committed evidence.

## 8. Changed files

- `supabase/migrations/20260911100000_create_companion_schema.sql`
- `src/features/companions/domain/companion-v1.ts`
- `src/db/schema/companions.ts`
- `src/db/schema/index.ts`
- `src/types/database.generated.ts` — real generated output
- `tests/task-044-companion-fixtures.mjs`
- `tests/task-044-companion-schema.test.mjs`
- `tests/task-044-companion-schema.runtime.mjs`
- `package.json` — only two Companion test scripts
- `docs/architecture/companion-schema-v1.md`
- `docs/architecture/companion-schema-v1-freeze.md`
- `docs/tasks/TASK-044-b-companion-schema-v1.md`
- `docs/tasks/CODEX-TASK-044-b-companion-schema-v1.md`
- `docs/tasks/RESULT-TASK-044-b-companion-schema-v1.md`
- `docs/project/WBS-TravelAssist.md` — only 5.12 status

The four input documents are copied from the official spec branch with Markdown formatting only; their publication-state wording is historical and product semantics remain frozen. Current implementation status is this Result and the single WBS row.

## 9. Delivery boundary

Implementation-stage acceptance is ready. WBS 5.12 is 待审查, Issue #312 stays OPEN, and the PR must remain Draft → develop pending user acceptance. No auto-merge, Ready transition or issue closure is authorized/performed.

No changes to Profile/Preference semantics, A Trip Contract, Planner, Engine, AI, POI, 5.6 UI persistence or prior migrations. No launch/completion claim for **5.17, 5.18 or 8.6**. Trip snapshots, temporary companions, overrides, history adapters, aggregate API CAS, storage operations, sharing/invitations and passenger/medical data remain deferred.

**TASK-044-B execution stops here; no next Task is started.**
