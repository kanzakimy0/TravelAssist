# TASK-039 Questionnaire Quality Correction v2

## Decision

The completed v1 R1/R2 workbooks are retained only as exploratory questionnaire-quality evidence. They are not eligible for Human Gold or candidate evaluation.

The v1 review surface had three defects:

1. A POI's displayed category could be inferred from a secondary-tag priority instead of its primary identity. For example, Asahiyama Zoo appeared as natural scenery even though its primary category is zoo.
2. Primary validation could compare POIs that were not both applicable to the traveler scenario. This created forced and unrealistic choices, such as asking a food-focused traveler to choose between non-food landmarks.
3. Reviewers had no distinct answer for “both POIs are understandable, but neither is suitable.” `INSUFFICIENT_INFO` was forced to cover two different meanings.

## v2 correction

- Every one of the 100 POIs has an explicit, evidence-linked primary category.
- Scenario applicability is independent from primary category and is recorded explicitly.
- Primary and near-score items require both POIs to be applicable to the scenario.
- Machine-benchmark audit items require at least one applicable POI because they audit the machine comparison rather than form the Human Gold primary set.
- `NEITHER_SUITABLE` is a first-class response, separate from `INSUFFICIENT_INFO`.
- R1/R2 remain independently randomized with the same 144-item composition and hidden-repeat controls.

## Quality evidence from v1

The original human-filled workbooks are not committed. Their SHA-256 fingerprints and aggregate quality metrics are recorded in `exploratory-v1-quality-result.json`:

- R1 hidden-repeat consistency: 10/12 (83.33%).
- R2 hidden-repeat consistency: 3/12 (25.00%).
- Raw R1/R2 agreement: 63/132 (47.73%).
- Agreement excluding insufficient-information answers: 57.80%.
- Cohen's kappa: 0.2353.
- Primary disagreements: 51/96.

These figures diagnose the questionnaire and reviewer-experience problem. They are not evidence for or against candidate-0457.

## Human boundary

No v1 answer is migrated to v2. The corrected v2 workbooks start blank and require a fresh independent review. Until valid v2 responses pass the quality gates:

- no reviewer response JSON is committed;
- no Human Gold is generated;
- candidate-0457 is not evaluated;
- scoring parameters remain unchanged;
- WBS 7.9 remains `待人工盲审`.
