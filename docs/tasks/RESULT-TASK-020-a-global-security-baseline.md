# TASK-020-A Result

> TASK-027-A refreshed this implementation against the 2026-09-10 integrated tree. Current acceptance evidence is recorded in `RESULT-TASK-027-a-security-baseline-acceptance-closeout.md`; the remainder of this file preserves the original TASK-020 delivery record.

## Status

Completed — implementation and local acceptance complete; WBS 9.10 **待审查**.
Draft PR and human acceptance are not a develop merge.

## Base / Parallel State

- origin/develop base: `74bc3cccf8bcfd603706e2b96d4072076191f308`.
- TASK-019-A state: Issue #226; actual PR **#227** Open / Draft / unmerged,
  head `f0226b784ede9c310c3796d50edf2592455d117b`. #226 is not its PR.
- TASK-017-B state: #207 / PR #221 Open / Draft / Partial / unmerged,
  head `ae8b1e18ea713a2d86b1126178522e1752b1cb8d`.
- TASK-021-A #229 / Draft #230 remains unmerged; route work not imported.
- final develop integration: fetched again; unchanged at the base above.
  Independent clean worktree; no stacking/cherry-pick. Original dirty Planner
  worktree and its preview/env were left untouched. No other WBS status changed.

## Security Scan

- tracked files scanned: **895 text of 1,960 tracked files**, including all 15
  implementation/tracking files. Earlier report snapshot is explicitly dated.
- history commits/objects scanned: **624 / 6,468; 2,770 text objects scanned**
  after implementation commit `2969660`; earlier report baseline 623 / 6,442.
  A documentation-only publication commit necessarily adds reachable objects;
  its subsequent scan outcome is also recorded on the Issue/PR.
- binary/oversize skipped: tracked 1,062 / 3; history 1,086 / 4.
- findings by category: zero unresolved. 15 current / 76 historical reviewed
  fixture/prose occurrences; exact breakdown and exclusions in
  `docs/security/secret-scan-report.md`.
- confirmed secret values printed: **No**.

## Findings

- critical/high/medium/low counts: confirmed outstanding secret findings **0/0/0/0**.
- redacted finding references: report + 42 exact expiring allowlist entries.
  No blanket test directory, provider or public-token exception.
- rotation required: no confirmed real exposure found within scanned scope;
  excluded large assets/binaries/credential stores are not certified clean.
  Genuine later findings require owner-authorized rotation, never external key tests.
- history rewrite required: **No**; any future cleanup needs separate authorization.

## Engineering Controls

- scanner: bounded tracked + reachable Git blob/commit/tag + browser scans,
  redacted JSON/summary, deterministic results, nonzero finding/error exits.
- allowlist: exact scope/path/category/SHA-256/reason/expiry, 2026-12-09 review
  deadline, invalid/expired/duplicate/wildcard entries rejected.
- client bundle guard: real Next build with five isolated synthetic server
  canaries; zero browser leakage; private env/provider/DB signatures checked.
- server-only guard: TypeScript AST runtime import graph and public-env name
  allowlist, transitive DB/Auth/provider boundaries, dynamic access and risky logs.
- CI gate: read-only PR/push workflow; tracked/history/tests/boundaries/full Node
  suite/lint/typecheck/production canary build/bundle. No secret input, no source
  upload. Workflow added, **branch-protection enforcement not changed/claimed**.
- Minimal fixes: stronger ignore rules; TASK-016 bundle assertion no longer dumps
  whole chunk contents on failure. No new dependency/lockfile/UI/DB migration changes.

## Validation

- scanner tests: **29/29 PASS**, synthetic positive/negative/redaction/public vs
  secret/allowlist/binary/size/history deletion+commit text/determinism/AST cases.
- history scan: **PASS**, full reachable non-shallow refs, documented exclusions.
- lint: **PASS**.
- typecheck: **PASS**.
- tests: **660/660 PASS** full Node suite; no skipped tests.
- build: **PASS**, `security:build` invokes the installed Next production build
  with synthetic env and no real cloud DB dependency; captured logs never echoed.
- bundle scan: **PASS**, 39 production browser files, five private canaries absent;
  independent existing Auth audit PASS (31 JS chunks / 64 dependency modules).
  Its first sandbox-limited attempt could not traverse parent directories;
  authorized local rerun succeeded, no source workaround.
- format/diff: changed-file Prettier and diff **PASS**. Full
  `npm run format:check` exits 1 on **28 unchanged upstream Markdown files**;
  all normalized blob hashes match develop, zero new failures. Not reported green.
- npm ci: **PASS**, zero audit vulnerabilities reported at installation.
- Browser interaction QA / Local DB runtime: not applicable to security-only
  infrastructure with no UI or schema change; not claimed as executed.

## Tracking

- Issue: [#228](https://github.com/kanzakimy0/TravelAssist/issues/228), keep Open.
- Branch: `codex/a-global-security-baseline` → `develop`.
- Commit: implementation `296966016faf131b4a8cc1d008586dda965f1987`;
  following tracking-only commit records this PR without changing the controls.
- Draft PR: [#231](https://github.com/kanzakimy0/TravelAssist/pull/231),
  Open / Draft → develop; no auto merge.
- WBS updated: 9.10 进行中 → **待审查**, not 已完成.
- Task: `docs/tasks/TASK-020-a-global-security-baseline.md`.
- Baseline/report: `docs/security/secret-scanning-baseline.md`,
  `docs/security/secret-scan-report.md`.
- Changes: `tools/security/{rules,scan,boundary,build}.mjs`, exact allowlist JSON,
  independent TASK-020 tests, security workflow, package scripts, ignore rules,
  one redaction-safe legacy assertion, Task/Result/WBS/security docs only.

## Scope Preserved

- no real secret printed: **Yes**.
- no credential store access: **Yes**; original private preview env not accessed.
- no forced history rewrite: **Yes**; no clean/reset/force push/rotation/revoke.
- 9.9 / 10.x not claimed: **Yes**; also no 9.11 or later task.
- Existing Auth/DB/Planner/Personal Center/Mapbox behavior preserved.

## Ready For Review

**Yes** — local engineering acceptance complete, with explicit coverage and
existing-format limitations. Keep Draft pending user review; do not merge.
