# TASK-086-B QA

Status: **IN_PROGRESS_AUTO_REMEDIATION**. This is an ongoing-work checkpoint under [the no-early-exit amendment](../../tasks/AMENDMENT-TASK-086-b-autonomous-source-acquisition-no-early-exit-v2.md), not a terminal Result or acceptance request. Ordinary discovery remains and the global fixpoint is not proven. Work continues on the same branch and [Draft PR #466](https://github.com/kanzakimy0/TravelAssist/pull/466).

| Measure | Preserved checkpoint 1236238c8 | Current phase 42 |
| --- | ---: | ---: |
| Required inventory | 1038 | 1759 |
| ADMIT / HOLD | 327 / 711 | 1520 / 239 |
| Lines / service patterns | 9 / 63 | 84 / 229 |
| Directed edges | 1339 | 4210 |
| Batches | 88 | 372 |
| Adaptive iterations | 10 | 42 |
| Connected T0 | 0 / 89 | 80 / 89 |
| Connected T1 | 0 / 462 | 287 / 462 |
| Connected required nodes | 0 / 1038 | 1193 / 1759 |
| Mandatory corridors | 0 / 9 | 9 / 9 |

Independent component review has converted **472 original HOLD records to ADMIT**. Additional actual service intermediates expand the denominator; no original requirement was dropped or downgraded.

## Reproduce

```sh
python tools/transport/task-086-extract-identities.py --output /tmp/s12-identities.jsonl
node tools/transport/task-086-run.mjs
node tools/transport/task-086-verify.mjs --publish
node --test tests/task-086-b-mobility-backbone.test.mjs tests/task-086-b-autonomous-remediation.test.mjs
node --import ./tests/register-route-ts.mjs --test "tests/*.test.mjs"
npm run lint
npm run typecheck
npm run format:check:deploy
npm run deploy:build:local
npm run deploy:verify-artifact
```

On Windows, select a writable scratch volume for `TEMP` and `TMP`. No network request is made during deterministic rebuild. The immutable archive in `checkpoints/1236238c8.json.gz` preserves the original 196 artifact files, including all 88 batches, receipts and the exact ten-record history prefix. Independent MLIT extraction must reproduce the persisted identity JSONL. Full rebuild twice and checksum-resume are compared; corruption and source invalidation have negative tests.

`task-086-source-actions.mjs acquire <review-request.json>` executes public evidence acquisition, response hashing and rights-state transitions. `reference` records a reviewed public reference with an explicit observation fingerprint instead of claiming raw source bytes. `next` prioritizes Shinkansen, conventional/private/metro, transfers and national modal bridges. `task-086-remediate.mjs --final` intentionally fails until the final gate is legitimate.

[Rebuild receipt](deterministic-rebuild.json) binds generator and input hashes. [Publication validation](publication-validation.json) identifies the validation checkpoint. [Connectivity](connectivity-report.md), [rights](source-license-summary.md), and [adaptive progress](adaptive-model-report.md) describe the current execution scope. No production routing/API/planner integration is authorized by these task-local artifacts.
