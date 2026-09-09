# TASK-027-A — WBS 9.10 Security Baseline Acceptance / Integration Closeout

- Issue: #257
- Owner: A / Shared Infrastructure / Security
- WBS: 9.10
- Source task: TASK-020-A
- Source PR: #231
- Existing branch: `codex/a-global-security-baseline`
- Status: Ready

## Objective

Refresh PR #231 against latest develop and rerun the complete secret-leakage/security baseline over all newly merged files, history-reachable text, client/server boundaries and production bundles.

## Required work

- Reuse the existing scanner and exact allowlist; do not build a second scanner.
- Merge latest develop into the existing branch.
- Re-run tracked-file scan, reachable-history scan, AST server-only boundary checks, browser bundle canaries, env/public-name checks and CI security gate.
- Re-audit allowlist entries and expiry/reason/path specificity.
- Newly introduced workflows/config/files since the old base must be included.
- Findings must never print suspected secret values; use redacted type/path/fingerprint only.
- Run full tests, lint, typecheck, actual production build, changed-file formatting and diff checks.
- Update Result/WBS/Issue/PR. Passing implementation remains `待审查` until user accepts and merges.

## Boundaries

No credential-store access, external credential validation, rotation/revoke, history rewrite, branch protection mutation, production deployment, 9.9 or unrelated business changes.

## Final result rules

Before returning:

- update the task Result;
- update the current Master WBS truthfully;
- synchronize Issue/PR tracking;
- commit and push all task-owned changes;
- report exact commands/tests run and exact Deferred items;
- stop. Do not start the next task automatically.
