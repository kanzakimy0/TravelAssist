# Engine v0.1 certification — TASK-065-B

Status: current-subset Local certification passed; final-head gate receipt is maintained in [TASK-065 QA](../qa/TASK-065/README.md). WBS 4.24 remains subject to user acceptance.

## Certified scope and evidence boundary

This certification exercises the merged 4.21 validate/preview, 4.22 apply/reconcile and 4.23 local recompute/compensating rollback implementation. The executable subset is exclusively source.kind=user with UPDATE_TIME and REORDER_ITEMS. A reorder rollback fixture combines supported schedule changes with reorder so that both before and after are valid chronological plans.

The implementation continues to use the existing 8.5 Trip repository, owner RLS, root/plan locks and revision triggers. A caller snapshot is never authoritative apply state. Trusted current context is resolved after the DB read/lock; current owner, actor, revisions, locks, booking/protection and 4.21 validation are rechecked. Confirmation requirements prevent accepted writes; this certification supplies no grant.

Accepted apply commits one terminal receipt, one accepted audit, one outbox and one minimal preimage atomically. Compensation adds its own four records and exactly one original-to-compensation relation. Revision advances; original receipt/audit remain unchanged. A historic result replay returns the revision recorded by that original commit, even when later writes have advanced the current revision. Fresh successful responses are compared with authoritative DB readback; historic replay is compared with the original audit.

Local runtime claims are leased, fenced, bounded to three attempts and consumed by eight concurrent loops. Recompute reads current authoritative state, calls existing 4.21 rules, persists at most one minimal result per event and never writes Trip state. Tests distinguish processed rule findings from retryable resolver failures and terminal exhaustion. Production delivery is outside this evidence.

See [seeded evidence](../qa/TASK-065/seeded-evidence.json), [Local evidence](../qa/TASK-065/runtime-evidence.json) and [gate ledger](../qa/TASK-065/acceptance-evidence.json). Counts across focused, wrapper and full repository suites overlap and must not be added.

## Reproducibility and fault model

Generator v1 uses xorshift32, fixed seed 0x065b2026 (106635302), 40 families × 128 addressed cases = 5,120 unique canonical inputs. An ordinal derives its own PRNG state so a failure can be reproduced without executing previous cases. The evidence includes family/outcome distributions, issue counts, failure addresses and a deterministic transcript SHA-256.

Run the pure suite with Node 24 and the repository loader:

```sh
node --import ./tests/register-route-ts.mjs --test tests/task-065-engine-certification.test.mjs
```

For one case, set TASK065_CASE to its integer index (0–5119), then run that command. A one-case run is not full certification. TASK065_SMOKE=1 similarly reduces Local rounds and explicitly labels its evidence SMOKE_PASS_NOT_CERTIFICATION.

The full Local suite uses a dedicated empty Local Supabase project, real Auth users and a 24-connection PostgreSQL pool:

```sh
node --conditions=react-server --import ./tests/register-route-ts.mjs --test tests/task-065-engine-certification.runtime.mjs
```

There are 120 apply rounds across six families, with 16 competing requests in same-key, conflicting-payload and stale-base families. Lock barriers and PostgreSQL wait observations establish actual overlapping transactions. Independent Trip resolvers must both enter before either is released, proving there is no actor-wide transaction lock.

There are 100 rollback/race rounds across five families; each family covers both supported operation shapes. The matrix includes duplicate and competing keys, rollback-first and apply-first schedules against the same target, and concurrent rollback attempts after drift. The original result remains replayable; a consumed original or a compensation receipt cannot toggle state back.

PostgreSQL statement and deferred constraint triggers inject faults at Trip write, after Trip write/before terminal receipt, receipt, audit, preimage, outbox and commit. Compensation additionally exercises relation and rollback receipt failures. Trigger SQLSTATE 40001 is a deterministic rejection test, not a claim of naturally occurring SSI conflicts. The fault trigger is removed in finally and the original key/payload retried only after proven rollback.

Transport/read wrappers allow real COMMIT to occur before dropping its acknowledgement or failing its subsequent read. They establish the distinction between known rollback and unknown outcome. Unknown recovery exclusively calls reconcile/replay with the original key and exact payload. This is controlled fault injection, not a simulation of a live network partition or a production availability guarantee.

Global fetch in the Local certification process rejects non-loopback destinations. Route fixtures pass only through the existing 7.5 RouteResponse contract. Missing, stale and invalid required facts fail closed. No live/paid Provider is queried.

## Frozen §25 decision classification

“Certified” below means evidence for the current subset only. It does not close the remaining production/product decision or change its owner. WBS 8.5 canonical ownership follows [the accepted correction](../project/WBS-8.5-owner-correction.md).

| Decision         | Classification               | Current evidence and remaining boundary                                                                                                                                    |
| ---------------- | ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| OD-4.16-01       | DEFERRED_FAIL_CLOSED         | Unknown/unsupported operation codes and input extensions rejected; no patch, transport, skip/restore or new canonical fields.                                              |
| OD-4.16-02       | DEFERRED_FAIL_CLOSED         | MOVE/REPLACE/alternative promotion not enabled; only existing stable IDs are used.                                                                                         |
| OD-8.5-01        | CERTIFIED_FOR_CURRENT_SUBSET | Current DB revisions, same-root multi-plan races, CAS and forward compensation verified.                                                                                   |
| OD-8.5-02        | CERTIFIED_FOR_CURRENT_SUBSET | Actor/key/hash identity, 16-way replay/conflict, unique commit and original-key unknown reconciliation verified; retention/pruning remains deferred.                       |
| OD-8.5-03        | CERTIFIED_FOR_CURRENT_SUBSET | Atomic accepted graph, actual transaction faults, safe errors and server-only metadata verified.                                                                           |
| OD-8.5-04        | CERTIFIED_FOR_CURRENT_SUBSET | Minimal net preimage, one compensation, immutable originals and account cascade verified; historic missing preimage unsupported; retention-window policy remains deferred. |
| OD-7.5-01        | DEFERRED_FAIL_CLOSED         | Existing normalized RouteResponse is exercised; production binding/TTL/confidence/entitlement/fallback policy remains with Provider owners.                                |
| OD-7.5-02        | DEFERRED_FAIL_CLOSED         | Explicit trusted evaluation policy and required missing/stale fact rejection verified; no production/offline downgrade policy invented.                                    |
| OD-PRODUCT-01    | DEFERRED_FAIL_CLOSED         | No budget/FX/payment operation or invented unknown price.                                                                                                                  |
| OD-PRODUCT-02    | DEFERRED_FAIL_CLOSED         | Current protected/booking/lock checks remain blocking, unsupported or confirmation-required; no booking modification.                                                      |
| OD-PRODUCT-03    | DEFERRED_FAIL_CLOSED         | Real Auth/owner/RLS checked; no client role or grant JSON, collaborative role override, grant issuance, TTL or consumption.                                                |
| OD-PRODUCT-04    | DEFERRED_FAIL_CLOSED         | ai/system/provider_event apply and Autopilot remain unsupported.                                                                                                           |
| OD-BOOKING-01    | DEFERRED_FAIL_CLOSED         | No external cancellation, refund, rebooking or payment side effects.                                                                                                       |
| OD-SAVE-01       | DEFERRED_FAIL_CLOSED         | Existing Trip Library/Personal Center/Save coexistence regression only; no Planner Save/History/Resume integration.                                                        |
| OD-CONTRACT-01   | CERTIFIED_FOR_CURRENT_SUBSET | Frozen shapes, parser limits, unknown codes, canonical hash and stable typed results exercised; no public HTTP release or Consumer rollout.                                |
| OD-ERROR-01      | CERTIFIED_FOR_CURRENT_SUBSET | Foreign/absent/anon/actor mismatch and injected raw errors are safely mapped; public localization/correlation exposure still requires review.                              |
| OD-DURATION-01   | DEFERRED_FAIL_CLOSED         | Existing planned schedules only; no UPDATE_DURATION or observed/segmented duration schema.                                                                                 |
| OD-ASSESSMENT-01 | CERTIFIED_FOR_CURRENT_SUBSET | Deterministic current assessment, issue/coverage linkage and context/preview fingerprints verified; production negotiation/output caps/grant binding deferred.             |
| OD-RULE-01       | DEFERRED_FAIL_CLOSED         | Existing versioned evaluation input and fail-closed missing/stale profile behavior exercised; no production POI/profile policy calibration.                                |
| OD-LOAD-01       | DEFERRED_FAIL_CLOSED         | Existing evaluation-only duration/context model preserved; no claim of production fatigue accuracy.                                                                        |
| OD-COVERAGE-01   | CERTIFIED_FOR_CURRENT_SUBSET | Existing item/day/itinerary coverage and fail-closed required fact gaps tested; new-operation and production dependency policies remain deferred.                          |

Any future proposal changing frozen public semantics is REQUIRES_AMENDMENT and must be handled outside TASK-065.

## Defects and compatibility

No Engine correctness defect has been established by this certification. Runtime, contracts, schema, generated types and historical migrations have not been modified for activity. Harness calibration failures are recorded separately in QA: required booking evidence in a synthetic fixture, the established invalid-context error code, and PostgreSQL Result-array prototype comparison. These are not runtime defect fixes.

The final evidence inventory records hashes for all historical migrations and verifies generated types against develop. Tests reuse canonical Trip/Route and accepted TASK-063/064 fixtures rather than defining a second Trip schema.

## Deferred capabilities and residual risks

- This evidence is for the explicit server-only user/two-operation subset, not all Engine v0.1 operations.
- Production Route/POI facts, policy calibration and Provider entitlement remain deferred. WBS 7.3 and 7.8 statuses are unchanged.
- Confirmation grant, Booking/Payment, AI/system/provider_event apply, 4.18/4.19 UI/HTTP wiring and Consumer rollout are absent.
- No daemon, cron, broker, production worker or Production/Staging DB mutation is introduced.
- Bounded synthetic soak is not an unbounded availability, throughput or latency SLA. Real deployment fault domains, connection limits and capacity need a separately owned production exercise.
- Historical records lacking minimal preimage remain unsupported. Current locks/booking/protection or target drift can prevent compensation; it never implies reversal of an external reservation/payment.
- Exact final-head Quality Gate and immutable delivery binding are supplied in the Draft PR delivery receipt; a commit cannot contain its own cryptographic SHA. The checked-in ledger identifies the source digest and external final-head proof location.
