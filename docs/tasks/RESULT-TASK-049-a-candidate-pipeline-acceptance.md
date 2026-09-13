# TASK-049-A Result — Candidate Pipeline Independent Acceptance Review

## Status

Completed / WBS 4.49 Candidate Pipeline acceptance ready for owner approval.

## Recommendation

**ACCEPT**

WBS 4.49 remains `待审查`. PR #372 remains Open / Draft. This review did not
merge or modify PR #372 and did not start the AI Compact Context / Decision
Adapter Pilot.

## Reviewed Object

- Repository: `kanzakimy0/TravelAssist`
- Reviewed PR: [#372](https://github.com/kanzakimy0/TravelAssist/pull/372)
- Reviewed branch: `codex/a-candidate-pipeline-reference`
- Initial reviewed Head: `b90917d2c5534ab73ed924cde4f79b992a93bb88`
- Exact reviewed Head: `b90917d2c5534ab73ed924cde4f79b992a93bb88`
- PR base: `develop`
- Candidate implementation base: `3ba3f34ea07a160c237c22b85050df5313ea10ae`
- Latest review baseline: `56901c3a18703105442f9c566406f041c0660fbe`
- Independent review branch: `codex/a-candidate-pipeline-acceptance`
- Review baseline merge commit: `58c6af77`

The PR Head did not advance from the initially specified Head during the
review.

## Prerequisites

- WBS 4.48 final merge `4465d8fef68456a1d4554322b97fa5b3e3f10b82`
  is an ancestor of the exact reviewed Head: PASS.
- WBS 4.48 final closeout remains in `develop`: PASS.
- Candidate Pipeline remains provider-free: PASS.
- PR #372 exact reviewed Head GitHub CI: PASS.
- PR #372 merge eligibility: mergeable / clean.

## Independent Evidence Boundary

The review did not treat TASK-048 Result or checked-in TASK-048 generated QA
evidence as proof. It:

- inspected the runtime, types, source fixtures and PR changed-file boundary;
- invoked the runtime directly from source fixtures;
- reconstructed all acceptance counts from fresh in-memory results;
- ran every scenario twice and compared normalized byte output;
- created independent negative mutations and result validation checks;
- separately inspected source ordering, Pareto implementation and external
  dependency boundaries.

Human Gold, TASK-039 reviewer answers and candidate-0457 data were not read.

## Independent Scenario Review

All 14 required scenarios independently passed:

1. Tokyo first-time iconic trip
2. Tokyo hidden/local preference
3. Hakone/Fuji corridor
4. Alpine/Hokuriku corridor
5. Kyoto/Nara/Osaka/Kobe corridor
6. Low walking tolerance
7. Low crowd tolerance
8. Must-go preserved
9. Must-go impossible through an explicit hard constraint
10. Route-infeasible candidate removed
11. Critical route/opening fact remains `NEEDS_FACT`
12. Diversity prevents one-category Top-N monoculture
13. Sparse candidate fallback expansion
14. No-valid-choice terminal case

## Mandatory Acceptance Gates

| Gate                                       |     Result |
| ------------------------------------------ | ---------: |
| Deterministic repeat                       |       PASS |
| Byte-stable normalized result              |       PASS |
| Hard reject bypass                         |          0 |
| Must-go silently dropped                   |          0 |
| `NEEDS_FACT` silently promoted             |          0 |
| Dangling Region / POI / Candidate refs     |          0 |
| Improper Pareto-dominated survivors        |          0 |
| Diversity-resurrected rejected candidates  |          0 |
| Unbounded loop / retry                     |          0 |
| Decision Trace stage coverage              |       100% |
| Duplicate Candidate ID rejected            |       PASS |
| Stale run/revision mismatch rejected       |       PASS |
| Invalid Region / POI refs rejected         |       PASS |
| Equal-score ordering deterministic         |       PASS |
| AI/local run IDs leaked into stable output |          0 |
| Required Pilot scenarios                   | 14/14 PASS |
| AI / provider calls                        |          0 |
| Production DB writes                       |          0 |
| Scoring parameter changes                  |          0 |
| Region Graph semantic changes              |          0 |
| Master Code governance changes             |          0 |
| Planner / Step UI changes                  |          0 |

## Manual Semantic Review

### Hard Filter

The stage sequence invokes Hard Filter before scoring, feasibility, Pareto,
Diversity and Top-N. Every later selection stage reads only candidates whose
status is still `active`. The final validator independently rejects any
hard-rejected candidate reintroduced into persistable selection. No bypass was
found through Pareto, Diversity, fallback or Top-N.

### Must-go

Must-go candidates are marked protected during POI expansion and are exempt
from Pareto and Diversity pruning. Top-N expands its limit when required to
retain them. An omitted must-go is valid only when its status is `rejected` or
`needs_fact`; the review additionally confirmed a non-empty blocking Reason
Code. Silent omission fails closed.

### Critical Unknown Facts

Hard, route and itinerary checks map unknown critical facts to `needs_fact`.
Later stages operate only on `active` candidates, the terminal result preserves
the unresolved POI refs, and the final validator rejects promotion into stable
selection.

### Fallback / Retry

POI expansion is bounded by both requested rounds and the configured maximum.
Configuration is capped by a hard runtime maximum, excess requests fail closed,
and the sparse fallback code is deterministic. No retry or provider loop is
present.

### Pareto

Pareto uses nine explicit maximize/minimize objectives and requires no-worse on
all objectives plus better on at least one. Independent trade-off vectors
confirmed that an improvement in preference cannot hide a regression in cost.
The Pareto stage does not invoke the later ranking vector or reduce objectives
to a scalar.

### Diversity

Diversity receives only `active` candidates. It can mark eligible candidates as
`pruned_by_diversity`, but cannot reactivate rejected, unresolved or dominated
candidates. Independent output tampering was rejected.

### Decision Trace Safety

Decision Trace contains structured counts, Reason Codes, refs and empty
AI/provider usage lists. No hidden chain-of-thought, raw provider payload,
secret, API key, booking token or payment token was found.

## Negative / Determinism Checks

Twelve fail-closed mutations plus an independent equal-score ordering check
passed:

- duplicate Candidate ID;
- stale revision;
- invalid Region ref;
- invalid POI ref;
- hard reject reintroduction;
- `NEEDS_FACT` promotion;
- silent must-go drop;
- Pareto-dominated survivor;
- Diversity resurrection;
- expansion bound overflow;
- local Candidate ID leak;
- dangling parent Candidate ref;
- equal-score source-order reversal.

## PR Boundary Review

PR #372 contains 14 changed files. The implementation boundary is Candidate
Pipeline source, its Pilot/test evidence, package scripts, Result and WBS.

No changed file belongs to:

- Planner or Step UI;
- production scoring weights or candidate-0457;
- Region Graph data/semantics;
- Master Code Registry/governance;
- DB schema/migrations/persistence;
- AI or provider runtime.

## Validation

| Check                          | Result                   |
| ------------------------------ | ------------------------ |
| TASK-049 focused acceptance    | PASS — 11/11             |
| TASK-048 focused               | PASS — 16/16             |
| Planning Contracts             | PASS — 21/21             |
| Planning Soak                  | PASS — 6/6               |
| Region Graph                   | PASS — 17/17             |
| Master Code Registry           | PASS — 15/15             |
| Region Master Code integration | PASS — 6/6               |
| Routing                        | PASS — 28/28             |
| Trip / Engine focused          | PASS — 124/124           |
| Canonical full Node regression | PASS — 2543/2543         |
| ESLint                         | PASS                     |
| TypeScript                     | PASS                     |
| Production build               | PASS                     |
| TASK-owned Prettier            | PASS                     |
| `git diff --check`             | PASS                     |
| PR #372 GitHub CI              | PASS                     |
| PR #372 merge eligibility      | PASS — mergeable / clean |

## Outputs

- `docs/qa/TASK-049/acceptance-check.json`
- `docs/qa/TASK-049/acceptance-report.md`
- `tools/qa/candidate-pipeline-acceptance.mjs`
- `tests/task-049-a-candidate-pipeline-acceptance.test.mjs`
- `docs/tasks/RESULT-TASK-049-a-candidate-pipeline-acceptance.md`
- `docs/project/WBS-TravelAssist.md`

## Tracking

- Issue: [#373](https://github.com/kanzakimy0/TravelAssist/issues/373) — Open
- Review branch: `codex/a-candidate-pipeline-acceptance`
- Review commit(s): pending
- Draft acceptance PR: pending, target `develop`
- Reviewed implementation PR #372: Open / Draft / mergeable clean
- WBS 4.49: `待审查`

## Owner Decision

The exact reviewed Head satisfies TASK-049. Recommendation is `ACCEPT`.
Explicit owner approval and merge remain required before WBS 4.49 can be marked
complete.

## Stop Boundary

PR #372 was not merged or modified. No AI Compact Context / Decision Adapter
Pilot, scoring calibration, provider call, DB change or unrelated task was
started.
