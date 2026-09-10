# TASK-040-A — Blind Review Excel Pack / Import Bridge

> Issue: #303  
> WBS: **7.9 — POI Recommendation Scoring / Calibration**  
> Owner: **A — Main Travel System / Planning Engine QA**  
> Priority: **P0 Support**

## 1. Goal

Make TASK-039's frozen R1/R2 blind review practical for real human reviewers by producing two polished `.xlsx` workbooks and a deterministic import/validation bridge back to TASK-039's canonical reviewer-response JSON format.

This Task changes the **review surface only**. It must not change the questions, reviewer assignment, blind IDs, A/B orientation, scoring candidate, or machine benchmark.

## 2. Dependency / branch rule

TASK-039-A currently lives on Draft PR #302 / branch:

```text
codex/a-poi-scoring-blind-review
```

TASK-038 is Draft PR #300.

If #302 remains unmerged when execution begins:

1. create `codex/a-blind-review-excel-pack` from latest `origin/codex/a-poi-scoring-blind-review`;
2. merge latest `origin/develop` normally for compatibility;
3. do not modify/retarget/merge #300 or #302;
4. TASK-040 Draft PR targets `codex/a-poi-scoring-blind-review`.

If #302 has already merged, start from latest `origin/develop` and target `develop`.

Never force-push.

## 3. Required input files

Consume the frozen TASK-039 artifacts exactly as found on the execution base:

```text
docs/qa/TASK-039/reviewer-guidance.md
docs/qa/TASK-039/reviewer-pack-r1.json
docs/qa/TASK-039/reviewer-pack-r2.json
docs/qa/TASK-039/reviewer-response-template.json
```

Do not regenerate TASK-039 packs.

Record and preserve the exact source-pack SHA-256 values.

## 4. Required workbook outputs

Create exactly:

```text
docs/qa/TASK-040/reviewer-r1-blind-review.xlsx
docs/qa/TASK-040/reviewer-r2-blind-review.xlsx
```

Each workbook must contain:

### Sheet `Review`

Exactly 144 data rows, preserving the assigned pack order.

Columns:

```text
Row
Blind Item ID
Scenario
Traveler Intent
POI A
A Prefecture
A Region
A Category
A Source 1
A Source 2
POI B
B Prefecture
B Region
B Category
B Source 1
B Source 2
Choice
Confidence
Note
```

Rules:

- `Blind Item ID` exactly matches the source pack.
- POI A/B and all reviewer-facing content must exactly match the source pack.
- Source cells should be clickable hyperlinks where supported.
- `Choice` data validation: `A,B,TIE,INSUFFICIENT_INFO`.
- `Confidence` data validation: `high,medium,low`.
- `Choice`, `Confidence`, `Note` are blank in committed reviewer workbooks.
- Freeze header row and identity columns where useful.
- Enable filters.
- Use readable widths, wrapped traveler intent, alternating row treatment or an equivalent restrained professional layout.
- Do not use any visual hint that implies the expected answer.
- Do not conditionally color A/B based on scoring or benchmark.

### Sheet `Instructions`

Human-readable instructions derived only from `reviewer-guidance.md`.

It must state:

- judge fit for the stated traveler, not personal favorite;
- choose one of A/B/TIE/INSUFFICIENT_INFO;
- choose confidence high/medium/low;
- work independently;
- do not inspect TASK-038, TASK-039 internal map, scoring code, or other reviewer answers;
- live opening/queues/weather/routes/booking/price are out of scope;
- use INSUFFICIENT_INFO when information is inadequate;
- do not alter protected question cells.

### Sheet `Metadata`

Include at least:

```text
reviewVersion
reviewerCode
itemCount
sourcePackSha256
workbookSchemaVersion
protectedContentDigestAlgorithm
```

No scoring candidate or internal benchmark metadata may appear.

## 5. Workbook protection / edit surface

Where practical:

- protect/freeze question content cells against accidental edit;
- only `Choice`, `Confidence`, and `Note` should be editable by the reviewer;
- protection is for accidental edits only, not a security boundary.

The importer must still independently verify protected content because spreadsheet protection can be bypassed.

## 6. XLSX import bridge

Implement a deterministic importer, suggested location:

```text
tools/qa/task040-blind-review-xlsx.mjs
```

The importer must convert a completed R1/R2 workbook into canonical TASK-039 response JSON equivalent to `reviewer-response-template.json`.

Suggested commands:

```text
npm run qa:blind-review:xlsx:generate
npm run qa:blind-review:xlsx:import -- <xlsx> <output.json>
```

Exact script names may follow repository conventions.

### Required validations

Reject fail-closed on:

- wrong/missing reviewer code;
- wrong review version;
- source pack SHA mismatch;
- item count not 144;
- missing blind ID;
- unknown blind ID;
- duplicate blind ID;
- reordered rows if the chosen schema treats order as protected;
- changed scenario/intent/POI identity/prefecture/region/category/source URL content;
- invalid choice;
- invalid confidence;
- choice filled but confidence blank;
- confidence filled but choice blank;
- incomplete submission when importing in final mode;
- unexpected extra reviewer rows;
- formula/error value in answer cells;
- hidden/internal columns that should not exist.

Output JSON must contain only the canonical reviewer response fields expected by TASK-039 and must never include workbook-internal protected hashes or machine scoring data.

## 7. Dependency policy

Prefer an existing repository spreadsheet library if already present.

If none exists, adding **one development-only XLSX library** is allowed solely for this QA bridge. Do not add a runtime/browser spreadsheet dependency. Document the dependency and keep the change narrow.

## 8. Round-trip tests

Add focused tests, suggested:

```text
tests/task-040-blind-review-excel.test.mjs
```

Tests must cover at least:

1. both committed workbooks open successfully;
2. each has Review / Instructions / Metadata sheets;
3. exactly 144 rows per reviewer;
4. all 144 blind IDs match source pack exactly;
5. reviewer-facing question content matches pack exactly;
6. committed Choice/Confidence/Note are blank;
7. dropdown validation exists for Choice and Confidence;
8. R1 workbook contains only R1 IDs; R2 only R2 IDs;
9. source-pack SHA metadata matches;
10. no forbidden leakage tokens/fields appear;
11. synthetic test-only fully-filled workbook imports to valid canonical JSON;
12. A/B/TIE/INSUFFICIENT_INFO all round-trip correctly;
13. invalid choice/confidence fails;
14. missing/duplicate/unknown blind IDs fail;
15. protected task-content modification fails;
16. source-pack SHA mismatch fails;
17. incomplete final submission fails;
18. importer output passes TASK-039 response validation.

Synthetic answers are QA-only. Never commit them as real reviewer responses.

## 9. Leakage audit

Create:

```text
docs/qa/TASK-040/excel-leakage-audit.json
```

Scan both reviewer workbooks' reviewer-visible cell values / formulas / metadata strings for forbidden concepts including:

```text
candidate-0457
gamma
weights
engine score
rank
score gap
machine expected
machine confidence
POIFeature numeric vector
archetypeTags
calibration partition
holdout partition
internal review map
machine reason code
```

Expected findings: zero.

## 10. Mapping / workbook manifest

Create:

```text
docs/qa/TASK-040/workbook-manifest.json
```

Include:

- reviewer code;
- workbook path;
- workbook SHA-256;
- source pack path;
- source pack SHA-256;
- item count;
- blank answer count;
- sheet names;
- content digest/check result;
- leakage audit status.

## 11. Human boundary

Codex/AI must not provide or infer real reviewer judgments.

Committed reviewer workbooks must contain:

```text
Choice = blank
Confidence = blank
Note = blank
```

Do not create:

```text
reviewer-r1-response.json
reviewer-r2-response.json
human-gold-v1.json
candidate-human-evaluation.json
```

unless genuine human-completed workbook/response files are supplied in a later, explicit TASK-039 continuation.

## 12. Validation

Run at minimum:

```text
npm ci
TASK-040 focused tests
npm run test:planning-contracts
npm run test:planning-soak
npm run test:routing
relevant TASK-038/TASK-039 tests
Trip / Route / Engine contract tests
full Node regression
npm run lint
npm run typecheck
npm run build
TASK-owned Prettier
git diff --check
```

If repository-wide format debt remains pre-existing, document exact baseline comparison; TASK-040 must add zero new formatting failures.

## 13. Required Result

Create:

```text
docs/tasks/RESULT-TASK-040-a-blind-review-excel-pack.md
```

Report:

- Status;
- base/dependency SHAs;
- Issue;
- branch/commits;
- Draft PR base/head;
- workbook paths and SHA-256;
- item counts;
- blank answer verification;
- dropdown/protection status;
- importer validation coverage;
- leakage audit;
- focused/full regression results;
- WBS update;
- next human action.

## 14. WBS status

TASK-040 is a support task under WBS 7.9. It does not complete the human blind review.

During/after this Task, WBS 7.9 remains:

```text
待人工盲审
```

or equivalent.

## 15. Completion boundary

Expected completion state:

```text
Completed / Reviewer workbooks ready
```

Then stop.

Do not auto-merge. Do not start human scoring, Human Gold, candidate evaluation, parameter tuning, larger POI pilot, Region Graph pilot, Candidate pilot, AI pilot, or production shadow testing.