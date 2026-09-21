# TASK-071-A security closeout evidence

- Date: 2026-09-20 JST
- WBS: 9.10
- Issue: #404
- Existing implementation PR: #231 (Draft)
- Branch: `codex/a-global-security-baseline`

## Security evidence

| Gate                        | Result | Safe evidence                                                                                                                                                                     |
| --------------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Focused scanner regression  | PASS   | 31/31 tests                                                                                                                                                                       |
| Tracked secret scan         | PASS   | 2,755 tracked files; 1,600 textual files; 31,688,661 bytes; 1,148 binary and 3 oversized exclusions; 43 exact allowed occurrences; 0 unresolved findings                          |
| Reachable history scan      | PASS   | 1,338 commits; 14,638 reachable objects; 7,201 textual objects; 292,642,102 bytes; 1,138 binary and 21 oversized exclusions; 114 exact allowed occurrences; 0 unresolved findings |
| Client/server boundary      | PASS   | 381 source modules; 44 client entries; 199 reachable client modules; 0 findings                                                                                                   |
| Synthetic production canary | PASS   | Five generated private canaries; no real credential or external validation used                                                                                                   |
| Browser bundle scan         | PASS   | 48 files; 47 textual assets; 4,071,817 bytes; 1 binary exclusion; 0 findings and 0 canary leaks                                                                                   |

## Allowlist review

The allowlist has 102 exact entries. TASK-071-A adds 28 user-authorized records for reviewed synthetic fixtures, QA documentation examples, and instruction-field false positives. Each record has an exact path, category, SHA-256 fingerprint, scope, reason, and expiry of 2026-12-20. No wildcard, directory-wide, vendor-wide, or bundle exception was added. `allowlist-review.json` contains the safe metadata for every new record.

## Current compatibility fixes

- The Planner server page now declares `server-only` because it reads private route-evaluation environment flags.
- The scanner treats a quoted JavaScript property whose identifier and string value are identical as a self-referential field-name map, and retains detection for a distinct quoted credential value. The focused regression covers both conditions.

## Other gates

`npm ci`, full Node regression (2,678/2,678), lint, typecheck, normal production build, local deployment validation, local deployment artifact build, artifact verification, deployment formatting, and `git diff --check` passed. Existing Node module-type warnings were non-failing performance warnings only.

## Scope limits

The history scan covers locally reachable fetched refs. Binary and over-4 MiB objects, ignored private environment files, credential stores, dangling/reflog-only objects, unfetched refs, and external LFS payloads remain outside its decoded text scope. This evidence does not claim cloud runtime, credential validity, rotation, penetration testing, WBS 9.9 controls, or production deployment validation.
