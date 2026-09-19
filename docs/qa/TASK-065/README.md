# TASK-065-B QA

Execution base: `3d6c326ff62d69c8d1a9fb96bd6dca368faa3642`. Branch: `codex/b-wbs-4-24-engine-integration-certification`. Issue: [#387](https://github.com/kanzakimy0/TravelAssist/issues/387). Delivery: [PR #388](https://github.com/kanzakimy0/TravelAssist/pull/388), merged after explicit user acceptance on 2026-09-17. WBS 4.24 = B / 已完成. Issue #387 remains Open.

Overall gate status: Local QA PASS; accepted final-head [Quality Gate 35179449036 PASS](https://github.com/kanzakimy0/TravelAssist/actions/runs/35179449036). Full machine records are in [acceptance-evidence.json](acceptance-evidence.json). No unexecuted gate is recorded as PASS.

## Certification results

| Check                    | Executed result                                                                                                                              |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Fixed seed / generator   | v1, `0x065b2026` / 106635302                                                                                                                 |
| Deterministic cases      | 5,120 unique inputs; 40 families × 128; zero failures                                                                                        |
| Outcomes                 | 384 accepted, 2,944 blocked, 384 needsConfirmation, 1,408 unsupported                                                                        |
| Repeated transcript      | Standalone and full Node transcript SHA-256 identical                                                                                        |
| Apply concurrency        | 120 rounds / 1,080 competing requests; 16-way same key, mixed payload and stale base; 15 observed DB waiters for those families              |
| Rollback/concurrent race | 100 rounds / 560 competing rollback/race requests; 50 time-only and 50 time+reorder shapes                                                   |
| Runtime bulk             | 531 pending events; eight worker loops, each actually processed events; 531 processed, zero retryable/terminal failures in this initial bulk |
| Runtime special cases    | Four expired running leases fenced, recovery on retry, bounded terminal failure, abandoned-lease exhaustion, four Route fact variants        |
| Fault matrix             | 26 cases: 18 real PostgreSQL statement/deferred-constraint failures and eight actual-COMMIT transport/read wrappers                          |
| Accepted graph           | 544 accepted receipts, audits, outboxes, required preimages and terminal runtime results each                                                |
| Non-accepted graph       | 347 terminal apply receipts; zero accepted audit/outbox/preimage linked to them                                                              |
| Compensation graph       | 75 unique original → compensation relations, valid accepted targets                                                                          |
| Aggregate graph          | 891 apply receipts; zero invariant violations                                                                                                |
| Data minimization        | 3,507 persisted rows scanned; zero prohibited content matches                                                                                |
| Metadata isolation       | 42 real anon/authenticated-browser read/insert/update checks returned 42501                                                                  |
| Real account deletion    | HTTP 204; 869 target-owner receipts plus dependent metadata removed; other user preserved                                                    |
| Cleanup                  | Auth, seven Engine metadata tables and temporary fault functions all zero                                                                    |

The runtime bulk SQL GROUP BY assertion supplies its terminal distribution. Special fixture outcomes are recorded separately; the two final account-cascade fixture events belong to the 544-result aggregate and are not added to the 531-event bulk. These totals describe different test scopes and must not be added together.

Accepted original receipts/audits are compared before/after compensation. Successful revisions advance and match authoritative readback. Replaying an old accepted receipt intentionally returns its original committed version, not a later current revision.

Accepted candidate: d4b3f8e7f40225d39522a19a9fafd57f32510432. Normal merge: c368c978d69b7e92d56ecb1a313725c855399b78. Merge tree equals accepted candidate tree. See [acceptance-closeout.json](acceptance-closeout.json); original Local QA and pre-acceptance delivery records remain historical evidence.

## Evidence

- [seeded-evidence.json](seeded-evidence.json): all family/outcome/issue counts, seed and transcript.
- [seeded-replay-comparison.json](seeded-replay-comparison.json): independent invocation equality.
- [runtime-evidence.json](runtime-evidence.json): every apply/rollback round, real lock waits, workers, lease/fact cases, fault cases, DB graph, minimization and cleanup.
- [migration-replays.json](migration-replays.json): two resets/types/catalog and behavioral replays. Its legacy baseline field identifies TASK-054's original manifest, not TASK-065's execution base.
- [source-inventory.json](source-inventory.json): 39 unchanged production/contract/schema/type/migration files, 19-table generated contract and tool versions.
- [personal-center-local.json](personal-center-local.json): existing aggregate regression, including Profile / Preference / Companion / Trip Library / account deletion.
- [acceptance-evidence.json](acceptance-evidence.json): exact commands, exit codes, test totals, log hashes, limitations and final-head proof binding.

Original command logs remain in the execution workspace's ignored `.artifacts/task065` directory (next to the candidate worktree). Test programs emit reproducible JSON under the candidate's `.artifacts/task065`. Published evidence contains no Auth token, service credential or raw Provider payload.

## Reproduction

Use the repository Node 24 environment, Docker desktop Local project and installed dependencies. Local fixtures require an empty dedicated Local DB; existing data must not be erased.

```sh
npm ci
npm run db:start
npm run db:status
npm run db:reset
npm run db:types
node --import ./tests/register-route-ts.mjs --test tests/task-065-engine-certification.test.mjs
node --conditions=react-server --import ./tests/register-route-ts.mjs --test tests/task-065-engine-certification.runtime.mjs
npm run test:personal-center-migration:replay
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

Run the existing 4.21 / TASK-063 / TASK-064 focused pure suites, their explicit Local counterparts, TASK-062 coexistence, Personal Center Local aggregate and full Node suite using the exact commands in the ledger. Build before Local suites that start the existing account API. Personal Center Local additionally requires CODEX_PLAYWRIGHT_PATH pointing at an installed Playwright package and the accepted TASK-047 geometry copied to `.artifacts/task047/baseline-browser/geometry.json`. Do not run reset or multiple DB-mutating suites concurrently.

In PowerShell, a single seed case can be reproduced by setting `$env:TASK065_CASE='1152'` before the pure command; remove that variable for the full 5,120-case run. `TASK065_SMOKE=1` is explicitly a reduced harness check and is never reported as full certification.

Synthetic lease deadlines and retry availability are moved behind the database clock to exercise the actual expiry/recovery SQL predicates without waiting for production-like intervals. Fault DDL is created only in this Local project and removed in finally. No live/paid Provider, daemon, cron, broker or Production/Staging DB is used.

## Calibration and limitations

No Engine runtime correctness defect was found. Production code, public semantics and historical migrations remain unchanged.

Initial harness calibration corrected a confirmed-booking fixture missing required safe refs, the expected invalid-context error code, PostgreSQL Result-array prototype comparison and task-owned formatting. The published fixed-seed suite has zero failures. A read-only post-run observer attempted during the following reset was not an acceptance gate and is not reported PASS; bulk terminal statistics come from the assertion already executed inside the successful Local suite. After the complete run, evidence labels were clarified from “advisory waiters” to “observed lock waiters” to distinguish same-key advisory locks from stale-base Trip root locks; measured values and assertions are unchanged.

The [certification report](../../architecture/engine-v0.1-certification.md) classifies every frozen §25 decision. Production Provider policy, grant issuance/consumption, Booking/Payment, AI/system/provider_event apply, public API/Consumer rollout and worker deployment remain deferred. WBS 7.3/7.8 and 4.18/4.19 are unchanged.

## Final-head binding

The checked-in ledger binds the tested implementation using content hashes. Final candidate SHA, clean-tree assertion and exact `workflow_dispatch` Quality Gate run are added to the Draft PR delivery JSON after the last commit and are repeated in the user-facing Result. A commit cannot contain its own SHA; no prior-head run or PR synthetic merge revision is presented as the final branch-head gate.
