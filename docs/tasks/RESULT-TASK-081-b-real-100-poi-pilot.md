# RESULT — TASK-081-B Real 100 POI Pilot

**Status: BLOCKED.** No 100-POI Pilot data was produced. This is a prerequisite audit, not a partial 4,300-cell scoring run. In particular, `0 assessed` does **not** mean `4,300 unresolved` or `4,300 complete`.

## Execution identity

| Item                             | Result                                                                                                                          |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Required base                    | `origin/develop` at `0950d67a29a44820b7c311dbc4a4e4d8c620913d` (merged into task branch after it advanced during execution)     |
| Branch                           | `task/real-100-poi-pilot`, isolated worktree                                                                                    |
| Final commit                     | See branch/PR head; this document does not self-reference its own commit                                                        |
| Draft PR                         | [#437](https://github.com/kanzakimy0/TravelAssist/pull/437); do not merge or enable auto-merge                                  |
| Preflight artifact               | `docs/qa/TASK-081-B/preflight.json`                                                                                             |
| Sample artifact / selection rule | None. A 100-ID rule cannot be frozen against an inventory that has not passed the application Canonical POI admission boundary. |

## Why the Pilot stopped

1. The 43-field planning contract exists at `src/shared/contracts/planning/features.ts` and defines exactly 43 codes with `0..9|null`. During this task, `develop` advanced and merged TASK-050-A. The Canonical POI v1 contract, parser and candidate-admission gate now exist at `src/shared/contracts/poi/`, and their **24 fixture tests pass**. TASK-050-A explicitly did not import a real corpus, allocate whole-corpus POI Master Codes, write a production DB or implement a runtime API. Its positive fixtures are not real Pilot data.
2. The application Master Code Registry (`src/shared/data/master-code-registry.v1.json`, SHA-256 `9efcc0b6172dacdabe846789430d1ed54de98f12827097e96a7651131bf044b2`) has `governanceStatus: candidate`, 51 entries, and **0 POI entries**. This does not imply that Japan has no real POIs or that historical codes are free.
3. The real v1.66 workbook (`data/poi/full/registry/travelassist-japan-poi-master-registry-v1.66-B-5xxxx-7xxxx-feature43-phase2c-review-v2.xlsx`, SHA-256 `b396723fbe1ed326fc205b7b259dd992019120182ad35044c2a96bd8a54d4014`) has 10,585 `Registry` data rows and an `internal_uuid` in each row. It is a substantial frozen spreadsheet inventory, but this base has no authorized admission/mapping that makes those rows validated application Canonical POI v1 records. Its `FROZEN` spreadsheet status cannot substitute for actually passing the code-level identity, duplicate, provenance and schema gates.
4. The available real enrichment path, `tools/poi/enrich-candidates.mjs`, explicitly emits `CANDIDATE_ONLY_NO_CANONICAL_IMPORT`. `data/poi/full/manifests/current-candidate-review.v1.json` has the same scope and `runtimeImportAuthorized: false`. Even the file named `canonical-state-v2.3.jsonl` consists of `candidateKey` feature decisions, not admitted Canonical POI records. Running these as the required canonical Pilot would violate the source boundary.
5. No Canonical POI runtime API was found under `src/app` on this base. Consequently, downstream canonical consumption cannot be demonstrated. Candidate/planning contract tests are not a substitute for that acceptance gate.

No workbook row, candidateKey, fixture or mock was relabeled as a canonical record. No score, default, template copy or inferred value was added. No source/provider call, production DB write or runtime import was made. Credential sufficiency and source revalidation were not tested after the structural stop condition; their state remains unknown.

## Pilot accounting

| Measure                                                          |                                     Result |
| ---------------------------------------------------------------- | -----------------------------------------: |
| Required real Canonical POIs                                     |                                        100 |
| Selected / processed / succeeded / failed                        |              0 / 0 / 0 / 0 (not attempted) |
| Required Feature43 cells                                         |                                      4,300 |
| Assessed cells                                                   |                                          0 |
| Resolved / unresolved / low-confidence cells                     | Not measured / not measured / not measured |
| Before/after completeness, per POI                               |             Not measured; no lawful sample |
| Evidence/provenance coverage and confidence distribution         |                               Not measured |
| Identity/duplicate conflicts, validation errors, source failures |      Not measured; zero cannot be asserted |

The following is the requested 43-row field accounting. Every row is `0/100 assessed`, **not** a field-level unresolved verdict.

| Code | Feature           | Assessed POIs | Resolved / unresolved / low-confidence |
| ---- | ----------------- | ------------: | -------------------------------------- |
| 01   | scenery           |         0/100 | Not measured                           |
| 02   | history           |         0/100 | Not measured                           |
| 03   | architecture      |         0/100 | Not measured                           |
| 04   | photo             |         0/100 | Not measured                           |
| 05   | food              |         0/100 | Not measured                           |
| 06   | shopping          |         0/100 | Not measured                           |
| 07   | nature            |         0/100 | Not measured                           |
| 08   | night             |         0/100 | Not measured                           |
| 09   | onsen             |         0/100 | Not measured                           |
| 10   | art               |         0/100 | Not measured                           |
| 11   | entertainment     |         0/100 | Not measured                           |
| 12   | local             |         0/100 | Not measured                           |
| 13   | unique            |         0/100 | Not measured                           |
| 14   | hidden            |         0/100 | Not measured                           |
| 15   | iconic            |         0/100 | Not measured                           |
| 16   | family            |         0/100 | Not measured                           |
| 17   | senior            |         0/100 | Not measured                           |
| 18   | couple            |         0/100 | Not measured                           |
| 19   | solo              |         0/100 | Not measured                           |
| 20   | relax             |         0/100 | Not measured                           |
| 21   | adventure         |         0/100 | Not measured                           |
| 22   | educational       |         0/100 | Not measured                           |
| 23   | interactive       |         0/100 | Not measured                           |
| 24   | rest              |         0/100 | Not measured                           |
| 25   | walking           |         0/100 | Not measured                           |
| 26   | physical          |         0/100 | Not measured                           |
| 27   | crowd             |         0/100 | Not measured                           |
| 28   | queue             |         0/100 | Not measured                           |
| 29   | wheelchair        |         0/100 | Not measured                           |
| 30   | stroller          |         0/100 | Not measured                           |
| 31   | morning           |         0/100 | Not measured                           |
| 32   | daytime           |         0/100 | Not measured                           |
| 33   | sunrise           |         0/100 | Not measured                           |
| 34   | sunset            |         0/100 | Not measured                           |
| 35   | rain              |         0/100 | Not measured                           |
| 36   | heat              |         0/100 | Not measured                           |
| 37   | cold              |         0/100 | Not measured                           |
| 38   | snow              |         0/100 | Not measured                           |
| 39   | weather_sensitive |         0/100 | Not measured                           |
| 40   | spring            |         0/100 | Not measured                           |
| 41   | summer            |         0/100 | Not measured                           |
| 42   | autumn            |         0/100 | Not measured                           |
| 43   | winter            |         0/100 | Not measured                           |

## Validation and downstream gate record

Dependencies were installed with `npm ci --no-audit --no-fund` in the isolated worktree. These checks validate the existing base and the stop condition; they **do not** constitute a successful Pilot:

| Check                                                                                             | Outcome                                                                                       |
| ------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `npm run lint`                                                                                    | PASS, 0 errors and 9 pre-existing unused-variable warnings in unrelated `tools/poi` files     |
| `npm run typecheck`                                                                               | PASS, including Next route type generation                                                    |
| `npm run test:poi-contracts`                                                                      | PASS, 24/24; Canonical POI schema/admission fixtures, not real corpus records                 |
| `npm run test:planning-contracts`                                                                 | PASS, 21/21; includes 43-key and null/zero validation                                         |
| `npm run qa:master-code-registry`                                                                 | PASS; 50 Region allocations, no Canonical POI allocation                                      |
| `npm run test:master-code-registry`                                                               | PASS, 15/15                                                                                   |
| `node --import ./tests/register-route-ts.mjs --test tests/task-068-candidate-enrichment.test.mjs` | PASS, 12/12; tests candidate-only code, not the required canonical run                        |
| Canonical POI v1 schema and admission quality gate                                                | IMPLEMENTED and fixture-tested; NOT RUN on 100 real records because no admitted corpus exists |
| 100-record schema validation and duplicate/identity gate                                          | NOT RUN; no admitted canonical sample                                                         |
| Real enrichment and 4,300-cell evidence check                                                     | NOT RUN; available path is candidate-only                                                     |
| Downstream canonical runtime compatibility                                                        | NOT RUN; authorized canonical runtime boundary absent                                         |

A direct Node invocation of the candidate test without the repository TypeScript loader initially failed module resolution; the invocation above is the corrected passing command. No test failure is being hidden as a Pilot failure or claimed as a Pilot pass.

## Unblock and next batch recommendation

The Canonical POI v1 contract and admission gate are now on `develop`. Next, explicitly authorize and execute real admission/active Master Code allocation, determining whether and how the v1.66 workbook can pass those gates; do not equate spreadsheet `FROZEN` with application `ADMIT`. Provide a real canonical enrichment entry point with authorized sources and a downstream boundary. Then freeze a deterministic 100-ID sample over the **admitted** population, record the exact IDs and strata, evaluate all 4,300 cells with per-field evidence/confidence, and rerun all schema/quality/runtime gates. This report must not be upgraded to PASS by merely filling 100 workbook rows or reusing B candidate projections.
