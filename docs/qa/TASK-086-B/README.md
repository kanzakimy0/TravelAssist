# TASK-086-B QA

Status: **IN_PROGRESS_AUTO_REMEDIATION**. This is an ongoing-work checkpoint under [the no-early-exit amendment](../../tasks/AMENDMENT-TASK-086-b-autonomous-source-acquisition-no-early-exit-v2.md), not a terminal Result or acceptance request. Ordinary discovery remains and the global fixpoint is not proven. Work continues on the same branch and [Draft PR #466](https://github.com/kanzakimy0/TravelAssist/pull/466).

| Measure                  | Preserved checkpoint 1236238c8 | Current phase 104 |
| ------------------------ | -----------------------------: | ----------------: |
| Required inventory       |                           1038 |              2921 |
| ADMIT / HOLD             |                      327 / 711 |         2848 / 73 |
| Lines / service patterns |                         9 / 63 |         192 / 437 |
| Directed edges           |                           1339 |              7044 |
| Batches                  |                             88 |               708 |
| Adaptive iterations      |                             10 |               104 |
| Connected T0             |                         0 / 89 |           89 / 89 |
| Connected T1             |                        0 / 462 |         444 / 462 |
| Connected required nodes |                       0 / 1038 |       2601 / 2921 |
| Mandatory corridors      |                          0 / 9 |             9 / 9 |

Independent component review has converted **638 original HOLD records to ADMIT**. Additional actual service intermediates expand the denominator; no original requirement was dropped or downgraded.

## Reproduce

```sh
python tools/transport/task-086-extract-identities.py --output /tmp/s12-identities.jsonl
python tools/transport/task-086-extract-airports.py --output /tmp/c28-identities.jsonl
python tools/transport/task-086-extract-highway-stops.py --output /tmp/p36-identities.jsonl
python tools/transport/task-086-extract-bus-stops.py --output /tmp/p11-identities.jsonl
node tools/transport/task-086-run.mjs
node tools/transport/task-086-verify.mjs --publish
node --test tests/task-086-b-mobility-backbone.test.mjs tests/task-086-b-autonomous-remediation.test.mjs tests/task-086-b-selected-gtfs.test.mjs
node --import ./tests/register-route-ts.mjs --test --test-concurrency=2 "tests/*.test.mjs"
npm run lint
npm run typecheck
npm run format:check:deploy
npm run deploy:build:local
npm run deploy:verify-artifact
```

On Windows, select a writable scratch volume for `TEMP` and `TMP`. No network request is made during deterministic rebuild. The immutable archive in `checkpoints/1236238c8.json.gz` preserves the original 196 artifact files, including all 88 batches, receipts and the exact ten-record history prefix. Independent S12, C28, P36 and selected P11 extraction must reproduce the persisted identity JSONL files. The licensed Toei rail GTFS extraction must reproduce the selected phase facts, including calendar checks, repeated calls, and pickup/drop-off restrictions; wrong dates, trip bindings and altered restrictions are rejected. All selected licensed airport GTFS packages, including Kotoden, Kyushu Sanko, Tosaden, Tokushima, Oita, CC0 Geiyo, Miyako Kyoei and Karry Ishigaki, are independently re-extracted from licensed archives and bound to explicit active trips. Stop IDs, operator identities, platform metadata, complete call sequences and directional boarding restrictions are preserved. Official public-passage evidence separately binds exact terminal stops to rail or whole-airport identities; matching names and coordinates cannot create transfers. Reference-only or blocked rights decisions select further lawful-source research rather than extraction. The 2025 Keisei Matsudo merger requires an exact archival station code and a dated, fingerprint-bound current-operator transition; unreviewed aliases, future transitions and changed fingerprints are rejected. Japanese parenthesis-width review is narrowly scoped and does not drop name prefixes or normalize arbitrary characters. The reviewed airfield-name correspondence requires exact official/public/required names plus a corroborating URL and response hash; spoofed names and missing bindings fail. CC0 metadata is preserved separately from CC BY and bound to a successful primary terms response; unknown, relabelled or missing license evidence fails. Corroborating sources must bind to a reviewed action and its exact successful response fingerprint. Fixed-guideway identities retain their distinct mode and node kind. Airport acceptance requires an explicitly reviewed bidirectional surface connection as well as national reachability; flight-only reachability cannot clear that gap. P11 extraction binds the exact selected GML feature, operator, historical route context and point reference to raw archive bytes. P11 coordinates represent same-road/operator stop components, not platforms; current service and public access require separately fingerprint-bound evidence. Historical route order cannot generate service. Exact Shin-Ishigaki identity additionally requires independently bound predecessor-closure evidence rather than a broad new-airport prefix alias. Bus phase purpose must equal the raw selected-trip purpose and stay within the allowed scope. Full rebuild twice and checksum-resume are compared; corruption and source invalidation have negative tests.

`task-086-source-actions.mjs acquire <review-request.json>` executes public evidence acquisition, response hashing and rights-state transitions. `reference` records a reviewed public reference with an explicit observation fingerprint instead of claiming raw source bytes. `next` prioritizes Shinkansen, conventional/private/metro, transfers and national modal bridges. `task-086-remediate.mjs --final` intentionally fails until the final gate is legitimate.

[Rebuild receipt](deterministic-rebuild.json) binds generator and input hashes. [Publication validation](publication-validation.json) identifies the validation checkpoint. [Connectivity](connectivity-report.md), [rights](source-license-summary.md), and [adaptive progress](adaptive-model-report.md) describe the current execution scope. No production routing/API/planner integration is authorized by these task-local artifacts.
