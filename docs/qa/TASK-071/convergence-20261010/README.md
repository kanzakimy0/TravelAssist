# TASK-071-A convergence QA — 2026-10-10

**BLOCKED_TECHNICAL_AND_HOLD_OWNER**. A remains Canonical Owner, B execution support. Original Draft PR #231 is retained. Phase 0 was reused.

Source candidate **1bef6c8b634a24eacfa554a6612526679919d95c** remains local in I:/Codex/TravelAssist-task071-20261010; develop **cfd51e42f96e43f84f406c6aab5aab6e408b713e**. Normal merge b1be62f8f incorporates remote docs head 90b59b57 without rewriting either history. Candidate worktree is clean. These local results do not certify the remote documentation branch or a PR merge-result.

## Rebuild diagnosis and remediation

[Same-system baseline and CPU evidence](rebuild-diagnosis.json) compares clean accepted develop and retained candidate. Graph, validation and rebuild-test bytes match develop. Plain npm test performs extraction plus two graph builds and full resume within a 30-minute total budget; accepted Linux reference receipts spend 18–27 minutes on each graph stage. Its existing proof-backed ordinary suite completes in 4–6 minutes. Reference runs are diagnostic only, never candidate PASS evidence.

Quality now selects the original security branch for its accepted specialized pipeline while preserving push triggers. Security reuses the exact parsed accepted graph/extraction/resume/proof jobs, runs full npm test with same-run exact-head proofs and published-byte comparison, and adds an always-evaluated mandatory dependency gate. Existing scan/build gates remain. [Workflow audit](workflow-audit.json) rejects 15 failure/skip/cancellation cases; the [exact unpublished workflow patch](workflow-remediation.patch) makes this local repair reviewable without publishing the unresolved merged source candidate. This convergence change preserves the accepted canonical 30-minute ordinary and 40-minute graph budgets. No algorithm, scanner, assertion or frozen output changed.

Current rebuild lane: **FAIL**. Ordinary canonical: **FAIL**, 155/155 direct file summaries; observed final counts: 3935/3939 passed, 4 failed, 0 skipped, 0 cancelled, 0 todo. [Actual Node observations](node-observed-counts.json) are not a passing count certificate when the canonical receipt fails. Full ordinary and partition results are separate; their counts are never added together.

The final Linux graph-first and graph-second attempts also failed their original 2400000 ms inner timeout and were killed by the unchanged runner. UTC start/end times are preserved separately from the configured timer budget. No complete first/second native proof exists; resume was not run. The local rebuild remains technically BLOCKED. Workflow compatibility repair alone has not resolved or certified runtime completion.

These current local canonical results use a separate complete Linux clone at the same exact HEAD, with Node v24.21.0, npm 11.19.0, Python 3.12.3; [environment and clone verification](linux-environment.json). Runtime came from the official Node distribution with SHA-256 verification. Python differs from the accepted CI reference (3.12.14/3.12.15), so this is not represented as an identical hosted environment. The first Linux graph attempt failed because the original generator invokes python while Ubuntu only provided python3. A task-private runtime alias now points python to the same existing interpreter; no system or repository files changed. [Environment repair](linux-environment-repair.json), original execution receipts under linux-initial, and prior canonical attempts are retained. Partial generated output directories were preserved separately before the clean graph retry; no failed proof was reused.

[All Windows attempts](windows-attempt/gate-matrix.json) are retained separately: both unchanged graph jobs reached their original 40-minute budget; ordinary Node completed 3939 tests with five failures (missing rebuild proof, three frozen assertions, one assets nightly timeout). The first assets partition also timed out while graph work was concurrent. The isolated Windows assets retry and both aggregates are preserved in [attempt selection](resource-isolation-attempts.json). Linux receipts never replace or relabel those failures. No conclusion attributes an operating-system/runtime/filesystem difference to Node version alone.

## Actual local execution receipts

| Gate | Status | Evidence |
| --- | --- | --- |
| ai-bundle | PASS | [receipt](executions/ai-bundle.json) |
| ai-runtime | PASS | [receipt](executions/ai-runtime.json) |
| assets | PASS | [receipt](executions/assets.json) |
| boundary | PASS | [receipt](executions/boundary.json) |
| bundle | PASS | [receipt](executions/bundle.json) |
| canary-build | PASS | [receipt](executions/canary-build.json) |
| canonical-aggregate | FAIL | [receipt](executions/canonical-aggregate.json) |
| canonical-node | FAIL | [receipt](executions/canonical-node.json) |
| diff-check | PASS | [receipt](executions/diff-check.json) |
| extraction | PASS | [receipt](executions/extraction.json) |
| graph-first | FAIL | [receipt](executions/graph-first.json) |
| graph-second | FAIL | [receipt](executions/graph-second.json) |
| history | FAIL | [receipt](executions/history.json) |
| inventory | PASS | [receipt](executions/inventory.json) |
| python-fixture | PASS | [receipt](executions/python-fixture.json) |
| quality | PASS | [receipt](executions/quality.json) |
| rebuild | FAIL | [receipt](executions/rebuild.json) |
| regression-0 | FAIL | [receipt](executions/regression-0.json) |
| regression-1 | PASS | [receipt](executions/regression-1.json) |
| regression-2 | FAIL | [receipt](executions/regression-2.json) |
| regression-3 | PASS | [receipt](executions/regression-3.json) |
| security-format | PASS | [receipt](executions/security-format.json) |
| security-tests | PASS | [receipt](executions/security-tests.json) |
| tracked | FAIL | [receipt](executions/tracked.json) |

| Canonical required job | Status | Count status | Evidence |
| --- | --- | --- | --- |
| assets | PASS | VERIFIED | [receipt](canonical/assets.json) |
| extraction | PASS | NOT_APPLICABLE_COMMAND_GATE | [receipt](canonical/extraction.json) |
| graph-first | FAIL | NOT_APPLICABLE_COMMAND_GATE | [receipt](canonical/graph-first.json) |
| graph-second | FAIL | NOT_APPLICABLE_COMMAND_GATE | [receipt](canonical/graph-second.json) |
| ordinary | FAIL | UNVERIFIED | [receipt](canonical/ordinary.json) |
| quality | PASS | NOT_APPLICABLE_COMMAND_GATE | [receipt](canonical/quality.json) |
| rebuild | FAIL | UNVERIFIED | [receipt](canonical/rebuild.json) |
| regression-0 | FAIL | UNVERIFIED | [receipt](canonical/regression-0.json) |
| regression-1 | PASS | VERIFIED | [receipt](canonical/regression-1.json) |
| regression-2 | FAIL | UNVERIFIED | [receipt](canonical/regression-2.json) |
| regression-3 | PASS | VERIFIED | [receipt](canonical/regression-3.json) |
| resume | NOT_RUN | UNVERIFIED | No receipt; prerequisite blocked |

## Owner boundaries and hosted identity

[Owner matrix](OWNER-MATRIX.md) and [machine matrix](gate-matrix.json) retain D1/D2/D3 HOLD_OWNER. Current tracked source and all history groups remain visible findings; no source bytes, credentials, allowlist entries or frozen certifications were changed. D3 now binds package.json and Quality workflow; the [original generator plan](task086-refresh-plan.json) records its unchanged SHA. Three frozen certification assertions remain active, and only real receipts determine failures.

Source exact-head Quality/Security CI: **NOT_RUN**. Current PR merge-result: **UNAVAILABLE**, because the remote docs branch still conflicts with develop. Stale refs and older green CI are not borrowed. The docs-only publication SHA and its actual Security run/attempt are recorded separately in the delivery receipt on #231/#404.

All raw diagnostic/test logs remain outside Git under I:/Codex/task071-convergence and the independent validation clones; machine receipts bind their hashes. Public evidence contains paths, hashes, categories and test counts, never source credential values. Binary/oversized and inaccessible Git objects remain subject to original scanner coverage limits recorded in the scan reports. D1 holds do not mean scanner PASS.

Prior records are preserved: [one-pass QA at 90b59b57](https://github.com/kanzakimy0/TravelAssist/blob/90b59b57d61dfb8e05b432867bff7730422afe39/docs/qa/TASK-071/one-pass-20261010/README.md). WBS 9.1 and 9.11 remain as accepted develop; 9.10 is not complete. No second implementation PR, force push, history rewrite, original-worktree cleanup or automatic merge.
