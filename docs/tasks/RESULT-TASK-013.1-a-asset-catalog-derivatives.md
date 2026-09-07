# TASK-013.1-A Result

## Status

**Completed / 已完成**. On 2026-09-08 the user explicitly authorized acceptance, merge and continuation of TASK-013.2. PR #172 merged as `b635465c623a4e628c9c9986253ee9266be39541`; its file tree is identical to accepted head `2cb487284572a24eaf6f4cc5ab98a5099501f23a`. Current rerun evidence below supersedes the historical 2026-09-07 delivery counts and Draft status.

## Acceptance rerun — 2026-09-08

- Integrated actual develop `e98a715a11e4a4ee9bdc196854558a5a02b1753c` in merge `4ea365d`; no conflicts and no rewritten history.
- Refreshed full inventory: 1,141 sources / 1,141 unique paths / 0 uncatalogued; 320,963,446 original bytes. Scope: runtime 74, protected legacy 32, design 16, preview 6, documentation 1,013. Referenced 179 / orphan 962; 46 protected; 72 exact duplicate groups; 125 unresolved references.
- 69 approved SVG sources / 364 vector tokens. 1,062 unapproved rasters / 3,186 unavailable S/M/L records. Total logical variants 3,550; eligible raster 0; new physical files/bytes 0; processing errors 0. No rights promoted.
- Clean install passes (362 packages; audit 0 vulnerabilities). Latest integrated pipeline passes catalog, derive, verify, review, 51 variant tests, 44 parent tests, lint, build and typecheck.
- Full format check fails on **30 unchanged develop documents**, verified individually against the current base. Exact list: `docs/assets/generated/variant-format-baseline.json`. The acceptance audit accepts an explicit base through `ASSET_ACCEPTANCE_BASE`, retaining its historical default.
- Repeated normal runs skip 1,141 unchanged sources, write 0 files/bytes and have no canonical differences. Full normal/second/resume evidence is recorded in `docs/assets/generated/variant-repeat-verification.json`; nightly truthfully returns nonzero for the independently verified format debt.
- Desktop 1440×1000 and mobile 390×844 offline browser review repeated: 433 images decoded each, no failed images, overflow, page errors or external requests; screenshots visually inspected.
- Full repository tests on the clean committed acceptance tree: **406/406 passed**, no skips. The initial B QA working-tree scope failure during uncommitted A edits resolved after commit; no unrelated test changed.
- No differences from develop in `src/features`, `src/app`, original `public` assets or Personal Center source assets. Existing dirty UI worktrees and preview remain untouched.

The following delivery sections preserve historical implementation context; current inventory and format totals are those above and in the regenerated reports.

Final tracking: Issue #116 completed; WBS 2.14 / Task 已完成. Documentation closeout branch `codex/task-0131-final-acceptance`; final closeout Commit/PR are recorded in Issue #116. TASK-013.2 can begin only after this completed WBS/Result record reaches develop. No production photographs were approved by this acceptance.

## Prerequisite

- TASK-013-A / [Issue #112](https://github.com/kanzakimy0/TravelAssist/issues/112): Closed / completed, final acceptance recorded.
- Parent [PR #166](https://github.com/kanzakimy0/TravelAssist/pull/166): merged as `aee2eaec3ac841395de1737a3042a112ad6fa6ea`.
- Acceptance closeout [PR #167](https://github.com/kanzakimy0/TravelAssist/pull/167): merged as `c38d8c87ab8acd2b10551e6dfefb0398968264ae`.
- Parent Result, actual manifest / registry / tools / shared assets are present on develop. WBS 2.13 is 已完成. All five gates A–E passed before implementation.

## Tracking

- Issue: [#116](https://github.com/kanzakimy0/TravelAssist/issues/116), Open.
- WBS: 2.14, dependency 2.13; no occupied ID overwritten.
- Branch: `feature/a-asset-catalog-derivatives` → `develop`.
- Historical documentation branch base: `4c1d9bbf1311a10b1e9db5bde00fe2e7b12fccab`.
- Actual implementation base / develop at execution: `c38d8c87ab8acd2b10551e6dfefb0398968264ae`.
- Latest integrated develop: `707bcc8d2af14a86032181be63573beb3aea3e17`; two new B governance documents preserved without edits.
- Safe parent/develop integration: `3fa1ca3`; no rebase, force push, reset, clean or cherry-pick.
- Implementation commit: `b1d06e8ca8f230f69f1cd995871c99646f569f43`; final documentation tracking commit is the PR head and is recorded in Issue #116.
- Draft PR: [#172](https://github.com/kanzakimy0/TravelAssist/pull/172), Open / Draft, not merged.

## Conflict Audit

Open PRs #139, #106, #76, #72 and #68 checked, including changed-file lists. #72 overlaps package / lock files; this task only adds seven asset scripts and exact development dependency sharp 0.35.4. No DB dependencies are copied, deleted or updated. The lock change promotes the already present sharp version from optional-only to an explicit dev dependency; no package upgrades.

#68 owns separate Personal Center asset tools. #76 assets are read-only. Existing WBS owners/statuses remain intact. New #168 / merged #169–170 add governance docs only. Existing dirty Planner worktrees and the live 3113 preview are untouched. No UI, route, background, map or user-state files changed.

## Full Asset Inventory

| Measure                          |          Actual |
| -------------------------------- | --------------: |
| Scanned / catalog / unique paths | 311 / 311 / 311 |
| Uncatalogued                     |               0 |
| Source bytes                     |     113,837,642 |
| Runtime-source scope             |              69 |
| Legacy-protected scope           |              32 |
| Design-source scope              |              16 |
| Preview-only scope               |               6 |
| Documentation-only scope         |             188 |
| Referenced / orphan              |       171 / 140 |
| Manifested / unmanifested        |        69 / 242 |
| Protected across all scopes      |              46 |
| Exact source duplicate groups    |              16 |

Scope counts are mutually exclusive; protected is an overlapping flag. Metadata includes two asset-manifest JSON files. All documentation images are included, including unreferenced evidence. Symlinks and generated files are excluded from sources by safety policy. Literal imports / require / URL / CSS / Markdown / HTML and manifest references are recorded with source lines. There are 112 unresolved historical or computed references, not 112 proven broken runtime images. No deletion is inferred from orphan status.

## Eligibility

- Eligible production raster: **0**. Existing photographs do not have approved parent-manifest grants; no authorization has been invented.
- 242 unmanifested-review-required files: 232 rasters, eight SVGs and two metadata documents.
- 69 approved SVG sources: vector-token-only, not raster-eligible.
- Animated / video / font sources: 0 / 0 / 0 in this actual repository inventory; registration-only behavior tested.
- Nonlocal catalog: 125 acquisition-required requests; provider-only 0. They are not counted as fictitious local source files.
- Unknown role, unsupported format, no cache/derivative permission, expired/rejected grants, corrupt data and byte/pixel limits have machine-readable block reasons.

## S / M / L

| Profile | Physical | Alias | Unavailable |
| ------- | -------: | ----: | ----------: |
| sm      |        0 |     0 |         232 |
| md      |        0 |     0 |         232 |
| lg      |        0 |     0 |         232 |

All eligible-production-source resolution equations are 0 = 0. The 696 unavailable rows deliberately expose legacy raster gaps rather than disappearing from expected counts. Actual processing is tested with temporary artificial-color raster fixtures: S/M/L, source-limited aliases, identical encodings, independent-source duplicates and undersized special profiles. A 120×80 fixture remains 120×80, with one physical generic file and two degraded aliases; no enlargement.

## Special Profiles

21 raster profiles are defined: three generic plus 18 role-specific profiles (Hero/background desktop/mobile, region tile, three cards, map popup/pin, timeline/search, share JPEG, favicon/touch/PWA PNG and state panel). All dimensions/quality/budgets live in the single profile JSON.

Applicable production raster special expectations / physical / aliases / review / unavailable: **0 / 0 / 0 / 0 / 0**, because no local raster has an approved, declared parent role. This is not a claim that special photos were delivered. Complete role mappings, actual WebP/JPEG/PNG encoding, explicit brand selection, safe padding, focal crop and missing-special fallback are exercised by tests.

## Vector Tokens

- 38 POI/transport icons × six tokens = 228.
- 12 markers × five tokens = 60.
- 19 placeholders/state illustrations × four tokens = 76.
- **364 tokens**, referring to 69 original SVGs; no duplicated SVG files.
- Total logical variants: **1,060 = 364 vector-token + 696 unavailable**. Physical / alias / source-provided are zero in the production catalog.
- Eight unregistered legacy SVGs remain review-required source records, not silently approved display assets.

## Generated Output

- Production physical files: **0**; generated binary bytes: **0**; largest generated file: N/A.
- Root policy: `public/media/generated/v1/{stable-asset-key}/{profile}.{ext}`.
- Soft budget 50 MiB, hard 100 MiB; object cap 20 MiB and per-profile caps enforced.
- Original source total is not newly added Git data. Synthetic test binaries and browser screenshots live in ignored temporary directories, not Git.
- No new runtime photographs, AI images, downloads or cloud/CDN objects.

## Rights / Privacy

Scanning preserves parent rights and the 22 legacy AI/illustrative source labels; discovered metadata does not approve derivatives. Provider-only/acquisition/unknown/rejected/expired sources cannot emit runtime derivative paths. Runtime lookup rechecks expiry and both sides of aliases.

Synthetic fixtures with test-only GPS / camera serial EXIF were actually encoded and decoded: outputs contain no EXIF/XMP/IPTC, and keep only built-in sRGB ICC. Auto-orientation verified. Missing focal point cover is review_required with runtimeUsable=false; impossible protected safe areas stay unavailable/review. No face recognition, token, cookie, private license file or third-party hotlink was added.

## Original Protection

Source modified **0**; deleted **0**; renamed **0**; protected SHA changed **0**. All 311 source hashes are compared before/after night runs. Git diff against integrated develop is empty for public originals, design Personal Center assets, src/features and src/app. Parents' actual manifest/rights records are unchanged.

## Nightly Behavior

Default concurrency 2, configurable 1–4; sharp worker concurrency 1 and cache 64 MiB. Source limit 50 MiB / 80 MP; one retry per profile. Atomic writes, ignored checkpoint, per-source progress, SHA/policy/encoding cache, no automatic unknown-file pruning.

Normal execution, --resume, --rebuild, --dry-run and --verify-only are available. Young/live/cross-host locks cannot be stolen; stale recovery requires >12h and a dead local PID. Controlled interruption resumes without regenerating the completed source. Two independent byte-identical sources canonicalize to one physical file and resume with zero writes.

Initial and second complete nightly runs: sourceChanged=0, unnecessaryRegenerated=0, skippedUnchanged=311 after the initial catalog/derive pass. Required formatting failure deliberately returns exit 1, not a false green. Final integrated first / second / resume runs all completed: 19 canonical output files compared byte-for-byte, zero changes; resumeRecovered=311. Evidence: `docs/assets/generated/variant-repeat-verification.json`.

## Reports

Generated under `docs/assets/generated/`: all-assets-checklist, usage report, orphan list, variant matrix/statistics, duplicate, missing, oversize, focal review, processing errors CSV and nightly summary. Current processing errors **0**, source oversize **0**, focal-review production items **0**, duplicate physical outputs **0**.

Offline `assets/design/asset-library/previews/variant-review.html`: 1440×1000 and 390×844; 433 images decoded on each, zero failed images, zero horizontal overflow, zero page errors and zero external requests. Desktop/mobile screenshots were visually inspected and remain ignored. Committed browser and formatting JSON audits accompany the reports.

## Validation

| Command / check                                  | Actual result                                                                                                                  |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| npm ci (before and after sharp)                  | Passed, 362 installed packages; existing ESLint deprecation / unapproved unrs-resolver postinstall warning preserved           |
| npm install --save-dev --save-exact sharp@0.35.4 | Passed; only new direct dependency, Apache-2.0                                                                                 |
| npm audit                                        | Passed, 0 vulnerabilities                                                                                                      |
| assets:catalog                                   | Passed, 311 sources / 100% coverage                                                                                            |
| assets:derive                                    | Passed, 1,060 logical entries / 0 processing errors                                                                            |
| assets:verify-variants                           | Passed, 0 errors                                                                                                               |
| assets:review                                    | Passed; JSON/CSV/Markdown/HTML generated                                                                                       |
| assets:nightly normal / second                   | Processing, tests, parent validation, lint, build, typecheck passed; exit 1 for unchanged upstream format exceptions           |
| test:asset-variants                              | 51/51 passed, no skipped tests                                                                                                 |
| assets:validate / test:assets                    | Passed: 194 parent entries / 0 errors; 44/44 tests                                                                             |
| All repository Node tests                        | 318/318 passed, no skipped tests                                                                                               |
| lint                                             | Passed                                                                                                                         |
| typecheck                                        | Passed after build supplies Next route types                                                                                   |
| format:check                                     | Failed: 28 unchanged upstream documents on latest integrated develop; individually confirmed identical and failing on baseline |
| Task-owned formatting                            | Passed; WBS remains under existing repository exclusion                                                                        |
| build                                            | Passed; 21 static generation outputs; no cloud connection                                                                      |
| git diff --check                                 | Passed                                                                                                                         |
| Browser                                          | Two viewports / 433 decoded images each / no errors                                                                            |

Exact 28 format exceptions: `docs/assets/generated/variant-format-baseline.json`. The two newly integrated B governance documents explain the increase from 26 to 28. No unrelated owner files were reformatted. Earlier clean-install typecheck saw missing generated PageProps in an unchanged route; build generated those types, and subsequent typecheck passed without configuration changes.

CI is not claimed passed. All pushed commit subjects include [skip ci] to avoid the existing feature-push auto-create-and-merge workflow; publication is a manually created Draft PR. Workflows were not modified.

## Files Changed

- Seven npm asset scripts; exact sharp development dependency / lock; ignored checkpoint, fixture and temporary-file patterns.
- Two profile/policy JSON files, source JSON/CSV, usage map and variants JSON.
- Additive source/variant/responsive TypeScript API and optional safeArea/brand/profile presentation fields; existing parent API remains intact.
- Full scanner, guarded processor, verifier, report renderer, nightly entry and explicit acceptance utilities; parent legacy inventory excludes generated derivatives.
- 51 dedicated tests using actual temporary encoded images.
- Review HTML and all generated audit reports; Task / Result / WBS tracking.
- No business UI, source image, production secret, Provider, AI, Auth or DB change.

## WBS Update

2.14 was marked 进行中 only after the parent merged and was accepted. Now 2.14 is 待审查 and Task is 待验收; it must not be 已完成 until this PR is merged and accepted. Parent 2.13 remains 已完成; unrelated WBS entries preserved.

## Follow-ups

1. Review the Draft, profiles, rights gates and offline preview; do not auto-merge.
2. Approve/obtain legitimate source photographs through a separate asset acquisition task before processing production rasters.
3. Review the 242 unmanifested sources and 112 unresolved references; never delete them based only on this inventory.
4. Resolve the independently documented upstream format debt.
5. TASK-013.2 must wait for this parent to merge and pass acceptance. It was not executed.

## Known Limitations

- This is a functioning pipeline, not a delivered photographic collection. Zero eligible production raster is an honest rights outcome, not simulated image completion.
- Static usage extraction cannot prove all dynamic construction. Root metadata and unreferenced documentation visuals are cataloged conservatively.
- Approved SVGs use display bounds and must preserve intrinsic aspect ratio in future consumers.
- Profile versions and source-policy hashes govern caching. Originals are only audited, not migrated; stale/unknown outputs are reported instead of auto-pruned.
- Normal failures remove their own temporary writes; abrupt OS termination may leave ignored fragments and a lock requiring the documented safe recovery checks.
- No existing page consumes the new runtime API yet. CDN acquisition, storage, visual approval and future consumer integration remain separate tasks.
- Full nightly exit status stays nonzero for the 28 verified upstream format exceptions; no exception is silently treated as Passed.
