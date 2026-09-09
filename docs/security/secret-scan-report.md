# TASK-020-A redacted scan report

## TASK-027-A integrated acceptance refresh — 2026-09-10 JST

This section supersedes the inventory counts below for the current PR head while preserving the original TASK-020 evidence as history. The existing branch was normally merged with `origin/develop@171900698180b80220017c9c4bec551b72792f27` and rescanned without credential-store access or history rewriting.

| Scope              | Current integrated evidence                                                                                                                   | Unresolved |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- | ---------: |
| Tracked            | 2,172 files; 1,061 text files / 25,504,982 bytes; 1,108 binary and 3 oversize exclusions; 34 exact reviewed occurrences                       |          0 |
| Reachable history  | 726 commits / 7,749 objects; 3,437 text candidates / 91,925,878 bytes; 1,088 binary and 4 oversize exclusions; 101 exact reviewed occurrences |          0 |
| Production browser | 47 emitted files; 46 text files / 3,822,489 bytes; 1 binary exclusion; five synthetic private canaries                                        |          0 |

The exact allowlist now contains 74 reviewed entries, all expiring by 2026-12-10. Additions are limited to newly merged synthetic Auth/deployment/visual-QA fixtures, public QA evidence and one historical non-secret env enum. Standard HTML password autocomplete tokens are handled by a tested semantic exclusion rather than unstable bundle-path exceptions. See `RESULT-TASK-027-a-security-baseline-acceptance-closeout.md` for the complete validation record.

Date: 2026-09-09 (JST). Base / final fetched develop:
`74bc3cccf8bcfd603706e2b96d4072076191f308`.
Implementation branch: `codex/a-global-security-baseline`; Issue #228.
See [baseline](secret-scanning-baseline.md) for limits and commands.

## Verdict

No confirmed real secret or unresolved candidate within the scanned text scope.
No raw suspected values printed. No rotation is presently indicated by these
results; this is not a claim about excluded files, credential stores or external
systems. No history rewrite performed or authorized.

## Evidence snapshot

The pre-publication snapshot (new tool/test files staged, before these final
tracking documents) recorded:

| Scope              | Input inventory                                              | Text scanned | Binary skipped | Oversize skipped | Unresolved | Reviewed occurrences |
| ------------------ | ------------------------------------------------------------ | ------------ | -------------- | ---------------- | ---------- | -------------------- |
| Tracked            | 1,956 files                                                  | 891          | 1,062          | 3                | 0          | 15                   |
| Reachable history  | 623 commits / 6,442 objects; 3,844 text-or-binary candidates | 2,754        | 1,086          | 4                | 0          | 76                   |
| Production browser | 39 emitted files / 3,665,687 bytes                           | 39           | 0              | 0                | 0          | 0                    |

History scanned 50,690,445 text bytes. Later tracking commits add their own
documents/objects; final rerun counts are recorded in the Result/Issue, without
trying to embed a document's own commit SHA into itself.

## Candidate classification

| Category                         | Tracked reviewed occurrences | History reviewed occurrences | Unresolved |
| -------------------------------- | ---------------------------- | ---------------------------- | ---------- |
| Generic credential               | 11                           | 51                           | 0          |
| URL credentials                  | 1                            | 10                           | 0          |
| Supabase secret marker           | 1                            | 7                            | 0          |
| Supabase public marker           | 2                            | 5                            | 0          |
| JWT token                        | 0                            | 3                            | 0          |
| All other implemented categories | 0                            | 0                            | 0          |

These are occurrence counts, not distinct secrets. Local review found legacy
synthetic DB/Auth/redaction/negative fixtures and prose/method-label false
positives. The exact **42** scope/path/category/fingerprint/reason/expiry entries
are in [allowlist](../../tools/security/allowlist.json). Nothing was externally
validated, rotated or revoked.

Representative redacted references:

| Safe path                                     | Category           | SHA-256 fingerprint                                              | Disposition                                                                                |
| --------------------------------------------- | ------------------ | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| docs/tasks/RESULT-WBS-5.3-b-auth-user-flow.md | generic-credential | 89c683ba0c58f5476cbf99708eb50702e2e109a3f88f9b3e2c2a2009846f9035 | Historical UI accessibility prose, exact history exception                                 |
| .next/static/chunks/0cz1d0mv5g_q7.js          | generic-credential | 3ae0bee5b219aaba7becdbac128607d0471ee3008d5eca4da98dbdcc23673da9 | URL-parser property-copy expression; rule corrected, regression added, no bundle exception |

Outstanding confirmed critical/high/medium/low secret findings: **0/0/0/0**.
This does not assign “safe” status to unscanned binaries/oversized material.

## Explicit exclusions

| Path                                                        | Size bytes | Scope                 |
| ----------------------------------------------------------- | ---------- | --------------------- |
| docs/assets/catalog/core-source-jobs.v1.jsonl               | 11,254,077 | Current + history     |
| docs/assets/catalog/japan-destination-open-evidence.v1.json | 8,144,333  | Current + history     |
| docs/assets/catalog/japan-destination-open-evidence.v1.json | 8,134,433  | Historical older blob |
| docs/evidence/WBS-5.10-B-FOLLOWUP-1/screenshots.zip         | 14,229,381 | Current + history     |

These exceed the 4 MiB per-object cap and were **not decoded/scanned**.
Binary counts include images/media/fonts. No OCR/archive extraction.
Ignored private environments, credential stores, unfetched refs, dangling/reflog
objects and external LFS payloads were not accessed.

## Boundary / log evidence

- 214 current source modules audited; 34 client entries / 150 reachable modules.
- Existing independent browser Auth compilation: 64 dependency modules, 31
  production JS chunks, 22 Auth-related source files; no server module/key leak.
- Actual Next production build PASS with five in-memory synthetic private env
  canaries and unreachable loopback DB. Exact canaries absent from all 39 browser
  assets; zero private env/provider/DB markers.
- Existing app Auth/DB/Mapbox code required no UI or schema rewrite.
- Hardened ignore patterns and the legacy client-bundle assertion output.
- Added failing CI gates where only auto-PR/merge workflows previously existed.
  No branch-protection setting changed; remote CI outcome is tracked separately.

## Validation / limitations

29 security tests and 660 full Node tests PASS, including real temporary Git
history with a deleted synthetic secret and synthetic commit-message finding.
Lint, typecheck, production build, bundle and staged diff PASS.
All 28 full-repository Prettier failures are unchanged upstream Markdown files:
Git-normalized blob hashes equal the final develop baseline; zero new failures.
Changed/new security code/docs formatting PASS (WBS intentionally retains its
existing ignored format).

Heuristic signatures do not detect every obfuscated, encoded, short, unknown
provider credential or indirect runtime leak. The AST boundary is not a formal
proof. Expiring allowlist requires ongoing review. No cloud Auth/DB runtime,
penetration test, CSP/rate-limit work or production deployment is claimed.
