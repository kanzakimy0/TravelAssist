# RESULT — TASK-083-A Real 100 POI Canonical Admission + Runtime Import Gate

Status: **待审查 / Draft PR, no merge**. Issue #438. Implementation branch `codex/a-task-083-real-poi-canonical-admission` from `origin/develop@2dcf22cca48b920d99bfad416c5e79b13e599327`.

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

`src/server/poi-runtime/repository.ts` statically imports only the Pilot-100 dataset, its authorization manifest and the canonical registry. It validates scope, authorization, record count/order, content hashes, parser results, exact code bindings, and rejects tampering without a candidate fallback or request-controlled filesystem path. It exposes lookup, deterministic iteration and revision. The merged Detail route now defaults to this repository. Actual route smoke: 100/100 IDs returned 200; unknown Canonical ID returned 404; a Master Code and candidateKey used as route IDs returned 400. Corrupt dataset, manifest or registry failed closed. Detail DTO still projects only the accepted rights-safe fields. Search API / #433 was **not merged** into execution-time `develop`; no cherry-pick or Search production wiring was done.

## Validation and review boundary

Machine QA: `docs/qa/TASK-083/pilot100-validation.json`; human QA and commands: `docs/qa/TASK-083/README.md`. POI parser, all 14 gates × 100, Master Code parser/transition, Region refs, source rights, null semantics, runtime smoke and Next production build pass. Historical TASK-041/043/045 generated QA snapshots were refreshed only because the append-only registry now has 151 entries; Region topology and its 50 allocations remain unchanged.

WBS 7.4.1 is `待审查`, not `已完成`. No PR was merged or configured for auto-merge. TASK-081-B remains blocked pending user acceptance of this handoff.
