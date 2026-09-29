# CODEX — TASK-081-B Real 100 POI Pilot

Execute `docs/tasks/TASK-081-b-real-100-poi-pilot.md` completely.

Start with:

```bash
git status --short
git branch --show-current
git fetch --all --prune
git rev-parse origin/develop
git log --oneline -15 origin/develop
git show origin/task/real-100-poi-pilot:docs/tasks/TASK-081-b-real-100-poi-pilot.md
```

Then create/use an isolated worktree from the latest `origin/develop` and run the real 100-POI Pilot.

Critical constraints:
- real canonical POIs only; no fixtures/synthetic substitution;
- deterministic 100-ID sample; no cherry-picking;
- evaluate all 43 Feature43 dimensions;
- never fill missing evidence with invented/default scores;
- preserve unresolved/low-confidence states;
- run schema + POI quality gates + lint/typecheck/relevant tests;
- test downstream consumption at the nearest authorized runtime boundary;
- write `docs/tasks/RESULT-TASK-081-b-real-100-poi-pilot.md`;
- commit artifacts and open a Draft PR to develop;
- DO NOT merge or enable auto-merge.

If a real-source dependency is unavailable, stop with BLOCKED/PARTIAL and document the exact dependency. Do not fall back to mock data.
