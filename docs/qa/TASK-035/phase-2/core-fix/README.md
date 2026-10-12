# TASK-035 / R035-01–04 core fix validation

Canonical Owner: A. Implementation / QA: B. Issue #265 / Draft PR #272.

Implementation checkout: `116d4c66f2f0aed61527b89c703d24f93ec4a4b2`.
Task: `19c84116f1865866c61ee84a0858b0c0d557af46`.
Review basis: `13503912bbbc163f6464457cfe820e6d748930d7`.
Latest develop and merge-base at validation: `4888b4d507ee75d4f6b9914eb1a8d5661813f64b`.
The task/review were read from their fixed commits; they were not substituted for the implementation checkout.

## Scope and evidence

- `focused-results.json`: real Windows process receipts, exact checkout/input hashes, selected file hashes, raw log/event hashes, and validated counts. All nine steps completed as expected. Fault-injection exit 1 and npm exit 7 are intentional negative controls.
- `real-top-assert.jsonl`: unchanged REQUIRED rights-binding script, one accepted final file test; zero-registration per-file event preserved.
- `related-regression.jsonl`: 22/22 with TASK-035 governance (18), existing CI revision tests (3), and the real top-level script (1). Nested child TAP is not accumulated.
- `empty-rejection.jsonl` and `original-assert-fault.jsonl`: empty script rejected despite Node exit 0; an isolated copy of the original script with an appended failing assert exits 1 and is rejected. Original business source hash is unchanged. Synthetic results are not business-baseline evidence.
- `execution-model.json`: reviewed path/hash exception for the unchanged rights script and a hash-bound update of the TASK-035 governance file. `test-inventory.json` is the current supplemental snapshot. Original Phase 2 policy/inventory/receipts remain untouched.
- `remote-before-push.json`: read-only current API observation of the prior branch/PR runs, issue state, and Draft PR state. `pull_request_target` automation success is not a test-baseline pass.
- `logs/*.gz`: gzip archives retain exact process output bytes, including Windows newlines. `evidence-files.json` records archive and uncompressed SHA-256. The receipt `logSha256` binds the decompressed original log, not a newline-normalized copy.

## Fresh-checkout proof and supported model

The implementation used its own clean worktree. Validation used a second newly created detached worktree at the exact implementation SHA, followed by a fresh lockfile install (`npm ci`, 396 packages). Before any tests, `.artifacts` did not exist. These commands then ran in order:

```text
npm run test:baseline:inventory -- --check
node --import ./tests/register-route-ts.mjs --test tests/task-035-test-baseline.test.mjs tests/task-035-runner.test.mjs
```

Both passed; `.artifacts` was still absent afterward. The governance mirror additionally tests an existing sentinel and a target that throws if imported. Actual first focused execution at the committed SHA passed 18/18, with no skips, todo or cancellations.

A development attempt before commit had 17/18: the new fault-injection test expected a summary failure, but Node exits before emitting that file summary. The validator correctly rejected the incomplete file set. Only the new test's expected rejection category was expanded; original business assertions were not edited. The development log is retained as `logs/development-first-focused.log.gz` and is not claimed as PASS.

Node v24 registered file summaries exclude suite containers from `tests`; nested registered tests count once. A hash-reviewed assertion script with a `node:test` teardown hook emits a zero-registration file summary and contributes one successful file test only to the final summary. Unknown zero-registration/empty files never receive that exception. Every required counter is a nonnegative safe integer; totals, success, final/file model, and receipt/event equality are checked.

Focused negative cases cover missing/negative/fractional/string/null/unsafe-integer counts, passed greater than tests, failed/cancelled with success, false success, final 999, suite drift, receipt mismatch, and the previous complete twelve-lane forged aggregate. Existing wrong SHA/attempt/hash, missing/duplicate receipts, nonzero/signal/timeout/spawn error and skip/empty rejection cases remain present.

Windows was actually tested: Node v24.18.0, npm 11.16.0, win32 x64. npm CLI is invoked with Node and separate argv; the logical command, actual spawn argv and CLI hash are in each receipt. Real npm scripts run in a cwd containing spaces, preserve arguments with spaces/`&`, and propagate exit 7 and timeout. The shim additionally proves literal `%PATH%`, `$()`, quotes, pipe, caret and trailing slash. POSIX direct-command resolution is unit-tested here; no Linux/macOS execution is claimed for this fix.

## Replaying the focused evidence

Use a separate clean checkout of the implementation SHA with locked dependencies and no `.artifacts`. Put output outside the checkout. The saved driver is text so it is not a new repository test entry. For PowerShell:

```powershell
Get-Content -Raw docs/qa/TASK-035/phase-2/core-fix/validate-core-fix.mjs.txt |
  node --input-type=module - 'ABSOLUTE_CHECKOUT' 'NEW_EXTERNAL_OUTPUT'
```

The driver runs the commands above, the reporter validations, disposable fault cases, and real npm probes. For each archived log, decompress the `.gz` and SHA-256 the resulting bytes; compare with `evidence-files.json` and `focused-results.json`.

## Integration boundary

R035-05 remains BLOCKED and outside this task. Prior exact-head run [37467190704](https://github.com/kanzakimy0/TravelAssist/actions/runs/37467190704) tested branch `a77ec0ae24a555aba09ed6c6fc6520d2a5e2442c`; PR run [37467203410](https://github.com/kanzakimy0/TravelAssist/actions/runs/37467203410) actually tested merge checkout `f15d9bfa8062605c6f13829ef70f2981d955da2b`. Both attempt 1 runs ended cancelled with three mandatory certification assertions failed (3895/3898 passed). The API's PR `head_sha` is the branch head, not proof that the branch SHA was checked out. Original review evidence fixes the merge checkout identity.

No full repository regression, graph rebuild/resume/proof chain, DB/Auth/browser/live Provider or POI production was executed for this fix. No CI was manually dispatched/cancelled. Package/lockfile/workflows, TASK-085/086 data, business rules, original business tests and frozen evidence were not changed. This delivery means only R035-01–04 fixed / awaiting re-review; WBS 9.1 remains blocked and PR #272 remains unsuitable for merge pending R035-05 and full required integration evidence.

## Quality gate at the implementation SHA

`node tools/qa/task-035-baseline.mjs --job quality` completed PASS with `EXPECTED_HEAD=116d4c66f2f0aed61527b89c703d24f93ec4a4b2` and `TASK035_MODE=CORE_FIX`. All seven commands completed with exit 0 and no timeout/signal/spawn error: deploy local environment validation, lint (0 errors / 69 warnings), typecheck, deploy format check, deploy local build, artifact verification (1908 files), and `git diff --check`.

`quality-receipt.json` records the clean exact checkout, commands, logical/spawned argv, npm CLI hash, input hashes, and combined execution-log hash. Decompress `logs/quality-execution.log.gz` to recover that exact log. Individual `logs/quality-step-*.log.gz` retain each command's output. `validation-summary.json` consolidates the four FIXED results and keeps the whole WBS / R035-05 integration state BLOCKED. The verification worktree remained clean after all checks.

This local quality receipt is bound to the implementation SHA above. A subsequent document-only delivery commit does not receive an invented full-baseline or hosted-CI PASS.
