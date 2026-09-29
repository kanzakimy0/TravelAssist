# TASK-088-A — Trusted Feature43 Baseline Runtime Adoption for Pilot-100

- Issue: #455
- Owner: A
- WBS: 7.4.3
- Priority: P0
- Base: latest `develop`
- Execution branch: `feature/a-trusted-feature43-baseline-runtime`
- Depends on: TASK-083-A Canonical Pilot-100
- Inputs: TASK-087-B / PR #454 audit artifacts and the existing trusted v1.66 Feature43 dataset
- Related: TASK-081-B / PR #437, TASK-084-A / PR #451
- Auto-merge: No

## 1. Objective

Adopt the project's existing internal Feature43 values as the official trusted baseline scoring input for the fixed 100 admitted Canonical POIs.

This Task is not a new data-production task.

B has already completed the historical recovery/audit work in TASK-087-B.

A must now:

1. bind the trusted 4,300 Feature43 values to the 100 Canonical POIs;
2. validate the dataset-level identity/version/hash contract;
3. integrate the trusted baseline into the Canonical runtime repository;
4. make Recommendation Scoring consume the baseline;
5. preserve live/current fact precedence over baseline values;
6. prepare the 100-POI real scoring Pilot.

## 2. Expected data state

Expected:

```text
100 Canonical POIs
× 43 Feature43 values
= 4,300 baseline cells

100 / 100 POIs
= 43 / 43 baseline values
```

If this is not true, stop and report the discrepancy.

## 3. Source of truth

Use the existing internal v1.66 Feature43 dataset identified by TASK-087-B.

TASK-087-B already established:

- exact 100/100 legacy identity match;
- 4,300/4,300 workbook numeric cells;
- zero ambiguous identity joins.

A should reuse those findings and source/hash references, not redo the historical audit from scratch.

## 4. Runtime baseline artifact

Create a versioned trusted baseline artifact, for example:

```text
src/shared/data/
  canonical-poi-pilot100.feature43-trusted-baseline.v1.json
  canonical-poi-pilot100.feature43-trusted-baseline.manifest.v1.json
```

Exact naming may follow repository conventions.

Manifest must include:

- scope = `CANONICAL_POI_PILOT_100_FEATURE43_TRUSTED_BASELINE`
- trustPolicy = `TRUSTED_INTERNAL_BASELINE`
- base Canonical dataset revision/hash
- exact 100 internalIds
- exact 100 Master Codes
- historical source workbook revision/hash
- Feature43 registry version
- recordCount = 100
- featureCount = 43
- cellCount = 4300
- artifact hash
- deterministic rebuild version

## 5. Canonical repository integration

Update the server-only Canonical POI repository so that:

- admitted Pilot-100 POIs receive the trusted Feature43 baseline;
- only exact 100 manifest IDs can receive it;
- candidate-only POIs cannot enter runtime;
- tamper/reorder/hash mismatch fails closed;
- no ID or Master Code rebinding occurs.

The original Canonical identity/admission dataset remains immutable.

Feature43 is attached as a separately versioned trusted baseline layer.

## 6. Recommendation Scoring integration

Integrate with TASK-084-A Recommendation Scoring Runtime.

If PR #451 has not yet merged when execution starts:

- merge latest develop into the #451 branch separately as needed;
- do not duplicate its scoring runtime inside TASK-088-A;
- use the accepted/shared scoring contract.

Expected compatibility after integration:

```text
100 / 100 Canonical POIs recognized
100 / 100 have Feature43 baseline
100 / 100 can enter scoring runtime
```

This proves data-path completeness, not recommendation quality.

## 7. Baseline/live precedence

For dynamic attributes, runtime semantics must preserve:

```text
fresh live/current fact > trusted baseline
```

The trusted Feature43 baseline may be used when no fresher fact exists.

Do not overwrite or double-count fresh live data.

At minimum document/test precedence for applicable categories such as:

- crowd
- queue
- weather
- accessibility
- season/time suitability

Do not invent a live source in this Task if none exists.

## 8. PR #437 handling

PR #437's 17 inferred values remain reference/audit observations.

Produce a comparison report:

- equal to trusted baseline
- different from trusted baseline

Default runtime rule:

```text
trusted internal baseline = primary scoring baseline
PR #437 inferred value = reference observation
```

Do not average the values.

Do not merge #437 in a way that overwrites the complete baseline.

## 9. TASK-087-B handling

Do not rewrite TASK-087-B's historical conclusion.

Record the governance transition explicitly:

```text
old rule:
per-cell evidence promotion required

new user decision:
dataset-level internal trust adopted
```

PR #454 remains useful as an audit artifact.

Its provenance findings may be retained without blocking runtime use.

## 10. Candidate boundary

This Task must not authorize arbitrary candidate POIs.

Only the exact already admitted Canonical Pilot-100 may receive the trusted baseline.

No candidateKey-only row may enter runtime.

## 11. QA

Required:

- 100/100 exact Canonical identity binding
- 100/100 exact Master Code binding
- 100/100 historical UUID mapping
- zero ambiguous joins
- zero name-only joins
- exactly 43 feature codes per POI
- exactly 4,300 cells
- all values valid for the current Feature43 domain
- exact source workbook/hash pinned
- deterministic rebuild
- zero unexplained cell mutation
- no second Feature43 registry
- candidate boundary remains fail-closed
- tamper/reorder/hash mismatch fail-closed
- scoring runtime accepts 100/100 after baseline integration
- live-over-baseline precedence documented/tested

## 12. Tests

Run:

```text
TASK-088-A targeted tests
Canonical POI tests
Feature43 tests
TASK-083 tests
TASK-087 compatibility/audit checks where useful
Recommendation Scoring tests
Preference tests
Planning tests
Edge tests
governance tests
full Node regression
lint
typecheck
build
deployment validate/build/artifact
format
git diff --check
```

## 13. WBS state

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

This means trusted baseline runtime adoption is complete.

It does not mean recommendation calibration is complete.

## 14. Deliverables

- `docs/tasks/TASK-088-a-trusted-feature43-baseline-runtime-adoption.md`
- `docs/tasks/RESULT-TASK-088-a-trusted-feature43-baseline-runtime-adoption.md`
- `docs/qa/TASK-088-A/`
- trusted baseline data artifact + manifest
- deterministic build/rebuild tool
- Canonical runtime integration
- Recommendation Scoring integration
- PR #437 comparison
- governance transition note
- tests
- WBS update

## 15. Stop conditions

Stop / Partial if:

- exact 100 identity mapping fails;
- trusted source does not actually contain 4,300 valid baseline values;
- historical 43 columns do not map one-to-one to current Feature43;
- values fall outside the supported domain;
- source workbook/hash cannot be pinned;
- unexplained data mutation exists;
- runtime integration would require duplicating A's scoring/POI contracts.

## 16. Git

Use latest develop.

Create Draft PR only.

No auto-merge.
