# CODEX — TASK-041-A Region Graph Pilot

Repository:

```text
https://github.com/kanzakimy0/TravelAssist
```

Issue:

```text
#305
```

Task:

```text
docs/tasks/TASK-041-a-region-graph-pilot.md
```

Implementation branch:

```text
codex/a-region-graph-pilot
```

## Start

Use an independent clean worktree or clone. Do not disturb any main workspace with uncommitted Planner/Step work.

Run:

```bash
git status --short
git branch --show-current
git fetch --all --prune
git rev-parse origin/develop
git log --oneline -20 origin/develop
```

Read the full remote Task:

```bash
git show origin/task/a-task-041-region-graph-pilot:docs/tasks/TASK-041-a-region-graph-pilot.md
```

Create the implementation branch from **execution-time latest `origin/develop`**:

```bash
git switch -c codex/a-region-graph-pilot origin/develop
```

Do not stack on TASK-038 / TASK-039 / TASK-040. Those scoring-review branches are independent.

## Forbidden Git

```bash
git clean -fd
git reset --hard
git push --force
git push --force-with-lease
```

## Required semantics

Preserve exactly:

```text
RegionRelation != TravelEdge != TravelEdgeVariant != Live Route Fact
```

Do not put exact live departure/arrival times, live fares, availability or Provider Raw into planning-prior data.

Use the existing Planning Region Graph public contract/parser. Do not create a parallel schema.

Do not renumber or replace Master Codes.

## Required pilot coverage

Cover:

```text
Tokyo
Hakone / Fuji
Nagano / Matsumoto / Takayama / Kanazawa
Kyoto / Nara / Osaka / Kobe
```

Use evidence-supported region types only:

```text
country
macro_area
prefecture
municipality
travel_region
district
stay_cluster
onsen_resort
gateway
```

Create a sparse pilot with RegionRelations, directional TravelEdges and representative TravelEdgeVariants.

Suggested observational scale only:

```text
30–60 nodes
40–120 relations
40–100 directional TravelEdges
```

Do not fabricate data to hit counts.

## Required QA

At minimum validate:

```text
all committed graph data parses
unique IDs
dangling refs = 0
contains cycles = 0
invalid reverse symmetric duplicates = 0
self-loop violations = 0
invalid range order = 0
planning-prior exact timetable violations = 0
all four corridor anchors covered
representative corridor reachability works
```

Representative graph-only paths:

```text
Tokyo -> Hakone
Tokyo -> Matsumoto -> Takayama -> Kanazawa
Kyoto -> Nara -> Osaka -> Kobe
Tokyo -> Kyoto / Osaka
```

These are graph reachability checks, not live provider validation.

Add negative tests for:

```text
dangling ref
contains cycle
reverse symmetric duplicate
duplicate IDs
invalid range
unknown enum
planning-prior exact timetable claim
```

## Data boundary

Prefer repository-resolved Japan destination material and repository evidence. Stable open identity sources may be used when needed.

Forbidden:

```text
paid Provider APIs
live route/timetable/fare calls
LLM as factual authority
production DB write
DB migration
booking/weather/inventory APIs
scoring parameter changes
Human Gold / reviewer response access
candidate-0457 evaluation
Candidate Pipeline runtime
Planner UI
```

Unknown/unsupported relation or variant => omit or mark unknown and report the gap. Never invent precision.

## Suggested outputs

```text
tools/qa/region-graph-pilot.mjs
tests/task-041-region-graph-pilot.test.mjs

docs/qa/TASK-041/region-nodes.json
docs/qa/TASK-041/region-relations.json
docs/qa/TASK-041/travel-edges.json
docs/qa/TASK-041/graph-validation.json
docs/qa/TASK-041/corridor-reachability.json
docs/qa/TASK-041/evidence-index.json
docs/qa/TASK-041/pilot-report.md

docs/tasks/RESULT-TASK-041-a-region-graph-pilot.md
```

Update:

```text
docs/project/WBS-TravelAssist.md
```

WBS 4.48 must be `待审查` after implementation + Draft PR and before merge/user acceptance.

Do not modify WBS 7.9 blind-review status.

## Regression

Run at least:

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
TASK-041 focused tests
relevant Trip / Route / Engine contract tests
full Node regression
TASK-owned Prettier
git diff --check
```

Compare repository-wide formatting failures against the starting base. Do not mass-format unrelated files.

## Finish

Commit and push the implementation branch.

Create **Draft PR -> develop** only.

Update Issue #305 with Result summary.

Do not auto-merge.
Do not close #305 unless explicitly authorized later.
Do not start Candidate Pipeline / TASK-042.

Return the complete TASK-041 Result and STOP.