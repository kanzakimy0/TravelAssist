# CODEX — TASK-038-A 100 POI Scoring Pilot

Repository:

```text
https://github.com/kanzakimy0/TravelAssist
```

Issue:

```text
#299
```

Task:

```text
docs/tasks/TASK-038-a-100-poi-scoring-pilot.md
```

Expected implementation branch:

```text
codex/a-100-poi-scoring-pilot
```

## 1. Start safely

The user's main workspace may contain uncommitted Planner / Step changes. Do not switch, reset, clean, stash, or overwrite that workspace.

Use an isolated worktree / clean clone.

Run:

```bash
git status --short
git branch --show-current
git fetch --all --prune
git rev-parse origin/develop
git log --oneline -20 origin/develop
```

Forbidden:

```bash
git clean -fd
git reset --hard
git push --force
git push --force-with-lease
```

Verify latest `origin/develop` contains merged TASK-036 and TASK-037 artifacts.

## 2. Read the full Task

Read:

```bash
git show origin/task/a-task-038-100-poi-scoring-pilot:docs/tasks/TASK-038-a-100-poi-scoring-pilot.md
```

Then read the authoritative design/contracts listed in the Task from latest `origin/develop`.

Do not use this command file as a substitute for the full Task.

## 3. Branch

Create the implementation branch from latest `origin/develop`:

```bash
git switch -c codex/a-100-poi-scoring-pilot origin/develop
```

If that branch already exists, inspect it before reuse and do not overwrite unrelated work.

## 4. Pilot boundary

This is an offline 100-real-POI scoring calibration Pilot.

Required:

```text
100 real Japan POIs
stratified sample
43-key POI Feature annotation
Visit Profile pilot annotations where evidence allows
12+ fixed preference scenarios
240+ pairwise benchmark judgments
stable train/holdout split
offline deterministic scoring harness
bounded parameter search
holdout evaluation
failure/bias analysis
machine-readable evidence
human-readable Pilot report
```

Do not call:

```text
OpenAI / LLM API
paid Provider API
live route/weather/booking APIs
production DB
```

Do not modify:

```text
canonical Trip contract
canonical Route contract
Trip Mutation Engine semantics
Planner/Detail UI
production scoring defaults
Master Code numbering
```

Do not turn hard constraints into score penalties.

Do not treat `null` as 0/5.

Do not interpret high walking/crowd tolerance as liking walking/crowds.

## 5. Source/evidence rule

Prefer existing repository-resolved/evidence-backed POIs and source catalogs.

If public network research is available, use only permitted public/official sources as supporting evidence. Do not mass-scrape prohibited sources and do not use paid credentials.

Unknown attributes must remain `null` rather than guessed.

If fewer than 100 real identifiable POIs can be assembled safely, finish as `Partial` with exact evidence gaps; do not fabricate synthetic replacements.

## 6. Evaluation discipline

Parameter selection must use calibration/train judgments only.

The holdout must remain untouched until the candidate config is selected.

Do not repeatedly retune against holdout failures.

All semantic hard gates in the Task must pass for a calibration candidate to be eligible for human review.

Pilot quality targets are review gates, not production SLAs.

## 7. Required outputs

Create the Task-defined evidence under:

```text
docs/qa/TASK-038/
```

including:

```text
poi-sample-100.json
poi-feature-annotations.json
visit-profile-annotations.json
annotation-quality.json
preference-scenarios.json
pairwise-benchmark.json
train-holdout-split.json
parameter-search.json
calibration-results.json
holdout-results.json
failure-cases.json
pilot-report.md
```

Create:

```text
docs/tasks/RESULT-TASK-038-a-100-poi-scoring-pilot.md
```

Update Master WBS 7.9 before returning.

## 8. Validation

At minimum run:

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

```text
TASK-038 focused scoring pilot tests
current Trip / Route / Engine contract suites
full canonical Node regression
Task-owned Prettier check
git diff --check
```

Report exact counts. Do not claim unexecuted checks.

## 9. Result status

Valid final outcomes include:

```text
Completed / calibration candidate eligible for human review
```

or:

```text
Completed / calibration not accepted
```

or, when evidence cannot be completed safely:

```text
Partial / Blocked
```

Do not change the evidence/benchmark merely to force a pass.

## 10. Git / PR closeout

After implementation and evidence are complete:

```text
commit
push
create Draft PR → develop
update Issue #299 with Result
update Master WBS
```

Do not merge the PR.

Do not close #299 automatically unless the repository's explicit Task tracking rule at execution time requires otherwise; report actual state.

Do not start the Region Graph Pilot, Candidate Pilot, AI Pilot, or any subsequent task.

Return the complete TASK-038 Result and STOP.