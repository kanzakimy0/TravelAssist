# TASK-062-B — WBS 8.5 Trip Plan Schema Integration / Acceptance Closeout Support

## Metadata

- Task ID: `TASK-062-B`
- WBS: `8.5 — 主系统 Trip Plan Schema`
- Canonical Owner: `A / Main Travel System / Trip Plan Persistence`
- Execution Support: `B / DB Integration / Acceptance Closeout`
- Priority: `P0`
- Status: `Ready`
- GitHub Issue: `#376`
- Existing implementation: `TASK-019-A / #226`
- Existing acceptance closeout: `TASK-026-A / #256`
- Existing implementation branch: `codex/a-trip-plan-schema`
- Existing Draft PR: `#227 → develop`
- Observed PR head at publication: `81c8c104394fa5a94a35a0fe486ebd1998f428c1`
- Publication baseline: `develop@87fe139fa96eb5885ff7d2591197fee60b171ac7`
- Task publication branch: `task/b-wbs-8-5-trip-plan-schema-integration-closeout`

## Authorization / Ownership Rule

A has explicitly authorized B to execute the WBS 8.5 integration and acceptance closeout.

This authorization **does not change the canonical WBS owner**. WBS 8.5 remains A-owned because it is the Main Travel System Trip Plan persistence model. B is the execution/support owner for this closeout only.

Do not rewrite the global A/B responsibility boundary.

## Objective

Reuse the existing WBS 8.5 implementation in Draft PR #227 and bring it onto the execution-time latest `origin/develop` safely.

The task is to:

1. normally merge latest `origin/develop` into the existing `codex/a-trip-plan-schema` branch;
2. resolve only necessary integration conflicts while preserving both current `develop` and the accepted Trip Plan semantics;
3. rerun real Local Supabase / Auth / DB / RLS / CAS / transaction / round-trip acceptance;
4. prove coexistence with the currently accepted B-owned Personal Center data stack;
5. rerun the current repository quality gates;
6. return **the existing PR #227** to a clean, review-ready Draft state;
7. publish a complete TASK-062 Result and QA evidence.

This is an **integration / acceptance / closeout task**, not a redesign task.

## Single Canonical Implementation Rule

PR #227 and branch `codex/a-trip-plan-schema` remain the single canonical WBS 8.5 implementation.

Do **not**:

- create a second Trip Plan Schema implementation;
- create competing `trips / trip_plans / trip_days / itinerary_items` tables;
- open a replacement implementation PR to `develop`;
- cherry-pick only fragments of PR #227 into a new implementation branch;
- reimplement TASK-019 from scratch.

The actual integration work must update the existing `codex/a-trip-plan-schema` branch and therefore update PR #227.

## Start Gate

Before modifying anything, record:

```bash
git status --short
git branch --show-current
git fetch --all --prune
git rev-parse origin/develop
git rev-parse origin/codex/a-trip-plan-schema
git log --oneline -15 origin/develop
git log --oneline -15 origin/codex/a-trip-plan-schema
```

Then verify:

- current working tree is clean;
- latest `origin/develop` is known exactly;
- current PR #227 head is known exactly;
- PR #227 is still Open / Draft / target `develop`;
- A's authorization for B support is reflected by this TASK-062 / Issue #376;
- no other worktree is actively modifying the same `codex/a-trip-plan-schema` branch.

If the user's existing workspace contains uncommitted work, preserve it and use a separate clean worktree.

## Required Source Reading

Read the execution-time latest versions of at least:

- `AGENTS.md`
- `CONTRIBUTING.md`
- `docs/development/task-tracking.md`
- `docs/project/WBS-TravelAssist.md`
- `docs/architecture/db-orm-migration-standards.md`
- `docs/architecture/cross-module-contract-handoff.md`
- `docs/architecture/trip-plan-persistence.md`
- `docs/tasks/TASK-019-a-trip-plan-schema.md`
- `docs/tasks/RESULT-TASK-019-a-trip-plan-schema.md`
- `docs/tasks/RESULT-TASK-026-a-trip-plan-schema-acceptance-closeout.md`
- `docs/tasks/TASK-WBS-4.17-a-trip-plan-contract.md`
- `docs/tasks/RESULT-WBS-4.17-a-trip-plan-contract.md`
- current `src/shared/contracts/trips/**`
- current `src/server/trips/**` and/or current Trip DB projection/query layer
- current `src/db/schema/**`
- current `supabase/migrations/**`
- current `src/types/database.generated.ts`
- current B-owned Profile / Preference / Companion / Trip Library accepted contracts and migrations only as required for coexistence testing.

If old TASK-019/TASK-026 prose conflicts with the current merged Trip Contract or current DB standards, preserve the current canonical merged contracts and document the conflict rather than reviving stale semantics.

## Existing WBS 8.5 Invariants to Preserve

The accepted implementation must continue to represent:

```text
TripPlanSnapshotV1
        ↓
server-only validated transaction projection
        ↓
public.trips
public.trip_plans
public.trip_days
public.itinerary_items
        ↓
owner-only RLS + revision/CAS
        ↓
validated read-back as TripPlanSnapshotV1
```

Mandatory invariants include:

- `public.trips` remains the Trip root;
- `public.trip_plans` belongs to one Trip;
- `public.trip_days` belongs to one Plan;
- `public.itinerary_items` belongs to one Day;
- scheduled and alternative items share the accepted item model;
- active plan cannot point outside its Trip;
- owner identity cannot be client-selected to escape ownership;
- private Trip tree is owner-only for the current model;
- anonymous access fails closed;
- revision starts at the accepted value and follows accepted CAS semantics;
- stale revision writes are rejected;
- same-version concurrent writers have deterministic accepted behavior;
- transaction conflicts roll back atomically;
- local dates and IANA timezone semantics survive round-trip;
- booking facts remain facts only and do not invent a Booking subsystem;
- account deletion cascade removes only the owning Trip tree;
- Contract IDs remain opaque to consumers even if DB storage uses UUIDs.

## Integration Procedure

Use a dedicated clean worktree for the existing branch.

Conceptually:

```bash
git fetch --all --prune
# create/use a clean worktree for origin/codex/a-trip-plan-schema
# checkout the existing local branch tracking origin/codex/a-trip-plan-schema

git merge origin/develop
```

Rules:

- use a **normal merge**;
- do not rebase;
- do not squash existing WBS 8.5 history;
- do not force-push;
- do not overwrite one side of a conflict wholesale when both sides contain valid accepted work;
- inspect every conflict and retain the current accepted intent from both sides where compatible.

### Likely conflict-sensitive files

Pay particular attention to:

- `docs/project/WBS-TravelAssist.md`
- `package.json`
- `package-lock.json`
- DB schema index exports
- `src/types/database.generated.ts`
- shared server/index exports
- tests/aggregate runners
- migrations added after the old TASK-026 baseline.

Do not assume these will conflict; this is a review list, not permission to modify them unnecessarily.

## Cross-Module Guard

### B-owned data that must remain independent

Current B-owned Personal Center data includes accepted Profile, Preference, Companion and Trip Library persistence.

Do not fold these into the A Trip Plan model and do not redefine their product semantics.

In particular, preserve the conceptual separation:

```text
B long-term Preference
        ↓ snapshot / read contract
Trip-specific preference/draft boundary
        ↓
A TripPlanSnapshotV1 / normalized Trip Plan persistence
        ↓
B Trip Library Save/Read management contract where applicable
```

TASK-062 may make **mechanical integration corrections** only where necessary for current generated types, exports, test orchestration or migration coexistence. Any semantic change outside WBS 8.5 must be treated as a blocker unless separately authorized.

### Protected A work

Do not modify as part of TASK-062:

- Region Graph / Master Code;
- Candidate Pipeline;
- POI scoring / Human Gold;
- route provider/runtime logic;
- Planner UI or state architecture;
- AI runtime;
- Booking/Payment;
- unrelated infrastructure.

## Mandatory Database Acceptance

Use the execution-time current canonical npm scripts. At minimum execute and record equivalents of:

```bash
npm ci
npm run db:start
npm run db:status
npm run db:reset
npm run db:types
```

Then repeat the relevant reset/type generation step sufficiently to prove deterministic replay and no generated-type drift.

The full migration chain from an empty Local Supabase database must succeed.

### Required DB coherence checks

Verify:

- SQL migration history is the only formal DB history;
- no merged historical migration is edited/reordered/squashed;
- Trip Plan SQL final schema matches Drizzle mirrors;
- generated Supabase types match the current Local DB;
- current B-owned schemas also reconstruct correctly from the same full migration chain;
- no unexpected migration drift appears after a second replay;
- no Production/Staging endpoint is used.

If a **real WBS 8.5 integration defect** requires correction, add the narrowest correct forward migration. Do not edit a migration already merged to `develop`.

## Mandatory Focused Runtime Acceptance

Run the current equivalents of the accepted Trip Plan test commands and record exact counts.

At minimum prove:

1. minimum Trip Plan fixture round-trip;
2. full fixture round-trip;
3. multi-plan Trip;
4. multi-day Trip;
5. scheduled + alternative items;
6. timezone / local-date / date-line behavior;
7. booking fact preservation;
8. future/unknown forward-compatible code behavior where Contract requires it;
9. active-plan same-Trip integrity;
10. invalid Contract input rejected before persistence;
11. trip stale revision rejected;
12. plan stale revision rejected;
13. same-version concurrent writer behavior;
14. deliberate mid-transaction conflict rolls back the entire write;
15. Owner CRUD succeeds;
16. User B cannot read/update/delete User A Trip tree;
17. User B cannot attach a child row into User A Trip/Plan/Day;
18. anonymous access fails closed;
19. account deletion removes User A Trip tree;
20. User B Trip tree survives User A deletion.

Use real Local Auth users where the existing test harness does so.

## Mandatory Coexistence Regression

Because `develop` now contains a much larger B-owned data stack than the old TASK-026 baseline, run current accepted regression sufficient to prove WBS 8.5 does not break:

- Profile / account cascade;
- Preferences;
- Companions;
- Trip Library persistence/API;
- Personal Center migration chain;
- account deletion;
- Personal Center unit/integration aggregate if it is the current canonical gate.

Do not duplicate all B tests manually if a current canonical aggregate already covers them. Use the current repository entry points and record what was executed.

## Repository Quality Gates

At minimum:

```bash
# use current canonical commands
npm run lint
npm run typecheck
npm run build
```

Also run:

- canonical full repository Node test suite;
- current deployment validation;
- current local/standalone deployment build and artifact verification gates if used by the repository;
- task-owned/scoped formatter check;
- `git diff --check`;
- exact final-head GitHub Quality Gate.

The Result must distinguish:

- exact candidate failures introduced by TASK-062;
- failures reproduced identically on latest clean `develop`;
- environment/tooling failure;
- not executed.

No unexecuted mandatory gate may be called PASS.

## Historical TASK-026 Blockers

TASK-026 previously recorded 709/712 full repository tests with three failures outside Trip Plan ownership.

Those old failures are **historical evidence only**. Current `develop` has advanced substantially and has since had fully green repository Quality Gates.

TASK-062 must independently rerun current baselines. Do not:

- assume the three old failures still exist;
- waive them automatically;
- recreate old failures intentionally;
- use old test counts as current evidence.

## Secrets / Safety

- never commit real Supabase service-role keys or provider secrets;
- never print secrets into Result/QA logs;
- Local Supabase/Auth only unless explicitly authorized otherwise;
- do not mutate Production/Staging;
- clean synthetic users/data after tests;
- stop the Local DB/runtime at the end if TASK-062 started it.

## Forbidden Git Operations

Never execute:

```text
git clean -fd
git reset --hard
git push --force
git push --force-with-lease
```

Also do not perform destructive history rewrite or rebase the canonical PR branch.

## WBS Update

Canonical Owner remains `A`.

At execution start, after reading the complete latest WBS, update only the truthful 8.5 tracking state, for example:

```text
8.5 | 主系统 Trip Plan Schema | A | P0 | 4.17,8.1 | 进行中（#376 / TASK-062-B B-side integration closeout；existing Draft PR #227）
```

After integration + all mandatory acceptance gates pass and PR #227 is review-ready:

```text
8.5 | 主系统 Trip Plan Schema | A | P0 | 4.17,8.1 | 待审查（#376 / TASK-062-B closeout；Draft PR #227）
```

Only actual merge to `develop` plus explicit user acceptance can set 8.5 to `已完成`.

Do **not** automatically change:

- WBS 4.22;
- WBS 4.23;
- WBS 4.24;
- WBS 4.18;
- WBS 4.19;
- any other WBS status/owner.

Preserve all unrelated A/B WBS updates that landed on `develop` after the old PR branch diverged.

## Required Deliverables

Create/update on the canonical implementation branch:

- `docs/tasks/RESULT-TASK-062-b-wbs-8-5-trip-plan-schema-integration-closeout.md`
- `docs/qa/TASK-062/README.md`
- `docs/qa/TASK-062/acceptance-evidence.json`
- additional narrowly scoped reproducible QA files if useful;
- updated `docs/project/WBS-TravelAssist.md` tracking;
- updated existing PR #227 description if the exact final head/test evidence has materially changed.

The already published Task/launcher live on the Task publication branch and may also be brought into the implementation branch as part of normal integration if they are present in `develop` by then.

## Completion Behavior

### PASS

Return:

`Completed / WBS 8.5 integration closeout ready for owner review`

Requirements:

- latest `origin/develop` integrated normally;
- conflicts fully audited;
- no accepted unrelated work lost;
- all WBS 8.5 focused gates pass;
- mandatory coexistence regression passes;
- full repository/quality gates pass or any true unchanged baseline exception is evidenced and explicitly accepted by the user before claiming final Ready;
- exact final-head GitHub Quality Gate is green;
- PR #227 is Open / Draft and review-ready.

Do not merge.

### PARTIAL

Return:

`Partial / WBS 8.5 integration corrections require review`

Use when a narrow correction was required and the candidate is not yet ready for owner acceptance.

### BLOCKED

Return a precise blocker if the latest accepted repository state cannot coexist with the existing WBS 8.5 semantics without architectural redesign or violation of another accepted contract.

Do not paper over structural incompatibility.

## Explicitly Out of Scope

- automatic merge of PR #227;
- automatic Issue closure;
- automatic WBS 8.5 completion;
- automatic start of WBS 4.22;
- WBS 4.18 / 4.19 Planner wiring;
- Engine 4.22–4.24 implementation;
- POI / Route / AI / Booking / Payment implementation;
- Region / Candidate Pipeline changes;
- Production/Staging deployment or migration;
- broad unrelated refactoring.

## Final Response Requirements

Before returning the final TASK-062 Result:

1. re-fetch the latest `origin/develop` and record whether PR #227 is behind;
2. confirm the exact PR #227 head pushed;
3. confirm Draft/Open state and mergeability/CI state;
4. update WBS accurately;
5. update Result + QA evidence;
6. commit and push all TASK-062-owned changes;
7. return exact commit SHAs, test counts, Local DB evidence, GitHub CI run, remaining limitations, and next permitted action.

Stop there. Do not start WBS 4.22 automatically.
