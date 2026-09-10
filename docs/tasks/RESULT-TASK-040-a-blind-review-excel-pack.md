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
- Implementation commit: recorded in the Draft PR after push.
- Draft PR: `codex/a-blind-review-excel-pack` → `codex/a-poi-scoring-blind-review`.

## Reviewer Workbooks

| Reviewer | Workbook                                         | Workbook SHA-256                                                   | Source pack SHA-256                                                | Rows |        Blank answers |
| -------- | ------------------------------------------------ | ------------------------------------------------------------------ | ------------------------------------------------------------------ | ---: | -------------------: |
| R1       | `docs/qa/TASK-040/reviewer-r1-blind-review.xlsx` | `1c2ace316537ee66fb379fe152ef4b20717301a2c5d1e13f64ce0f6aef8ca9fd` | `0ec82e3769b014fe42b78c76d2b5cd50d215344b84446fec20375ae83e7973b7` |  144 | 144 rows / 432 cells |
| R2       | `docs/qa/TASK-040/reviewer-r2-blind-review.xlsx` | `ebccc60efd6cff615058bc3a4cf580edaeda08f366cfc07f05e9946f50549268` | `67782a402cfd999a9a4840d531cb139bf2b5aae6221fde3fd31480b92821fcba` |  144 | 144 rows / 432 cells |

Each workbook has exactly the `Review`, `Instructions`, and `Metadata` sheets. Review order, blind IDs, A/B orientation, scenarios, traveler intents, POI identity, categories, and both source URLs are copied from the corresponding frozen TASK-039 pack. Visual inspection covered all three sheets in both workbooks; the restrained navy, warm-white, and pale input treatment remains neutral between A and B.

## Dropdown / Protection Status

- `Choice`: `A`, `B`, `TIE`, `INSUFFICIENT_INFO` list validation on all 144 rows.
- `Confidence`: `high`, `medium`, `low` list validation on all 144 rows.
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

The final-mode importer fails closed for wrong reviewer/version/source SHA, wrong sheet surface, unexpected or hidden columns/sheets, wrong row count/order, missing/duplicate/unknown IDs, altered scenario/intent/POI/prefecture/region/category/source URL, invalid or half-complete answers, incomplete submission, and formulas/errors in answer cells. Successful output contains only TASK-039 canonical response fields and passes `validateReviewerResponse`.

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

Assign `reviewer-r1-blind-review.xlsx` and `reviewer-r2-blind-review.xlsx` to two independent human reviewers. Each reviewer must fill all 144 `Choice` and `Confidence` cells (and optional `Note`) without seeing TASK-038 material, restricted TASK-039 mappings, scoring code, or the other reviewer’s answers. After both completed files are returned, record each file’s SHA-256 before running the importer in a separately authorized TASK-039 continuation.

## Completion Boundary

Stopped after preparing the reviewer workbooks and import bridge. No human scoring, adjudication, Human Gold, candidate evaluation, retuning, larger POI pilot, Region Graph pilot, Candidate pilot, AI pilot, or production shadow test was started.
