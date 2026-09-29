# RESULT — TASK-081-B Real Canonical Pilot-100 Feature43

Status: **PARTIAL**. The old BLOCKED/0-assessed preflight is superseded. Exactly 100 admitted real Canonical POIs and all 4,300 Feature43 cells were reviewed. Only 17 cells have sufficiently specific evidence for a numeric inference. The remaining 4,283 remain null, including 106 low-confidence review cells. This is not a 43/43-complete or ranking-quality Pilot.

## Identity and authorized input

| Item                  | Result                                                                                                                                                           |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Latest develop merged | 3fab703d13694fd1205679c96fb8d1d2e8549fbc                                                                                                                         |
| Normal merge commit   | 78994e95efb84a945e8023667b8f33683cfa528f                                                                                                                         |
| Branch / PR           | task/real-100-poi-pilot / [Draft #437](https://github.com/kanzakimy0/TravelAssist/pull/437); no merge or auto-merge                                              |
| Final task commit     | See exact PR head; the Result does not self-reference its own commit                                                                                             |
| Input                 | src/shared/data/canonical-poi-pilot100.runtime-manifest.v1.json and its specified canonical-poi-pilot100.v1.json only                                            |
| Sample                | data/poi/canonical/pilot-100/sample-manifest.v1.json; selection SHA-256 c6208f8e0540e0d2e284037d6b2c2f0c087e12dcfb8f5027658f7bcd3632d9a6                         |
| Selection rule        | TASK-083-A frozen class-order/lexical-region buckets, SHA-256 ordering within each bucket, round-robin to exactly 100. No resampling or easier-POI substitution. |
| Admission base        | 100 active internal IDs and 100 unchanged Master Codes; original dataset SHA-256 802785ddb24e720698c2813f1f9dce29fe6792cdf02dbd01e9557b385a88bda2                |
| Candidate boundary    | Candidate corpus remains unauthorized; no workbook row, candidateKey, fixture, or extra POI enters the Pilot                                                     |

The TASK-083 admission dataset and its runtime manifest remain immutable. TASK-081-B writes a separately hashed, server-only Feature43 overlay bound to the exact original dataset hash, ordered 100 IDs and 100 Master Codes. The runtime repository validates this overlay, rejects tampering or out-of-manifest IDs, and returns only admitted Canonical records with the overlay applied. The overlay is not a second Feature43 registry: the 43 codes come from src/shared/contracts/planning/features.ts.

## Method and evidence

All 100 fixed Wikidata entity revisions from the TASK-083 sample were fetched successfully through the official EntityData endpoint; each source capsule records QID, pinned revision, locator, response SHA-256, type/heritage/status claims, and rights-compatible sourceRef. Wikidata structured data is CC0. Type/designation labels were separately resolved and snapshotted with locators and hashes. No official site, timetable, access, crowd, queue, accessibility, or weather-operation page was revalidated, despite URLs appearing in some source claims.

Each of the 4,300 decisions has a unique review reference, state, reason, inspected-source locator/hash, and sourceRef. Each non-null value additionally has a claim locator/value, evidence hash, confidence, inference method, and rubric version. The 17 resolved values were individually pinned to stronger site-specific claims, such as dated origin plus cultural designation, scenic/natural designation, or a named shopping centre. All are RESOLVED_INFERRED, not direct published 43D scores. Type or title alone was not allowed to set a numeric magnitude. No null was changed to 0 or 5; no unproven negative 0 was manufactured.

The evidence-inference rubric is bounded: existing codebook anchors (7 = high, 8 = very high, 9 = top) apply only to the 17 explicit QID/feature/claim/reason approvals in the generator. It is not a blanket category template. A type signal without defensible intensity becomes LOW_CONFIDENCE_REVIEW with null. Everything else becomes UNRESOLVED_NO_EVIDENCE with null. The individual inferential values still require domain review before broad production use.

## Coverage and provenance

| Metric                                                         |                  Result |
| -------------------------------------------------------------- | ----------------------: |
| POIs processed / identity validated / source fetched           |         100 / 100 / 100 |
| Feature decisions                                              |           4,300 / 4,300 |
| Resolved numeric, all inferred                                 |                      17 |
| Unresolved null, inclusive of low-confidence                   |                   4,283 |
| Low-confidence review, subset of unresolved                    |                     106 |
| Non-null before / after / delta                                |            0 / 17 / +17 |
| Resolved with sourceRef / locator / evidence hash              |            17 / 17 / 17 |
| Unresolved with field-level review reference and reason        |           4,283 / 4,283 |
| Unexplained non-null delta                                     |                       0 |
| Duplicate ID / duplicate Master Code / out-of-manifest         |               0 / 0 / 0 |
| POIs with 0 / 1–9 / 10–19 / 20–29 / 30–42 / 43 resolved fields | 84 / 16 / 0 / 0 / 0 / 0 |

Every feature has 100 reviewed decisions. Unresolved includes its low-confidence subset.

| Code | Feature           | Before | After | Delta | Unresolved | Low-confidence |
| ---- | ----------------- | -----: | ----: | ----: | ---------: | -------------: |
| 01   | scenery           |      0 |     1 |    +1 |         99 |              0 |
| 02   | history           |      0 |    12 |   +12 |         88 |             14 |
| 03   | architecture      |      0 |     0 |     0 |        100 |             31 |
| 04   | photo             |      0 |     0 |     0 |        100 |              0 |
| 05   | food              |      0 |     0 |     0 |        100 |              0 |
| 06   | shopping          |      0 |     1 |    +1 |         99 |              1 |
| 07   | nature            |      0 |     3 |    +3 |         97 |             20 |
| 08   | night             |      0 |     0 |     0 |        100 |              0 |
| 09   | onsen             |      0 |     0 |     0 |        100 |              0 |
| 10   | art               |      0 |     0 |     0 |        100 |              1 |
| 11   | entertainment     |      0 |     0 |     0 |        100 |              8 |
| 12   | local             |      0 |     0 |     0 |        100 |              0 |
| 13   | unique            |      0 |     0 |     0 |        100 |              0 |
| 14   | hidden            |      0 |     0 |     0 |        100 |              0 |
| 15   | iconic            |      0 |     0 |     0 |        100 |              0 |
| 16   | family            |      0 |     0 |     0 |        100 |              0 |
| 17   | senior            |      0 |     0 |     0 |        100 |              0 |
| 18   | couple            |      0 |     0 |     0 |        100 |              0 |
| 19   | solo              |      0 |     0 |     0 |        100 |              0 |
| 20   | relax             |      0 |     0 |     0 |        100 |              0 |
| 21   | adventure         |      0 |     0 |     0 |        100 |              0 |
| 22   | educational       |      0 |     0 |     0 |        100 |             25 |
| 23   | interactive       |      0 |     0 |     0 |        100 |              0 |
| 24   | rest              |      0 |     0 |     0 |        100 |              0 |
| 25   | walking           |      0 |     0 |     0 |        100 |              0 |
| 26   | physical          |      0 |     0 |     0 |        100 |              0 |
| 27   | crowd             |      0 |     0 |     0 |        100 |              0 |
| 28   | queue             |      0 |     0 |     0 |        100 |              0 |
| 29   | wheelchair        |      0 |     0 |     0 |        100 |              0 |
| 30   | stroller          |      0 |     0 |     0 |        100 |              0 |
| 31   | morning           |      0 |     0 |     0 |        100 |              0 |
| 32   | daytime           |      0 |     0 |     0 |        100 |              0 |
| 33   | sunrise           |      0 |     0 |     0 |        100 |              0 |
| 34   | sunset            |      0 |     0 |     0 |        100 |              0 |
| 35   | rain              |      0 |     0 |     0 |        100 |              0 |
| 36   | heat              |      0 |     0 |     0 |        100 |              0 |
| 37   | cold              |      0 |     0 |     0 |        100 |              0 |
| 38   | snow              |      0 |     0 |     0 |        100 |              6 |
| 39   | weather_sensitive |      0 |     0 |     0 |        100 |              0 |
| 40   | spring            |      0 |     0 |     0 |        100 |              0 |
| 41   | summer            |      0 |     0 |     0 |        100 |              0 |
| 42   | autumn            |      0 |     0 |     0 |        100 |              0 |
| 43   | winter            |      0 |     0 |     0 |        100 |              0 |

Machine-readable artifacts:

- docs/qa/TASK-081-B/pilot-membership.v1.json: exact 100 IDs/names/Master Codes, selection rule, per-POI before/after.
- docs/qa/TASK-081-B/source-capsules.wikidata-revisions.v1.json: 100 pinned real-source capsules and claim-label hashes.
- docs/qa/TASK-081-B/field-decisions.v1.jsonl: 4,300 ordered field decisions.
- docs/qa/TASK-081-B/unresolved-ledger.v1.jsonl: 4,283 unresolved/low-confidence decisions.
- docs/qa/TASK-081-B/coverage-statistics.v1.json: 43-field and 100-POI coverage.
- docs/qa/TASK-081-B/provenance-audit.v1.json: source, confidence, identity and delta audit.
- src/shared/data/canonical-poi-pilot100.feature43-overlay.v1.json and its runtime manifest: narrow, hashed Canonical runtime feature projection.

## Validation and downstream boundary

The original 100-record admission dataset still validates against the Canonical POI contract. All 100 overlay-projected records also pass the same parser. The server-only repository returns exactly 100 IDs, 100 Detail GET requests return 200 with the appropriate real feature/null view, and candidate/Master-Code substitution still fails closed. Overlay tampering, reordering and unauthorized imports are regression-tested.

A read-only cross-worktree smoke used the TASK-084-A scoring runtime against these real Canonical records: 100/100 IDs recognized; 16 POIs with at least one supported feature set entered the scoring runtime; the other 84 returned FEATURE43_UNAVAILABLE. This proves data-path compatibility only. It does not establish Top-N quality, preference/persona calibration, adequate component coverage or Planner ranking, all of which remain TASK-084-A's work.

Focused TASK-081/TASK-083 runtime tests: 11/11 PASS. Canonical schema: 24/24 PASS. Planning contracts: 21/21 PASS. Preferences: 503/503 PASS. Preference contract: 540/540 PASS. Edge contracts: 15/15 PASS. Repeatable 4,300-cell Pilot QA: PASS. Full repository Node regression: 2,781/2,781 PASS. Lint: PASS with 10 warnings (0 errors). Typecheck, application build, local deployment validation/build/artifact verification, changed-file and repository deployment formatting, and git diff --check: PASS. Exact-head GitHub Quality Gate: pending push and remote execution.

Baseline issue: the existing TASK-083 artifact replay script fails on latest develop because the frozen sample manifest's actual SHA-256 is 6d6187e53f6235abc757795896b8ba441736ce078e1e5b3e0c70df14c4709d51 while its runtime manifest and handoff still store 77e239e0b5092f38e85f1d4e7035cf2ece2956128b5c01dbabdffc11b08d2c82. The sample file is unchanged from origin/develop; this mismatch was not introduced by TASK-081-B. We do not rewrite TASK-083 admission history or its handoff solely to hide this baseline failure.

## Limits and next production batch

Wikidata entity facts provide broad identity/type/heritage evidence, but usually not visitor-experience intensity, seasonal operation, accessibility, walking burden, queues, or crowd levels. Consequently 84/100 POIs remain entirely non-numeric. A production batch needs authorized POI-specific official pages or other rights-cleared observational sources, freshness/status checks, and field-level human review for low-confidence items. Do not broaden this overlay to nationwide data or infer unknown values from category. WBS status: **TASK-081-B 待审查 / PARTIAL**; no user acceptance or merge is implied.
