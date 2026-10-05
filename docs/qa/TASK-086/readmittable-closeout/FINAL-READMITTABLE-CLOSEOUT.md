# TASK-086-B Final User-Directed Bounded Re-certification & Closeout

Authority: `03520a3a404ad0165664f46b9be6e2e98fd571ba`, dated user directive 2026-10-05; this implementation is dated 2026-10-06 (JST).

The amended product decision accepts a complete, fail-closed inventory classification. It does **not** claim a fully connected certified national graph. Historical BLOCKED findings, 251 certification roots and the earlier 253-entry combined blocker inventory remain unchanged at their existing paths.

## Bounded evidence pass

All 734 retained source descriptors and their evidence records were reprocessed through the existing strict source/node/edge/transfer certifier. Major JR corridors, Shinkansen/intercity continuity, metropolitan/private rail and gateway dependencies were reviewed first using 12 shared official terms pages. Findings and exact links are in `reviewed-evidence.json`; no additional equivalent queries will run. New web observations are semantic observations, not invented HTTP-body hash receipts. Token and billing usage are **UNKNOWN**; dynamic model switching is not exposed in this session. No new agents were used.

Two existing P05-22 MLIT source descriptors were repaired using their already retained, actually hash-matching archives, existing official dataset/catalog and CC BY 4.0 terms observations, and explicit attribution. Raw candidates/evidence and original descriptors remain unchanged. Newly certified: **2 sources, 0 nodes, 0 directed edges, 0 transfers**. Other dependencies still prevent affected node admission. Recovered high-value corridors/gateways: **0**.

## Final inventory

| Kind | Frozen candidates | Route enabled | Route disabled |
| --- | ---: | ---: | ---: |
| Nodes | 4061 | 1174 | 2887 |
| Directed edges | 9409 | 2460 | 6949 |
| Transfers (subset of edges) | 1072 | 37 | 1035 |
| Sources | 734 | 49 | 685 |

All disabled entities are future READMITTABLE; none was labelled REJECTED without contrary evidence. Transfers also appear as directed edges, so do not add these columns to infer unique physical entity counts. Terminal roots: **251**; certified source-binding root: **1**; accepted readmittable exclusion roots: **250**; pending acceptance roots: **0**.

The five native Nagasaki GTFS platforms retain certified identity and their actual boarding/alighting restrictions. Their absent extra direction/public walk is recorded as an unavailable coverage relationship; no existing valid one-way service is erased and no reverse/walking edge is invented. The historical special-scope obligation is mapped to its retained 152 required nodes and incident directed edges/source dependencies. The old stale scope proofs are not rewritten or borrowed as current PASS results.

## Authoritative contract and export

- `routing-eligibility.json`: certified node/edge/transfer/source IDs, frozen input/code hash and sealed export/exclusion/root hashes.
- `route-disabled.jsonl`: one terminal exclusion per typed stable entity ID, sources/evidence/endpoints/root IDs, import/traversal false and future re-admission requirements.
- `root-dispositions.jsonl`: all 251 retained root IDs, actual retained evidence/official observation attempts and terminal decisions; immutable historical ledgers remain visible.
- `route-enabled/`: certified-only graph, transfers, patterns, evidence and authorized source descriptors.
- `closeout-summary.json`: 16 national corridor, 10 regional and 86 gateway passenger-query results; unsupported routes remain unavailable. No national connectivity PASS.

`tools/transport/task-086-routing-eligibility.mjs` is the WBS 7.16 eligibility/export boundary only. No Planner, production import, provider or UI integration is performed. Loading checks actual frozen input and each sealed file. Export payload hashing rejects same-ID reversal, changed boarding restrictions, synthetic transfers, aliases and invented metrics. Unknown stable IDs fail closed. Eligible topology is not a guaranteed real-time or passenger-access route.

Reproduction: `node tools/transport/task-086-routing-eligibility.mjs`. This uses the same strict production certification code in an isolated scratch directory and never overwrites historical QA.

## Validation and publication

Candidate input/code SHA: `e7b0effcf08c7282a9d75ae71cb79a36478a36a30b7f37dd0b21846dbaeac2c2`. Graph integrity zero counts are in `closeout-summary.json`; disconnected components are accurate coverage metrics. Two independent complete certification projections and serialization byte comparisons are tested in `tests/task-086-readmittable-closeout.test.mjs`. Current-head deterministic, exclusion leak and GTFS/unknown-metric receipts are emitted under `.artifacts/ci/routing-eligibility-receipt.json`.

The final exact-head gate must still complete on the final published implementation SHA. It retains all repository test files, two clean full raw generations, all 27 artifact comparisons, actual checksum resume, corruption/recovery and raw GTFS extraction; no assertion/test is omitted. The final job requires both that proof and the same-run/same-checkout routing receipt. Final head, run URL, actual exit results and merge SHA are recorded by the final CI receipt and subsequent merge record; no future PASS is predeclared here.

The historical 156,850,452-byte `core-stage-acceptance.json` remains intentionally local in the preserved F: worktree, SHA-256 `4bb963ea8edc65a38e0cb4f089352fc05a1f08887ab8427f9b1d46e51c6694f6`; its compact receipt remains tracked. Normal push only; PR #466 remains the sole implementation PR. Normal merge and Issue #443 completion are authorized only after the new exact-head gate succeeds. After that actual merge, the WBS definition is inventory/eligibility closeout with accepted readmittable exclusions, not full Japan route coverage. Future dedicated re-admission work does not reopen TASK-086.
