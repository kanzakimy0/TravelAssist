# Engine local runtime and compensating rollback — TASK-064-B / WBS 4.23

## Ownership and public handoff

B produces the additive Engine contracts in `src/shared/contracts/engine/runtime.ts`; trusted server integrations consume them. A's TripPlanSnapshotV1 and Route v1.0 remain canonical. ChangeSetV0_1, the 4.21 rules, the 8.5 tables/RLS/revision triggers and existing migration files are unchanged. The Trip module only additionally exports its existing schedule parser so history validation reuses the same semantics.

Two server-only factories are available:

- `createLocalEngineRuntime(resolveContext, database?)`: explicit `processNext()`, or internal `claim()` / `processClaim(claim)` for local orchestration.
- `createEngineRollbackService(auth, resolveContext, database?)`: `rollback(request)` and read-only `reconcile(request)`.

There is no HTTP route, UI integration, scheduler, daemon, broker or provider refresh. The resolver is reviewed server code injected at construction, never caller JSON. It supplies the existing versioned 4.21 evaluation context. No production adapter or permissive default is fabricated. The worker's actor derives from the committed accepted receipt, and Trip access runs under that actor's current RLS. Request rollback additionally verifies real request-scoped Supabase Auth/getUser.

## Versioned domain contracts

Rollback request version is `4.23-rollback-1`: requestId, idempotencyKey, originalReceiptId, actorRef, correlationId and reason. IDs are bounded to 160 non-whitespace characters, DB references are lowercase UUIDs, reason is at most 1000 characters. Unknown fields/versions fail closed. The request cannot carry a snapshot, inverse, authority/role, context, facts or a confirmation flag/grant. Server-side canonical JSON detachment also rejects cycles/accessors/non-JSON values before use.

Runtime result version is `4.23-runtime-1`: event identity/type, original receipt/change correlation, actor and target refs, original resulting revisions, current observed revisions, terminal processing state, recompute status, fingerprint and bounded issue codes. The event identity is the original receipt UUID; its type remains `engine.apply.accepted.v0.1`. It is a domain DTO, without lease tokens or DB row dumps. Strict parsers and fixed-field-order serializers reject unknown/future extensions; fixtures demonstrate wire round trips. The issue summary holds at most 32 distinct sorted uppercase codes of at most 64 characters, with an explicit truncation bit. Full reports, snapshots, facts and contexts are not retained in runtime results.

Rollback results use an additive minimal DTO with the original identity, outcome, safe codes, observed/resulting versions, compensation apply receipt ID, replay flag and transaction state. Both successful and eligible non-successful terminal decisions replay without generating a new inverse. Parse/Auth/ownership failures are not retained.

## Shared apply transaction and minimal preimage

The original 4.22 coordinator retains its Auth, strict parsing, actor/key advisory lock, terminal replay, RLS Trip/Plan locks, commit acknowledgement and original-key reconciliation. Its locked body is extracted into `apply-transaction.ts`. Both coordinators call that body and the same existing `replaceTripTree` writer; there is no second revision or Trip persistence implementation.

After an accepted preview is written, the body reads the actual saved canonical snapshot and captures only net target changes:

- UPDATE_TIME: itemId, beforeSchedule, appliedSchedule.
- REORDER_ITEMS: dayId, beforeOrder, appliedOrder.

Before values come from the locked authoritative read; applied values come from the actual DB readback. This matters because the canonical DB projection normalizes timestamp representations, including millisecond precision. Capturing preview strings would incorrectly conflict with unchanged readback state.

A versioned preimage contains 1–100 distinct operation targets, schedules validated by the existing canonical parser, and orders of at most 1000 unique UUIDs with equal before/applied membership. Repeated operations on the same target retain its net original-before/final-applied pair. SQL additionally validates exact JSON shape, allowed fields, bounds and a 256 KiB maximum. No raw ChangeSet, full Trip, context, provider payload, credential or UI state is stored.

Preimage insertion is in the same transaction as Trip, terminal receipt, accepted audit and pending outbox. Validation/SQL insertion failure aborts all effects. Historical receipts are not backfilled using guessed state; absent or invalid history is `ROLLBACK_HISTORY_UNAVAILABLE` / unsupported.

## Compensation algorithm and concurrency

1. Verify real Auth and bind actorRef. Strictly parse/detach the request and hash its entire semantic payload with the existing canonical SHA-256 utility.
2. Begin READ COMMITTED and lock actor/rollback/idempotencyKey. A different payload under an existing key conflicts without mutation.
3. Acquire a separate actor/compensate/originalReceiptId advisory lock. All retry keys targeting that original serialize on this lock.
4. Read the actor's accepted original receipt. Set transaction-local JWT claims and authenticated role, lock/read current Trip and Plans using 8.5. Missing/foreign Trip access is indistinguishable. Matching replay also rechecks current ownership; reconciliation reads current RLS state.
5. Restore server metadata role and check original accepted audit, structurally valid preimage and existing compensation relations. An already-consumed original returns `ROLLBACK_ALREADY_COMPENSATED`; compensation receipts themselves are not reversible, preventing a compensation chain from toggling state.
6. Verify current target existence and exact equality with the recorded applied schedule/order. Drift is `ROLLBACK_CONFLICT`. Unrelated current edits are preserved.
7. Generate only trusted inverse UPDATE_TIME/REORDER_ITEMS operations. A new random apply key is reserved through the same apply-key lock namespace. The inverse uses the current real Trip/Plan revisions; its correlation points to the original receipt. Its source is the currently authenticated user.
8. Call the shared locked 4.22 body under authenticated RLS. Re-resolve current context, derive fact references only from that trusted context, and rerun existing 4.21 preview/validation. Current hard/user/booking/payment locks, protected targets, missing facts and confirmation requirements remain effective. No consent mechanism is introduced.
9. On acceptance, insert a unique original → compensation receipt relation and terminal rollback receipt in the same transaction as the new forward mutation/audit/outbox/preimage. Commit, then verify the committed rollback receipt.

The original receipt/audit is never updated or deleted. Revisions only move forward through existing SQL triggers; resultingVersion is read from the DB. Restoring a previously valid value may now fail current feasibility or require confirmation. For example, an old nonchronological order cannot be forced back through current schedule rules. The successful reorder fixture swaps schedules and order together, so both original and compensated Plans satisfy the unchanged rules.

Actor+rollback key uniqueness binds all request fields, including requestId/reason/correlation/original receipt. Same request replays the original result with duplicate=true. Different external keys for the same original can produce at most one compensation because of the original lock plus the unique original relation. Faults at preimage, relation insertion or deferred COMMIT leave no partial business/history/correlation state.

Known body/COMMIT rejection returns rolled_back. Ambiguous commit or post-commit read failure reconciles the original rollback key; unavailable evidence returns outcome_unknown. Retry must retain the original request/key. Fresh Auth and current RLS also apply to reconciliation. The existing apply replay contract remains unchanged, including historical apply replay after Trip removal.

## Outbox local state machine

Policy defaults for this local implementation are a 60-second lease, 5-second retry delay, and at most 3 evaluation attempts. They are implementation policy, not a permanent production scheduling decision.

```text
pending / due retryable_failure / expired processing
  → SELECT ... FOR UPDATE SKIP LOCKED
  → processing + random lease token + DB-clock expiry + bounded attempts
  → current-state read-only recompute
  → token-and-unexpired-lease checked under row lock
  → one runtime result + processed, atomically

resolver/read failure → retryable_failure (while attempts < 3)
                    → terminal_failure (otherwise)
missing current target → terminal_failure
abandoned final attempt → terminal_failure / RETRY_EXHAUSTED
```

Claims commit separately so work can be recovered after a crash. A worker does not hold the queue row lock during evaluation. Completion locks/rechecks the current token and DB-clock lease before publishing; replaced or expired workers return lease_lost and publish nothing. Concurrent completion of the same token still produces at most one result. A result's primary key is the original event receipt. Terminal events are not claimed again. Infrastructure failure before final commit leaves a recoverable lease, not a false processed state.

Recompute reads a consistent current authoritative snapshot in a REPEATABLE READ transaction through the existing 8.5 projection under authenticated RLS. It evaluates the target Plan with an empty-operation, internal read-only validation request; it never invokes apply. Its observed version records the read point, so a later concurrent edit is distinguishable rather than silently represented as the evaluated version.

The 4.21 context fingerprint covers canonical before/after state, trusted context and rule/model versions. The stored recompute fingerprint additionally covers the minimal outcome/summary. Event IDs and attempt counters do not enter deterministic assessment input, so two events processed against identical current state/context produce equal fingerprints. Invalid input remains fail-closed; a fallback digest binds the rejected state/context without retaining their payload.

## Route facts and production boundaries

The resolver may provide normalized existing RouteResponse facts. The 4.21 context parser calls the existing 7.5 validator; the rule engine then checks references, freshness, confidence, endpoints, time/duration and mode. Missing, stale or invalid required facts produce blocked/unsupported findings. No cache refresh, synthesized fallback fact or live/paid Provider call occurs.

WBS 7.3 remains production Provider unconfirmed (development provisional 駅すぱあと); WBS 7.8 remains a development/evaluation subset with Production Gate open. Recompute does not update these states or auto-apply findings.

## Additive persistence and account deletion

Only `20260917100000_engine_runtime_compensation.sql` extends schema:

| Object                        | Purpose                                                                                       |
| ----------------------------- | --------------------------------------------------------------------------------------------- |
| engine_apply_outbox additions | State, attempts, lease token/expiry, next availability, safe failure code and completion time |
| engine_apply_preimages        | Accepted audit FK plus bounded minimal versioned preimage                                     |
| engine_apply_compensations    | Unique original preimage → unique accepted compensation receipt                               |
| engine_rollback_receipts      | Typed actor/key/hash/identity/outcome/version/receipt correlation and safe codes              |
| engine_runtime_results        | One event FK, typed observed revisions/outcome/hash/bounded codes                             |

All metadata tables are server-only with RLS enabled and no browser policies. PUBLIC/anon/authenticated privileges are revoked. The trusted service role has SELECT/INSERT for new append-only records and UPDATE only for existing outbox delivery state. The shape predicate is server-only. The privileged DB connection never substitutes for Trip authorization: Trip reads/writes use transaction-local authenticated RLS.

No preimage FK points to replaceable Trip child rows. Auth user deletion cascades existing receipts → audits/outbox/history/results and both compensation relations/rollback receipts; another user's records remain intact. Runtime and rollback add four tables, yielding nineteen combined application tables. Existing TASK-054 exact Personal Center inventory remains unchanged; the combined catalog assertion adds these tables, the exact public function list adds only the shape predicate, and generated-type comparison now explicitly handles text arrays.

See [TASK-064 QA](../qa/TASK-064/README.md) and [Result](../tasks/RESULT-TASK-064-b-wbs-4-23-engine-runtime-recompute-rollback.md). WBS 4.24 certification, broader operations, confirmation issuance, Booking/Payment reversal, production workers and UI remain outside this task.
