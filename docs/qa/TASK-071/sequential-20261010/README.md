# TASK-071-A sequential graph validation — 2026-10-10

**BLOCKED_TECHNICAL_AND_HOLD_OWNER**. A is Canonical Owner, B execution support. Original PR #231 remains Draft/Open. Source exact HEAD **1bef6c8b634a24eacfa554a6612526679919d95c** is clean and local; actual develop **cfd51e42f96e43f84f406c6aab5aab6e408b713e**. No source, scanner, test, input or timeout changed in this experiment.

## Actual native and canonical receipts

| Lane | Result | Evidence |
| --- | --- | --- |
| graph-first | PASS | [receipt](canonical/graph-first.json) |
| graph-second | PASS | [receipt](canonical/graph-second.json) |
| resume | PASS | [receipt](canonical/resume.json) |
| extraction | PASS | [receipt](canonical/extraction.json) |
| rebuild | PASS | [receipt](canonical/rebuild.json) |
| ordinary | FAIL | [receipt](canonical/ordinary.json) |

Canonical ordinary: **FAIL**; 155/155 direct file summaries; 3936/3939 observed passing, 3 failed, 0 skipped, 0 cancelled, 0 todo. Failed canonical counts remain UNVERIFIED. [Observed Node summary](node-observed-counts.json). Same-HEAD prior security, Quality, inventory and partition checks remain individually recorded in the [previous gate matrix](../convergence-20261010/gate-matrix.json); they are not new runs or a passing combined aggregate.

The first graph PASS belongs to this same sequential experiment. Before continuation, the original lane binding, manifest and every artifact hash were revalidated. Its host load later rose (median 39%, p95 71%, maximum 77%), so it is not described as a continuously idle-host run. After the native first PASS, only the external orchestration process was stopped at a verified phase boundary. The second graph had not started. The user subsequently confirmed a sustained idle window, and continuation ran one stage at a time. First UTC elapsed time differs from monotonic elapsed time: the unchanged native timeout did not fire; only a 2295454.982011 ms sampled monotonic lower bound is available for that stage. No exact first monotonic completion duration is invented. Continuation stages record exact monotonic durations separately from UTC timestamps. These observations test sequential completion but do not prove that concurrency was the sole cause of prior failures.

- graph-second: PASS; monotonic 34.39 min; host CPU median 24%, p95 46%; 1 samples at or above 50%.
- resume: PASS; monotonic 34.71 min; host CPU median 24%, p95 40%; 1 samples at or above 50%.
- extraction: PASS; monotonic 0.36 min; host CPU median 12%, p95 12%; 0 samples at or above 50%.
- rebuild: PASS; monotonic 0.08 min; host CPU median null%, p95 null%; 0 samples at or above 50%.
- ordinary: FAIL; monotonic 7.13 min; host CPU median 26%, p95 31%; 0 samples at or above 50%.

Process samples cover processes whose working directory is inside the independent clone; descendants that change directories may be absent. Per-process values are not summed into a purported complete tree total. Host CPU samples cover the whole host. Brief high samples remain visible; an idle-window confirmation is not a claim that host CPU stayed constant.

The complete independent Linux clone uses Node 24.21.0, npm 11.19.0, Python 3.12.3 and a task-private python alias. All protected input hashes are in [continuation environment](continuation/started.json); digest **d53bd5a3c8913aed583153bd6f1dd483ccc495d9861f22cf9a206c3112378440**. The graph-first/second/resume native budget remains **2400000 ms**. Original canonical run commands and all timeouts are preserved inside each receipt. Rebuild uses TASK086_VERIFIED_LANES_DIR with TASK086_VERIFY_PUBLISHED=1. The original R035-05 derived-refresh generator was not executed. All graph artifact and proof bytes stay in the independent clone; published receipts bind their hashes. Raw logs remain outside Git.

## Reproduction with original commands

Use a fresh full clean checkout at the recorded source HEAD, npm ci, the recorded Linux runtime, an available python command, and an idle host. Execute each command only after its predecessor ends; do not overlap graph jobs. Receipts retain the exact process argv and actual configured budgets. The observed continuation used the same exported run function with additional external resource sampling.

```sh
node tools/qa/task-035-baseline.mjs --job graph-first
node tools/qa/task-035-baseline.mjs --job graph-second
node tools/qa/task-035-baseline.mjs --job resume
node tools/qa/task-035-baseline.mjs --job extraction
export TASK086_VERIFIED_LANES_DIR="$PWD/.artifacts/task086-lanes"
export TASK086_VERIFY_PUBLISHED=1
export TASK086_REBUILD_RECEIPT="$TASK086_VERIFIED_LANES_DIR/deterministic-recovery-proof.json"
node tools/qa/task-035-baseline.mjs --lane rebuild
npm test
```

Existing security commands remain npm run security:scan, npm run security:history, npm run security:boundary, npm run security:build and npm run security:bundle; inventory is npm run test:baseline:inventory. These commands retain original gates and findings, not new acceptance claims. No R035-05 refresh is included without D3 approval.

## Remaining gates and Owner scope

Current tracked scan: two unresolved findings. Full history scan: 47 unresolved occurrences / 14 groups, no scanner errors; unchanged same-HEAD receipts and all path/category/fingerprint dispositions are preserved in [history groups](../convergence-20261010/history-disposition-groups.json). D1 remains HOLD_OWNER; current source bytes and allowlist are unchanged. D2 reviewed inventory is technically PASS (155 direct + 4 indirect; all original assertions preserved), while formal Owner acceptance is pending. D3 remains HOLD_OWNER; the three previously identified frozen certification assertions are not manually repaired or waived. [One current Owner matrix](OWNER-MATRIX.md).

Source exact-head Quality and Security CI: **NOT_RUN**, no hosted run/attempt. Current PR merge-result: **UNAVAILABLE**; stale merge refs and earlier runs do not certify this candidate. Local canonical runId=local/attempt=1 and native null hosted identity are explicit. Any later documentation push and Security run are separate from source acceptance and will be recorded in the original PR/Issue delivery receipt.

[Machine matrix](gate-matrix.json) · [Latest RESULT](../../../tasks/RESULT-TASK-071-a-security-final-closeout.md). Historical concurrent failures remain in [convergence QA](../convergence-20261010/README.md). No force push, history rewrite, second implementation PR, secret disclosure, timeout extension, skipped test, weaker assertion or automatic merge.

Publication integrity: the two exported host-performance JSONL files use Git-normalized LF line endings; their sampled values are unchanged. The current evidence-files.json binds the exact published Git blob bytes. The nested first-segment/checkpoint-evidence-files.json is the historical external checkpoint manifest, which retains the hashes of the original raw files outside Git. Original raw samples remain unchanged.
