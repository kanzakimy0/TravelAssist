# TASK-071-A — WBS 9.10 Security 最终收口

Issue: #404
WBS: 9.10 — Secret 扫描 / 全局安全
Owner: A / Shared Infrastructure / Security
Priority: P1
Publication baseline: `develop@a16ea611b8fb24cfe751615d54a3828f7ef564ca`

## Existing implementation to reuse
- TASK-020-A / Issue #228
- TASK-027-A / Issue #257
- Existing implementation branch: `codex/a-global-security-baseline`
- Existing Draft PR: #231
- Do not create a replacement implementation branch or PR.

## Objective
Refresh and close the existing security baseline against execution-time latest `origin/develop`, resolve integration conflicts, rerun current-repository security coverage, and return PR #231 to a clean final-review state.

## Scope
- deterministic tracked-file secret scan;
- reachable-history text/blob scan with binary/oversized/LFS exclusions documented;
- env/public-name/NEXT_PUBLIC checks;
- server-only → client transitive boundary checks;
- production build synthetic private canary injection;
- browser bundle leakage scan;
- exact bounded allowlist review;
- security CI gate refresh;
- current-repository regression and deployment-local verification.

## Forbidden scope
- WBS 9.9 Rate Limit / Security Headers / CSP;
- credential store access;
- printing or committing real secrets;
- external credential validation;
- automatic rotation/revoke;
- history rewrite / force push;
- broad wildcard allowlist;
- disabling scanner/tests to pass.

## Integration procedure
1. Fetch latest `origin/develop` and existing `origin/codex/a-global-security-baseline`.
2. Record latest develop SHA and old PR #231 head.
3. Work on the existing implementation branch.
4. Merge latest develop normally into it.
5. Resolve conflicts by preserving both current develop behavior and security gate semantics.
6. Re-audit all new files/surfaces added since the old acceptance baseline.
7. Update scanner rules only where current repository structure requires it; coverage must not be reduced silently.
8. Push the same existing branch and update PR #231.

## Acceptance gates
- confirmed real secret in scanned scope: 0;
- unresolved current tracked finding: 0;
- unresolved reachable-history finding: 0, excluding explicitly documented undecoded scope;
- private synthetic canary in browser assets: 0;
- client import of server-only secret surface: 0;
- security fixture false-negative regression: 0;
- every allowlist rule exact/bounded/reasoned/expiring;
- raw secret value in logs/docs/Issue/PR/Result: 0;
- no history rewrite / force push;
- no 9.9 implementation;
- PR #231 reviewable against current develop.

## QA
Use current repository script names. At minimum run:
- `npm ci`;
- security focused tests;
- tracked scan;
- history scan;
- client/server boundary scan;
- production canary build;
- browser bundle scan;
- full relevant Node regression;
- `npm run lint`;
- `npm run typecheck`;
- production build;
- current deploy validate/build/artifact verification gates;
- task-owned formatting;
- `git diff --check`;
- exact final-head hosted GitHub Quality Gate.

Do not mark an unexecuted or failed gate PASS.

## Deliverables
- existing PR #231 updated;
- `docs/tasks/RESULT-TASK-071-a-security-final-closeout.md`;
- `docs/qa/TASK-071/README.md`;
- machine-readable security receipts under `docs/qa/TASK-071/`;
- refreshed security baseline docs where required;
- Master WBS 9.10 status synchronized.

## WBS
Execution start:
`A / 进行中（#404 / TASK-071-A / existing PR #231）`

After implementation + QA:
`A / 待审查（#404 / TASK-071-A；Draft PR #231）`

Only explicit user acceptance plus actual merge may set 9.10 to `已完成`.

## Stop condition
Do not auto-merge. Do not start 9.9 or another WBS automatically. Return a complete TASK-071-A Result for owner review.
