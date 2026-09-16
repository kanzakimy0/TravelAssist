# TASK-064-B — WBS 4.23 Engine Runtime Events / Local Recompute / Compensating Rollback

## Metadata

- Task ID: `TASK-064-B`
- WBS: `4.23 — Runtime事件 / 局部重算 / 回滚契约`
- Owner: `B / TravelAssist Engine Runtime`
- Priority: `P1`
- Status: `Ready`
- GitHub Issue: `#383`
- Publication baseline: `develop@b3c37a40ff8f0690a25d0372ac8e0c8f3cc063ea`
- Task publication branch: `task/b-wbs-4-23-runtime-recompute-rollback`
- Planned implementation branch: `codex/b-wbs-4-23-runtime-recompute-rollback`

## 1. Prerequisites

Execution must independently verify all of the following against execution-time latest `origin/develop`:

- WBS 4.20 Engine Contract v0.1 = `已完成 / Frozen`.
- WBS 4.20.1 = `已完成`.
- WBS 4.21 deterministic validation / feasibility / preview = `已完成`.
- WBS 4.22 authoritative transaction apply / permission / idempotency / audit = `已完成`.
- PR #382 is merged and Issue #380 is Closed / Completed.
- WBS 7.5 Route Schema = `已完成`.
- WBS 8.5 Trip Plan Schema = `B / 已完成`.

At publication, the above gates are satisfied. If any hard prerequisite is no longer true at execution time, return `Blocked` with exact evidence rather than implementing around it.

Important provider boundary:

- WBS 7.5 Route Contract is available and may be consumed.
- WBS 7.3 Production Route Provider is still not finally approved.
- WBS 7.8 is still a development/evaluation subset with Production Gate open.
- TASK-064 must not introduce live/paid Provider calls or pretend that a Production Provider gate is closed.

## 2. Canonical sources

Read these before implementation:

- `CONTRIBUTING.md`
- `AGENTS.md`
- `docs/development/task-tracking.md`
- `docs/project/WBS-TravelAssist.md`
- `docs/project/WBS-8.5-owner-correction.md`
- `docs/architecture/cross-module-contract-handoff.md`
- `docs/architecture/travelassist-engine-contract.md`
- `docs/architecture/rule-feasibility-engine.md`
- `docs/architecture/engine-transaction-apply.md`
- `docs/architecture/trip-plan-persistence.md`
- `docs/architecture/db-orm-migration-standards.md`
- `docs/tasks/RESULT-WBS-4.21-b-rule-feasibility-engine.md`
- `docs/tasks/RESULT-TASK-063-b-wbs-4-22-engine-transaction-apply.md`
- `docs/qa/TASK-063/README.md`
- `docs/qa/TASK-063/acceptance-evidence.json`
- `src/shared/contracts/engine/**`
- `src/shared/contracts/trips/**`
- `src/shared/contracts/routes/**`
- `src/server/engine/**`
- `src/server/trips/**`
- `src/db/schema/engine-apply.ts`
- `src/db/schema/trips.ts`
- `supabase/migrations/20260917090000_create_engine_apply.sql`
- current `supabase/migrations/**`
- current `src/types/database.generated.ts`

If a historical document conflicts with merged runtime, current merged code + accepted Result + frozen Contract + latest Master WBS are authoritative.

## 3. Start gate / Git safety

Before changing anything, execute and record:

```bash
git status --short
git branch --show-current
git fetch --all --prune
git rev-parse origin/develop
git log --oneline -20 origin/develop
```

Use a dedicated clean worktree and create the implementation branch from execution-time latest `origin/develop`:

```text
codex/b-wbs-4-23-runtime-recompute-rollback
```

Do not develop from the Task publication branch.

Forbidden:

```text
git clean -fd
git reset --hard
git push --force
git push --force-with-lease
history rewrite / destructive rebase
```

Preserve any user/untracked workspace content. Do not use a dirty primary workspace as the implementation worktree.

## 4. Objective

Implement the first safe Engine runtime-event and local-recompute layer on top of the accepted WBS 4.22 pending outbox, and implement **compensating rollback** for the currently reversible Engine operations.

The target flow is:

```text
4.22 accepted apply
    ↓
engine_apply_outbox = pending
    ↓
4.23 local runtime consumer
    ↓
claim / lease / bounded retry
    ↓
read current authoritative Trip/Plan
    ↓
trusted current evaluation context
    ↓
4.21 deterministic recompute
    ↓
minimal runtime result / fingerprint
    ↓
processed / retryable failure / terminal failure
```

and for business rollback:

```text
accepted apply receipt
    ↓
minimal reversible preimage exists
    ↓
Auth + current state + rollback preconditions
    ↓
construct inverse ChangeSet
    ↓
current real revisions
    ↓
4.21 preview / protections
    ↓
4.22-equivalent atomic apply path
    ↓
NEW revision + NEW audit + NEW outbox
    ↓
rollback correlation to original receipt
```

## 5. Critical rollback definition

There are two different meanings of “rollback”. Do not mix them.

### 5.1 Transaction rollback

Already implemented by WBS 4.22. A failed transaction leaves no partial Trip / receipt / audit / outbox state.

TASK-064 must preserve this behavior but does not reimplement it as a second mechanism.

### 5.2 Business compensation after commit

This is the WBS 4.23 responsibility.

A committed revision is historical fact. Therefore a successful business rollback MUST NOT:

- decrement `trip.revision` or `plan.revision`;
- reset revision counters;
- overwrite the current Trip using an old full snapshot;
- delete or rewrite the original apply receipt/audit;
- pretend an external Booking/Payment side effect was undone;
- bypass current permissions/locks/rules because the original apply had once been valid.

A successful rollback must create a **new compensating ChangeSet against current authoritative state**. It therefore produces a new accepted mutation and a new forward-moving revision.

## 6. Narrow reversible scope

At Task publication, WBS 4.22 persists only:

- `UPDATE_TIME`
- `REORDER_ITEMS`

TASK-064 may implement compensation only for these currently supported operations.

Do not enable or invent rollback semantics for:

- `ADD_ITEM`
- `UPDATE_ITEM`
- `MOVE_ITEM`
- `DELETE_ITEM`
- `SKIP_ITEM`
- `RESTORE_ITEM`
- `REPLACE_ITEM`
- `REPLACE_TRANSPORT`
- `UPDATE_DURATION`
- `UPDATE_PLACE`
- `LINK_BOOKING`
- `UPDATE_BOOKING_STATUS`
- `LOCK_ITEM`
- `UNLOCK_ITEM`
- `REPLAN_DAY`
- `REPLAN_RANGE`
- Booking / Payment cancellation, refund, rebooking or provider-side reversal.

Historical accepted receipts that lack sufficient reversible history must return a stable safe `unsupported / rollback history unavailable` result and perform zero Trip mutation.

## 7. Minimal reversible history

WBS 4.22 intentionally does not retain full before/after Trip snapshots. Do not reverse that privacy/data-minimization decision.

Add only the bounded operation-specific preimage required to reverse the two supported operations.

### 7.1 UPDATE_TIME

For an accepted operation, retain at least:

- target item stable ID;
- canonical schedule before the apply, including null if allowed;
- canonical schedule actually applied after the apply.

### 7.2 REORDER_ITEMS

For an accepted operation, retain at least:

- target day stable ID;
- ordered scheduled item IDs before the apply;
- ordered scheduled item IDs actually applied after the apply.

### 7.3 Persistence rules

Use an additive migration/table or equivalent append-only server-only structure.

Requirements:

- existing merged migrations remain byte-identical;
- compensation evidence is written atomically with future accepted applies after TASK-064 is merged;
- no accepted reversible mutation may commit without required compensation evidence;
- Auth account deletion must cascade safely;
- browser/anon/authenticated client roles must not be able to forge/read internal compensation evidence;
- do not store full Trip snapshots;
- do not store raw ChangeSet JSON unless strictly bounded operation-specific inverse data requires a normalized fragment;
- do not store full evaluation context;
- do not store raw Provider responses, credentials, auth headers, payment data, UI/React/Mapbox state.

If a dedicated table is used, prefer a receipt/audit reference plus bounded normalized inverse data rather than a second history store.

## 8. Rollback contract / request boundary

Frozen `ChangeSetV0_1` must not be silently redefined.

Define an explicit versioned rollback request/domain contract if a new request shape is necessary. It should contain only the minimum safe identity/correlation fields, such as:

- rollback contract/version;
- original accepted receipt/audit reference;
- caller-bound actor reference if required by existing Engine conventions;
- rollback request identity / idempotency identity;
- reason/correlation metadata.

The request must NOT accept:

- caller-provided authoritative snapshot;
- owner ID or role as authorization evidence;
- arbitrary before/after values;
- client-provided inverse operations;
- `confirmed: true` or arbitrary confirmation grant JSON;
- service-role credentials;
- raw Provider facts.

If a shared/public rollback type is introduced, make it additive under the Engine namespace, provide a strict parser + fixtures + tests, and document Producer/Consumer ownership. Do not mutate frozen ChangeSet fields in place.

## 9. Safe compensation preconditions

Before generating/applying the inverse, verify all of the following server-side:

1. real request-scoped Auth is valid;
2. authenticated user owns the target Trip under current RLS rules;
3. original receipt is accepted and belongs to this actor;
4. original audit/compensation history exists and is structurally valid;
5. the original receipt is an eligible reversible apply;
6. current authoritative Trip/Plan can be loaded and parsed;
7. current target item/day identities still exist;
8. current target field/order still equals the original **applied-after** value in the compensation evidence;
9. no prior successful compensation has already consumed this original accepted receipt;
10. inverse ChangeSet is generated by trusted server code, not caller input;
11. inverse ChangeSet uses current real `tripRevision` + `planRevision` as baseVersion;
12. current locks/booking/protected state is re-evaluated;
13. current trusted evaluation context is re-resolved;
14. existing 4.21 validation/preview is rerun;
15. existing 4.22 permission/idempotency/transaction/audit/outbox guarantees are preserved.

If another update changed the same schedule/order after the original apply, return a deterministic rollback conflict with zero mutation. Never overwrite newer work merely because an older receipt exists.

## 10. Rollback identity / concurrency / idempotency

Rollback must be safe under retries and concurrency.

Mandatory invariants:

- same rollback request retry cannot apply twice;
- two concurrent rollback attempts against the same original accepted receipt cannot both commit;
- after one successful compensation, later attempts against the same original receipt cannot flip the value/order back and forth;
- a successful rollback has an explicit correlation from original accepted receipt → compensation apply/receipt;
- original receipt/audit remain immutable;
- correlation records are server-only and minimal;
- forced failure before commit leaves no successful rollback relation or partial Trip mutation;
- rollback itself must use the existing 4.22 transaction/apply path or a refactored internal primitive preserving exactly the same Auth/RLS/CAS/idempotency/audit/outbox semantics;
- no second Trip writer is allowed.

Codex may choose the narrow internal locking/idempotency schema design. The Result must explain why the design prevents duplicate compensation, including concurrent requests with different external retry tokens if those are accepted by the rollback contract.

## 11. Runtime outbox consumption

WBS 4.22 created `engine_apply_outbox` with accepted events initially in `pending` state. WBS 4.23 owns local Engine consumption.

Implement a **server-only callable processor**, not an externally deployed daemon/message broker.

It must support safe multi-worker semantics:

- atomically claim pending/retryable work;
- use row locks / skip-locked / lease/token semantics or an equivalent proven mechanism;
- two workers must not create duplicate runtime results for one event;
- a worker crash/interruption must not strand an event forever;
- expired abandoned claims must be recoverable;
- retry count is bounded;
- terminal failures do not retry forever;
- repeated processor invocation is idempotent;
- error records expose stable safe codes, not raw exception/provider/SQL text;
- browser/anon/authenticated roles cannot manipulate queue state;
- account deletion/cascade remains coherent.

Existing `20260917090000_create_engine_apply.sql` is immutable. If the fixed `pending` state must evolve, do so only with a new additive migration.

The Task may select an explicit lease duration and maximum retry count as implementation policy, but both must be documented, deterministic/testable, bounded, and not presented as a permanent product decision if they are only runtime defaults.

## 12. Runtime event contract

Define an explicit versioned runtime-event/recompute contract without changing frozen ChangeSet v0.1.

At minimum represent:

- event version;
- event identity;
- event type (`engine.apply.accepted.v0.1` for this Task);
- original receipt/changeSet correlation;
- actor/Trip/Plan stable refs as needed;
- original resulting version / current observed version where applicable;
- processing state;
- recompute status;
- deterministic recompute/context fingerprint;
- bounded safe reason/issue summary.

Do not expose database row internals as public domain shape.

If the contract is shared/public:

- strict parser;
- explicit limits;
- deterministic serialization;
- fixtures;
- unknown/future value behavior;
- Consumer handoff notes;
- no raw Provider/UI/private DB payloads.

## 13. Local recompute

The runtime processor must recompute from the **current authoritative Trip/Plan** when the event is processed.

Do not use an old Trip snapshot hidden in audit/receipt data. None should exist.

Recompute requirements:

1. load current authoritative Trip/Plan from the accepted 8.5 persistence boundary;
2. verify canonical Trip contract;
3. use current observed revision;
4. resolve trusted evaluation context server-side;
5. reuse the accepted 4.21 deterministic rule engine;
6. remain read-only for Trip state;
7. produce deterministic bounded runtime result/fingerprint for identical current state/context/rule versions;
8. store only minimal result metadata/summary;
9. do not automatically create/apply another ChangeSet from a recompute finding in this Task.

A reasonable local scope is the target Plan if a safely smaller affected scope cannot be derived without retaining excessive history. Correctness and data minimization are more important than premature micro-optimization.

## 14. Route / Provider boundary

WBS 4.23 depends on completed WBS 7.5 Route Schema, not on a Production Provider being approved.

Rules:

- normalized route facts must validate through the current Route contract/validator;
- trusted route facts may participate in 4.21 evaluation;
- missing/stale/untrusted required route facts must stay fail-closed / insufficient-input / unsupported according to existing semantics;
- do not call 駅すぱあと or another live/paid Provider automatically;
- do not refresh Provider data as a side effect of outbox processing;
- do not persist raw Provider responses;
- do not invent coordinates, duration, route mode, opening hours or fallback facts;
- 7.3 / 7.8 Production Gate status must remain unchanged.

## 15. Runtime-result persistence

Persist only what is necessary to prove runtime processing/recompute and retry behavior.

A minimal record may include:

- outbox/event identity;
- target refs;
- observed revision;
- processing outcome/state;
- attempt count / lease metadata;
- recompute/context fingerprint;
- high-level assessment status/reasonableness;
- bounded reason/issue codes;
- processed/failed timestamps.

Do not persist:

- full Trip snapshot;
- complete trusted evaluation context;
- raw provider data;
- auth token/headers;
- payment/booking sensitive payloads;
- UI state.

Any JSONB field must have explicit bounds/shape validation and tests. Prefer typed columns for stable identifiers/state.

## 16. Relationship to WBS 4.22

TASK-064 is allowed to make narrowly necessary additive changes to the 4.22 internal apply implementation so that future accepted applies atomically capture compensation preimage.

It must NOT weaken these accepted 4.22 invariants:

- authoritative DB read under real Auth/RLS;
- dual revision gate;
- current 4.21 revalidation;
- only user-source `UPDATE_TIME` / `REORDER_ITEMS` persisted;
- confirmation requirements still do not auto-apply;
- actor+idempotency semantics remain deterministic;
- receipt/audit/outbox are atomic with accepted mutation;
- known transaction failure fully rolls back;
- unknown commit reconciles by original key;
- exactly one accepted audit/outbox;
- no browser access to Engine metadata.

If apply internals are refactored to support compensation, existing TASK-063 focused + Local tests must remain green.

## 17. Required focused acceptance — runtime events

With real Local Supabase/Auth where applicable, prove at minimum:

1. a normal accepted 4.22 apply creates one pending outbox event;
2. the 4.23 processor can claim it;
3. processing creates exactly one runtime/recompute terminal record;
4. repeated processing does not duplicate the record/effect;
5. two concurrent workers cannot double-process one event;
6. lease/claim loss can be recovered after expiry;
7. forced processor failure produces retryable state with zero Trip mutation;
8. retry count is bounded and terminal failure cannot loop forever;
9. processing uses the current Trip/Plan revision, including a case where Trip changed after event creation but before processing;
10. recompute uses existing 4.21 semantics and performs no Trip write;
11. valid normalized Route facts are accepted through 7.5 boundaries;
12. missing/stale/invalid Route facts fail closed without a live Provider call;
13. runtime result/fingerprint is deterministic for identical current state/context/rule versions;
14. persisted runtime records contain no full snapshot/raw context/provider payload/token/secret;
15. account deletion/cascade leaves no unsafe orphan runtime metadata.

## 18. Required focused acceptance — compensation / rollback

Prove at minimum:

16. a new accepted `UPDATE_TIME` apply atomically records minimal reversible history;
17. rollback restores the previous canonical schedule using a new compensating apply;
18. successful rollback increments Trip and target Plan revision; it never decrements them;
19. a new accepted `REORDER_ITEMS` apply records before/applied order;
20. rollback restores the prior scheduled order using a new revision;
21. original receipt/audit remain byte/semantic immutable after rollback;
22. compensation creates the normal new apply receipt/audit/outbox plus explicit original→compensation correlation;
23. drift of the current target schedule causes rollback conflict and zero mutation;
24. drift of the current day order causes rollback conflict and zero mutation;
25. missing/deleted target fails closed;
26. cross-user target is indistinguishable from unavailable/permission-denied as appropriate and leaks no data;
27. anonymous rollback fails closed;
28. actor mismatch fails closed;
29. current system-hard/booking/payment/protected rules can block compensation even when original apply had been valid;
30. historical accepted receipt without compensation preimage returns stable history-unavailable/unsupported and zero mutation;
31. same rollback retry is idempotent;
32. concurrent rollback attempts for one original receipt commit at most one compensation;
33. a second post-success rollback cannot reverse the compensation again;
34. forced mid-compensation failure rolls back Trip + compensation correlation + new metadata atomically;
35. original 4.22 idempotency/reconciliation remains correct;
36. account deletion cascade removes runtime/compensation metadata safely while preserving another user.

## 19. Required regression

Re-run and preserve at minimum:

- WBS 4.21 focused test suite;
- TASK-063 pure tests;
- TASK-063 real Local transaction/apply tests;
- Trip Plan pure/projection tests;
- Trip Plan Local Auth/RLS/CAS tests;
- Route Contract tests;
- account deletion tests;
- Personal Center migration/local coexistence tests;
- full repository Node tests;
- lint / typecheck / build / deployment validation.

Do not modify existing tests merely to hide a regression. If an accepted old test encodes a deliberately superseded internal detail, document the conflict and preserve the external invariant with a replacement only when justified.

## 20. Required QA commands

At minimum execute the current canonical equivalents of:

```bash
npm ci
npm run db:start
npm run db:status
npm run db:reset
npm run db:types
npm run test:trip-plan
npm run test:trip-plan:runtime
npm run test:routing
npm run lint
npm run typecheck
npm run build
npm run format:check:deploy
npm run deploy:validate:local
npm run deploy:build:local
npm run deploy:verify-artifact
npm run db:stop
```

Additionally execute:

- clean execution-time `develop` full Node baseline;
- a second DB reset/types or equivalent deterministic migration/type replay proof;
- WBS 4.21 focused regression;
- TASK-063 pure + Local regression;
- TASK-064 pure contract/runtime tests;
- TASK-064 real Local DB/Auth/outbox/concurrency/rollback tests;
- relevant account deletion + Personal Center Local/migration coexistence regression;
- candidate full Node regression;
- task-owned/scoped Prettier;
- `git diff --check`;
- exact final-head GitHub Quality Gate.

Record exact command mapping if package aliases change before execution.

No mandatory gate may be reported PASS if it was not actually executed.

## 21. Required QA evidence

Publish reproducible evidence under:

```text
docs/qa/TASK-064/
```

At minimum:

- `README.md`
- machine-readable acceptance evidence JSON
- test counts / zero-skip claims where applicable
- migration/type replay hashes
- runtime event state-machine evidence
- rollback/compensation matrix
- concurrency/fault-injection evidence
- cleanup evidence
- exact final head / CI reference in PR delivery metadata.

Never put secrets, raw Auth tokens, real user data or Provider credentials into QA artifacts.

## 22. WBS tracking

At actual implementation start, read the complete latest Master WBS and change only WBS 4.23 to a truthful active state:

```text
B / 进行中（#383 / TASK-064-B）
```

Preserve all unrelated A/B tracking changes.

After implementation + mandatory QA + Draft PR, set 4.23 to:

```text
B / 待审查（#383 / TASK-064-B；Draft PR #<number>）
```

Only explicit user acceptance and actual merge to `develop` may mark 4.23 `已完成` and close Issue #383.

Do **not** automatically start, update or complete WBS 4.24.

## 23. Required outputs

- `docs/tasks/TASK-064-b-wbs-4-23-engine-runtime-recompute-rollback.md`
- `docs/tasks/CODEX-TASK-064-b-wbs-4-23-engine-runtime-recompute-rollback.md`
- `docs/tasks/RESULT-TASK-064-b-wbs-4-23-engine-runtime-recompute-rollback.md`
- `docs/architecture/engine-runtime-events-rollback.md`
- additive SQL migration(s), if needed
- Drizzle mirrors + real generated Local Supabase types, if schema changes
- versioned runtime/rollback parser/types/fixtures, if required
- server-only runtime/outbox consumer
- server-only compensating rollback service
- focused pure tests
- real Local DB/Auth/concurrency/fault tests
- `docs/qa/TASK-064/README.md`
- machine-readable QA evidence
- latest Master WBS tracking
- Draft PR → `develop`.

## 24. Explicitly out of scope

- WBS 4.24 broad soak/fuzz/concurrency/replay certification;
- external Kafka/SQS/message broker or production queue infrastructure;
- daemon/cron deployment;
- live/paid Route/POI/Booking Provider polling;
- automatic Provider refresh;
- production/staging DB mutation;
- Planner/Detail UI integration;
- new public HTTP route unless a narrow internal test boundary requires it;
- confirmation-grant issuance or approval UI;
- enabling currently unsupported Engine operations;
- AI/system/provider_event apply;
- Booking/Payment cancel/refund/rebook side effects;
- snapshot-rewind rollback;
- revision decrement;
- history deletion/rewriting;
- unrelated Planner/POI/Route/AI/schema cleanup.

## 25. Completion states

### Completed / Ready for owner review

Use when:

- runtime event contract/state machine is implemented;
- outbox local consumption is retry-safe and concurrency-safe;
- local recompute is deterministic, current-state based and read-only;
- future reversible applies atomically capture minimal compensation history;
- UPDATE_TIME and REORDER_ITEMS compensation succeeds through forward-moving Engine apply semantics;
- drift/protection/history-unavailable cases fail closed;
- mandatory Local/full regression and exact-head CI pass;
- Draft PR is review-ready.

Keep WBS 4.23 `待审查` until user acceptance + merge.

### Partial / Corrections require review

Use when a narrow defect remains but no destructive workaround was used.

### Blocked

Use when completing the required semantics would require:

- changing frozen canonical Trip meaning;
- enabling unsupported operation families;
- inventing Booking/Payment rollback;
- depending on an unapproved live Provider;
- weakening accepted 4.22 transaction/idempotency guarantees.

## 26. Stop boundary

Create one Draft PR to `develop` and stop.

Do not:

- auto-merge;
- close Issue #383;
- mark WBS 4.23 complete;
- start WBS 4.24.

Return the complete TASK-064-B Result for user review.