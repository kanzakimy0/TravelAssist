# TASK-065-B — WBS 4.24 Engine Regression / Concurrency / Replay / Integration Certification

## Metadata

- Task ID: `TASK-065-B`
- WBS: `4.24 — Engine回归 / 并发 / 回放与集成验收`
- Owner: `B / TravelAssist Engine Runtime & QA`
- Priority: `P1`
- Status: `待验收`
- GitHub Issue: `#387`
- Publication baseline: `develop@3d6c326ff62d69c8d1a9fb96bd6dca368faa3642`
- Task publication branch: `task/b-wbs-4-24-engine-integration-certification`
- Planned implementation branch: `codex/b-wbs-4-24-engine-integration-certification`

- Commit: f4dfcadf3fae2fe9b1aa97196264eb5158316444
- Pull Request: PENDING_DRAFT_PR
- Result: [TASK-065-B Result](RESULT-TASK-065-b-wbs-4-24-engine-integration-certification.md)

## 1. Purpose

WBS 4.24 is the final certification task for the **currently merged and enabled Engine v0.1 subset** delivered by WBS 4.21–4.23.

This is primarily a regression / concurrency / replay / fault / integration QA task. It is **not** permission to expand Engine product capability.

The capability under certification is limited to:

- deterministic 4.21 validate / preview;
- user-source `UPDATE_TIME` and `REORDER_ITEMS` only;
- 4.22 authoritative apply / reconcile under real Auth/RLS, dual revision checks, idempotency, audit and outbox;
- 4.23 local outbox processing / current-state recompute;
- 4.23 compensating rollback for `UPDATE_TIME` and `REORDER_ITEMS` through a new forward ChangeSet/revision.

Passing this Task means this **narrow merged subset** has been certified under the required test matrix. It does not mean future operation families, AI, Booking/Payment, confirmation grants, public APIs, production Provider policies or production workers are production-ready.

## 2. Prerequisite gate

Before implementation, independently verify against execution-time latest `origin/develop`:

- WBS 4.20 = `B / 已完成 / Frozen`;
- WBS 4.20.1 = `B / 已完成`;
- WBS 4.21 = `B / 已完成`;
- WBS 4.22 = `B / 已完成`;
- WBS 4.23 = `B / 已完成`;
- PR #382 merged / Issue #380 completed;
- PR #384 merged / Issue #383 completed;
- WBS 8.5 = `B / 已完成`;
- WBS 7.5 Route Schema = `已完成`.

At publication these are satisfied. If a hard prerequisite is no longer true at execution time, stop and return `Blocked` with exact evidence rather than implementing around it.

Important unchanged gates:

- WBS 7.3 Production Route Provider remains not finally approved;
- WBS 7.8 Production Gate remains open;
- WBS 4.18 / 4.19 remain A integration work and are not part of TASK-065;
- AI / Booking / Payment / confirmation-grant product decisions are not unlocked by this Task.

## 3. Canonical sources to read

Read the execution-time latest versions before changing anything:

- `CONTRIBUTING.md`
- `AGENTS.md`
- `docs/development/task-tracking.md`
- `docs/project/WBS-TravelAssist.md`
- `docs/project/WBS-8.5-owner-correction.md`
- `docs/project/WBS-4.23-acceptance-closeout.md`
- `docs/architecture/cross-module-contract-handoff.md`
- `docs/architecture/travelassist-engine-contract.md`
- `docs/architecture/rule-feasibility-engine.md`
- `docs/architecture/engine-transaction-apply.md`
- `docs/architecture/engine-runtime-events-rollback.md`
- `docs/architecture/trip-plan-persistence.md`
- `docs/architecture/db-orm-migration-standards.md`
- `docs/tasks/RESULT-WBS-4.21-b-rule-feasibility-engine.md`
- `docs/tasks/RESULT-TASK-063-b-wbs-4-22-engine-transaction-apply.md`
- `docs/tasks/RESULT-TASK-064-b-wbs-4-23-engine-runtime-recompute-rollback.md`
- `docs/qa/TASK-063/README.md`
- `docs/qa/TASK-063/acceptance-evidence.json`
- `docs/qa/TASK-064/README.md`
- `docs/qa/TASK-064/acceptance-evidence.json`
- `src/shared/contracts/engine/**`
- `src/shared/contracts/trips/**`
- `src/shared/contracts/routes/**`
- `src/server/engine/**`
- `src/server/trips/**`
- `src/db/schema/engine-apply.ts`
- `src/db/schema/engine-runtime.ts`
- `src/db/schema/trips.ts`
- current `supabase/migrations/**`
- current `src/types/database.generated.ts`

If historical documentation conflicts with merged code, latest accepted Result/QA + merged runtime + frozen public Contract + latest Master WBS are authoritative.

## 4. Git start gate and safety

Before modifying files, execute and record:

```bash
git status --short
git branch --show-current
git fetch --all --prune
git rev-parse origin/develop
git log --oneline -20 origin/develop
```

Use a dedicated clean worktree and branch from execution-time latest `origin/develop`:

```text
codex/b-wbs-4-24-engine-integration-certification
```

Do not develop from the Task publication branch.

Forbidden:

```text
git clean -fd
git reset --hard
git push --force
git push --force-with-lease
destructive rebase / history rewrite
```

Preserve pre-existing user/untracked files. Do not use a dirty primary workspace as the candidate or baseline worktree.

## 5. Certification-first change policy

TASK-065 should prefer **tests, fault harnesses, deterministic generators and evidence** over runtime changes.

If testing exposes a real defect:

1. reproduce it deterministically;
2. identify which accepted 4.21/4.22/4.23 invariant is violated;
3. fix only the minimal internal implementation required;
4. add a regression proving the defect is closed;
5. document before/after evidence in Result/QA.

Do not silently fix a failure by:

- changing frozen public ChangeSet/EngineResult semantics;
- enabling another operation family;
- inventing a confirmation grant;
- inventing Product/Auth/Booking policies;
- weakening permission/RLS/revision rules;
- changing Provider truth or fabricating facts;
- removing assertions from accepted suites;
- editing a historical merged migration.

If a required correction would need an explicit Contract Amendment or upstream product/domain decision, record the case as deferred/blocked and preserve fail-closed behavior.

## 6. Certification matrix A — deterministic replay / parser / fuzz

Build a seeded deterministic Engine certification generator/harness.

Mandatory families should cover at minimum:

- valid `UPDATE_TIME` accepted candidates;
- valid `REORDER_ITEMS` accepted candidates;
- stale base versions;
- system-hard/protected/booking/payment-related blocked/unsupported conditions already represented by accepted context;
- confirmation-required outcomes;
- missing/stale/invalid normalized facts;
- unknown Engine/Trip versions;
- unknown fields;
- unknown/lowercase/altered operation codes;
- unsupported source kinds (`ai`, `system`, `provider_event`);
- duplicate operation IDs;
- invalid target refs;
- invalid schedules/order permutations;
- over-limit payloads/collections/strings where parsers define limits;
- object-key reordering / transport whitespace variants;
- semantic changes under the same apparent transport shape.

For identical canonical snapshot + ChangeSet + trusted context, repeated 4.21 validation/preview must produce stable:

- outcome;
- normalized issues / confirmation requirements;
- assessment;
- preview/fingerprints where applicable.

Canonical hash expectations:

- object-key ordering and JSON whitespace do not change canonical identity;
- array ordering remains semantic where defined;
- changing a semantic ChangeSet field changes payload identity/hash or produces the corresponding changed outcome;
- invalid/unknown input always fails closed.

### Mandatory pure soak size

Execute at least **5,000 deterministic generated/replayed Engine cases**.

Record:

- fixed seed(s);
- generator version/parameters;
- case distribution by outcome/family;
- exact failure count;
- reproducible failing seed/case if any.

Do not report random fuzz as PASS without a replayable seed.

## 7. Certification matrix B — apply concurrency / idempotency

Use real Local PostgreSQL and real Local Auth identities/sessions where applicable. Avoid mocks for concurrency correctness.

### B1. Same actor / same key / same payload

Submit at least **16 concurrent apply requests** for one actor/key/payload.

Prove:

- at most one business mutation commits;
- exactly one accepted audit/outbox/preimage for that mutation;
- all successful terminal responses reconcile to the same original terminal result;
- duplicates report replay semantics rather than writing again;
- actual Trip/Plan revisions equal returned resultingVersion.

### B2. Same key / conflicting payloads

Race mixed payloads under the same actor/key.

Prove:

- one actor/key identity exists;
- a mismatching canonical hash cannot mutate;
- conflict is deterministic;
- no duplicate accepted metadata exists.

### B3. Different keys / same stale base

Race at least **16 different idempotency keys** against the same old Trip/Plan baseVersion.

Prove stale writers cannot overwrite the winning committed state.

### B4. Different Plans in one Trip

Exercise concurrent writes against different Plans sharing a Trip root.

Prove canonical root/Trip revision serialization prevents lost updates and that returned plan/trip revisions match the committed DB tree.

### B5. Independent Trips

Prove independent Trips for the same actor can both commit without an accidental actor-global business serialization bottleneck beyond the intended idempotency-key scope.

### B6. Actor isolation

Prove:

- the same idempotency key can be independently used by different authenticated actors;
- cross-user / anonymous / actorRef mismatch attempts fail closed;
- foreign target existence/revision/details are not leaked.

### Mandatory apply concurrency soak

Run **at least 100 total real-DB concurrency rounds** across the above scenarios.

After every batch, verify no duplicate/orphan accepted metadata.

## 8. Certification matrix C — transaction faults and unknown outcome

Exercise deterministic fault boundaries around real Local transactions.

Prove:

1. lost/ambiguous COMMIT acknowledgement is reconciled using **only the original actor/key/payload**;
2. a committed terminal receipt is replayed after acknowledgement loss;
3. if outcome genuinely cannot be established, the result remains outcome_unknown rather than inventing rollback/success;
4. post-COMMIT read failure is never reported as `rolled_back`;
5. known COMMIT constraint/serialization rejection returns transaction failure/rolled_back and no partial accepted state;
6. retry after known rollback may safely reuse the original key/payload;
7. no recovery path tells a caller to generate a new key to bypass uncertainty.

Inject failures at multiple stages as practical, including the equivalents of:

- before/at Trip writer;
- after Trip mutation but before terminal metadata;
- receipt/audit insertion;
- preimage insertion;
- outbox insertion;
- deferred/commit constraint failure;
- post-COMMIT terminal reread.

For every known transaction failure verify business state + accepted receipt/audit/preimage/outbox all obey atomicity.

Do not claim a live network partition if it was not actually exercised.

## 9. Certification matrix D — runtime outbox multi-worker

Generate a batch of real accepted apply events and process them with concurrent local runtime workers.

Prove:

- SKIP LOCKED/lease/fencing gives one active claim per event;
- every event has at most one terminal runtime result;
- repeated consumer invocation after completion is idempotent;
- stale/expired worker token cannot publish after claim replacement;
- expired abandoned claims can be reclaimed;
- retryable context failures respect bounded retry;
- max attempts terminate and cannot loop forever;
- no event is permanently stranded solely because a worker stopped after claiming;
- current authoritative Trip/Plan revision is read at processing time;
- if Trip changed after original apply but before processing, recompute uses the newer current state;
- recompute does not write Trip state;
- valid Route facts are accepted only through the current WBS 7.5 contract/validator;
- stale/missing/invalid Route facts fail closed;
- no hidden live/paid Provider call or refresh occurs.

### Mandatory runtime soak

Process at least **100 outbox events** using at least **8 concurrent worker loops**, plus an explicit lease-expiry/recovery subset.

Record event counts by processed/retryable/terminal state and prove no duplicate runtime-result rows.

## 10. Certification matrix E — compensating rollback races

Test both currently reversible operation families:

- `UPDATE_TIME`
- `REORDER_ITEMS`

Mandatory invariants:

1. successful rollback is a new forward apply and new revision;
2. revision never decreases/resets;
3. no old full snapshot is restored wholesale;
4. original apply receipt/audit remain unchanged;
5. compensation has its own receipt/audit/outbox/preimage;
6. original→compensation relation exists exactly once;
7. same rollback request retry is idempotent;
8. two or more different external rollback keys racing the same original receipt commit at most one compensation;
9. a second rollback after successful compensation cannot flip state back;
10. compensation receipt cannot be used to create a rollback chain/flip-flop;
11. state drift on the reversible field/order produces rollback conflict with zero mutation;
12. historical accepted receipt lacking preimage remains unsupported / no mutation;
13. missing/deleted target fails closed;
14. cross-user/anonymous/actor mismatch fails closed;
15. current system-hard/booking/payment/protected/current-context rules can block compensation.

### Rollback versus normal apply race

Race rollback against a new normal apply on the same reversible target.

At most one path may validly commit against a given observed state. The loser must fail safely via current revision/state-drift/rule/idempotency gates; neither path may overwrite a newer result.

### Mandatory rollback soak

Run at least **100 rollback/concurrent-race rounds total**, covering both supported operation families.

## 11. Certification matrix F — persistence / audit graph invariants

After every focused scenario and after aggregate soaks, query the real Local DB and assert:

### Accepted normal apply

- exactly one terminal accepted apply receipt;
- exactly one accepted audit;
- exactly one outbox row;
- exactly one required preimage;
- returned resultingVersion equals DB revisions.

### Accepted compensation

- its own normal apply receipt/audit/outbox/preimage;
- exactly one original→compensation relation;
- original receipt/audit remain immutable.

### Non-accepted decisions

- no accepted audit;
- no accepted outbox;
- no accepted preimage;
- no Trip mutation.

### Runtime event

- at most one runtime result per outbox event.

### Global structural invariants

- Trip/Plan revisions remain positive and monotonic;
- revisions never decrease;
- no duplicate/orphan Engine metadata;
- FK/cascade behavior remains coherent;
- account deletion removes the target account’s Engine/Trip/Profile data without deleting another account’s data;
- browser/anon/authenticated DB roles cannot read/forge internal Engine receipts/audit/outbox/preimage/compensation/rollback/runtime metadata.

If schema/catalog checks find an inconsistency, compare against execution-time clean `develop` before classifying it as a TASK-065 regression.

## 12. Certification matrix G — data minimization / security

Inspect persisted Engine metadata, including JSON/array fields, and prove it does not contain:

- full Trip/Plan snapshot;
- complete trusted evaluation context;
- raw Provider response;
- access/refresh token;
- Authorization/cookie headers;
- service credentials;
- payment/card payload;
- Booking private payload beyond existing canonical safe refs;
- React/Mapbox/UI state.

Also verify safe error paths do not expose:

- raw SQL/driver errors;
- database credentials;
- raw Provider exceptions/payload;
- foreign target data/revision/existence details;
- auth secret material.

## 13. Certification matrix H — integration regressions

Preserve all accepted upstream behavior. At minimum run and pass the current canonical equivalents of:

- WBS 4.21 focused validate/preview suite;
- TASK-063 / WBS 4.22 pure suite;
- TASK-063 real Local apply suite;
- TASK-064 / WBS 4.23 pure suite;
- TASK-064 real Local runtime/rollback suite;
- canonical Trip Contract/parser/fixtures;
- `npm run test:trip-plan`;
- `npm run test:trip-plan:runtime`;
- Route Contract / `npm run test:routing`;
- 8.5 Trip persistence/RLS/CAS round-trip;
- current A+B persistence coexistence;
- relevant Personal Center migration/account deletion Local aggregate;
- existing Save/History coexistence checks if they are already present and callable, without adding Planner wiring;
- full repository Node baseline/candidate comparison.

Do not modify WBS 7.3/7.8, 4.18/4.19, 6.x, Booking/Payment, confirmation grant, unsupported-operation or deployment status as a side effect of testing.

## 14. Open-decision certification handling

Review the frozen Contract §25 deferred-decision matrix.

For each item materially exercised by current 4.21–4.23 runtime, classify it in the certification report as one of:

- `CERTIFIED_FOR_CURRENT_SUBSET` — the current implementation decision is now backed by 4.24 tests;
- `DEFERRED_FAIL_CLOSED` — upstream/product/provider capability remains intentionally unavailable;
- `REQUIRES_AMENDMENT` — a future change would alter frozen public semantics and must not be implemented in TASK-065.

Do not delete or silently mark deferred Product/Provider/Booking/AI decisions “resolved” just because the current narrow behavior is safe.

## 15. Required Engine v0.1 certification report

Create:

`docs/architecture/engine-v0.1-certification.md`

It must state clearly:

### Certified now

Exact server-only behavior and operation/source scope proven by TASK-065.

### Deferred / fail-closed

At minimum identify:

- unsupported operation families;
- `ai` / `system` / `provider_event` apply;
- production Route/POI fact/provider policy;
- confirmation grant issuance/consumption;
- Booking/Payment side effects;
- public API / Consumer rollout not implemented;
- production worker/cron/broker deployment;
- product/model calibration still dependent on future owned decisions.

### Defects discovered/fixed

For each actual defect fixed in TASK-065:

- reproduction;
- violated invariant;
- minimal fix;
- regression test;
- compatibility impact.

If no defect is found, explicitly say runtime code was not changed solely to create activity.

### Residual risks

List residual risks without presenting them as current certified features.

### Reproducibility

Record fixed seeds, soak sizes, Local Supabase/runtime versions where already available through project evidence, and exact final commit evidence.

## 16. Mandatory QA sequence

At minimum execute and preserve evidence for:

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

- clean execution-time latest-develop full Node baseline;
- second clean reset/types or equivalent deterministic migration/catalog/type replay;
- 4.21 focused regression;
- TASK-063 pure + real Local regression;
- TASK-064 pure + real Local regression;
- TASK-065 >=5,000 deterministic pure replay/fuzz cases;
- TASK-065 >=100 apply DB concurrency rounds;
- TASK-065 >=100 outbox events / >=8 concurrent worker loops;
- TASK-065 >=100 rollback/race rounds;
- TASK-065 transaction fault/unknown-outcome/reconciliation matrix;
- account deletion / Personal Center / A+B coexistence regression;
- candidate full repository Node regression;
- Task-owned/scoped formatting;
- `git diff --check`;
- synthetic Auth/users/data/claims/events cleanup;
- exact final-head GitHub Quality Gate PASS.

No mandatory gate may be marked PASS unless actually executed.

If command names changed on execution-time latest develop, use the canonical current equivalent and document the mapping. Do not silently omit a required gate because an old command disappeared.

## 17. Evidence requirements

Create:

- `docs/qa/TASK-065/README.md`
- one or more machine-readable evidence files under `docs/qa/TASK-065/`.

Machine-readable evidence must include at least:

- execution base and final candidate head;
- clean baseline/candidate status;
- exact commands and exit codes;
- test counts/pass/fail/skip/todo;
- deterministic seed(s);
- generated/replayed case count and distribution;
- apply concurrency rounds/concurrency levels;
- runtime event/worker counts and terminal distribution;
- rollback/race rounds;
- transaction fault cases;
- DB invariant counts/results;
- reset/types/catalog replay hashes where used;
- cleanup inventory/results;
- exact final-head CI run/head match.

Do not embed secrets/tokens/credentials/raw provider payloads in evidence.

## 18. Deliverables

Required outputs:

- `docs/tasks/TASK-065-b-wbs-4-24-engine-integration-certification.md`
- `docs/tasks/CODEX-TASK-065-b-wbs-4-24-engine-integration-certification.md`
- `docs/tasks/RESULT-TASK-065-b-wbs-4-24-engine-integration-certification.md`
- `docs/architecture/engine-v0.1-certification.md`
- new focused pure/seeded replay/fuzz tests;
- new real Local concurrency/fault/replay certification tests;
- `docs/qa/TASK-065/README.md`
- machine-readable `docs/qa/TASK-065/*` evidence;
- Master WBS synchronization;
- one Draft PR → `develop`.

If a genuine runtime fix is required, include only the minimal changed runtime/schema files and explain them in Result. A code diff is not required if the existing runtime passes the stronger certification unchanged.

## 19. WBS tracking

Task publication does **not** itself start WBS 4.24.

At actual Codex implementation start, after reading execution-time latest Master WBS, update only:

```text
4.24 = B / 进行中（#387 / TASK-065-B）
```

After implementation + mandatory QA + Draft PR:

```text
4.24 = B / 待审查（#387 / TASK-065-B；Draft PR #...）
```

Only explicit user acceptance plus merge to `develop` may change 4.24 to `已完成`.

Preserve all unrelated A/B rows and historical records.

## 20. Explicitly out of scope

TASK-065 must not:

- enable new operation families;
- change frozen Engine v0.1 public semantics without an explicit amendment;
- enable `ai` / `system` / `provider_event` apply;
- issue/consume a new confirmation grant mechanism;
- implement Booking/Payment/refund/rebooking/cancellation side effects;
- call live/paid Providers or finalize WBS 7.3/7.8;
- add Planner/Detail UI or HTTP product wiring;
- implement 4.18/4.19 Planner integration;
- deploy production cron/daemon/message broker;
- mutate Production/Staging DB;
- rewrite historical migrations;
- refactor unrelated Planner/POI/Route/AI/account code;
- auto-start another WBS item.

## 21. Completion behavior

When certification implementation and all mandatory QA are complete:

1. write the complete Result and certification report;
2. synchronize WBS 4.24 to `B / 待审查`;
3. push the implementation branch;
4. create exactly one Draft PR to `develop`;
5. obtain exact final-head GitHub Quality Gate PASS;
6. return the complete TASK-065-B Result to the user.

Do **not** auto-merge the Draft PR.
Do **not** auto-close Issue #387.
Do **not** mark WBS 4.24 `已完成` before explicit user acceptance + merge.
