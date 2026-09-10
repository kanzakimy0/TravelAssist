# CODEX — TASK-039-A Independent Blind Human Review

Repository:
`https://github.com/kanzakimy0/TravelAssist`

Issue:
`#301`

Task:
`TASK-039-A`

WBS:
`7.9`

## Start

```bash
git status --short
git branch --show-current
git fetch --all --prune
git rev-parse origin/develop
git log --oneline -20 origin/develop
```

Also inspect TASK-038 status:

```bash
git rev-parse origin/codex/a-100-poi-scoring-pilot
git log --oneline -10 origin/codex/a-100-poi-scoring-pilot
```

Forbidden:

```bash
git clean -fd
git reset --hard
git push --force
git push --force-with-lease
```

Read the full Task:

```bash
git show origin/task/a-task-039-poi-scoring-blind-review:docs/tasks/TASK-039-a-poi-scoring-blind-review.md
```

## Branching

If PR #300 remains unmerged:

```text
base semantic branch:
origin/codex/a-100-poi-scoring-pilot

implementation branch:
codex/a-poi-scoring-blind-review

Draft PR base:
codex/a-100-poi-scoring-pilot
```

Immediately merge current `origin/develop` normally for compatibility.

If PR #300 is already merged, create the implementation branch from latest `origin/develop` and target `develop`.

Do not modify/retarget/merge/close PR #300.

## Critical human boundary

You are NOT a human reviewer.

You MUST NOT generate or fill reviewer choices such as:

```text
A
B
TIE
INSUFFICIENT_INFO
```

for R1/R2/R3.

Do not ask another LLM to act as reviewer.

Your work is limited to:

```text
review pack generation
blind randomization
leakage audit
response templates
response validators
agreement/statistics tooling
adjudication-pack generation
human-gold freeze tooling
one-time candidate evaluation tooling
QA evidence
```

If real reviewer responses are absent, finish as:

```text
Prepared / Awaiting Human Review
```

and STOP.

## Required preparation output

Generate exactly 144 review items:

```text
96 primary validation
24 near-score diagnostic
12 machine-benchmark audit
12 hidden repeats
```

Primary selection MUST NOT use candidate score or machine expected answer.

Reviewer-facing packs MUST NOT expose:

```text
candidate-0457
parameter values
engine score/rank/gap
machine benchmark expected answer
POIFeature numeric values
archetype tags
calibration/holdout partition
machine reason codes
```

Reviewer packs may contain only neutral scenario and POI identity information needed to decide.

Create at least:

```text
docs/qa/TASK-039/blind-review-protocol.md
docs/qa/TASK-039/reviewer-guidance.md
docs/qa/TASK-039/reviewer-pack-r1.json
docs/qa/TASK-039/reviewer-pack-r2.json
docs/qa/TASK-039/reviewer-response-template.json
docs/qa/TASK-039/internal-review-map.json
docs/qa/TASK-039/leakage-audit.json
```

Do not create completed fake reviewer response files.

## Human review analysis rules

Only if actual human reviewer responses already exist and are clearly supplied as such:

1. checksum each response before analysis;
2. normalize A/B orientation;
3. compute hidden-repeat consistency;
4. compute inter-rater raw agreement and Cohen's kappa;
5. create blind adjudication pack for unresolved primary disagreements;
6. never adjudicate yourself;
7. create Human Gold only when the Task conditions are satisfied;
8. checksum Human Gold before candidate evaluation;
9. evaluate `candidate-0457` exactly once;
10. do not retune any parameter after seeing human results.

Minimum complete review requires two independent real human reviewers.

Suggested review-quality gates:

```text
repeat consistency >= 85%
raw agreement >= 70%
Cohen kappa >= 0.55 where computable
```

Candidate validation gates:

```text
usable primary human gold >= 60 / 96
primary high-confidence agreement >= 80%
primary high+medium agreement >= 75%
semantic directionality invariants = 100%
```

Near-score/TIE results are diagnostic only and must not be used to game the primary metric.

## Tests

Add focused TASK-039 tests covering at least:

```text
144 exact item count
96/24/12/12 composition
12 scenario primary coverage
deterministic generation
no duplicate canonical pairs except repeats
repeat canonical identity
R1/R2 independent ordering/orientation
leakage rejection
response schema validation
unknown/duplicate/missing blind IDs rejected
orientation normalization
agreement calculation
Human Gold precondition
candidate evaluation precondition
TASK-038 config immutability
```

Run:

```bash
npm ci
npm run test:planning-contracts
npm run test:planning-soak
npm run test:routing
npm run lint
npm run typecheck
npm run build
```

Also run:

- TASK-039 focused tests;
- current Trip / Route / Engine contract suites;
- canonical full Node regression discovered at execution time;
- TASK-owned Prettier check;
- `git diff --check`.

## Tracking

Create/update:

```text
docs/tasks/RESULT-TASK-039-a-poi-scoring-blind-review.md
docs/project/WBS-TravelAssist.md
```

WBS 7.9 state at preparation completion must remain compatible with:

```text
待人工盲审
```

or equivalent pending-human-review language.

Do not mark candidate-0457 as production accepted/frozen.

## End

Commit + push implementation branch.

Create Draft PR only.

Update Issue #301 with Result / current state.

Do not auto-merge.

Do not close #299 or #301.

Do not start parameter retuning, larger POI Pilot, Region Graph Pilot, Candidate Pilot, AI Pilot, production shadow test or any downstream Task.

Return the complete Result and STOP.
