# TASK-038-A Result — 100 POI Scoring Pilot / Calibration

## Status

Completed / calibration candidate eligible for human review. This result is a reproducible offline Pilot and is not a production scoring freeze.

## Base / develop SHA

`fede48bb2a4916bcc6070be325ec5b450fa6fbd1`

The base contains merged TASK-036-A / PR #293 and TASK-037-A / PR #298, with WBS 4.47 and 9.13 completed.

## Issue

[#299](https://github.com/kanzakimy0/TravelAssist/issues/299) remains open pending review.

## Branch

`codex/a-100-poi-scoring-pilot`

## Commits

- `b4dea8855fc128df21b4ab40939b739be96e66a1` — implementation, deterministic evidence, focused tests, Result, and WBS review status.
- Final tracking synchronization commit follows on the same branch.

## Draft PR

[#300](https://github.com/kanzakimy0/TravelAssist/pull/300) targets `develop` and remains Draft / unmerged.

## Sample source and selection rules

- Exactly 100 real Japanese POIs were resolved to unique Wikidata entities and linked English Wikipedia identity pages.
- Wikidata identity data is CC0. No page descriptions, images, live operational claims, Provider payloads, or paid data were copied.
- The repository attraction manifest was audited but not used as identity evidence because its 9,000 entries are explicitly unresolved slots.
- The sample was selected for geographic, experience, burden, popularity, and crowd/queue diversity. Unsupported attributes remain `null`.
- Stable repository references use `wikidata:Q...`; each sample row retains its identity and page evidence references.

## 100-POI distribution

- Regions: 9.
- Prefectures: 37.
- Largest prefecture: 10 POIs.
- Tokyo + Kyoto + Osaka: 24 POIs.
- High walking/physical burden calibration examples: 31.
- Low walking/physical burden calibration examples: 24.
- High iconic examples: 52.
- Hidden/local examples: 42.
- Crowd/queue-prone examples: 29.
- All ten required experience families contain at least five examples.

## Annotation completeness / null coverage

- Identity validity: 100/100.
- Complete 43-key vector shape: 100/100.
- Feature values: only `0..9 | null`.
- Every non-null value has an annotation method and source reference.
- Feature annotations are explicitly marked `pilot_editorial_from_verified_identity_and_archetype`; they are subjective calibration labels, not objective or live facts.
- Unknown values are explicitly `null` and are never converted to 0 or 5.
- Detailed per-feature and per-POI known/null coverage is in `annotation-quality.json`.

## Visit Profile coverage

55 `full_visit` profile shells are included where verified attraction identity supports the mode. They validate against the TASK-036 contract, but all numeric duration/load fields remain `null`: the selected identity evidence does not support those facts. A separate, explicitly synthetic contract-only fixture demonstrates distinct 30/60/90/120-minute loads and is never attached to a real POI. Numeric Visit Profile acquisition remains a human/source-review gap.

## Preference scenarios

12 fixed Effective Preference scenarios cover iconic first visits, hidden/local exploration, photography/scenery, history/architecture, food, shopping/city, nature, art/education, family/interactive, relaxed/rest, low walking/physical tolerance, and low crowd/queue tolerance.

All scenarios explicitly exclude current weather, live route, current fatigue, opening feasibility, booking, inventory, and itinerary feasibility from `matchScore`.

## Benchmark judgment counts

- Total: 288.
- Calibration: 168.
- Untouched holdout: 96.
- Indeterminate/null diagnostics: 24.
- Low walking/physical scenario: 24.
- Low crowd/queue scenario: 24.
- Iconic versus hidden/local scenarios: 48.
- All judgments are machine-authored editorial benchmark candidates, independent of candidate parameter values, and marked `reviewRequired=true`.

## Train/holdout split

- Calibration/train: 80 POIs.
- Untouched holdout: 20 POIs.
- Method: stable SHA-256 of `pilotVersion + Wikidata identity`.
- Holdout coverage: 7 regions and 14 prefectures.
- Candidate selection read calibration judgments only. Holdout was evaluated once after selection and was not used for retuning.

## Parameter search space

A bounded exhaustive grid evaluated 720 candidates:

- gamma: 1, 1.5, 2, 2.5, 3;
- benefit weight: 0.8, 1.0, 1.2;
- suitability weight: 0.8, 1.0;
- cost weight: 0.8, 1.2;
- risk weight: 0.8, 1.2;
- coverage exponent: 0, 0.5, 1;
- confidence strength: 0, 0.25;
- normalization: bounded 0..99.

No unbounded optimizer or holdout feedback loop was used.

## Selected candidate config

`candidate-0457`: gamma 2.5; benefit 0.8; suitability 1.0; cost 0.8; risk 0.8; coverage exponent 0; confidence adjustment strength 0; bounded 0..99 normalization. Coverage and output confidence remain explicit even when the selected score adjustment strength is zero. It is a Pilot candidate only and does not change production defaults.

## Calibration metrics

- High-confidence pairwise agreement: 100%.
- High + medium agreement: 99.3631%.
- Evaluated calibration judgments: 168.
- Tie handling accuracy: 27.2727% (diagnostic weakness, not hidden).

## Holdout metrics

- High-confidence pairwise agreement: 100%.
- High + medium agreement: 98.5507%.
- Evaluated holdout judgments: 96.
- Tie handling accuracy: 44.4444% (diagnostic weakness, not hidden).
- Holdout was evaluated once after candidate selection.

## Invariant results

12/12 hard semantic checks passed:

- benefit monotonicity and neutral-5 behavior;
- low versus high cost/risk tolerance direction;
- no positive reward from high walking/crowd tolerance;
- `null` changes coverage and remains unknown;
- hard reject cannot become selectable;
- score stays in 0..99;
- live/context fields do not enter `matchScore`.

## Top disagreements / failure categories

25 disagreements were retained; the first 20 include both scores, coverage, expected/actual result, likely category, and follow-up. Main categories are tie-threshold boundaries, coarse archetype labels, and subjective benchmark ambiguity. No benchmark row was deleted or relabeled after evaluation.

## Bias checks

- Tokyo/Kyoto/Osaka sample dominance is bounded by the 24/45 cap, but English open-knowledge coverage remains a source bias.
- Iconic and hidden/local scenarios are both represented.
- High walking does not win through a positive burden reward under low tolerance.
- High crowd tolerance reduces penalty only; it does not reward crowd.
- Unknown-heavy rows receive lower measured coverage/confidence.
- Ten experience families are represented, reducing category monoculture.
- Subjective annotation dependence remains material; blinded human adjudication is required.

## Commands/tests exact outcomes

- `npm ci`: passed; 395 packages installed, 0 vulnerabilities.
- `npm run qa:poi-scoring-pilot`: passed; deterministic evidence generated.
- `npm run test:poi-scoring-pilot`: 16/16 passed.
- `npm run test:planning-contracts`: 21/21 passed.
- `npm run test:planning-soak`: 6/6 passed.
- `npm run test:routing`: 28/28 passed.
- Current canonical Trip / Route / Engine compatibility command: 152/152 passed.
- `node --import ./tests/register-route-ts.mjs --test tests/*.test.mjs`: 845/845 passed.
- `npm run lint`: passed.
- `npm run typecheck`: passed.
- `npm run build`: passed; Next.js 16.3.4 compiled and generated all 19 pages.
- TASK-038-owned Prettier check: passed.
- `git diff --check`: passed.

## Known baseline failures

- Node emits the repository's existing `MODULE_TYPELESS_PACKAGE_JSON` performance warning through the TypeScript test loader; tests remain valid.
- Repository-wide `npm run format:check` reports 63 pre-existing unrelated files. A targeted check of every TASK-038-owned file passes, so this Task adds zero formatting failures.

## No-provider/no-LLM confirmation

The scoring run is offline and performs no OpenAI/LLM call, paid Provider call, live route/weather/booking/inventory call, or production database access. The optional evidence-capture helper only resolves public Wikimedia identity metadata and is not invoked by scoring or tests.

## Files changed

- `package.json`
- `tools/qa/task038-source-pois.mjs`
- `tools/qa/capture-task038-poi-evidence.mjs`
- `tools/qa/poi-scoring-pilot.mjs`
- `tests/task-038-poi-scoring-pilot.test.mjs`
- `docs/qa/TASK-038/*`
- `docs/tasks/RESULT-TASK-038-a-100-poi-scoring-pilot.md`
- `docs/project/WBS-TravelAssist.md`

## WBS updated

Yes. WBS 7.9 is `待审查` while the Draft PR is unmerged.

## Recommended decision

Accept the candidate for blinded human review only. Do not freeze it for production. The low tie accuracy, coarse editorial Feature labels, English-source bias, and missing evidence-supported numeric Visit Profiles must be addressed before any next version.

## Recommended next Task (not started)

Run independent, blinded human adjudication of the 100-POI annotations and pairwise judgments, version the evidence if labels change, and then reassess calibration. No Region Graph, Candidate, AI, or production scoring follow-up was started.
