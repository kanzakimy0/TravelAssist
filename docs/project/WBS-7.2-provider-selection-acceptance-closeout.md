# WBS 7.2 — Places / POI Provider Selection Acceptance Closeout

- Date: 2026-09-13
- Owner: **B**
- Task: TASK-058-B
- Issue: [#361](https://github.com/kanzakimy0/TravelAssist/issues/361)
- Research PR: [#362](https://github.com/kanzakimy0/TravelAssist/pull/362)
- WBS final status: **已完成**
- Provider decision: **CONDITIONAL**

## User acceptance and merge

The user explicitly authorized acceptance, merge and WBS closeout:

```text
验收通过，允许合并 PR #362，并完成 WBS 7.2 收尾
```

PR #362 was changed from Draft to Ready and merged using the accepted head SHA as the merge guard.

| Record                 | Value                                      |
| ---------------------- | ------------------------------------------ |
| Accepted research head | `248effee37a13534d61670c20257c7392fa11a64` |
| Pre-merge develop      | `c8290b199fad0828245b355f231743b67d2eaad2` |
| Research merge commit  | `07335833ccd2a7b0f4dd0c5a21ba5e094c9b49eb` |
| Merged at              | `2026-09-13T08:26:00Z`                     |
| Issue status / reason  | CLOSED / COMPLETED                         |
| Issue closed at        | `2026-09-13T08:27:31Z`                     |
| Closeout branch        | `codex/b-wbs-7-2-acceptance-closeout`      |
| Closeout branch base   | `07335833ccd2a7b0f4dd0c5a21ba5e094c9b49eb` |

The closeout branch was created from the latest clean `origin/develop` after the research merge. This record supersedes the earlier review-stage stop status. The [ownership override](WBS-7.2-owner-correction.md) continues to establish Owner B; its historical start status is superseded by the [Master WBS](WBS-TravelAssist.md) and this closeout.

## Accepted research scope

The accepted deliverables are the [architecture decision](../architecture/poi-provider-selection.md), [provider matrix](../qa/TASK-058/provider-matrix.json), [decision report](../qa/TASK-058/provider-decision-report.md) and [Result](../tasks/RESULT-TASK-058-b-wbs-7-2-poi-provider-selection.md).

They cover eight provider families, 184 matrix facts, 70 official source entries and 110 hard gates including offering variants. Official-source access dates, unknown rights, commercial assumptions and empirical-evaluation limitations remain as recorded in the accepted research.

Geoapify paid Places + Place Details + Autocomplete remains the preferred conditional candidate. HERE Geocoding & Search v7 remains runner-up; NAVITIME remains a Japan-specific contract candidate. The matrix remains `decision = CONDITIONAL`, `primary.productionApproved = false`, and `fallback.productionProvider = null`.

WBS 7.2 completion records acceptance of the provider research and decision. It does not approve deployment, procurement, subscriptions, provider API calls or an automatic external fallback.

## Conditions retained

- **C1:** Confirm Geoapify ID refresh/deletion/migration, Web/iOS/Android subscription scope, processing region/DPA and support scope.
- **C2:** Obtain separate authorization for empirical Japan urban/rural and category-quality evaluation in Japanese and English, including autocomplete, details and closed businesses. This evaluation has not run.
- **C3:** Review actual persistence, provenance, attribution and ODbL derived/collective database obligations before WBS 7.4.
- **C4:** Confirm budget, peak load, rate limits, credentials and degradation strategy before WBS 7.6/7.7. No automatic fallback has been approved.
- **C5:** Keep provider photos disabled until media rights and the asset/attribution policy are approved.

No condition is closed by accepting this research. Unknown permissions remain UNKNOWN.

## Quality evidence

- Accepted-head [Quality Gate 34745152774](https://github.com/kanzakimy0/TravelAssist/actions/runs/34745152774): **PASS**, explicit `workflow_dispatch` at `248effee37a13534d61670c20257c7392fa11a64`.
- Research merge [Quality Gate 34747670918](https://github.com/kanzakimy0/TravelAssist/actions/runs/34747670918): **PASS**, develop push at `07335833ccd2a7b0f4dd0c5a21ba5e094c9b49eb`.
- Accepted runtime regression: **2493 passed, 0 failed / skipped**. The existing research report records local installation, clean-worktree lint/typecheck/build, deployment validation/build/artifact verification, structured matrix/source/cost checks and scoped documentation QA.
- Closeout documentation QA: **PASS**. Scoped Prettier, 15 local Markdown links, a WBS byte comparison excluding only row 7.2, unchanged architecture/matrix and runtime trees, credential-pattern scan, and `git diff --check` all passed.
- The closeout PR description records its exact final head and workflow-dispatch Quality Gate result. Its merge SHA and post-merge develop Quality Gate are recorded there after merge; this avoids a self-referential commit SHA or claiming a future CI run has passed.

## Tracking and stop point

Only the Master WBS 7.2 row changes:

```text
7.2 = B / 已完成（#361 / TASK-058-B；用户验收，PR #362 已合并）
```

The closeout updates this record, the Result, the decision report's acceptance status and that single WBS row. The accepted provider matrix and architecture decision are unchanged. Other WBS owners and statuses are preserved.

No runtime, package, lockfile, workflow, database, provider account or paid service change is included. WBS 7.4 / 7.6 / 7.7 / 7.9 and all other downstream tasks remain unstarted by this closeout.
