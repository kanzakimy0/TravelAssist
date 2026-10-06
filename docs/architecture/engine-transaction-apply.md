# Engine transactional apply — TASK-063-B / WBS 4.22

## Boundary and reuse

The server-only entry point is `createEngineApplyService(auth, resolveContext, database?)` in `src/server/engine/apply.ts`. Its `apply(changeSet)` and `reconcile(changeSet)` consume the existing ChangeSetV0_1 and return EngineResultV0_1 with requestKind=apply. There is no caller snapshot, access object, role, confirmation flag or grant argument. No HTTP route, Planner UI, live Provider lookup, rollback executor or event consumer is added.

Only user-source UPDATE_TIME and REORDER_ITEMS can persist. Every other recognized operation and ai/system/provider_event source remains unsupported. The accepted 4.21 validate/preview module remains pure and unchanged; apply calls its existing preview pipeline, including validation, against locked authoritative state.

The request-scoped Supabase client is verified using requireAuthUser/getUser. source.actorRef must equal that authenticated user's UUID. The supplied resolver is trusted server code, not request JSON. It receives detached copies of the authoritative snapshot and ChangeSet, supplies reviewed versioned policy/profile/fact/time inputs, and cannot modify the candidate by mutating those copies. The service replaces access with the actual actor and locked target. No permissive default context or production POI/Profile adapter is fabricated. Existing missing/stale/unsupported context rules still fail closed. Production adapter wiring remains a separate prerequisite for a future consumer.

## One transaction

1. Verify server Auth and strictly parse/detach ChangeSet; calculate the existing bounded canonical SHA-256 digest.
2. Begin READ COMMITTED. Acquire a transaction advisory lock on the canonical actor/apply/key identity.
3. Read the actor's terminal receipt. Matching hash replays it; a different hash returns IDEMPOTENCY_KEY_REUSED before any business write.
4. Set transaction-local JWT claims and `SET LOCAL ROLE authenticated`. Lock the target Trip, then its Plans in ID order. RLS ownership is the authorization boundary; missing and foreign targets share PERMISSION_DENIED with no observed version or assessment.
5. Reconstruct TripPlanSnapshotV1 through the existing 8.5 projection. Check target Plan and both base revisions before resolving context.
6. Run the existing 4.21 preview against that DB tree and trusted context. Nonempty confirmationRequirements always yields needsConfirmation. No blocked, unsupported or unresolved-confirmation candidate is written.
7. Persist the exact accepted preview.after through `replaceTripTree`, extracted from the existing Trip repository. The Engine mode writes only the existing target Plan; the regular repository retains whole-tree replace behavior. Root CAS, normalized rows, RLS and SQL revision/ancestor triggers are unchanged.
8. Read actual persisted Trip and target Plan revisions. Do not calculate a separate Engine revision.
9. Restore the original server connection role solely for Engine metadata inserts. Insert the terminal receipt, one accepted audit and one pending outbox in this same transaction.
10. COMMIT. An accepted response is returned only after rereading its committed terminal receipt.

The key lock is acquired before business locks. READ COMMITTED makes a waiter see the predecessor's committed receipt/current revisions after acquiring locks, unlike a pre-lock repeatable-read snapshot. The Trip root lock serializes Engine writers and the existing repository. Low-level child writes also touch the root through the existing ancestor trigger; competing lock orders may abort with a deadlock, which is a known rollback, never a partial acceptance. A 64-bit advisory-hash collision can serialize unrelated keys but cannot authorize or misidentify a receipt: the exact actor/key unique constraint and hash comparison remain authoritative.

The extracted transaction primitives are internal server code and require the caller to establish verified Auth/RLS. No new public privileged SQL function or alternate Trip model/writer is introduced. Transaction-local claims/role do not escape into the pooled connection.

## Receipt scope and replay

Persistent reservation is deliberately stricter than a target-local key: **authenticated actor UUID + apply + idempotencyKey** is unique across that actor's Trips and Plans. The receipt binds tripId, planId, changeSetId and the canonical payload hash; target and source are also included in that hash. Thus the full actor/target/plan/request-kind identity remains bound, while reusing a key on a different target conflicts instead of authorizing a second mutation. Other actors have independent key spaces.

Object key order and transport whitespace do not affect the digest; array order and every semantic ChangeSet field do. Changing changeSetId, reason, target or operation data under the same key is a different payload. The existing 4.21 digest/parser is reused without a new wire protocol.

Matching replay returns the stored original result with duplicate=true and originalChangeSetId set to the stored changeSetId. It does not resolve context, reapply against a newer revision or duplicate audit/outbox. New keys still face the two-revision gate.

Authorized stale, blocked, unsupported and needsConfirmation decisions are also terminal receipts, with transaction.not_started, null resultingVersion and no accepted audit/outbox. This denotes zero Trip transaction mutation even though the decision itself is durably recorded. Parse/Auth/ownership failures are not retained. Transaction failures roll back their receipts; the same original key can then be retried safely. No records are silently expired or pruned.

## Minimal schema and permissions

Only new migration `20260917090000_create_engine_apply.sql` extends public schema. Merged migrations stay byte-identical. Drizzle mirrors and real Local-generated Supabase types include all fifteen tables: eight Personal Center, four Trip and three Engine metadata tables.

| Table                 | Retained fields and constraints                                                                                                                                             |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| engine_apply_receipts | UUID, Auth owner FK/cascade, actor-global key uniqueness, historical Trip/Plan IDs, change ID, payload hash, terminal outcome/result, created_at; result consistency checks |
| engine_apply_audits   | Receipt PK + accepted-outcome composite FK/cascade, before/resulting revisions, preview/context hashes, operation codes/IDs, created_at                                     |
| engine_apply_outbox   | Accepted-audit PK/FK/cascade, fixed event type, pending status, created_at                                                                                                  |

These are append-only decision records, so there is no mutable updated_at field. Receipt result preserves the public assessment/issues/confirmation references needed to replay the original decision, but preview is always null. No Trip snapshot, raw ChangeSet, full evaluation context, Provider response, credentials, tokens, headers, payment payload or UI state is stored. The audit and outbox join the receipt for actor/target/hash rather than duplicating payloads.

All three tables have RLS enabled and no browser policies. PUBLIC/anon/authenticated privileges are revoked. service_role receives SELECT/INSERT only; updates/deletes and event delivery are not exposed. The existing trusted DATABASE_URL connection may read/write metadata, but every Trip read/write runs under authenticated RLS with the verified actor. No client receives that connection or service credential.

Trip/Plan IDs in receipts are historical references, intentionally not FKs to disposable business rows. This lets original-key reconciliation survive Trip deletion without retaining a snapshot, and avoids introducing dependencies on child rows replaced by the accepted 8.5 writer. Ownership is an actual FK to auth.users; deletion cascades receipt → audit → outbox. The real public account-deletion route is tested to remove these rows along with Trip/Profile while preserving another account. Unique receipt/audit/outbox keys enforce at most one of each; the coordinator's single transaction guarantees all three for an accepted apply.

## Failure and reconciliation

A body failure or known COMMIT constraint/serialization rejection returns TRANSACTION_FAILED, rolled_back, null resultingVersion. Trip, receipt, audit and outbox all roll back, including a fault after Trip/audit writes at outbox insertion and a deferred constraint failure at COMMIT.

An ambiguous COMMIT error triggers a new transaction, locks the original actor/key and reads the receipt. If found, replay the original terminal result. If the DB is unavailable or no terminal record can be established, return TRANSACTION_OUTCOME_UNKNOWN/outcome_unknown with null resultingVersion. The caller must reconcile/retry the **original key and unchanged payload**, never generate a replacement key to bypass ambiguity. `reconcile(changeSet)` verifies fresh Auth/actor, checks the original payload hash and never mutates Trip.

Once COMMIT is acknowledged, even a subsequent read's serialization error cannot be labelled rollback. The service attempts reconciliation and otherwise reports unknown. Local tests deterministically inject lost acknowledgements/read failures around real transactions and prove reconciliation from real committed receipts. They do not claim to reproduce a live network partition.

## OD-8.5-02 scope

The implementation portion is resolved for this narrow owner-only/user-source apply capability: actor-bound scope, existing canonical digest, SQL uniqueness, concurrent reservation, terminal replay, known rollback and unknown-outcome reconciliation are implemented and tested. Retention/cleanup policy remains deferred with no pruning. Confirmation-grant issuance/consumption, outbox delivery, rollback execution, broader operation capabilities and 4.23/4.24 remain deferred.

See [TASK-063 Result](../tasks/RESULT-TASK-063-b-wbs-4-22-engine-transaction-apply.md) and [QA](../qa/TASK-063/README.md). Earlier 4.20/4.21/8.5 documents describe their execution-time boundaries; this additive implementation note does not change the frozen Engine types or past ownership.
