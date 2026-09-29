# RESULT — TASK-088-A Trusted Feature43 Baseline Runtime Adoption

Status: **PASS_BASELINE_RUNTIME / DRAFT_REVIEW**. Issue #455. Branch `feature/a-trusted-feature43-baseline-runtime` from `origin/develop@3fab703d13694fd1205679c96fb8d1d2e8549fbc`. No PR auto-merge. WBS 7.4.3 = **待审查**, not completed.

## Governance transition

The user explicitly adopted the existing internal Feature43 database as a trusted scoring baseline. TASK-087-B / [PR #454](https://github.com/kanzakimy0/TravelAssist/pull/454) remains the historical audit: zero cells passed its former per-cell promotion gate, and its evidence limitations are not rewritten. Dataset-level trust, exact Canonical identity, source hash and runtime integrity now authorize internal baseline use. The ratings are not live/current facts and are not redistributed through the public Detail API.

TASK-081-B / [PR #437](https://github.com/kanzakimy0/TravelAssist/pull/437) remains an unmerged Draft reference. Its 17 inferred observations are 8 equal and 9 different from the trusted workbook baseline. No averaging or overwrite occurred.

## Frozen input and output

- Source: v1.66 `data/poi/full/registry/travelassist-japan-poi-master-registry-v1.66-B-5xxxx-7xxxx-feature43-phase2c-review-v2.xlsx`; SHA-256 `b396723fbe1ed326fc205b7b259dd992019120182ad35044c2a96bd8a54d4014`.
- Base admitted Canonical dataset: `task-083-a-pilot100-v1`; semantic SHA-256 `802785ddb24e720698c2813f1f9dce29fe6792cdf02dbd01e9557b385a88bda2`. It remains unchanged with 100 `features:null` values on disk.
- Trusted baseline artifact: `src/shared/data/canonical-poi-pilot100.feature43-trusted-baseline.v1.json`; revision `task-088-a-pilot100-feature43-trusted-baseline-v1`; semantic SHA-256 `f77a6afd7e37fe6d6e1ea42fc7f0f411761748c06bb11a1c574cee7d26326b24`.
- Manifest: `src/shared/data/canonical-poi-pilot100.feature43-trusted-baseline.manifest.v1.json`; `trustPolicy=TRUSTED_INTERNAL_BASELINE`, `baselineAttachAuthorized=true`, `candidateCorpusAuthorized=false`, exact 100 IDs/codes/UUIDs and deterministic rebuild version `TASK-088-A-v1`.

The builder uses only the pinned workbook, TASK-083's admitted sample/dataset/manifest and the current single Feature43 registry. Exact UUID, historical code lineage, name/prefecture check, QID support, current internalId and active Master Code were checked. No candidateKey or fuzzy name/coordinate join authorized a row.

| Gate                                                          |         Result |
| ------------------------------------------------------------- | -------------: |
| Exact Canonical internalId / Master Code / legacy UUID        | 100 / 100 each |
| Ambiguous / name-only joins                                   |          0 / 0 |
| Source numeric cells / valid 0–9 cells                        |  4,300 / 4,300 |
| Baseline POIs at 43-of-43                                     |      100 / 100 |
| Current base dataset non-null / server-side attached baseline |      0 / 4,300 |
| ID rebind / unexplained value mutation                        |          0 / 0 |

Every feature code 01–43 has 100/100 baseline coverage; details are in `docs/qa/TASK-088-A/coverage-and-identity.json`.

## Runtime and scoring

`src/server/poi-runtime/repository.ts` statically imports the exact baseline and manifest, then validates scope, hashes, base dataset, Feature43 registry, ordered identities, value domain and source binding before attaching a versioned in-memory layer. Unknown/candidate IDs return null; altered artifact, reordered rows, changed code, changed source hash or unauthorized manifest fail closed. The original Candidate corpus remains unauthorized, and the original Canonical identity file is not changed.

The server-only repository returns 100/100 valid Feature43 sets to exact-ID lookups and internal iteration. Its Search candidate handoff retains the base records with `features:null`, so restricted internal ratings are not expanded into that future public path. The actual unmerged TASK-084-A / [PR #451](https://github.com/kanzakimy0/TravelAssist/pull/451) `scoreAuthorizedCanonicalPoiV1` service at head `a2b82fcb4a5e5b95025e603be9f315fb21d4b007` was imported read-only against this repository: 100/100 recognized and **100/100 scored**, zero `FEATURE43_UNAVAILABLE`. No scorer implementation was copied into TASK-088. This is data-path compatibility only, not ranking quality or a merged production service.

For dynamic codes 27–43, `selectEffectiveFeature43` accepts only sourced, same-scale, bounded current facts; fresh facts override the baseline, stale facts do not. Closure/accessibility booleans remain hard-constraint inputs in TASK-084 rather than fabricated 0–9 replacements. No live provider/source was invented. Public Detail redacts the restricted internal baseline values (100/100 responses remain `features:null`) while the server-only scoring path reads them.

## QA

- TASK-088 targeted + TASK-083 runtime: 12/12 PASS; tamper/reorder/hash, candidate rejection, 100/100 Detail redaction and live-over-baseline tests included.
- Full repository Node regression: 2,782/2,782 PASS, with bundled Python explicitly on PATH for the existing offline Python test. An initial Windows run without that PATH had one environment-only failure.
- Lint: 0 errors, 10 existing warnings. Typecheck, deployment environment validation, Next production build, standalone artifact audit (1,908 files), artifact verification, repository formatting and `git diff --check`: PASS.
- Deterministic rebuild `--check`: PASS.
- TASK-083's separate byte-exact QA replay still fails on this Windows LF checkout because its frozen sample-manifest SHA is CRLF-based (`77e239...` versus LF `6d6187...`). The unchanged TASK-083 Canonical tests and 100 identity bindings pass. This is a pre-existing cross-platform replay limitation, not an unexplained Feature43 mutation.

## Remaining gates

PR #451 is still Draft/unmerged. Its old boundary test expects 100 missing Feature43 sets and must be updated when branches are integrated; the cross-branch service smoke above confirms the implementation accepts the new baseline. The current-fact resolver is tested but no live provider is authorized or introduced here. User review and normal merge are required before WBS 7.4.3 can be marked completed. Recommendation calibration/Top-N quality remains TASK-084-A work.
