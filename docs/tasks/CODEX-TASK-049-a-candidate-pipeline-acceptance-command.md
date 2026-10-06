# CODEX — TASK-049-A Candidate Pipeline Independent Acceptance Review

Repository:
https://github.com/kanzakimy0/TravelAssist

Issue:
#373

Reviewed PR:
#372

Reviewed branch:
`codex/a-candidate-pipeline-reference`

Initial reviewed head:
`b90917d2c5534ab73ed924cde4f79b992a93bb88`

If PR #372 has advanced, record and review the exact latest head instead.

## Start checks

```bash
git status --short
git branch --show-current
git fetch --all --prune
git rev-parse origin/develop
git rev-parse origin/codex/a-candidate-pipeline-reference
git log --oneline -15 origin/develop
```

Confirm WBS 4.48 integration merge is in candidate history:

```bash
git merge-base --is-ancestor \
4465d8fef68456a1d4554322b97fa5b3e3f10b82 \
origin/codex/a-candidate-pipeline-reference
```

Must succeed.

## Forbidden

```text
git clean -fd
git reset --hard
git push --force
git push --force-with-lease
```

Do not merge PR #372.
Do not start AI Compact Context / Decision Adapter Pilot.
Do not read Human Gold / TASK-039 reviewer answers.
Do not call AI/providers.
Do not alter scoring weights or candidate-0457 calibration.

## Read authoritative Task

```bash
git show origin/develop:docs/tasks/TASK-049-a-candidate-pipeline-acceptance.md
```

Read TASK-048 implementation Task only as scope context; do not use its Result or generated QA files as proof.

## Review mode

Use a dedicated clean worktree and an independent review branch, suggested:

`codex/a-candidate-pipeline-acceptance`

Review the exact PR #372 head. Independently inspect runtime source, fixtures, changed-file boundary, tests and contracts.

Reproduce and independently verify at least:

```text
deterministic repeat = PASS
byte-stable normalized result = PASS
hard reject bypass = 0
must-go silently dropped = 0
NEEDS_FACT silently promoted = 0
dangling Region/POI/Candidate refs = 0
improper Pareto dominated survivors = 0 unless explicitly contract-protected
diversity-resurrected rejected candidates = 0
unbounded loop/retry = 0
Decision Trace coverage = 100%
duplicate Candidate ID rejected
stale run/revision mismatch rejected
invalid Region/POI refs rejected
equal-score ordering deterministic
AI/local run IDs do not leak into stable domain output
14/14 pilot scenarios independently pass
AI/provider calls = 0
production DB writes = 0
scoring parameter changes = 0
Region Graph semantic changes = 0
Master Code governance changes = 0
Planner/Step UI changes = 0
```

Explicitly inspect that:
- Hard Filter cannot be bypassed by Pareto, Diversity, fallback or Top-N.
- must-go is only removed for explicit hard constraints with traceable reason.
- critical unknown facts remain NEEDS_FACT/unresolved.
- fallback/retry loops are deterministic and bounded.
- Pareto is multi-objective rather than a hidden scalar collapse.
- Diversity cannot resurrect rejected candidates.
- Decision Trace contains no hidden chain-of-thought, provider raw payloads, secrets, or booking/payment tokens.

## Required validation

Run:
- TASK-049 focused acceptance checks
- TASK-048 focused
- Planning Contracts
- Planning Soak
- Region Graph
- Master Code Registry
- Region Master Code integration
- Routing
- Trip / Engine focused
- canonical full Node regression
- `npm run lint`
- `npm run typecheck`
- `npm run build`
- TASK-owned Prettier
- `git diff --check`

Also verify GitHub CI and merge-eligibility for the exact reviewed PR #372 head.

## Required outputs

```text
docs/tasks/RESULT-TASK-049-a-candidate-pipeline-acceptance.md
docs/qa/TASK-049/acceptance-report.md
docs/qa/TASK-049/acceptance-check.json
```

Update Master WBS on the review branch only.

If PASS, Result must say:

`Completed / WBS 4.49 Candidate Pipeline acceptance ready for owner approval`

and:

`Recommendation: ACCEPT`

Keep:

```text
PR #372 = Open / Draft
WBS 4.49 = 待审查
```

Do not merge and do not start the next AI Pilot.

Return the full Result file to the user.
