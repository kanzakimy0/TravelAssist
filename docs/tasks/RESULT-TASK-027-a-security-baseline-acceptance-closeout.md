# TASK-027-A Result — Security Baseline Acceptance / Integration Closeout

## Status

**Ready for review / 待审查.** The existing TASK-020-A implementation was integrated with `origin/develop@171900698180b80220017c9c4bec551b72792f27`, remediated only where the integrated tree exposed new security or regression failures, and rerun through the complete acceptance chain. PR #231 must remain Draft until explicit user acceptance and merge.

## Tracking

- WBS: 9.10
- Closeout Issue: #257
- Source Issue: #228
- Branch: `codex/a-global-security-baseline`
- Existing Draft PR: #231 → `develop`
- Integration merge: `ba2e3a3`
- Worktree: `.worktrees/task027-security`

## Integration and conflict audit

- The original Planner worktree and its untracked attachments were not modified.
- Latest `origin/develop` was merged normally into the existing implementation branch; no history rewrite, force push, clean or hard reset was used.
- The only textual merge conflicts were additive: package scripts retained both security and deployment commands; the Master WBS retained both security and all newer project records.
- Newly merged Auth, deployment, route, Home/Planner and asset files are included in current tracked/history/boundary scans.

## Security acceptance

- Scanner tests: **30/30 PASS**, including the new regression proving standard HTML password autocomplete tokens are not treated as embedded credentials while ordinary credential assignments remain detected.
- Tracked scan: **PASS**; 2,174 Git-listed files, 1,063 textual files / 25,517,574 bytes scanned, 1,108 binary and 3 oversize exclusions, 32 reviewed exact allowlist occurrences, 0 unresolved findings.
- Reachable-history scan after the implementation commit: **PASS**; 736 commits / 7,858 objects, 3,494 textual candidates / 95,546,034 bytes scanned, 1,088 binary and 4 oversize exclusions, 94 reviewed exact allowlist occurrences, 0 unresolved findings.
- AST boundary: **PASS**; 267 source modules, 39 client entries / 168 reachable client modules, 0 findings.
- Production canary build: **PASS** with five random synthetic server values and an unreachable loopback DB; no real credential or cloud connection was used.
- Browser bundle: **PASS**; 47 emitted files, 46 textual / 3,822,489 bytes scanned, 1 binary exclusion, 0 findings and 0 canary leaks.
- No suspected credential value is reproduced in this Result. Allowlist entries remain exact path/category/fingerprint/scope/reason/expiry records and expire no later than 2026-12-10.

## Integrated-tree remediations

- Blank the non-secret observability mode in `.env.example`; runtime/local rehearsal defaults remain owned by the environment contract rather than the committed env template.
- Mark the Planner route entry as server-only because it reads private route-evaluation environment flags.
- Teach the scanner that standardized HTML `current-password` / `new-password` autocomplete values are UI vocabulary, not secrets; dedicated negative regression added.
- Add narrowly reviewed exact allowlist records for newly merged synthetic Auth, deployment and visual-QA fixtures plus public QA evidence; no wildcard/path-wide/vendor-wide exception was added.
- Make typecheck run Next's documented `next typegen` before `tsc --noEmit`, so a clean CI checkout obtains generated image/route declarations without tracking `next-env.d.ts`.
- Repair two integrated baseline regressions needed by the full-suite gate: duplicate validation now de-duplicates identical paths shared by canonical and legacy inventories, and the coral-palette test registers the existing TypeScript resolver before importing an extensionless module graph.
- Regenerate the asset source catalog and legacy inventory to include newly merged Home/design assets; no protected asset source was changed.

## Validation

- `npm ci`: PASS; 396 packages audited, 0 vulnerabilities reported by npm.
- `npm run test:security`: 30/30 PASS.
- `npm run security:scan`: PASS.
- `npm run security:history`: PASS.
- `npm run security:boundary`: PASS.
- `node --experimental-strip-types --test tests/*.test.mjs`: **741/741 PASS**, 0 skipped.
- `npm run assets:validate`: PASS.
- `npm run test:assets`: 45/45 PASS.
- `npm run test:asset-variants`: 51/51 PASS.
- `npm run lint`: PASS.
- `npm run typecheck`: PASS after `next typegen`.
- `npm run security:build`: PASS.
- `npm run security:bundle`: PASS.
- Changed-file Prettier and `git diff --check`: PASS in final verification.

## Deferred / exclusions

- Binary contents, oversized text objects, ignored private environment files, external credential stores, dangling/reflog-only objects, unfetched refs and external LFS payloads are outside scanner coverage; no zero-risk claim is made.
- No credential validity check, revoke/rotation, history rewrite, branch-protection mutation, penetration test, CSP/rate-limit work, cloud deployment or production access was performed.
- Browser interaction QA and Local Supabase runtime are not applicable to this security-only closeout and are not claimed.
- Remote GitHub checks remain authoritative after push; PR #231 stays Draft and Issue #257 stays open until user acceptance.

## Ready for review

**Yes.** WBS 9.10 remains `待审查`, not `已完成`.
