# TASK-039-A Result — 100 POI Scoring Independent Blind Human Review

## Status

**Prepared / Awaiting Human Review v2.** Blind-review infrastructure and corrected reviewer packs are complete. A real v1 R1/R2 run was later supplied, but questionnaire-quality defects make it exploratory evidence only. No v2 human responses exist, so this Task correctly stops before Human Gold or candidate evaluation.

## Base / TASK-038 dependency

- Latest `origin/develop` at execution start: `fede48bb2a4916bcc6070be325ec5b450fa6fbd1`.
- TASK-038 branch/head: `codex/a-100-poi-scoring-pilot` at `71825e995946d7796587f4648dfc78490b45546d`.
- PR #300 remained Draft and unmerged. TASK-039 was created from the TASK-038 head, then latest `origin/develop` was merged normally (`Already up to date`).
- TASK-039 Draft PR base: `codex/a-100-poi-scoring-pilot`.
- PR #300 was not modified, retargeted, merged, closed, or rewritten.

## Issue

[#301](https://github.com/kanzakimy0/TravelAssist/issues/301) remains open pending two independent human reviews.

## Branch / commits

- Branch: `codex/a-poi-scoring-blind-review`.
- `b240c57f3fb14c295a81bfb3972812152fbc73b3` — blind-review generator, two reviewer packs, internal map, leakage audit, response/agreement/gold/evaluation tooling, focused tests, Result, and WBS state.
- A final tracking-only commit synchronizes PR #302 into this Result and WBS; the Draft PR head is authoritative for that commit SHA.

## Draft PR

[#302](https://github.com/kanzakimy0/TravelAssist/pull/302) is Open / Draft from `codex/a-poi-scoring-blind-review` to `codex/a-100-poi-scoring-pilot`. It must not be merged before the stacked TASK-038 dependency is handled.

## 144-item composition

- Primary validation: **96** (12 scenarios × 8).
- Near-score diagnostic: **24** (12 scenarios × 2).
- Machine-benchmark audit: **12** (one per scenario; available high, medium, and low confidence bands represented internally).
- Hidden repeat: **12** (one primary source item per scenario).
- Total: **144**.
- Non-repeat canonical task keys: **132 unique / 132**.
- Hidden repeats are the only intentional canonical duplicates and each maps to its source primary item.

Primary selection uses stable POI identity, geography, neutral broad category, and deterministic hashing only. It does not use candidate scores, score gaps, TASK-038 expected answers, or machine confidence.

## Scenario coverage

All 12 TASK-038 scenarios have exactly eight primary items: first-time iconic, hidden/local, photography/scenery, history/architecture, food, shopping/city, nature, art/education, family/interactive, relaxed/rest, low walking tolerance, and low crowd tolerance.

## Reviewer pack checksums

- R1 SHA-256: `0ec82e3769b014fe42b78c76d2b5cd50d215344b84446fec20375ae83e7973b7`.
- R2 SHA-256: `67782a402cfd999a9a4840d531cb139bf2b5aae6221fde3fd31480b92821fcba`.
- Internal map SHA-256: `7f58d8b129ab17db7a7ac6081acab2a3230453a664afd9f37363464173cc94b5`.
- TASK-038 parameter-search SHA-256 before/after generation: `da8490e9b32be75504da608fcfc343f633b2b41c4a9ac1499cc96abb9cecc66b` (unchanged).

R1 and R2 contain the same canonical 144 tasks with independent deterministic row order, blind IDs, and A/B orientation. Their orientation differs on 77 rows. Every repeat appears after its source row in each pack.

## Leakage audit

Passed with zero findings for both reviewer packs. Recursive key/value inspection excludes candidate identity and parameters, gamma/weights, engine score/rank/gap, machine answer/confidence/reason codes, POIFeature values, archetype tags, and calibration/holdout labels.

Reviewer packs contain only blind ID, plain-language traveler scenario, neutral POI identity, prefecture/region, broad factual category, evidence links, answer options, confidence options, and optional-note guidance. Sensitive references remain only in `internal-review-map.json`, marked `INTERNAL — DO NOT PROVIDE TO REVIEWERS BEFORE RESPONSE FREEZE`.

## Response template / tooling

- Deterministic generation is available through `npm run qa:poi-blind-review`.
- The response template has null answer/confidence values and contains no completed judgment.
- Validation rejects missing, duplicate, and unknown blind IDs, invalid choice/confidence, wrong reviewer code, and incomplete submissions.
- A/B normalization maps each independently randomized pack back to canonical orientation.
- Analysis tooling computes hidden-repeat consistency, raw agreement, agreement excluding insufficient information, per-scenario agreement, A/B-versus-tie disagreement, insufficient-information rate, and Cohen's kappa.
- Blind adjudication-pack generation excludes R1/R2 answers and machine data.
- Human Gold generation fails closed until at least two independent, complete human responses pass quality gates and all primary disagreements are adjudicated.
- Candidate evaluation fails closed until a verified Human Gold checksum exists. The implemented evaluation uses the frozen TASK-038 candidate without mutation, enforces 60/96 usable-primary coverage, separates diagnostics, and does not retune parameters.

## Focused tests

`npm run test:poi-blind-review`: **14/14 passed**.

Coverage includes exact total/composition, 12-scenario primary coverage, deterministic generation, canonical duplicate control, repeat identity, R1/R2 order/orientation independence, repeat ordering, leakage audit, response validation, unknown/duplicate/missing ID rejection, A/B normalization, agreement/repeat calculations, blind adjudication output, Human Gold precondition, candidate-evaluation precondition, no fabricated response artifacts, and TASK-038 parameter immutability.

## Upstream regression

- `npm ci`: passed; 395 packages installed, 0 vulnerabilities.
- `npm run test:planning-contracts`: **21/21 passed**.
- `npm run test:planning-soak`: **6/6 passed**.
- `npm run test:routing`: **28/28 passed**.
- Current Trip / Route / Engine contract command: **179/179 passed**.
- Full Node regression (`tests/*.test.mjs`): **859/859 passed**.
- `npm run lint`: passed.
- `npm run typecheck`: passed.
- `npm run build`: passed; Next.js 16.3.4 generated all 19 pages.
- TASK-owned Prettier check: passed.
- `git diff --check`: passed.

The repository's existing `MODULE_TYPELESS_PACKAGE_JSON` loader warning remains informational and does not affect results.

## Human judgments fabricated

**No.** Codex/scripts did not choose A, B, TIE, or INSUFFICIENT_INFO for R1/R2/R3. Synthetic in-memory unit-test fixtures exercise validators and statistics only; they are explicitly not human evidence and are never written as reviewer responses.

The following are intentionally absent:

- `reviewer-r1-response.json`;
- `reviewer-r2-response.json`;
- `human-gold-v1.json`;
- `candidate-0457-human-evaluation.json`;
- machine-versus-human conclusions.

## Current completion state

**Prepared / Awaiting Human Review.** This is an accepted preparation-only state, not a failure and not evidence that candidate-0457 is supported by humans.

## WBS status

WBS 7.9 is updated to `待人工盲审`. It remains one scoring/calibration work item covering TASK-038 internal calibration and TASK-039 independent validation. It is not Production Frozen or Completed.

## Next human action

1. Assign `reviewer-pack-r1.json` and `reviewer-pack-r2.json` to two independent human reviewers with `reviewer-guidance.md`.
2. Keep reviewers separated from each other, TASK-038 output, and TASK-039 internal files.
3. Collect all 144 answers from each reviewer and record each file's SHA-256 before analysis.
4. Run validation and agreement analysis. If primary disagreements remain, give a blind adjudication pack to an independent R3.
5. Freeze Human Gold and its SHA-256 only after quality gates pass; only then authorize the one-time candidate evaluation.

No retuning, larger POI/Region/Candidate/AI Pilot, or production shadow test was started.

## Questionnaire quality correction v2 (2026-09-12)

The first completed R1/R2 workbook run exposed a questionnaire blocker rather than acceptable Human Gold evidence. Its aggregate evidence is retained in `docs/qa/TASK-039/exploratory-v1-quality-result.json`; raw reviewer choices are not committed.

- v1 displayed some categories from secondary-tag priority. Asahiyama Zoo could therefore appear as natural scenery instead of its explicit primary category, zoo.
- v1 primary selection did not require both POIs to be applicable to the scenario, which could force implausible comparisons.
- v1 lacked a separate `NEITHER_SUITABLE` response.

The v2 correction adds a complete 100/100 POI identity taxonomy, explicit scenario-applicability gates, `NEITHER_SUITABLE`, and regenerated R1/R2 packs. Primary and near-score items now contain two scenario-applicable POIs. The 144-item composition, blind ordering, A/B randomization, hidden repeats, leakage boundary, and TASK-038 candidate parameters remain unchanged.

Corrected pack SHA-256:

- R1: `8dcdde424a91d9c21e7739dc3f456a0f19bcfa510f73bc9f6807e19f7e229f6d`
- R2: `1ff3deb87a7cd21481b0119117ab972e96bb7d7fdb3d88a8f2b2a8865e5427a5`

Status remains **Prepared / Awaiting Human Review**. The v1 response run is explicitly ineligible for Human Gold and candidate evaluation; fresh v2 human reviews are required.

Correction validation:

- Explicit taxonomy coverage: **100/100 POIs**, **26 primary categories**.
- Corrected TASK-039 focused tests: **17/17 passed**.
- Corrected TASK-040 Excel/import tests: **7/7 passed**.
- TASK-038 pilot regression: **16/16 passed**.
- Planning contracts: **21/21 passed**.
- Planning soak: **6/6 passed**.
- Routing: **28/28 passed**.
- Full Node regression: **869/869 passed**, including concurrent generator/read coverage after atomic output replacement.
- lint, typecheck, and production build: passed.
