# TASK-063-B — WBS 4.22 Engine Transaction Apply / Permission / Idempotency / Version / Audit

## Metadata

- Task ID: `TASK-063-B`
- WBS: `4.22 — 事务应用 / 权限 / 幂等 / 版本与审计`
- Owner: `B / TravelAssist Engine + Trip Persistence`
- Priority: `P1`
- Status: `Ready`
- GitHub Issue: `#380`
- Publication baseline: `develop@849ed9f207a0ec55ff514e287fbc3d6c7adc2cea`
- Task publication branch: `task/b-wbs-4-22-engine-transaction-apply`
- Planned implementation branch: `codex/b-wbs-4-22-engine-transaction-apply`

## 1. Prerequisites

Execution must independently verify all of the following against execution-time latest `origin/develop`:

- WBS 4.20 Engine Contract v0.1 = 已完成 / Frozen.
- WBS 4.20.1 Engine Contract Amendment = 已完成.
- WBS 4.21 deterministic Rule / Feasibility / Preview Engine = 已完成.
- WBS 8.1 DB / ORM / Migration foundation = 已完成.
- WBS 8.3 Authentication core = 已完成.
- WBS 8.4 DB Migration global standard = 已完成.
- WBS 8.5 Trip Plan Schema = 已完成.
- `docs/project/WBS-8.5-owner-correction.md` is authoritative: WBS 8.5 Owner = B.
- PR #227 Trip Plan persistence is merged.
- PR #379 WBS 8.5 owner correction is merged.

If any hard prerequisite is no longer true, return `Blocked` with exact evidence and do not implement around it.

## 2. Canonical sources

Read before implementation:

- `CONTRIBUTING.md`
- `AGENTS.md`
- `docs/development/task-tracking.md`
- `docs/project/WBS-TravelAssist.md`
- `docs/project/WBS-8.5-owner-correction.md`
- `docs/architecture/cross-module-contract-handoff.md`
- `docs/architecture/db-orm-migration-standards.md`
- `docs/architecture/travelassist-engine-contract.md`
- `docs/architecture/rule-feasibility-engine.md`
- `docs/architecture/trip-plan-persistence.md`
- `docs/tasks/RESULT-WBS-4.20-b-engine-contract-final-closeout.md`
- `docs/tasks/RESULT-WBS-4.21-b-rule-feasibility-engine.md`
- `docs/tasks/RESULT-TASK-062-b-wbs-8-5-trip-plan-schema-integration-closeout.md`
- `src/shared/contracts/engine/**`
- `src/shared/contracts/trips/**`
- `src/server/engine/**`
- `src/server/trips/**`
- `src/db/schema/**`
- current `supabase/migrations/**`
- current `src/types/database.generated.ts`

Priority when sources disagree:

1. merged runtime contracts/types and accepted DB schema;
2. frozen Engine Contract + accepted 4.21 Result;
3. current Master WBS + authoritative owner-correction docs;
4. historical Task/Result text.

Do not rewrite historical A-owned 8.5 records as if B owned those execution-time phases.

## 3. Objective

Implement the first authoritative, server-only Engine `apply` capability on top of the accepted 4.21 deterministic validate/preview runtime and accepted 8.5 Trip Plan persistence.

The authoritative flow is:

```text
request-scoped authenticated user
        ↓
ChangeSetV0_1 parser / canonical payload hash
        ↓
transaction + authoritative Trip/Plan lock/read
        ↓
trusted actor/owner + baseVersion check
        ↓
4.21 validate/preview rerun against authoritative snapshot/context
        ↓
zero blocking / zero unsupported / zero unresolved confirmation
        ↓
canonical candidate persistence using existing 8.5 semantics
        ↓
actual resulting revisions
        ↓
idempotency terminal record + audit + pending outbox
        ↓
commit
        ↓
EngineResultV0_1(requestKind="apply")
```

This Task does not implement rollback execution, event delivery or Planner UI wiring.

## 4. Start gate / Git rules

Before any implementation, execute and record:

```bash
git status --short
git branch --show-current
git fetch --all --prune
git rev-parse origin/develop
git log --oneline -20 origin/develop
```

Also verify the relevant merged PRs/commits and current WBS ownership.

Use a dedicated clean worktree and an independent branch from execution-time latest `origin/develop`:

```text
codex/b-wbs-4-22-engine-transaction-apply
```

Forbidden:

```text
git clean -fd
git reset --hard
git push --force
git push --force-with-lease
destructive rebase / history rewrite
```

Do not touch or delete unrelated user worktrees/untracked files.

## 5. Narrow operation capability gate

WBS 4.20 lists a broader operation vocabulary, but accepted 4.21 runtime currently enables deterministic mutation only for:

- `UPDATE_TIME`
- `REORDER_ITEMS`

4.22 may persist only operations already enabled by accepted 4.21 runtime.

Every other recognized operation remains `unsupported` unless a separately accepted prerequisite already enabled it at execution time and that change is explicitly documented/revalidated in this Task.

Do not silently enable:

- ADD / MOVE / DELETE / REPLACE;
- duration changes;
- booking/payment operations;
- skip/restore;
- macro replanning;
- any new payload shape.

`source.kind` remains `user` only for apply. `ai`, `system`, and `provider_event` apply stay unsupported.

## 6. Permission and trusted actor rules

Current 8.5 persistence is owner-only. Keep that model in 4.22.

Mandatory rules:

- Use request-scoped server Auth and `requireAuthUser` or the current canonical equivalent.
- Never trust caller-selected `ownerUserId`, role, membership or service-role flags.
- Bind/verify `ChangeSet.source.actorRef` at the trusted service boundary against the actual authenticated actor for current user-owned apply.
- Load target Trip/Plan from DB under the authenticated permission boundary.
- Cross-user target access must fail closed and not reveal another user's Trip existence/details.
- Anonymous apply fails closed.
- Do not expose service-role keys or privileged DB credentials to browser/client code.
- Do not weaken existing Trip RLS as a shortcut for Engine writes.

If a transaction-scoped server primitive needs privileged metadata writes, keep the scope narrow, explicitly document why, and prove the Trip business write still enforces owner authorization.

## 7. Authoritative transaction / version semantics

The caller must not provide the authoritative apply snapshot.

Inside one apply transaction:

1. authenticate the user;
2. establish trustworthy DB authorization context;
3. read/lock the target Trip/Plan authoritative state or use an equivalent proven serialization mechanism;
4. reconstruct canonical `TripPlanSnapshotV1`;
5. verify target Trip/Plan IDs;
6. verify `baseVersion.tripRevision` and `baseVersion.planRevision` against current DB state;
7. build/inject trusted access values for the existing 4.21 evaluation context;
8. re-run accepted 4.21 validation/preview logic;
9. refuse any blocked/unsupported/needsConfirmation candidate;
10. persist the exact accepted canonical candidate using existing 8.5 revision/CAS behavior;
11. read back the actual resulting Trip/Plan revisions;
12. write idempotency terminal state, minimal audit and pending outbox record;
13. commit.

Do not invent a second revision counter. Existing 8.5 SQL revision/ancestor trigger behavior remains canonical.

`EngineResultV0_1.resultingVersion` after successful commit must equal actual persisted revisions.

No partial apply is allowed.

## 8. Confirmation gate

4.21 can emit confirmation requirements, but signed/one-time grant semantics are not yet frozen.

This Task must not invent a client-trusted confirmation mechanism.

Current 4.22 behavior:

- `preview/validation outcome=accepted` and `confirmationRequirements=[]` may proceed;
- non-empty confirmation requirements return `needsConfirmation` and no Trip mutation;
- client booleans, role strings, arbitrary grant JSON, `confirmed:true` or UI state are never evidence;
- confirmation grant issuance/consumption stays deferred until explicitly specified in a future Task/amendment.

## 9. Idempotency semantics

Implement persistent apply idempotency and close the implementation portion of OD-8.5-02 narrowly.

The Task must choose and document a deterministic scope. The required minimum behavior is:

- same authenticated actor + same idempotency key + same canonical payload hash → replay original terminal result;
- replay must set `replay.duplicate=true` and preserve original `changeSetId` reference semantics;
- no second Trip mutation;
- no second accepted audit;
- no second outbox event;
- same actor + same key + different payload hash → deterministic idempotency conflict;
- concurrent same-key submissions → at most one business mutation commits;
- canonical payload hash must be key-order independent and reuse the accepted stable Engine digest semantics or a documented compatible canonical algorithm;
- stored idempotency state must not contain raw Provider responses, tokens, credentials, Authorization headers, payment data or UI state.

Retention/cleanup may remain deferred. Until a retention Task exists, do not silently prune records in a way that breaks safe retry/reconciliation.

## 10. Transaction failure / unknown outcome

Known transaction failure:

- no partial Trip changes;
- no committed accepted audit/outbox;
- safe `TRANSACTION_FAILED` issue;
- `transaction.status="rolled_back"`;
- `resultingVersion=null`.

Unknown commit outcome:

- do not tell callers to create a new idempotency key;
- provide a server-side reconciliation path by original actor + idempotency key;
- if a committed terminal record can be found, return/replay it;
- if the service genuinely cannot determine commit state, return `transaction.status="outcome_unknown"` safely.

A live network-level unknown-commit is not required if the local environment cannot reproduce it deterministically. In that case, test the fault boundary deterministically and separately prove real reconciliation against committed Local DB state. Do not misreport an unexecuted live condition as PASS.

## 11. Engine persistence / audit / outbox

Add only the minimum persistence necessary for 4.22.

Exact SQL table/function names may be chosen during implementation, but the design must provide equivalent capabilities for:

- persistent idempotency terminal records;
- accepted Engine apply audit records;
- pending Engine outbox/sync records for future 4.23 consumption.

Use `supabase/migrations/*.sql` as the only formal DB history. Do not modify merged migrations. Add new migration(s) only.

Drizzle remains the mirror/query layer; generated Supabase public types must be regenerated from real Local Supabase for public schema changes.

For a successful apply, the following facts must be atomic in the same DB transaction:

```text
Trip/Plan/item mutation
+ resulting revisions
+ idempotency terminal record
+ one accepted audit record
+ one pending outbox record
```

Audit/outbox should contain only minimal safe fields, for example stable target/actor/change refs, payload hash, operation codes/IDs where needed, before/resulting revisions, timestamps, preview/context fingerprint and event status. Avoid full raw ChangeSet/provider/UI dumps unless a field is demonstrably required and safe.

Outbox delivery/consumption is **not** part of 4.22.

## 12. Reuse existing Trip persistence

Do not build a second Trip Plan model or divergent writer.

Reuse:

- `src/shared/contracts/trips/**`;
- `src/shared/contracts/engine/**`;
- current `src/server/engine/**`;
- current `src/server/trips/**`;
- accepted 8.5 SQL RLS/revision semantics.

If current `createTripRepository` cannot participate in one Engine transaction, refactor transaction-scoped internal primitives cleanly and keep existing repository behavior/tests green.

A separate Engine apply coordinator/service is acceptable. A parallel independent Trip persistence implementation is not.

## 13. Required focused acceptance

Real Local Supabase/Auth must prove at minimum:

1. owner `UPDATE_TIME` accepted path commits exactly once;
2. owner `REORDER_ITEMS` accepted path commits exactly once;
3. resulting DB tree parses as canonical `TripPlanSnapshotV1`;
4. returned `resultingVersion` equals actual persisted Trip/Plan revisions;
5. stale Trip revision rejects with no mutation/audit/outbox;
6. stale Plan revision rejects with no mutation/audit/outbox;
7. cross-user target apply fails closed without leaking target data;
8. anonymous apply fails closed;
9. actorRef mismatch fails closed;
10. system-hard / booking / payment / protected / unsupported operation paths do not mutate;
11. confirmation-required path returns `needsConfirmation` and does not mutate;
12. same key + same payload replays original result, duplicate=true, one mutation/audit/outbox total;
13. same key + different payload returns idempotency conflict;
14. concurrent same-key requests commit at most once;
15. concurrent different-key requests from the same stale base cannot both overwrite each other;
16. forced mid-transaction failure rolls back Trip + terminal idempotency + accepted audit + outbox atomically;
17. committed apply creates exactly one accepted audit and one pending outbox record;
18. blocked/unsupported/permission failures create no accepted Trip audit/outbox event;
19. account deletion/cascade behavior leaves no unsafe orphan Engine ownership records;
20. existing 8.5 + B Personal Center persistence coexistence remains intact.

Also preserve 4.21 deterministic validate/preview behavior.

## 14. Required test/QA matrix

At minimum execute and record exact counts/status:

```text
npm ci
clean latest-develop full Node baseline
npm run db:start
npm run db:status
npm run db:reset
npm run db:types
second reset/types or equivalent deterministic replay proof
existing WBS 4.21 focused suite
TASK-063 pure/unit suite
TASK-063 Local Auth/DB transaction suite
npm run test:trip-plan
npm run test:trip-plan:runtime
relevant account deletion / migration / A+B coexistence regression
candidate full repository Node regression
npm run lint
npm run typecheck
npm run build
npm run format:check:deploy
npm run deploy:validate:local
npm run deploy:build:local
npm run deploy:verify-artifact
TASK-owned formatting
git diff --check
cleanup synthetic users/data
npm run db:stop
exact final-head GitHub Quality Gate
```

Use current canonical equivalents if script names changed. Document the mapping.

No mandatory gate may be reported PASS if it was not executed.

Do not hide newly introduced failures behind historical baseline debt. If current clean develop has failures, reproduce and compare them explicitly.

## 15. Expected implementation outputs

At minimum:

- server-only apply coordinator/service under the existing Engine server boundary;
- transaction-scoped reuse/refactor of accepted Trip persistence if required;
- new SQL migration(s) for idempotency/audit/outbox metadata if required;
- Drizzle mirrors;
- regenerated Local Supabase public types for public schema changes;
- architecture/update document describing transaction, permission, idempotency scope, DB records, replay and unknown-outcome reconciliation;
- pure tests and real Local integration tests;
- `docs/qa/TASK-063/README.md`;
- machine-readable evidence under `docs/qa/TASK-063/`;
- `docs/tasks/RESULT-TASK-063-b-wbs-4-22-engine-transaction-apply.md`;
- Master WBS update.

## 16. WBS update rules

At actual implementation start:

- read latest Master WBS and `WBS-8.5-owner-correction.md`;
- change only WBS 4.22 to `B / 进行中（#380 / TASK-063-B）`;
- preserve all unrelated A/B changes.

After implementation + mandatory QA + Draft PR:

- WBS 4.22 → `B / 待审查（#380 / TASK-063-B；Draft PR #...）`.

Only explicit user acceptance plus actual merge to `develop` may set 4.22 = `已完成`.

Do not start or change 4.23 / 4.24 automatically.

## 17. Required Task outputs

- `docs/tasks/TASK-063-b-wbs-4-22-engine-transaction-apply.md`
- `docs/tasks/CODEX-TASK-063-b-wbs-4-22-engine-transaction-apply.md`
- `docs/tasks/RESULT-TASK-063-b-wbs-4-22-engine-transaction-apply.md`
- architecture/DB design update
- TASK-063 tests and QA evidence
- Master WBS tracking
- Draft PR → `develop`

## 18. Out of scope

- WBS 4.23 runtime event consumption, local recompute orchestration, rollback execution or compensating ChangeSet execution;
- WBS 4.24 broad final integration/replay/concurrency campaign beyond focused 4.22 requirements;
- arbitrary confirmation-grant issuance/approval UI;
- unsupported Engine operation enablement;
- AI/autopilot/system/provider-event apply;
- Booking/Payment mutation/cancellation/purchase;
- live Provider calls;
- Planner/Detail UI wiring;
- WBS 4.18 / 4.19 wiring;
- Production/Staging migration;
- unrelated schema/refactor/UI changes.

## 19. Completion behavior

When implementation and mandatory acceptance are complete:

1. update Result + QA + WBS;
2. commit and push implementation branch;
3. create/update one Draft PR → `develop`;
4. keep Issue #380 Open;
5. keep 4.23/4.24 unstarted;
6. return the complete TASK-063 Result for user review.

Do not auto-merge.