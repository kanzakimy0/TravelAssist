# RESULT — TASK-083-A Real 100 POI Canonical Admission + Runtime Import Gate

> Current authorization (2026-09-30): see [Canonical owner correction](RESULT-TASK-083-a-canonical-owner-correction.md) for the repaired LF supporting hash, updated runtime revision and five final lifecycle/access decisions. Earlier hashes below are historical checkpoints.

Status: **待审查 / [Draft PR #444](https://github.com/kanzakimy0/TravelAssist/pull/444), no merge**. Issue #438. Implementation branch `codex/a-task-083-real-poi-canonical-admission` from `origin/develop@2dcf22cca48b920d99bfad416c5e79b13e599327`, normally updated with `develop@ef388cdcd0ff5f15ebd404337b4ed29fb3435058` and latest `develop@511508c9a59c3b94c7d72cedbf5ff559da69ded8`.

## Outcome and scope

- Exactly 100 real v1.66 POIs passed the existing 14-gate Candidate Admission evaluator: `ADMIT=100`, `REVIEW_REQUIRED=0`, `BLOCKED=0`, `MERGE_TARGET=0`, `INSUFFICIENT_EVIDENCE=0`.
- Exactly 100 new active POI Master Codes were appended. The previous 51 entries were retained; the registry now has 151 entries and keeps `governanceStatus=candidate`.
- The Pilot-only runtime manifest authorizes exactly those 100 Canonical records. The original `data/poi/full/manifests/current-candidate-review.v1.json` remains `CANDIDATE_ONLY_NO_CANONICAL_IMPORT` with `runtimeImportAuthorized=false`.
- `features:null` for all 100. TASK-083 assessed **0/4,300 Feature43 cells**. No workbook score was copied, renamed Canonical, defaulted to 0, or defaulted to 5.
- TASK-081-B / PR #437 can resume scoring **only after user acceptance of this Task**. This Task does not execute TASK-081-B or WBS 7.9.

## Frozen source and eligibility

Source: `data/poi/full/registry/travelassist-japan-poi-master-registry-v1.66-B-5xxxx-7xxxx-feature43-phase2c-review-v2.xlsx`, SHA-256 `b396723fbe1ed326fc205b7b259dd992019120182ad35044c2a96bd8a54d4014`.

The `Registry` sheet has 10,585 rows and 10,585 unique valid `internal_uuid` values; 10,409 were marked `FROZEN`, 176 `RETIRED`. Workbook `FROZEN` was **not** treated as ADMIT. The workbook has no location coordinates, and the current canonical Region Graph has only 10 prefecture identities. A conservative source crosswalk found 500 frozen Wikidata-linked rows in those 10 prefectures and five directly mappable classes. Public Wikidata entity data was checked for exact Japanese label, single Earth coordinate within Japan, `P17=Japan`, `P131` ancestry to the workbook prefecture, and absence of recorded dissolution/end-date claims. 420 passed. Two target-specific official-source-linked rows (浅草神社 and GINZA SIX) were independently matched to Wikidata entities, coordinates and Tokyo administrative ancestry, bringing the frozen eligible pool to **422** across all seven Canonical classes.

Wikidata structured data is CC0; the runtime carries only the verified label/coordinate/identifier and a source locator, not website content. The workbook identity/classification is retained as `master_prior` reference-only metadata; official-site locators for the two targeted rows were not copied as content. The historical Geoshape coordinate corpus was not imported. Source pages were not exhaustively recrawled, and active lifecycle here represents an extant Canonical identity, not a live open/closed or timetable assertion. No visit profile, access anchor, live fact, or Feature43 score was inferred.

Eligibility is deliberately conservative, not a claim that all other v1.66 rows are permanently ineligible. The 15-prefecture diversity target cannot be met with only 10 canonical prefecture IDs in the current Region Graph; the frozen 100 cover all 10, with at most 11 in any one prefecture.

## Deterministic sample and identity

Classification order: `cityscape_landmark, culture_history, nature, experience, museum_art, religious_historic, shopping`. Within each classification, buckets are ordered by canonical `regionId`; within each bucket by `SHA-256("TASK-083-A|pilot100|" + internal_uuid)`, then UUID. One record per bucket is taken per round until 100. The result is 20/20/20/20/18/1/1 by class and 9–11 by prefecture. The 100 workbook UUIDs map only after uniqueness audit to `poi:` + lowercase UUID; no candidateKey, Provider ID, Region ID or old code is used as canonical identity.

- Sample: `data/poi/canonical/pilot-100/sample-manifest.v1.json`; SHA-256 `77e239e0b5092f38e85f1d4e7035cf2ece2956128b5c01dbabdffc11b08d2c82`.
- Selection membership/order SHA-256: `c6208f8e0540e0d2e284037d6b2c2f0c087e12dcfb8f5027658f7bcd3632d9a6`.
- Frozen pool and per-row source/QID/revision/selection proof: `data/poi/canonical/pilot-100/eligible-pool.v1.json`.
- Repeated sampling/admission verification: `node --import ./tests/register-route-ts.mjs tools/qa/task-083-pilot100.mjs`.

## Master Code audit

The pre-allocation occupied set had **15,617 distinct codes** and was built from the original 51-entry application registry, every v1.66 workbook code, agreed legacy claims, conflict ledger, code-lineage review, legacy-code-lineage collisions, combined candidate claims, and any explicit code in unmapped history. Unknown history with a blank code was never interpreted as an available code. The entire excluded-code set, source file hashes and 100 decisions are frozen in `data/poi/canonical/pilot-100/allocation-audit.v1.json`.

All 100 workbook code values were treated as historical, unadmitted claims, not automatically preserved. No claim had enough authoritative application lineage to be promoted merely on workbook `FROZEN`; 100 codes were instead taken from the lowest safe free numbers in their existing 7-class namespaces. New entries have `entityType=poi.<classification>`, exact canonical `entityRef`, `lifecycleStatus=active`, and `allocation_review` provenance. Existing validator and namespace grammar were not changed. Original registry parsing, new registry parsing, append-only transition and no-collision checks pass.

## Canonical runtime and handoff

- Dataset: `src/shared/data/canonical-poi-pilot100.v1.json`, revision `task-083-a-pilot100-v1`, semantic SHA-256 `802785ddb24e720698c2813f1f9dce29fe6792cdf02dbd01e9557b385a88bda2`.
- Registry: `src/shared/data/master-code-registry.v1.json`, revision `task-083-a-pilot100-r1`, semantic SHA-256 `f256679b7fa056242d386771e7d2c83d15121a52447de55742e320d8c5c2fa9e`.
- Admission results: `data/poi/canonical/pilot-100/admission-results.v1.jsonl`, SHA-256 `6b452e6a84fe337ee31ba545315ed81b11ff676781ec9bdcaa716925b59007c7`.
- Runtime authorization: `src/shared/data/canonical-poi-pilot100.runtime-manifest.v1.json`, SHA-256 `11fd42f2ded8cc45519767ba86b97bcb1123552550c7f6af6ee60af7436cdbf0`.
- TASK-081-B handoff: `docs/qa/TASK-083/pilot100-handoff.json`, containing all 100 internal IDs and codes in sample order, revisions and hashes, runtime module and QA entry point.

`src/server/poi-runtime/repository.ts` statically imports only the Pilot-100 dataset, its authorization manifest and the canonical registry. It validates scope, authorization, record count/order, content hashes, parser results, exact code bindings, and rejects tampering without a candidate fallback or request-controlled filesystem path. It exposes lookup, deterministic iteration and revision. The merged Detail route now defaults to this repository. Actual route smoke: 100/100 IDs returned 200; unknown Canonical ID returned 404; a Master Code and candidateKey used as route IDs returned 400. Corrupt dataset, manifest or registry failed closed. Detail DTO still projects only the accepted rights-safe fields. Search API / #433 was **not merged** into execution-time or latest `develop`; no cherry-pick or Search production wiring was done. A tested `findCandidates` structural adapter returns the complete bounded Pilot-100 set with revision for TASK-080's repository interface.

## Validation and review boundary

Machine QA: `docs/qa/TASK-083/pilot100-validation.json`; human QA and commands: `docs/qa/TASK-083/README.md`. POI parser, all 14 gates × 100, Master Code parser/transition, Region refs, source rights, null semantics, runtime smoke and Next production build pass. Historical TASK-041/043/045 generated QA snapshots were refreshed only because the append-only registry now has 151 entries; Region topology and its 50 allocations remain unchanged. TASK-068/070 and remaining-candidate replay retain byte-pinned original registry/tool snapshots and require the live registry to extend the original append-only; the candidate manifest remains untouched.

Full serialized Node regression: **2,756/2,756 PASS** with bundled Python available for the historical offline test. Focused Pilot runtime/Detail/Search-handoff tests: **5/5 PASS**. POI contracts 24/24, Master Code registry 15/15, Region integration 6/6 and Planning contracts 21/21 passed. Lint: 0 errors and 9 pre-existing warnings. Typecheck, Next production build, `deploy:validate:local`, `deploy:build:local`, `deploy:verify-artifact`, `format:check:deploy` and staged `git diff --check` passed. The standalone artifact inventory contained no workbook or candidate-corpus filename. Exact final PR-head GitHub Quality Gate is recorded after final push.

WBS 7.4.1 is `待审查`, not `已完成`. No PR was merged or configured for auto-merge. TASK-081-B remains blocked pending user acceptance of this handoff.

## Latest-develop refresh and reacceptance (2026-09-28)

Old PR head `21713eabfeb2e8507b30ed39bb84b5013bc9e199` was clean and diverged 4 behind / 3 ahead from `origin/develop@511508c9a59c3b94c7d72cedbf5ff559da69ded8`. A normal `git merge --no-ff origin/develop` created merge commit `c0472379629061fecc6f961a1b30e2827200b9a8` without conflict. The merge retained PR #445's directed Edge foundation and PR #446's Draft-only feature PR rule, deleted auto-merge workflow and governance regression tests. No TASK-082 Pilot data was regenerated or submitted.

Read-only TASK-083 QA still reports eligible pool 422, sample 100, 100 newly active POI Master Codes, all 100 ADMIT with 14/14 gates, zero review/blocked/merge/insufficient, and 0/4,300 Feature43 cells assessed. The dataset semantic SHA-256 remains `802785ddb24e720698c2813f1f9dce29fe6792cdf02dbd01e9557b385a88bda2`; runtime manifest SHA-256 remains `11fd42f2ded8cc45519767ba86b97bcb1123552550c7f6af6ee60af7436cdbf0`; candidate runtime import remains unauthorized. Actual Detail GET smoke passed 100/100. The TASK-082 read-only admission boundary now has an explicit regression proving it recognizes exactly 100 authorized nodes, 100 matching codes and no rejected nodes. Its separate negative test still rejects candidate-only authorization; only the obsolete assertion that the live registry must contain zero active POIs was removed.

The existing `npm run qa:poi-edge-pilot` deterministic replay is intentionally **not green** on this pre-merge TASK-083 branch: its frozen TASK-082 artifact says 0 Pilot POIs, while replay against the new authorized dataset expects 100. The check correctly identifies the admission change, then rejects the stale artifact (`pilot-poi-manifest.json differs from deterministic replay`). TASK-083 does not overwrite those frozen TASK-082 outputs or claim a completed Edge Pilot; TASK-082 resume must re-baseline its own real-Pilot artifacts after TASK-083 acceptance and merge. WBS 7.13 remains 阻塞.

Current local reacceptance: focused cross-domain suite 90/90 (including TASK-082/TASK-083 runtime 21/21), full Node regression 2,776/2,776 with managed Python, Master Code and Region transition QA, lint (0 errors, 10 warnings), typecheck, `format:check:deploy`, local deployment validation, production standalone build and artifact verification (1,908 files) passed. Repository-wide `format:check` still reports 3,007 unchanged historical files; all four modified files pass their direct Prettier checks. Exact-head GitHub Quality Gate must run on the final pushed PR head; the old #475 success is not a current merge gate.
