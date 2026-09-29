# TASK-088-B — Trusted Legacy Feature43 Baseline Adoption for Pilot-100

- Issue: #455
- Owner: B
- Proposed WBS: 7.4.3
- Priority: P0
- Base: latest `develop`
- Depends on: TASK-083-A Canonical Pilot-100
- Related: TASK-081-B / PR #437, TASK-087-B / PR #454, TASK-084-A / PR #451
- Policy: `docs/design/feature43-trusted-internal-baseline-policy.md`
- Runtime / Recommendation owner: A remains unchanged
- Auto-merge: No

## 1. Objective

Adopt the project's existing internal Feature43 scores as a trusted baseline for the exact 100 admitted Canonical POIs.

Do **not** perform per-field Canonical promotion.

The job is dataset binding and validation, not evidence reconstruction.

Expected Pilot-100 baseline:

```text
100 POIs × 43 fields = 4,300 trusted baseline values
```

## 2. Source of truth

Use the existing internal v1.66 Feature43 dataset / frozen machine-readable derivatives identified by TASK-087-B.

Do not replace the existing values with the 17-value PR #437 experimental overlay.

TASK-087-B's identity and workbook audit may be reused to avoid duplicate work.

## 3. Required identity binding

For all 100 admitted Canonical POIs:

- exact Canonical internalId;
- exact accepted Master Code;
- exact legacy UUID mapping;
- QID consistency where available.

Required result:

```text
100 / 100 exact trusted baseline bindings
0 ambiguous bindings
0 name-only bindings
0 Master Code rebinds
```

## 4. Feature mapping

Validate that the historical 43 columns map one-to-one to the current Feature43 registry.

For every field:

- code matches current code;
- numeric domain valid;
- no missing column;
- no duplicate column;
- no silent remapping.

If the scale remains the same 0–9 internal scoring scale, keep values as-is.

Do not perform evidence-based numeric recalculation in this Task.

## 5. Trusted baseline contract

Create a versioned dataset such as:

```text
canonical-poi-pilot100.feature43-trusted-baseline.v1.json
canonical-poi-pilot100.feature43-trusted-baseline.manifest.v1.json
```

Naming may follow repository convention.

Manifest must record at least:

- scope = CANONICAL_POI_PILOT_100_FEATURE43_TRUSTED_BASELINE
- trustPolicy = TRUSTED_INTERNAL_BASELINE
- base Canonical dataset revision/hash
- source historical dataset/workbook revision/hash
- recordCount = 100
- featureCount = 43
- cellCount = 4300
- exact internalIds
- exact Master Codes
- Feature43 registry version
- generated/rebuild version
- dataset hash

## 6. Runtime semantics

The trusted baseline is a scoring baseline, not live truth.

Fields such as crowd, queue, accessibility, weather, seasonal suitability or time suitability may be used as baseline ratings.

If runtime has a fresher live fact:

```text
live/current fact > trusted baseline
```

The baseline must never overwrite a known fresher fact.

## 7. Candidate boundary

Do not authorize arbitrary candidate POI runtime import.

Only:

```text
already admitted Canonical POI
+ exact trusted historical Feature43 row
```

may receive trusted baseline features.

All other candidate corpus governance remains unchanged.

## 8. Relationship to PR #437

PR #437 is not the primary data source.

Compare its 17 inferred cells against the trusted baseline and publish a difference report.

Do not average or merge the 17 values automatically.

Default disposition:

```text
trusted baseline value = runtime baseline
PR #437 value = audit/reference observation
```

If PR #437 contains useful provenance, retain it separately.

## 9. Relationship to PR #454

PR #454's recovery audit should remain as an audit record.

Its old evidence-promotion conclusion does not block this Task.

TASK-088-B should explicitly record:

```text
dataset-level trust policy supersedes per-cell promotion requirement
```

without rewriting TASK-087-B's historical findings.

## 10. Output coverage

Expected:

- 100 Canonical POIs
- 43 values per POI
- 4,300 baseline cells
- 4,300 non-null if the trusted workbook is complete
- 100 POIs at 43/43
- zero unexplained deltas from the designated trusted source

If this differs, stop and report the exact discrepancy.

## 11. QA

At minimum:

- exactly 100 Canonical IDs;
- exactly 100 Master Codes;
- exactly 43 feature codes each;
- exactly 4,300 cells;
- values integer/in-domain;
- exact historical UUID crosswalk;
- deterministic rebuild;
- source workbook/hash pinned;
- no candidate-only extra POI;
- no ID rebinding;
- no Feature43 schema duplication;
- no unexplained cell mutation;
- tamper/reorder detection;
- live-override semantics documented/tested where runtime contract exists.

## 12. Scoring compatibility

If TASK-084-A scoring code is available on the execution base, run read-only compatibility.

Expected:

```text
100 / 100 Canonical POIs have Feature43 baseline
100 / 100 can enter scoring runtime
```

This is a data-path check only.

Do not claim recommendation quality or calibration completion in B's Task.

## 13. Deliverables

- `docs/tasks/TASK-088-b-trusted-feature43-baseline-adoption.md`
- `docs/tasks/RESULT-TASK-088-b-trusted-feature43-baseline-adoption.md`
- `docs/qa/TASK-088-B/`
- trusted baseline overlay + manifest
- deterministic generator/rebuild tool
- tests
- PR #437 comparison report
- TASK-087 policy transition note
- WBS update

## 14. WBS state

Start:

```text
7.4.3 = 进行中
```

Draft review:

```text
7.4.3 = 待审查
```

After user acceptance and merge:

```text
7.4.3 = 已完成
```

This means trusted baseline adoption is complete, not that scoring calibration is complete.

## 15. Stop conditions

Stop / Partial if:

- exact 100-row identity mapping is not possible;
- workbook does not actually contain 43 values per Canonical POI;
- Feature43 column meanings do not align with the current registry;
- source workbook/hash cannot be pinned;
- values fall outside the expected domain;
- unexplained cell mutation exists.

Do not fall back to web research in this Task.

## 16. Git

Use a separate feature branch from latest develop.

Create Draft PR only.

No automatic merge.
