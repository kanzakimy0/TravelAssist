# RESULT — TASK-073-B Identity Deep Resolution + Null-Targeted 43D Expansion

> Previous TASK-072 completion is upstream input only; TASK-073-B is the authoritative identity-deep/null-targeted execution result.

## Status

**PARTIAL / BLOCKED**

- Task: TASK-073-B
- Issue: #411
- Publication head: 3f0ba25bcc6663503552aff477631a920e331b72
- Execution branch: codex/b-task-073-identity-deep-null-targeted-43d
- Completion gate: NOT SATISFIED
- Blocker: exact-head GitHub Quality Gate pending; local final QA PASS

## Upstream stabilization

- authoritative upstream: TASK-072-B Correction v2 current-candidate view
- Visit fixture diagnosis: candidate:B-20260914-R06-002 retained authoritative minimumDurationMinutes=60; the regression was caused by generated delta ordering, not stale evidence.
- authoritative 60-minute evidence: sourceRef remaining-source:9d311bb4944125f288000bba; locator hash 69f2046e95d999e9acfff26fc0205930b472e45e6c59aaf9878ead4229b2ddd5
- targeted Visit test: PASS (8/8)
- full repository Node tests: PASS (2685/2685) with --test-concurrency=1; default parallel run was not used as the gate because its asset child exceeded the fixed internal timeout under resource contention.
- stabilization result: PASS

## Authoritative baseline and frozen populations

- global population: 10369
- pending: 10097
- global scored before: 2515
- global non-null before: 6111
- identity deep population: 6014 (5849 SECOND_PASS_REQUIRED + 165 IDENTITY_CONFLICT_HOLD)
- enrichment-ready population: 4083
- Visit before: 23
- Access/static links before: 1538
- reconciliation: 6014 + 4083 = 10097
- freeze manifest: data/poi/full/task-073-b-identity-deep-null-targeted-43d/freeze-manifest.json
- Track A checksum: 2eb5dba74d96aaf8ca80c05c6e782203bf52ee2bc93f9c3fc068b68d05145031
- Track B checksum: cb84c0982577537a932b4d1d086fe7f1c4ed761496ab94ac0f40299ea02d82c4

## Mandatory Dual Canary

### Identity deep-resolution canary

- status: PASS
- candidates: 31
- search traces complete: 31
- RESOLVED_HIGH: 2
- RESOLVED_MEDIUM: 11
- DEEP_RESEARCH_REQUIRED: 6
- IDENTITY_CONFLICT_HOLD: 12
- resolved candidates enriched: 13
- invalid MEDIUM/HIGH: 0
- coverage tags: ["coordinate_mismatch","historical_or_renamed","identity_conflict","official_site","same_name_ambiguity","address_mismatch","official_sns"]
- deterministic repeat: true
- result: PASS

### Null-targeted enrichment canary

- status: PASS
- candidates: 30
- semantic annotation attempted: 30
- candidates with ADD_SUPPORTED: 30
- total new non-null: 100
- distinct feature codes: ["01","02","03","04","06","07","08","09","10","11","12","13","22","23","25","31","40","41","42","43"]
- provenance written: 100
- existing supported values preserved: true
- deterministic projection: true
- result: PASS

Required PASS thresholds: candidates with ADD_SUPPORTED >= 15, new non-null >= 25, distinct feature codes >= 5, provenance >= added/superseded.

## Track execution telemetry

| Batch | Candidates | HIGH | MEDIUM | DEEP_RESEARCH | CONFLICT_HOLD | Resolved+Enriched | New 43D | Provenance | QA |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| A-0001 | 200 | 1 | 5 | 161 | 33 | 6 | 10 | 10 | PASS |
| A-0002 | 200 | 0 | 0 | 196 | 4 | 0 | 0 | 0 | PASS |
| A-0003 | 200 | 0 | 4 | 193 | 3 | 4 | 2 | 2 | PASS |
| A-0004 | 200 | 0 | 5 | 182 | 13 | 5 | 0 | 0 | PASS |
| A-0005 | 200 | 0 | 2 | 189 | 9 | 2 | 0 | 0 | PASS |
| A-0006 | 200 | 0 | 4 | 190 | 6 | 4 | 0 | 0 | PASS |
| A-0007 | 200 | 0 | 7 | 189 | 4 | 7 | 0 | 0 | PASS |
| A-0008 | 200 | 0 | 5 | 190 | 5 | 5 | 0 | 0 | PASS |
| A-0009 | 200 | 0 | 5 | 192 | 3 | 5 | 0 | 0 | PASS |
| A-0010 | 200 | 0 | 4 | 194 | 2 | 4 | 0 | 0 | PASS |
| A-0011 | 200 | 1 | 7 | 190 | 2 | 8 | 0 | 0 | PASS |
| A-0012 | 200 | 0 | 4 | 194 | 2 | 4 | 0 | 0 | PASS |
| A-0013 | 200 | 0 | 5 | 195 | 0 | 5 | 0 | 0 | PASS |
| A-0014 | 200 | 0 | 7 | 192 | 1 | 7 | 0 | 0 | PASS |
| A-0015 | 200 | 0 | 1 | 196 | 3 | 1 | 0 | 0 | PASS |
| A-0016 | 200 | 0 | 1 | 196 | 3 | 1 | 0 | 0 | PASS |
| A-0017 | 200 | 0 | 1 | 199 | 0 | 1 | 0 | 0 | PASS |
| A-0018 | 200 | 0 | 4 | 193 | 3 | 4 | 0 | 0 | PASS |
| A-0019 | 200 | 0 | 0 | 192 | 8 | 0 | 0 | 0 | PASS |
| A-0020 | 200 | 0 | 1 | 186 | 13 | 1 | 0 | 0 | PASS |
| A-0021 | 200 | 0 | 2 | 183 | 15 | 2 | 0 | 0 | PASS |
| A-0022 | 200 | 0 | 2 | 193 | 5 | 2 | 0 | 0 | PASS |
| A-0023 | 200 | 0 | 3 | 192 | 5 | 3 | 0 | 0 | PASS |
| A-0024 | 200 | 0 | 1 | 188 | 11 | 1 | 0 | 0 | PASS |
| A-0025 | 200 | 0 | 2 | 194 | 4 | 2 | 0 | 0 | PASS |
| A-0026 | 200 | 0 | 2 | 197 | 1 | 2 | 0 | 0 | PASS |
| A-0027 | 200 | 0 | 1 | 197 | 2 | 1 | 0 | 0 | PASS |
| A-0028 | 200 | 0 | 0 | 198 | 2 | 0 | 0 | 0 | PASS |
| A-0029 | 200 | 0 | 4 | 194 | 2 | 4 | 0 | 0 | PASS |
| A-0030 | 200 | 0 | 2 | 197 | 1 | 2 | 0 | 0 | PASS |
| A-0031 | 14 | 0 | 1 | 13 | 0 | 1 | 0 | 0 | PASS |
| B-0001 | 200 | 0 | 0 | 0 | 0 | 200 | 2 | 2 | PASS |
| B-0002 | 200 | 0 | 0 | 0 | 0 | 200 | 0 | 0 | PASS |
| B-0003 | 200 | 0 | 0 | 0 | 0 | 200 | 0 | 0 | PASS |
| B-0004 | 200 | 0 | 0 | 0 | 0 | 200 | 5 | 5 | PASS |
| B-0005 | 200 | 0 | 0 | 0 | 0 | 200 | 25 | 25 | PASS |
| B-0006 | 200 | 0 | 0 | 0 | 0 | 200 | 20 | 20 | PASS |
| B-0007 | 200 | 0 | 0 | 0 | 0 | 200 | 14 | 14 | PASS |
| B-0008 | 200 | 0 | 1 | 0 | 0 | 200 | 0 | 0 | PASS |
| B-0009 | 200 | 0 | 0 | 0 | 0 | 200 | 2 | 2 | PASS |
| B-0010 | 200 | 0 | 0 | 0 | 0 | 200 | 0 | 0 | PASS |
| B-0011 | 200 | 0 | 1 | 0 | 0 | 200 | 0 | 0 | PASS |
| B-0012 | 200 | 0 | 1 | 0 | 0 | 200 | 5 | 5 | PASS |
| B-0013 | 200 | 0 | 0 | 0 | 0 | 200 | 0 | 0 | PASS |
| B-0014 | 200 | 0 | 0 | 0 | 0 | 200 | 0 | 0 | PASS |
| B-0015 | 200 | 0 | 0 | 0 | 0 | 200 | 0 | 0 | PASS |
| B-0016 | 200 | 0 | 0 | 0 | 0 | 200 | 2 | 2 | PASS |
| B-0017 | 200 | 0 | 0 | 0 | 0 | 200 | 3 | 3 | PASS |
| B-0018 | 200 | 0 | 0 | 0 | 0 | 200 | 0 | 0 | PASS |
| B-0019 | 200 | 0 | 60 | 0 | 0 | 200 | 11 | 11 | PASS |
| B-0020 | 200 | 0 | 137 | 0 | 0 | 200 | 11 | 11 | PASS |
| B-0021 | 83 | 0 | 0 | 0 | 0 | 83 | 10 | 10 | PASS |

- frozen candidates processed: 10097 / 10097
- total 43D decisions: 434171 / 434171
- Visit extraction attempted: 10097 / 10097
- Access extraction attempted: 10097 / 10097
- existing non-null loaded/preserved: 5251 / 5244 pending baseline non-null (preserve/supersede checked)
- new non-null: 122
- superseded non-null: 0
- provenance written: 122

## Identity reconciliation

- before: 5849 SECOND_PASS_REQUIRED + 165 IDENTITY_CONFLICT_HOLD = 6014
- RESOLVED_HIGH: 2
- RESOLVED_MEDIUM: 92
- DEEP_RESEARCH_REQUIRED: 5755
- IDENTITY_CONFLICT_HOLD: 165
- after reconciliation: 6014 = 2 + 92 + 5755 + 165
- deep research files: docs/qa/TASK-073-B/identity-deep-research.md and docs/qa/TASK-073-B/identity-deep-research.jsonl
- MEDIUM/HIGH canary audit invalid: 0

## 43D coverage

- global scored before / after: 2515 / 2516
- global non-null before / after: 6111 / 6185
- new / superseded: 122 / 0
- per-feature before: {"10":337,"11":97,"12":632,"13":5,"14":0,"15":0,"16":93,"17":0,"18":2,"19":1,"20":102,"21":7,"22":238,"23":160,"24":91,"25":13,"26":8,"27":3,"28":1,"29":28,"30":0,"31":88,"32":3,"33":7,"34":15,"35":9,"36":5,"37":0,"38":2,"39":27,"40":164,"41":77,"42":114,"43":45,"01":352,"02":1196,"03":579,"04":60,"05":454,"06":707,"07":310,"08":59,"09":20}
- per-feature after: {"10":337,"11":97,"12":632,"13":5,"14":0,"15":0,"16":93,"17":0,"18":2,"19":1,"20":102,"21":7,"22":238,"23":160,"24":91,"25":13,"26":8,"27":3,"28":1,"29":28,"30":0,"31":88,"32":3,"33":7,"34":15,"35":9,"36":5,"37":0,"38":2,"39":27,"40":164,"41":77,"42":114,"43":45,"01":352,"02":1196,"03":579,"04":60,"05":454,"06":707,"07":310,"08":59,"09":20}
- coverage bands: {">=1":2515,">=10":5,">=20":0,">=30":0,">=43":0}

## Visit / Access

- authoritative Visit before / after: 23 / 23
- Visit additions / superseded: 0 / 0
- authoritative Access before / after: 1538 / 1538
- Access additions / superseded: 0 / 0
- static access link additions: 0
- attempted: Visit 10097, Access 10097

## Evidence / source statistics

- official site/tourism pages opened: 450
- government/public-body pages opened: 69
- official operator pages included in official source tier
- official SNS candidate traces: 401; posts retained: 0
- authoritative secondary pages opened: 2160
- retained target-scoped text records: 2679
- semantic annotations: 4177
- provenance written: 122
- locator/hash validation: performed before every accepted ADD_SUPPORTED
- rejected evidence / contradictory sources: 5755 / 0 unclassified

## Errors / queues / integrity

- batch failures: 0
- candidate errors: 0
- corruption/recovery events: 0
- identity deep-research queue: 5755
- identity conflict queue: 165
- canonical Registry checksum: 4c8f6a4904cd85acafc9b355d3f5d8cf85fc6e00781751a657595db821812067 (unchanged)
- candidate identity checksum: 703ad2f69806ba1b74d1ad1971ccb9edc98126d8d1317da6a6eab347838830db (unchanged)
- Master Code allocation: 0
- Registry rebind: 0
- candidateKey change: 0
- freeze manifest: data/poi/full/task-073-b-identity-deep-null-targeted-43d/freeze-manifest.json
- final output manifest: data/poi/full/task-073-b-identity-deep-null-targeted-43d/final-manifest.json

## Final local QA / integration recovery

- local QA status: **PASS_LOCAL_EXACT_HEAD_PENDING**
- receipts / feature-decision files: 52 / 52
- candidates / decisions: 10097 / 434171
- bad exactly-43D candidate rows: 0
- Visit / Access extraction attempted: 10097 / 10097
- authoritative final view: population 10369, scored 2516, non-null 6185, pending 10097
- execution before → after: scored 2515 → 2516, non-null 6111 → 6185
- batch projection new non-null / provenance: 122 / 122
- canonical applied new non-null / provenance: 74 / 74
- every applied provenance retained sourceRefs and locator/hash: 5325 / 5325
- Track A identity: HIGH 2, MEDIUM 92, DEEP_RESEARCH_REQUIRED 5755, IDENTITY_CONFLICT_HOLD 165
- deterministic final QA repeat: true
- Registry / candidate identity unchanged: true
- final manifest SHA-256: `7f2193eb3bd27af278eb95cb7ef4e772a6412c21f89531d9fe4e40d211918310`
- canonical integration recovery: finalization contract corrected to `editorial_calibration`; canonical reader revalidated PASS. No data corruption was detected.
- exact-head GitHub Quality Gate: **PENDING**

The original blocked Identity Canary remains preserved, and the remediation/rerun remains separately auditable. This local QA does not authorize COMPLETE.

## GitHub delivery

- execution branch: codex/b-task-073-identity-deep-null-targeted-43d
- Draft PR: base codex/b-task-072-evidence-to-43d-projection, head codex/b-task-073-identity-deep-null-targeted-43d
- exact final head: pending ordinary non-force push
- Quality Gate: pending exact current-head run
- heartbeat: not created in this local run
- auto-merge: false

## Final acceptance

### PARTIAL / BLOCKED

TASK-073-B is not complete. Failed or pending gate: exact-head GitHub Quality Gate pending.
