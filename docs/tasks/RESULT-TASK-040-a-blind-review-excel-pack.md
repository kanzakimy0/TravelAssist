# TASK-040-A Result — Blind Review Excel Pack / Import Bridge

## Status

Completed / Reviewer workbooks ready.

No human judgment was entered or inferred. No reviewer response, Human Gold, candidate evaluation, or parameter change was created.

## Base / Dependencies

- Latest `origin/develop` at execution: `fede48bb2a4916bcc6070be325ec5b450fa6fbd1`.
- TASK-039-A dependency head: `d79eeaaa9ac5e7c052a300d07710679584458c6b`.
- PR #302 remained unmerged at branch creation, so this Task uses the required stacked base `codex/a-poi-scoring-blind-review`.
- Latest `origin/develop` was merged normally; it was already contained, so no merge commit was required.
- TASK-038 / PR #300 and TASK-039 / PR #302 were not modified, retargeted, merged, or closed.

## Tracking

- Issue: #303
- WBS: 7.9 — remains `待人工盲审`.
- Branch: `codex/a-blind-review-excel-pack`
- Implementation commit: `f0dfe244142b7108a60ab0a2e19a655ddd937355`.
- Draft PR: #304 — `codex/a-blind-review-excel-pack` → `codex/a-poi-scoring-blind-review`.

## Reviewer Workbooks

| Reviewer | Workbook                                         | Workbook SHA-256                                                   | Source pack SHA-256                                                | Rows |        Blank answers |
| -------- | ------------------------------------------------ | ------------------------------------------------------------------ | ------------------------------------------------------------------ | ---: | -------------------: |
| R1       | `docs/qa/TASK-040/reviewer-r1-blind-review.xlsx` | `2d267eb841d25f49f7f45a73edc41c4dfb5342af3711846694e957650ff0e4eb` | `0ec82e3769b014fe42b78c76d2b5cd50d215344b84446fec20375ae83e7973b7` |  144 | 144 rows / 432 cells |
| R2       | `docs/qa/TASK-040/reviewer-r2-blind-review.xlsx` | `e97d576707aac7ec36175331d20dc20a20d8acbbe68b6e2f3656a12a33ba7ab4` | `67782a402cfd999a9a4840d531cb139bf2b5aae6221fde3fd31480b92821fcba` |  144 | 144 rows / 432 cells |

Each workbook has exactly the `评审`, `说明`, and `元数据` sheets. Reviewer-visible content is Simplified Chinese (`zh-CN`): scenario and traveler-intent text, POI names, prefectures, regions, categories, guidance, headers, metadata labels, and answer dropdowns are localized. Review order, blind IDs, A/B orientation, POI identity, and both source URLs remain bound to the corresponding frozen TASK-039 pack. `docs/qa/TASK-040/localization-zh-CN.json` provides a deterministic, hash-bound Chinese identity catalog. Visual inspection covered all three sheets in both workbooks; the restrained navy, warm-white, and pale input treatment remains neutral between A and B.

## Dropdown / Protection Status

- `选择`: `A`, `B`, `平局`, `信息不足` list validation on all 144 rows.
- `置信度`: `高`, `中`, `低` list validation on all 144 rows.
- Header row and the first two identity columns are frozen; Review filters are enabled.
- All source references are clickable HTTPS hyperlinks.
- Question, identity, source, Instructions, and Metadata cells are locked under worksheet protection.
- Only `Choice`, `Confidence`, and `Note` cells are unlocked for reviewer edits.
- Protection is explicitly treated as accidental-edit protection, not a security boundary. The importer independently revalidates every protected value.

## Import Bridge

Added one development-only dependency, `exceljs@4.4.0`, limited to repository QA tooling and tests. No browser/runtime spreadsheet dependency was added.

Commands:

```text
npm run qa:blind-review:xlsx:generate
npm run qa:blind-review:xlsx:import -- <workbook.xlsx> <response.json>
npm run test:blind-review:xlsx
```

The final-mode importer fails closed for wrong reviewer/version/source SHA/localization SHA, wrong sheet surface, unexpected or hidden columns/sheets, wrong row count/order, missing/duplicate/unknown IDs, altered localized scenario/intent/POI/prefecture/region/category/source URL, invalid or half-complete answers, incomplete submission, and formulas/errors in answer cells. Chinese choices and confidence values are normalized back to TASK-039 canonical enums; successful output contains only canonical response fields and passes `validateReviewerResponse`.

## Leakage Audit

- `docs/qa/TASK-040/excel-leakage-audit.json`: passed.
- Reviewer-visible values, hyperlinks, and metadata strings were scanned.
- Forbidden findings: 0.
- `docs/qa/TASK-040/workbook-manifest.json` records workbook/source hashes, row and blank counts, sheet names, protected-content digests, and audit status.

## Validation

| Validation                                 | Result         |
| ------------------------------------------ | -------------- |
| `npm ci`                                   | Passed         |
| TASK-040 focused tests                     | 7/7 passed     |
| TASK-039 focused tests                     | 14/14 passed   |
| TASK-038 focused tests                     | 16/16 passed   |
| Planning contract tests                    | 21/21 passed   |
| Planning soak tests                        | 6/6 passed     |
| Routing tests                              | 28/28 passed   |
| Trip / Route / Engine focused contract run | 130/130 passed |
| Full Node regression                       | 866/866 passed |
| `npm run lint`                             | Passed         |
| `npm run typecheck`                        | Passed         |
| `npm run build`                            | Passed         |
| TASK-owned Prettier check                  | Passed         |
| `git diff --check`                         | Passed         |

The existing module-type performance warnings remain informational and were not introduced by TASK-040.

## WBS Update

WBS 7.9 remains `待人工盲审`. TASK-040 supplies the human-review transport and validation layer only; it does not complete or freeze the scoring calibration.

## Next Human Action

Assign `reviewer-r1-blind-review-v2.xlsx` and `reviewer-r2-blind-review-v2.xlsx` to two independent human reviewers. The v1 workbooks are obsolete for Human Gold. Each reviewer must fill all 144 `Choice` and `Confidence` cells (and optional `Note`) without seeing TASK-038 material, restricted TASK-039 mappings, scoring code, or the other reviewer’s answers. After both completed v2 files are returned, record each file’s SHA-256 before running the importer in a separately authorized TASK-039 continuation.

## Completion Boundary

Stopped after preparing the reviewer workbooks and import bridge. No human scoring, adjudication, Human Gold, candidate evaluation, retuning, larger POI pilot, Region Graph pilot, Candidate pilot, AI pilot, or production shadow test was started.

## Corrected reviewer workbooks v2 (2026-09-12)

The first human run identified upstream questionnaire defects: category-priority misclassification, missing scenario-applicability gating, and no distinct “both unsuitable” answer. The original v1 workbooks and responses are not overwritten. The completed v1 files are retained outside this branch and only their fingerprints/aggregate quality metrics are recorded.

- Correction branch: `codex/a-poi-review-quality-fix`.
- Draft PR: [#340](https://github.com/kanzakimy0/TravelAssist/pull/340), stacked on `codex/a-blind-review-excel-pack`.

New blank workbooks were generated from the corrected TASK-039 v2 packs:

| Reviewer | Corrected workbook                                  | Workbook SHA-256                                                   | Source pack SHA-256                                                |
| -------- | --------------------------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------ |
| R1       | `docs/qa/TASK-040/reviewer-r1-blind-review-v2.xlsx` | `34c2f4b5aa7bce4c96a12c3ce7efabf67ddbb8f0083501f216b99621729840f9` | `8dcdde424a91d9c21e7739dc3f456a0f19bcfa510f73bc9f6807e19f7e229f6d` |
| R2       | `docs/qa/TASK-040/reviewer-r2-blind-review-v2.xlsx` | `34f1b513c0b270fe827272680a78111080ded063dc5b374c13181d3dfee97981` | `1ff3deb87a7cd21481b0119117ab972e96bb7d7fdb3d88a8f2b2a8865e5427a5` |

Each v2 workbook contains 144 blank review rows and the same three Chinese sheets. The choice dropdown is now `A / B / 平局 / 两者都不适合 / 信息不足`. `两者都不适合` means both POIs are understood but neither fits the traveler; `信息不足` means the evidence is insufficient to judge.

The XLSX importer and leakage audit are bound to review version `task-039-v2` and the corrected source-pack hashes. Fresh human completion is required; v1 answers are not automatically transferred.

Correction validation:

- v2 workbooks: **144 blank rows each**, three Chinese sheets each.
- Visual render inspection: passed for both Review sheets and the shared Instructions layout.
- TASK-040 Excel/import tests: **7/7 passed**.
- TASK-039 corrected blind-review tests: **17/17 passed**.
- Full Node regression: **869/869 passed**.
- lint, typecheck, and production build: passed.
