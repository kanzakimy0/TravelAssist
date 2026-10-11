# CODEX — TASK-090-A Recommendation Match Quality Calibration

Repository:
https://github.com/kanzakimy0/TravelAssist

Issue:
#461

Owner:
A

Task-spec branch:
docs/task-090-a-recommendation-quality-calibration

Read:

```bash
git show origin/docs/task-090-a-recommendation-quality-calibration:docs/tasks/TASK-090-a-recommendation-match-quality-calibration.md
```

Start from latest develop:

```bash
git status --short
git branch --show-current
git fetch --all --prune
git rev-parse origin/develop
git log --oneline -15 origin/develop
```

Create:

```text
feature/a-recommendation-quality-calibration
```

Context:

TASK-084-A / PR #451 is merged.

The scoring engine already proved:
- 100 Canonical POIs
- 43/43 Feature43 baseline for all 100
- 4,300 deterministic cell traces
- 100 recomputable aggregate results

Do NOT repeat the old single-input 100×43 smoke as the main work.

Do NOT run an 8-persona benchmark.

The goal is input-response calibration.

For each actual supported Preference/Context input, change one factor at a time while keeping the same 100 POIs and all unrelated inputs frozen.

Required probe families:

1. all 16 interest preference families:
   dislike → neutral/absent → like

2. supported interest detail inputs

3. walking tolerance levels

4. queue tolerance levels

5. discovery style / iconic-hidden-local direction

6. family/party context

7. spring/summer/autumn/winter context

8. clear/rain/heat/cold/snow weather context where supported

9. morning/daytime/sunrise/sunset time-slot context where supported

10. rest/fatigue context where supported

11. hard constraints:
   wheelchair
   stroller
   no public transit
   no bus
   no ferry
   critical unknown
   schedule/open requirement where supported

For every probe:

score the same fixed 100 Canonical POIs.

Output:
- before score
- after score
- score delta
- before rank
- after rank
- rank delta
- changed feature/component traces
- expected direction
- actual direction
- pass/fail/review classification

Compute:
- expected-direction rate
- counter-direction rate
- no-effect count
- rank movement distribution
- mean/median delta
- max delta
- relevant Feature43 vs score-delta correlation
- monotonicity for ordinal inputs
- pairwise high-feature vs low-feature separation

Do not handpick named POIs.

Build anchor groups deterministically from Feature43 quantiles.

If config changes are needed:
- freeze before outputs;
- modify centralized versioned scoring config only;
- bump config version;
- rerun everything;
- publish before/after metrics.

Never:
- patch named POIs;
- alter Feature43 data just to improve ranking;
- add hidden exceptions;
- average away hard constraints;
- claim universal recommendation quality.

Suggested initial gates:
- expected-direction >= 95% on materially relevant POIs
- counter-direction <= 2%
- hard constraints = 100% correct
- deterministic replay = 100%
- unexplained score movement = 0

All exceptions must be in an anomaly ledger.

Required QA artifacts:
- probe-catalog.json
- probe-inputs.jsonl
- score-observations.jsonl
- rank-deltas.jsonl
- monotonicity-summary.json
- pairwise-anchor-checks.json
- hard-constraint-checks.json
- anomaly-ledger.jsonl
- config-before.json
- config-after.json
- calibration-summary.json
- deterministic-replay.json

Run:
TASK-090 tests
TASK-084 scoring
TASK-088 baseline
Canonical POI
Preference
Planning
Edge
Transport regressions where applicable
governance
full Node
lint
typecheck
build
deployment validate/build/artifact
format
git diff --check

Create Draft PR.

No auto-merge.

Return:

```text
BASE_DEVELOP
FINAL_HEAD
DRAFT_PR

probe count
POI evaluations per probe
total score evaluations

directional pass rate
counter-direction rate
monotonicity results

hard-constraint pass rate

anomaly count
anomaly classifications

config changed? yes/no
old config version
new config version

before/after sensitivity metrics

deterministic replay

full tests
exact-head Quality Gate

WBS 7.9.1 status
remaining blockers
```
