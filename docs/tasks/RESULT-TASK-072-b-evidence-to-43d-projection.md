# RESULT — TASK-072-B Evidence → 43D Projection

> Previous TASK-072 completion superseded by Authoritative Enrichment Correction v2.

## Status

**COMPLETE**

- Task: TASK-072-B
- Issue: #409
- Correction publication head: 2f01c25bb1b69e52ab9790328cf2de30cf01431c
- Execution branch: codex/b-task-072-evidence-to-43d-projection
- Draft PR: #410
- Blocker: none

## Authoritative baseline

Canonical command: `node --import ./tests/register-route-ts.mjs tools/poi/read-current-candidates.mjs`

- population: 10369
- newScoredPois: 2238
- scoredPois: 2510
- nonNullFeatures: 6104
- pendingCandidates: 10097
- pending scored candidates: 2238
- pending non-null features: 5244
- runtimeImportAuthorized: false

The protected prior 272 / 860 baseline remains untouched.

## Correction canary

- status: PASS
- preservation controls: 20; preserve PASS=true
- evidence-rich controls: 20
- feature extraction attempted: 20
- feature decisions: 860; exactly 43 each=true
- ADD_SUPPORTED candidates: 20
- new non-null features: 31
- provenance written: 31
- feature codes covered: 01, 02, 03, 07, 10, 11, 22, 23, 25, 40, 42
- provenance complete: true
- deterministic repeat: true


## Full frozen-batch execution

| Batch | Candidates | Extraction attempted | Feature decisions | New non-null | Provenance | Identity updates | Visit | Access | QA |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| TASK-071-A-0001 | 200 | 200 | 8600 | 2 | 2 | 9 | 200 | 200 | PASS |
| TASK-071-A-0002 | 200 | 200 | 8600 | 0 | 0 | 6 | 200 | 200 | PASS |
| TASK-071-A-0003 | 200 | 200 | 8600 | 0 | 0 | 4 | 200 | 200 | PASS |
| TASK-071-A-0004 | 200 | 200 | 8600 | 0 | 0 | 8 | 200 | 200 | PASS |
| TASK-071-A-0005 | 200 | 200 | 8600 | 0 | 0 | 9 | 200 | 200 | PASS |
| TASK-071-A-0006 | 200 | 200 | 8600 | 0 | 0 | 7 | 200 | 200 | PASS |
| TASK-071-A-0007 | 200 | 200 | 8600 | 0 | 0 | 11 | 200 | 200 | PASS |
| TASK-071-A-0008 | 200 | 200 | 8600 | 0 | 0 | 3 | 200 | 200 | PASS |
| TASK-071-A-0009 | 200 | 200 | 8600 | 0 | 0 | 7 | 200 | 200 | PASS |
| TASK-071-A-0010 | 200 | 200 | 8600 | 0 | 0 | 4 | 200 | 200 | PASS |
| TASK-071-A-0011 | 200 | 200 | 8600 | 0 | 0 | 8 | 200 | 200 | PASS |
| TASK-071-A-0012 | 200 | 200 | 8600 | 0 | 0 | 8 | 200 | 200 | PASS |
| TASK-071-A-0013 | 200 | 200 | 8600 | 0 | 0 | 11 | 200 | 200 | PASS |
| TASK-071-A-0014 | 200 | 200 | 8600 | 0 | 0 | 6 | 200 | 200 | PASS |
| TASK-071-A-0015 | 200 | 200 | 8600 | 0 | 0 | 10 | 200 | 200 | PASS |
| TASK-071-A-0016 | 200 | 200 | 8600 | 0 | 0 | 4 | 200 | 200 | PASS |
| TASK-071-A-0017 | 200 | 200 | 8600 | 0 | 0 | 7 | 200 | 200 | PASS |
| TASK-071-A-0018 | 200 | 200 | 8600 | 0 | 0 | 6 | 200 | 200 | PASS |
| TASK-071-A-0019 | 200 | 200 | 8600 | 0 | 0 | 3 | 200 | 200 | PASS |
| TASK-071-A-0020 | 200 | 200 | 8600 | 0 | 0 | 4 | 200 | 200 | PASS |
| TASK-071-A-0021 | 200 | 200 | 8600 | 0 | 0 | 8 | 200 | 200 | PASS |
| TASK-071-A-0022 | 200 | 200 | 8600 | 0 | 0 | 7 | 200 | 200 | PASS |
| TASK-071-A-0023 | 200 | 200 | 8600 | 0 | 0 | 4 | 200 | 200 | PASS |
| TASK-071-A-0024 | 200 | 200 | 8600 | 0 | 0 | 9 | 200 | 200 | PASS |
| TASK-071-A-0025 | 200 | 200 | 8600 | 0 | 0 | 4 | 200 | 200 | PASS |
| TASK-071-A-0026 | 200 | 200 | 8600 | 0 | 0 | 11 | 200 | 200 | PASS |
| TASK-071-A-0027 | 200 | 200 | 8600 | 0 | 0 | 2 | 200 | 200 | PASS |
| TASK-071-A-0028 | 200 | 200 | 8600 | 0 | 0 | 7 | 200 | 200 | PASS |
| TASK-071-A-0029 | 200 | 200 | 8600 | 0 | 0 | 8 | 200 | 200 | PASS |
| TASK-071-A-0030 | 200 | 200 | 8600 | 0 | 0 | 4 | 200 | 200 | PASS |
| TASK-071-A-0031 | 49 | 49 | 2107 | 0 | 0 | 1 | 49 | 49 | PASS |
| TASK-071-B-0001 | 165 | 165 | 7095 | 0 | 0 | 0 | 165 | 165 | PASS |
| TASK-071-C-0001 | 200 | 200 | 8600 | 2 | 2 | 0 | 200 | 200 | PASS |
| TASK-071-C-0002 | 200 | 200 | 8600 | 0 | 0 | 0 | 200 | 200 | PASS |
| TASK-071-C-0003 | 200 | 200 | 8600 | 0 | 0 | 0 | 200 | 200 | PASS |
| TASK-071-C-0004 | 200 | 200 | 8600 | 0 | 0 | 0 | 200 | 200 | PASS |
| TASK-071-C-0005 | 200 | 200 | 8600 | 0 | 0 | 0 | 200 | 200 | PASS |
| TASK-071-C-0006 | 200 | 200 | 8600 | 0 | 0 | 0 | 200 | 200 | PASS |
| TASK-071-C-0007 | 200 | 200 | 8600 | 0 | 0 | 0 | 200 | 200 | PASS |
| TASK-071-C-0008 | 22 | 22 | 946 | 1 | 1 | 0 | 22 | 22 | PASS |
| TASK-071-D-0001 | 200 | 200 | 8600 | 0 | 0 | 0 | 200 | 200 | PASS |
| TASK-071-D-0002 | 200 | 200 | 8600 | 0 | 0 | 0 | 200 | 200 | PASS |
| TASK-071-D-0003 | 200 | 200 | 8600 | 0 | 0 | 0 | 200 | 200 | PASS |
| TASK-071-D-0004 | 200 | 200 | 8600 | 0 | 0 | 0 | 200 | 200 | PASS |
| TASK-071-D-0005 | 200 | 200 | 8600 | 2 | 2 | 0 | 200 | 200 | PASS |
| TASK-071-D-0006 | 200 | 200 | 8600 | 0 | 0 | 0 | 200 | 200 | PASS |
| TASK-071-D-0007 | 200 | 200 | 8600 | 0 | 0 | 0 | 200 | 200 | PASS |
| TASK-071-D-0008 | 200 | 200 | 8600 | 0 | 0 | 0 | 200 | 200 | PASS |
| TASK-071-D-0009 | 200 | 200 | 8600 | 0 | 0 | 0 | 200 | 200 | PASS |
| TASK-071-D-0010 | 200 | 200 | 8600 | 0 | 0 | 0 | 200 | 200 | PASS |
| TASK-071-D-0011 | 200 | 200 | 8600 | 0 | 0 | 0 | 200 | 200 | PASS |
| TASK-071-D-0012 | 200 | 200 | 8600 | 0 | 0 | 0 | 200 | 200 | PASS |
| TASK-071-D-0013 | 61 | 61 | 2623 | 0 | 0 | 0 | 61 | 61 | PASS |

- frozen candidates processed: 10097 / 10097
- total 43D decisions: 434171 / 434171
- featureExtractionAttemptedCount: 10097
- semanticAnnotationAttemptedCount: 4083
- preserved current non-null: 5244
- preserved + superseded current non-null: 5244 / 5244
- new non-null: 7
- superseded: 0
- provenance written: 7

## 43D coverage

- global scored before / after: 2510 / 2515
- global non-null before / after: 6104 / 6111
- new / superseded: 7 / 0
- remaining null decisions: 428920
- per-feature before: {"10":336,"11":96,"12":632,"13":5,"14":0,"15":0,"16":93,"17":0,"18":2,"19":1,"20":102,"21":7,"22":237,"23":160,"24":91,"25":13,"26":8,"27":3,"28":1,"29":28,"30":0,"31":88,"32":3,"33":7,"34":15,"35":9,"36":5,"37":0,"38":2,"39":27,"40":162,"41":77,"42":114,"43":45,"01":352,"02":1196,"03":577,"04":60,"05":454,"06":707,"07":310,"08":59,"09":20}
- per-feature after: {"10":337,"11":97,"12":632,"13":5,"14":0,"15":0,"16":93,"17":0,"18":2,"19":1,"20":102,"21":7,"22":238,"23":160,"24":91,"25":13,"26":8,"27":3,"28":1,"29":28,"30":0,"31":88,"32":3,"33":7,"34":15,"35":9,"36":5,"37":0,"38":2,"39":27,"40":164,"41":77,"42":114,"43":45,"01":352,"02":1196,"03":579,"04":60,"05":454,"06":707,"07":310,"08":59,"09":20}
- coverage bands: {">=1":2515,">=10":5,">=20":0,">=30":0,">=43":0}

## Identity correction

- Phase A before TARGET_IDENTITY_UNRESOLVED: 6049
- RESOLVED_HIGH: 0
- RESOLVED_MEDIUM: 200
- SECOND_PASS_REQUIRED: 5849
- IDENTITY_CONFLICT_HOLD: 0
- reconciliation: 6049 = 0 + 200 + 5849 + 0
- MEDIUM audit: 200 sampled, 0 invalid
- second-pass deliverables: docs/qa/TASK-072-B/identity-second-pass.md and docs/qa/TASK-072-B/identity-second-pass.jsonl
- Registry rebinds: 0
- formal Master Code allocations: 0

## Visit / Access

- authoritative Visit before / after: 23 / 23
- visitExtractionAttemptedCount: 10097 / 10097
- Visit Profile additions / superseded: 0 / 0
- authoritative Access before / after: 1538 / 1538
- accessExtractionAttemptedCount: 10097 / 10097
- Access Anchor additions / superseded: 0 / 0
- static access link additions: 0

## Evidence / provenance

- retained evidence candidates loaded: 1032
- retained text records loaded: 2645
- supplemental accepted/official sources used in Stage A: 46 curated facts
- official SNS additions: 0
- locator/hash validated: 46 curated facts plus retained cache checksums
- contradictory sources: 0
- every null decision has a field-level no-evidence reason

## Errors / review queues

- batch failures: 0
- candidate errors: 0
- identity blocker queue: 6014
- unresolved review queue: 5849
- corruption/recovery events: 0

## Integrity

- canonical Registry before/after: 4c8f6a4904cd85acafc9b355d3f5d8cf85fc6e00781751a657595db821812067 / 4c8f6a4904cd85acafc9b355d3f5d8cf85fc6e00781751a657595db821812067
- candidate identity checksum before/after: 703ad2f69806ba1b74d1ad1971ccb9edc98126d8d1317da6a6eab347838830db / 703ad2f69806ba1b74d1ad1971ccb9edc98126d8d1317da6a6eab347838830db
- Master Code registry: 9efcc0b6172dacdabe846789430d1ed54de98f12827097e96a7651131bf044b2 unchanged
- frozen population manifests: phase-A through phase-D reused exactly
- rubric: candidate-recovery-1.0 unchanged
- corrected output manifest: data/poi/full/task-072-b-correction-v2/final-manifest.json
- canonical integration: {"addedKeys":["candidate:B_V1_PROPOSED:60349","candidate:B_V1_PROPOSED:80001","candidate:B_V1_PROPOSED:80032","geoshape-nrct-poi:030000021300","wikidata:Q746216"],"canonicalDeltaSha256":"81a615fb9d3e3409d59465de5cb87f05a6bb55d371467dd669815012075d0e98","editorialSha256":"47df601eb4d1f231b5144f749da1bc0d8aed04b017e83a27c435523f943374d3","manifestSha256":"7582fc99f6087d5c40e7862ff84508c3d4cadf0c92f7d2977f3d925169696748"}

## GitHub delivery

- execution branch: codex/b-task-072-evidence-to-43d-projection
- Draft PR: #410
- final commit / exact final head: recorded after ordinary push
- Quality Gate: exact current-head receipt will be recorded in PR #410 and Issue #409 comments
- heartbeat deleted: not created
- auto-merge: false

## Final acceptance

### COMPLETE

All local Correction v2 hard gates passed; exact PR-head Quality Gate receipt remains the final GitHub delivery gate.
