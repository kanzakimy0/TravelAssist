# TASK-044-B — WBS 5.12 Companion Schema v1

## Metadata

- Task ID: `TASK-044-B`
- WBS: `5.12 — Companion Schema`
- Owner: `B — Personal Center / Companion Data`
- Priority: `P1`
- Issue: `#312`
- Repository: `https://github.com/kanzakimy0/TravelAssist`
- Spec branch: `task/b-wbs-5-12-companion-schema`
- Implementation branch: `codex/b-account-wbs-5-12-companion-schema`
- Target: `develop`
- Publication baseline: `f10aded716719eabc94b81d9a3104b386c640946`
- Design: `docs/architecture/companion-schema-v1.md`
- Freeze record: `docs/architecture/companion-schema-v1-freeze.md`
- Required Result: `docs/tasks/RESULT-TASK-044-b-companion-schema-v1.md`
- Status at publication: `未开始`

> Use `codex/**`, not `feature/**`. Repository automation may create a non-draft PR and attempt an automatic merge for `feature/**`.

---

## 1. Objective

Implement the user-confirmed Companion Schema v1 as the canonical B-owned long-term data model for reusable **non-self** travel companions and frequent companion groups.

The schema must not duplicate Profile or Preference truth and must not implement Trip Companion Snapshot persistence yet.

Real Local Supabase/Auth/PostgreSQL acceptance is mandatory before WBS 5.12 can become `待审查`.

---

## 2. Start gate

Before implementation:

```bash
git status --short
git branch --show-current
git fetch --all --prune
git rev-parse origin/develop
git log --oneline -15 origin/develop
```

Read:

```bash
git show origin/task/b-wbs-5-12-companion-schema:docs/architecture/companion-schema-v1.md
git show origin/task/b-wbs-5-12-companion-schema:docs/architecture/companion-schema-v1-freeze.md
git show origin/task/b-wbs-5-12-companion-schema:docs/tasks/TASK-044-b-companion-schema-v1.md
git show origin/task/b-wbs-5-12-companion-schema:docs/tasks/CODEX-TASK-044-b-companion-schema-v1.md
```

Also read latest merged versions of:

```text
docs/project/WBS-TravelAssist.md
docs/ui/companion-management.md
docs/architecture/db-orm-migration-standards.md
docs/architecture/cross-module-contract-handoff.md
src/features/companions/**
src/db/schema/profiles.ts
src/db/schema/profile-common.ts
src/db/schema/travel-preferences.ts
src/shared/contracts/trips/**
```

Verify 1.26 and 8.1 are completed, Issue #312 is open, and no canonical 5.12 implementation has already merged.

5.11 is **not** a dependency of 5.12. Do not repair unrelated WBS rows. Do not stack on, modify or close PR #221 / Issue #207.

Start implementation from the **latest clean `origin/develop` at execution time**, not from the spec branch. If another canonical 5.12 implementation has merged, return `Blocked` instead of creating a competing schema.

---

## 3. Branch and tracking safety

Implementation branch:

```text
codex/b-account-wbs-5-12-companion-schema
```

Forbidden:

```bash
git clean -fd
git reset --hard
git push --force
git push --force-with-lease
```

Preserve unrelated user work and other Task/WBS records.

When actual implementation starts, update **only WBS 5.12** to `进行中`. Do not start 5.17, 5.18 or 8.6.

---

## 4. Frozen product invariants

These decisions are user-confirmed and may not be redesigned in implementation:

1. The account owner has **no Companion DB row**. Self is a virtual projection from Profile/Preference/Trip context.
2. Long-term Companion Master stores non-self reusable people only.
3. Exactly three new business tables: `companions`, `companion_groups`, `companion_group_members`.
4. Frequent-group self membership is `includes_owner`, never a fake `self-*` companion ID.
5. DOB and fallback age group are mutually exclusive facts.
6. Planning age bands are 0–2 infant, 3–17 child, 18–64 adult, 65+ senior.
7. Never infer functional needs from age, gender or relationship.
8. Gender is optional display metadata and is not a recommendation signal.
9. `travel_profile` is strict versioned JSONB v1.0, max 8 KiB.
10. v1 persists stable functional codes only; `diningNote`/`privateNote`, diagnoses, medication and specific-allergen free text do not persist.
11. Trip Snapshot semantics are boundary-only in 5.12; actual snapshot/temp/override persistence belongs to 5.18/related work.
12. No cross-account Companion sharing/invitation in v1.

---

## 5. Exactly three tables

Create exactly:

```text
public.companions
public.companion_groups
public.companion_group_members
```

Do not create:

```text
self_companions
trip_companion_snapshots
trip_companion_overrides
temporary_companions
medical_profiles
companion_preferences
```

---

## 6. `companions`

Required logical columns:

```text
id                    uuid primary key
owner_user_id         uuid not null -> auth.users(id) ON DELETE CASCADE
display_name          text not null
relationship_code     text null
relationship_label    text null
birth_date            date null
age_group_fallback    text null
gender_code           text null
avatar_path           text null
travel_profile        jsonb not null
revision              integer not null
created_at            timestamptz not null
updated_at            timestamptz not null
```

Required bounds/semantics:

```text
display_name       trimmed non-empty, <=100
relationship_label optional, <=100
avatar_path         optional, <=1024
revision            >0
```

Use the repository's accepted UUID convention. `avatar_path` is a storage path only; do not persist browser `blob:` URLs. Actual Storage upload/delete belongs to 5.17.

Stable `relationship_code`:

```text
family | partner | friend | colleague | other
```

Stable optional `gender_code`:

```text
female | male | other
```

Relationship/gender must never drive recommendation inference.

---

## 7. DOB / age source of truth

Exactly one mode must be valid:

```text
DOB mode:      birth_date != NULL AND age_group_fallback = NULL
Fallback mode: birth_date = NULL AND age_group_fallback != NULL
```

Fallback allowlist:

```text
infant | child | adult | senior
```

Do not persist derived numeric age in Companion Master. Future DOBs must be rejected at write time. Use a safe SQL write validator/guard rather than a fragile time-dependent CHECK if necessary.

Create a pure deterministic B-internal helper such as:

```ts
derivePlanningAgeGroup(birthDate, referenceDate)
```

Use strict local calendar dates (`YYYY-MM-DD`) without timezone drift.

Planning bands:

```text
0–2 infant
3–17 child
18–64 adult
65+ senior
```

Test 2→3, 17→18, 64→65, birthday eve/birthday, invalid/future dates, timezone independence and a deterministic Feb-29 planning-only fixture. Do not claim these are legal/ticket/fare rules.

---

## 8. No inference from identity

Never infer from age group, gender or relationship that a person needs:

```text
stroller
child_seat
reduce_walking
reduce_stairs
accessible_route
more_rest
dietary/medical accommodation
```

Functional needs must be explicitly saved.

---

## 9. `travel_profile` v1

Canonical shape:

```json
{
  "schemaVersion": "1.0",
  "mobilityNeeds": [],
  "diningNeeds": [],
  "activityInterests": []
}
```

Requirements:

- exact schemaVersion `1.0`;
- all canonical keys present;
- no unknown keys;
- arrays only;
- stable allowlisted codes only;
- duplicate values rejected;
- JSON null rejected;
- payload <= 8 KiB;
- empty arrays legal.

Create one frozen **B-internal** TypeScript registry/parser, suggested at:

```text
src/features/companions/domain/companion-v1.ts
```

Do not publish `src/shared/contracts/companions/**` in this Task.

### MobilityNeedCode — exactly 6

```text
reduce_walking
reduce_stairs
stroller
child_seat
accessible_route
more_rest
```

Metadata:

```text
reduce_walking   = soft_constraint_input
reduce_stairs    = soft_constraint_input
stroller         = equipment_context
child_seat       = conditional_hard_when_car_applies
accessible_route = hard_functional_requirement
more_rest        = soft_constraint_input
```

### DiningNeedCode — exactly 5

```text
dietary_restriction
food_allergy_notice
vegetarian
child_meal
other_dietary_need
```

`food_allergy_notice` only records that a safety issue exists; v1 does not persist a specific allergen in free text.

### ActivityInterestCode — exactly 5

```text
animals
outdoor
museums
photography
rides
```

All are soft positive signals. There is no companion-level dislike model in v1.

Explicitly reject/localize rather than persist Chinese UI labels as domain codes.

---

## 10. Sensitive free text is out of v1

Current 5.6 fields:

```text
diningNote
privateNote
```

must not be persisted.

Do not add workaround columns such as `notes`, `medical_notes`, `allergen_text`, `diagnosis`, `medication`, `religion` or arbitrary private profile text.

---

## 11. `companion_groups`

Required logical columns:

```text
id
owner_user_id
name
description
includes_owner
revision
created_at
updated_at
```

Rules:

```text
name           trimmed non-empty, <=100
description    <=300
includes_owner boolean not null
revision       >0
```

`includes_owner` is the only canonical self-membership representation.

---

## 12. `companion_group_members`

Required logical columns:

```text
owner_user_id
group_id
companion_id
sort_order
created_at
```

Enforce equivalent of:

```text
UNIQUE(group_id, companion_id)
UNIQUE(group_id, sort_order)
sort_order >= 0
```

Parent tables must expose the composite uniqueness needed to enforce same-owner FKs equivalent to:

```text
(group_id, owner_user_id) -> companion_groups(id, owner_user_id)
(companion_id, owner_user_id) -> companions(id, owner_user_id)
```

The DB must reject a User A group linked to a User B companion even if application code is wrong.

---

## 13. Group aggregate boundary

A group is only a reusable selection template, not a Trip.

Aggregate concept:

```text
name + description + includes_owner + members
```

5.12 provides schema and `revision`. Full atomic membership update / group aggregate CAS belongs to 5.17.

Do not add a complex DB trigger requiring >=1 effective group member. A temporarily empty group is schema-valid; 5.17 will own the transaction rule.

---

## 14. Revision and audit guards

For both `companions` and `companion_groups`:

```text
initial revision = 1
every update = old + 1 exactly
```

Reject initial !=1, same/stale revision, jump revision, NULL revision and owner mutation.

DB owns timestamps:

```text
created_at immutable
updated_at generated on write
```

Reuse the accepted architectural pattern from 5.11 where useful, but do not couple Companion code to Preference semantics.

Membership rows have no independent second revision model in 5.12.

---

## 15. Delete lifecycle

v1 uses hard delete.

Deleting a Companion must delete only that Companion Master and cascade its group-membership rows. Unrelated companions remain.

Deleting a group cascades its membership rows.

Deleting Auth User A cascades A's long-term companion/group/member data while User B's data remains.

Historical Trip stability must never depend on the live Companion row.

---

## 16. RLS / grants

All three tables: `RLS ENABLED`.

Prove:

- anon has no CRUD;
- authenticated users cannot read/write another owner's data;
- owner operations intentionally exposed at this schema stage work;
- service-role behavior follows existing trusted-backend conventions;
- no public sharing/cross-account ownership is introduced.

If direct authenticated membership mutation is exposed, Result must state that full group aggregate CAS remains deferred to 5.17.

---

## 17. Trip Snapshot boundary only

Do not create Trip Snapshot tables.

Future semantic shape is frozen only conceptually:

```text
sourceType: owner | companion | temporary
sourceCompanionId?
sourceRevision?
displayName
relationshipCode?
ageYearsAtTripStart?
ageGroupAtTripStart
travelProfile
```

Data minimization: planning snapshots should normally store age-at-trip / planning age group rather than duplicate full DOB. Booking/Passenger legal DOB belongs to a separate future domain.

Master update/delete must not rewrite old snapshots. Trip override must not write back unless a future explicit user action saves it as long-term.

---

## 18. Protect A Trip Contract

Do not modify:

```text
src/shared/contracts/trips/**
```

The future adapter from Trip Companion Snapshots to A's `participants` / `participantNeeds` is not part of 5.12.

Never auto-map `child -> childSeat` or `senior -> limited walking` without explicit need data.

---

## 19. Audit current 5.6 UI

Audit `src/features/companions/**` and record `REUSE / ADAPT / DEFER / SUPERSEDED` per current field.

Minimum expected decisions:

| Current UI | 5.12 decision |
|---|---|
| string IDs | ADAPT → UUID |
| displayName | REUSE semantic |
| free relationship | ADAPT → code + label |
| DOB | REUSE |
| ageGroup | ADAPT → fallback only / derived from DOB |
| Chinese gender | ADAPT → stable code |
| blob avatar | SUPERSEDED as persistence |
| Chinese need arrays | ADAPT → stable codes |
| diningNote | DEFER |
| privateNote | DEFER |
| isSelf | SUPERSEDED → virtual owner |
| group self ID | SUPERSEDED → includes_owner |

Do not wire 5.6 UI to DB and do not remove current localStorage behavior in this Task.

---

## 20. Runtime/SQL validation parity

The B-internal parser must be fail-closed and return a defensive independent value.

TypeScript and SQL must reject equivalent invalid profiles: wrong/missing version, extra key, unknown code, duplicate code, wrong type, null, >8 KiB, localized UI code such as `少步行`, and extra sensitive keys such as `privateNote`.

Use shared vectors or an equivalent single-source fixture strategy so runtime and real DB are tested against the same semantics.

Valid coverage must include every individual code, all 6 mobility codes once, all 5 dining codes once, all 5 activity codes once, empty profile and a near-limit profile.

Avoid permissive JSON containment patterns that accept nested/wrapped invalid values.

---

## 21. SQL Migration / Drizzle / generated types

Create one **new** migration after all current merged migrations:

```text
supabase/migrations/<timestamp>_create_companion_schema.sql
```

Do not edit any previous migration, including `20260911090000_create_travel_preferences.sql`.

SQL is authoritative history. Use safe explicit function `search_path` and accepted trigger/RLS conventions. Empty-db replay must pass.

Create the Drizzle query mirror under `src/db/schema/**` (e.g. cohesive `companions.ts`). Do not introduce Drizzle migration history.

Run real Local Supabase type generation and update `src/types/database.generated.ts`; never hand-edit generated types. Regenerate again to verify deterministic output where supported.

---

## 22. Mandatory real Local Supabase acceptance

Use real Local Supabase/PostgreSQL/Auth and **at least two temporary real Auth users**.

Run repository-supported equivalents of:

```text
db:start
db:status
db:reset
db:types
```

### companions

Test owner insert/select/update/delete, cross-user denial, owner spoof rejection, anon denial, revision/audit guards, travel_profile validation, DOB/fallback rules.

### companion_groups

Test owner CRUD, cross-user denial, includes_owner true/false, revision/audit guards.

### companion_group_members

Test valid same-owner membership, duplicate member rejection, duplicate sort-order rejection, negative sort rejection, cross-owner group/companion FK rejection, cascade behavior and anon denial.

### account lifecycle

Delete Auth User A and prove all A Companion/Group/Member rows are gone while User B's rows remain. Clean all temporary fixtures.

---

## 23. Regression / quality gates

Must not change semantics of Profile, Preference, A Trip Contract, Planner, Engine, AI or POI.

Run actual repository commands for:

```text
npm ci
Companion pure/domain tests
Companion real DB/Auth/RLS tests
Profile regression
Preference regression
full CI-equivalent Node tests
lint
typecheck
build
applicable deploy validate/build/artifact checks
changed-file formatting
git diff --check
db:stop
```

If full repository format check has existing debt, prove TASK-044 adds no new failures; do not mass-fix unrelated files or weaken tests.

If Docker/Supabase Local is unavailable, return `Partial/Blocked`, do not claim DB/RLS PASS and do **not** advance WBS 5.12 to `待审查`.

---

## 24. Explicitly out of scope

Do not implement/claim completion of:

```text
5.17 Companion Persistence API
5.18 Trip Companion Snapshot / temporary companion / overrides
8.6 Personal Center Migration
A Trip Contract changes
Planner Companion adapter
AI / Engine integration
Passport / Passenger identity
phone/email contacts
Companion sharing/invitation
medical profile
specific-allergen free text
```

---

## 25. Result / tracking

Create:

```text
docs/tasks/RESULT-TASK-044-b-companion-schema-v1.md
```

Result must report: actual baseline/head; dependency gate; exact schema; registries/parser; age semantics; SQL validator; RLS; revision/audit; current UI audit; real Local commands/results; two-user evidence; generated types; full quality gates; changed files; baseline-only failures; scope protection; deferred work; and `Ready for User Acceptance: Yes/No`.

At actual start: `5.12 = 进行中`.

Only after implementation **and mandatory real Local DB QA**: `5.12 = 待审查`, Issue #312 remains Open and PR remains Draft.

Only after explicit user acceptance + merge to `develop`: `5.12 = 已完成` and #312 may close.

Do not change unrelated WBS rows.

---

## 26. Final Draft PR

After all required implementation/QA passes:

```bash
git push -u origin codex/b-account-wbs-5-12-companion-schema

gh pr create \
  --repo kanzakimy0/TravelAssist \
  --base develop \
  --head codex/b-account-wbs-5-12-companion-schema \
  --draft \
  --title "[TASK-044-B] Implement Companion Schema v1" \
  --body "Refs #312. WBS 5.12 Companion Schema implementation and real Local Supabase QA complete; awaiting user acceptance. Do not auto-merge."
```

Reuse an existing Draft PR if present. Then stop.

Do not mark Ready, merge, close #312 or start 5.17/5.18/8.6.

---

## 27. Implementation-stage Definition of Done

Ready for user review only when all are true:

- [ ] exactly three new business tables;
- [ ] no self Companion row;
- [ ] stable scalar/travel-profile codes;
- [ ] DOB/fallback single source enforced;
- [ ] deterministic age helper tested;
- [ ] strict 8 KiB travel_profile parity in TS + SQL;
- [ ] no sensitive free notes persisted;
- [ ] same-owner composite FKs proven;
- [ ] owner-only RLS proven with >=2 real Auth users;
- [ ] revision/audit guards proven;
- [ ] hard-delete lifecycle proven;
- [ ] real Local reset/types pass;
- [ ] generated types are real;
- [ ] no new repository regression;
- [ ] Result complete;
- [ ] WBS 5.12 = `待审查`;
- [ ] Issue #312 remains Open;
- [ ] Draft PR exists;
- [ ] downstream Tasks remain unstarted.