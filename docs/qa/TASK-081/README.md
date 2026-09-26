# QA — TASK-081-A Canonical POI Detail API

Date: 2026-09-27
Issue: #431
Branch: `codex/a-task-081-poi-detail-api`
Execution-time `origin/develop`: `85f5c62361d93f897423e92232547863d46ab0d1`
Consumed WBS 7.4 candidate: `875caf9e9130514fa99da95ce11d63fca2bf3b1d`

## Source and authorization

`data/poi/full/manifests/current-candidate-review.v1.json` declares `scope=CANDIDATE_ONLY_NO_CANONICAL_IMPORT` and `runtimeImportAuthorized=false`. The production route imports the default unavailable repository. The deterministic fixture repository is injected only by tests. No runtime file adapter, Provider call or DB query was added.

## Detail behavior

| Case | Expected and observed |
| --- | --- |
| Valid canonical `internalId` | 200 and curated product DTO |
| Active, temporary closure, permanent closure | 200 with distinct lifecycle status |
| Merged, superseded | 200 with explicit target; original `poiRef` retained |
| Localized names and aliases | Preserved from validated canonical record |
| Nullable Master Code, point, entire feature set | Null remains null |
| 43D | All 43 keys; zero and unknown null preserved exactly |
| Multiple Visit Profiles | Static duration/load values preserved |
| Region and Access Anchor | Canonical references only, no source payload |
| Malformed/oversized/alternate identity | 400; repository not called |
| Unknown canonical ID | 404 |
| Invalid canonical record, 43D or Visit | 503, stable error, no partial data |
| Repository unavailable or failing | 503, stable error |
| Rights boundary | No raw Provider data, external IDs, locator, restricted/transient evidence, assets, geometry reference, postal code, exact timetable/fare/weather/crowd |
| Repeat | Identical deterministic JSON |

The allowlisted evidence summary includes only sources with `persistence=allowed`, `redistribution=allowed` and a curated non-Provider source kind. It omits locators and licensing mechanics. The public DTO omits canonical `facts`, `externalIds`, `assetRefs`, `revision`, source mappings and live values. An accepted runtime importer must separately prove redistribution rights for canonical names and aliases before enabling the repository.

## Local validation

Tests ran in `K:\CodexWork\TravelAssist\TASK-081-A-runtime-20260927`; dependencies, `.next`, build artifacts and logs stayed outside the repository worktree.

| Gate | Result |
| --- | --- |
| TASK-081 focused | 10/10 PASS |
| TASK-050 / WBS 7.4 POI contracts | 24/24 PASS |
| Planning contracts | 21/21 PASS |
| Planning soak | 6/6 PASS |
| Full Node regression | 2744/2744 PASS |
| `npm run lint` | PASS, 0 errors; 9 pre-existing warnings in unrelated POI tools |
| `npm run typecheck` | PASS |
| `npm run format:check:deploy` | PASS |
| `npm run deploy:validate:local` | PASS |
| `npm run deploy:build:local` | PASS; `/api/pois/[poiRef]` included |
| `npm run deploy:verify-artifact` | PASS; 1,883 files, 0 failures |
| Production HTTP smoke (`next start`, port 3134) | `poi:tokyo-station` → 503 unavailable; Master Code `10001` → 400 invalid |

The first unrestricted local regression attempt could not create an external temporary assets directory under the sandbox. After granting writes only to the external QA directory, one test still could not invoke the system `python` alias. The bundled Python passed its own 14 tests; with that executable prepended to the test process PATH, the complete 2,744-test Node regression passed. No test or scanner was disabled.

## Merge gate

PR #417 is currently Open/Draft and unmerged. TASK-081 remains Draft; after #417 merges, refresh against latest `develop`, verify accepted 7.4 contract ancestry/equivalence, rerun affected validation and obtain an exact-head GitHub Quality Gate before acceptance. No automatic merge.