# RESULT — TASK-072-B Evidence → 43D Projection

## Status

**PRECHECK PASS — FULL RUN AUTHORIZED**

- Task: TASK-072-B
- Issue: #409
- Publication head: 96355af2e80c26b437431306d00f49e046b047c5
- Execution branch: codex/b-task-072-evidence-to-43d-projection
- Draft PR: not created by this local run
- Current local gate: incomplete
- Blocker: none reported

## Required Final Summary

| Metric | Before | After | Delta |
| --- | ---: | ---: | ---: |
| Frozen candidates | 10,097 | 0 | -10097 |
| Feature extraction attempted candidates | 0 | 0 | 0 |
| Total 43-field decisions | 0 | 0 | 0 |
| Scored POIs (all sidecars) | 272 | 272 | 0 |
| Non-null 43D fields (all sidecars) | 860 | 860 | 0 |
| New non-null fields | 0 | 0 | 0 |
| Superseded fields | 0 | 0 | 0 |
| Provenance records written | 0 | 0 | 0 |
| Identity disposition updates | 0 | 0 | 0 |
| Visit Profile additions | 0 | 0 | 0 |
| Access Anchor additions | 0 | 0 | 0 |

Required exact total feature decisions: 10,097 × 43 = 434,171.

## Preflight Controls

- positive-control candidate count: 20
- retained-text control count: 20
- rubricVersion: candidate-recovery-1.0
- positive-control reproduction: PASS
- retained evidence hash validation: 2645 records / PASS
- 43-decision control validation: 1720
- projector schema validation: PASS
- deterministic repeated dry-run: PASS
- Registry unchanged: PASS
- Master Code unchanged: PASS
- candidateKey unchanged: PASS
- preflight result: PASS

## Batch Completion

| Batch | Candidates | Extraction attempted | Feature decisions | New non-null | Provenance | Identity updates | Visit | Access | QA |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| 1–53 | TBD | TBD | TBD | TBD | TBD | TBD | TBD | TBD | NOT STARTED |

## 43D Coverage

- scored POIs before / after: 272 / 272
- total non-null fields before / after: 860 / 860
- new non-null count: 0
- superseded count: 0
- preserved non-null count: 0
- remaining null count: 445007
- per-feature coverage: {"10":67,"11":9,"12":78,"13":0,"14":0,"15":0,"16":3,"17":0,"18":0,"19":0,"20":28,"21":2,"22":35,"23":28,"24":0,"25":7,"26":4,"27":0,"28":0,"29":0,"30":0,"31":1,"32":0,"33":2,"34":1,"35":1,"36":1,"37":0,"38":0,"39":0,"40":56,"41":10,"42":44,"43":10,"01":99,"02":176,"03":103,"04":19,"05":25,"06":28,"07":14,"08":9,"09":0}
- POI coverage bands: {">=1":272,">=10":0,">=20":0,">=30":0,">=43":0}

## Identity Projection / Amendment Reconciliation

- TARGET_IDENTITY_UNRESOLVED before: 6,049
- IDENTITY_CONFLICT before: 165
- TASK-071 reported identity decisions not projected: 25
- Phase A after: {"RESOLVED_HIGH":0,"RESOLVED_MEDIUM":0,"SECOND_PASS_REQUIRED":0,"IDENTITY_CONFLICT_HOLD":0}
- candidates resolved then enriched: 0
- second-pass candidate count: 0
- second-pass reason distribution: {}
- second-pass deliverables: docs/qa/TASK-072-B/identity-second-pass.md, docs/qa/TASK-072-B/identity-second-pass.jsonl
- Registry rebinds: 0
- formal Master Code allocations: 0

Required reconciliation: 6049 = 0 + 0 + 0 + 0 = 0.

## Visit / Access Projection

- visitExtractionAttemptedCount: 0
- Visit Profile additions: 0
- accessExtractionAttemptedCount: 0
- Access Anchor additions: 0
- static access link additions: 0
- unsupported/no-supported disposition counts: 0

## Evidence / Provenance

- retained evidence candidates loaded: 1032
- retained text used: 0 records
- identity search inventories evaluated: 0 candidates
- supplemental official source count: 0
- supplemental official SNS count: 0
- provenance written: 0
- locator/hash validated: 0
- contradictory sources: 0
- rejected/no-evidence reasons: field-level noEvidenceReason is present on every null decision

## Errors / Review Queue

- batch failures: 0
- candidate errors: 0
- contradictory evidence queue: 0
- identity blocker queue: 0
- corruption/recovery events: 0
- unresolved review queue: 0

## Integrity

- canonical Registry before/after: 4c8f6a4904cd85acafc9b355d3f5d8cf85fc6e00781751a657595db821812067 / 4c8f6a4904cd85acafc9b355d3f5d8cf85fc6e00781751a657595db821812067
- candidate identity corpus before/after: 703ad2f69806ba1b74d1ad1971ccb9edc98126d8d1317da6a6eab347838830db / 703ad2f69806ba1b74d1ad1971ccb9edc98126d8d1317da6a6eab347838830db
- frozen population manifest: data/poi/full/manifests/task-071/phase-A.json through phase-D.json; membership/order reused exactly
- rubric: candidate-recovery-1.0; unchanged
- relevant output manifest: data/poi/full/task-072-b/final-manifest.json
- invariant: Registry change = 0; formal Master Code allocation = 0; candidateKey change = 0

## GitHub Delivery

- execution branch: codex/b-task-072-evidence-to-43d-projection
- Draft PR: not created by this local run
- final commit: TBD
- exact final head: TBD
- GitHub Quality Gate run: not run
- Quality Gate conclusion: NOT RUN
- heartbeat deleted: not created
- auto-merge: false

## Final Acceptance Statement

### BLOCKED / PARTIAL

The exact final-head GitHub Quality Gate and Draft PR delivery remain outstanding; this Result is intentionally BLOCKED / PARTIAL and is not COMPLETE.

## Identity Resolution / Second-Pass Required Final Metrics

| Metric | Before | After |
| --- | ---: | ---: |
| TARGET_IDENTITY_UNRESOLVED | 6,049 | 0 |
| RESOLVED_HIGH | 0 | 0 |
| RESOLVED_MEDIUM | 0 | 0 |
| SECOND_PASS_REQUIRED | 0 | 0 |
| IDENTITY_CONFLICT_HOLD | 0 | 0 |
| Candidates resolved then enriched | 0 | 0 |

The second-pass queue contains no candidate already reasonably resolved for enrichment; every queued row is explicitly blocked or requires a missing discriminative signal.
