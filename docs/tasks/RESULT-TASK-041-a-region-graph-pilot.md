# TASK-041-A Result — Travel Region Graph Pilot / Reference Dataset

## Status

Completed / Region Graph pilot ready for review. The implementation and
deterministic local validation are complete; WBS 4.48 remains `待审查` until
review, merge and user acceptance.

## Base SHA

`fede48bb2a4916bcc6070be325ec5b450fa6fbd1`

## Issue

[#305](https://github.com/kanzakimy0/TravelAssist/issues/305) — Open.

## Branch

`codex/a-region-graph-pilot`

## Commits

- `01132c98e30c4a9d86965bb269f9db370cc9efd4` — pilot dataset,
  deterministic generator, validation, tests, Result and initial WBS update.
- Final tracking commit is recorded in Draft PR #306 history.

## Draft PR

[#306](https://github.com/kanzakimy0/TravelAssist/pull/306), Open / Draft,
`codex/a-region-graph-pilot` → `develop`.

## Files changed

- `package.json`
- `tools/qa/region-graph-pilot.mjs`
- `tests/task-041-region-graph-pilot.test.mjs`
- `docs/qa/TASK-041/region-nodes.json`
- `docs/qa/TASK-041/region-relations.json`
- `docs/qa/TASK-041/travel-edges.json`
- `docs/qa/TASK-041/graph-validation.json`
- `docs/qa/TASK-041/corridor-reachability.json`
- `docs/qa/TASK-041/evidence-index.json`
- `docs/qa/TASK-041/pilot-report.md`
- `docs/tasks/RESULT-TASK-041-a-region-graph-pilot.md`
- `docs/project/WBS-TravelAssist.md`

## Data source summary

The pilot reuses repository-pinned Japan destination identity evidence and
official JNTO destination material. TASK-041 editorial priors are explicitly
identified as graph-search assumptions. No Reviewer answer, Human Gold,
candidate-0457 result, POI calibration parameter, Provider API or LLM factual
output was read or used.

## Node counts by type

| Region type   |  Count |
| ------------- | -----: |
| country       |      1 |
| macro_area    |      3 |
| prefecture    |     10 |
| municipality  |      2 |
| travel_region |     12 |
| district      |      8 |
| stay_cluster  |      4 |
| onsen_resort  |      1 |
| gateway       |      9 |
| **Total**     | **50** |

## Relation counts by type

| Relation   |  Count |
| ---------- | -----: |
| contains   |     40 |
| gateway_of |      9 |
| adjacent   |      2 |
| overlaps   |      2 |
| **Total**  | **53** |

`part_of` is not persisted; it remains a derived reverse view of `contains`.

## TravelEdge / Variant counts

- Directional TravelEdges: 58.
- TravelEdgeVariants: 90.
- The graph is sparse; it is not an all-to-all matrix.

## Mode coverage

| Mode  | Variants |
| ----- | -------: |
| rail  |       38 |
| bus   |       22 |
| mixed |       16 |
| car   |        8 |
| walk  |        6 |

Flight and ferry remain contract-supported modes but are intentionally omitted
from this dataset because the available evidence did not justify a specific
pilot prior.

## Four-corridor coverage

- Tokyo: covered.
- Hakone / Fuji: covered.
- Nagano / Matsumoto / Takayama / Kanazawa: covered, with Kamikochi and
  Shirakawa-go supporting nodes.
- Kyoto / Nara / Osaka / Kobe: covered.

## Gateway / Stay Cluster / Onsen coverage

- 9 gateway abstractions.
- 4 stay clusters.
- 1 explicit onsen resort: Hakone.
- Gateway transport-node references remain external identities; the pilot does
  not duplicate a Transport Master.

## Evidence coverage / unknown gaps

- Nodes: 50/50 source references resolved.
- Relations: 53/53 source references resolved.
- Edges: 58/58 source references resolved.
- Precise tourism polygons are not claimed.
- Most duration/cost/transfer/walking ranges are intentionally `null`.
- Frequency, reservation, live fare and availability are unknown.
- Evidence coverage is record-level traceability, not production validation of
  every editorial prior value.

## Structural validation

- Canonical `parseTravelRegionGraphV1`: PASS.
- Duplicate node IDs / Master Codes / relation IDs / edge IDs: 0.
- Dangling Region/Gateway references: 0.
- Self relations / TravelEdges: 0.
- `contains` cycles: 0.
- Symmetric reverse duplicates: 0.
- Invalid ranges: 0.
- Planning-prior exact timetable violations: 0.

## Reachability results

Provider-free graph traversal passed:

- Tokyo → Hakone.
- Tokyo → Matsumoto → Takayama → Kanazawa.
- Kyoto → Nara → Osaka → Kobe.
- Tokyo → Kyoto.
- Tokyo → Osaka.

These are graph reachability checks, not real-time route validation.

## Semantic negative tests

Fail-closed tests cover dangling reference, `contains` cycle, reverse symmetric
duplicate, duplicate ID, invalid range order, unknown enum and a
planning-prior exact timetable field.

## No-live-route confirmation

Confirmed. No exact departure/arrival minutes, live fare, live availability,
Provider Raw, paid API response or production provider query is committed.

## Master Code unchanged confirmation

Confirmed. No existing Master Code or registry was modified or renumbered.
TASK-041 only assigns stable pilot node codes in its isolated reference data.

## Focused tests

`npm run test:region-graph-pilot`: 15/15 passed. Coverage includes the canonical
parser, structural diagnostics, all corridor anchors, provider-free
reachability, semantic separation, evidence references, deterministic output
and all seven required negative families.

## Planning / Routing / Trip-Route-Engine tests

- `npm run test:planning-contracts`: 21/21 passed.
- `npm run test:planning-soak`: 6/6 passed.
- `npm run test:routing`: 28/28 passed.
- Canonical Trip + Engine feasibility suites: 124/124 passed.

## Full Node regression

`node --import ./tests/register-route-ts.mjs --test tests/*.test.mjs`: 844/844
passed.

## lint/typecheck/build

- `npm ci`: passed; 395 packages installed. Existing npm lifecycle-script
  approval warnings were informational.
- `npm run lint`: passed.
- `npm run typecheck`: passed.
- `npm run build`: passed with Next.js 16.3.4.

## format/diff status

- TASK-041-owned Prettier check: passed.
- `git diff --check`: passed.
- Repository-wide `npm run format:check` reports 45 pre-existing files outside
  TASK-041 ownership. No TASK-041 file appears in that list; unrelated files
  were not mass-formatted.

## WBS update

WBS 4.48 added as A / P0 / depends on 4.47 / `待审查`. WBS 7.9 is left
byte-for-byte unchanged from the execution-time `origin/develop` baseline; the
independent unmerged blind-review branches were not stacked into this Task.

## Recommended next action

Review the sparse dataset, evidence gaps and editorial priors in the Draft PR.
After merge and user acceptance, WBS 4.48 may become `已完成`. Do not start
Candidate Pipeline / TASK-042 from this Task automatically.
