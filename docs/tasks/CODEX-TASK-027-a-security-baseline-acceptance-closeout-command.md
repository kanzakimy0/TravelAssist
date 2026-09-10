# Codex Command — TASK-027-A

Execute TASK-027-A using existing PR #231 / branch `codex/a-global-security-baseline`.

Read:
- `docs/project/A-TASK-026-035-execution-plan.md`
- `docs/tasks/TASK-027-a-security-baseline-acceptance-closeout.md`
- `docs/tasks/TASK-020-a-global-security-baseline.md`
- `docs/tasks/RESULT-TASK-020-a-global-security-baseline.md`
- `docs/security/secret-scanning-baseline.md`
- `docs/security/secret-scan-report.md`
- latest `docs/project/WBS-TravelAssist.md`

Fetch latest develop, merge it normally into the existing branch, and rerun the security acceptance on the integrated tree. Never print a real/suspected secret. Never use force push or history rewrite.

Required validation includes scanner tests, full repository tests, tracked/history scans, AST boundaries, actual production build with synthetic canaries, browser bundle inspection, lint/typecheck and changed-file/diff checks.

Update WBS 9.10 to `待审查` only if current integrated acceptance passes. Keep PR #231 Draft and stop.
