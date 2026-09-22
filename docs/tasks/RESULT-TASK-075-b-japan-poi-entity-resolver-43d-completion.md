# RESULT — TASK-075-B Japanese POI Entity Resolver + Final Identity Adjudication + 43D Completion

> Created at publication time. Must be updated continuously during execution.
> TASK-075-B cannot be COMPLETE without a fully populated final Result.

## Status
**NOT STARTED / AWAITING EXECUTION**

- Task: TASK-075-B
- Issue: #416
- Upstream: TASK-074-B / PR #415
- Publication branch: `task/b-task-075-japan-poi-entity-resolver-43d-completion`
- Planned execution branch: `codex/b-task-075-japan-poi-entity-resolver-43d-completion`
- Completion gate: NOT SATISFIED

## Authoritative baseline
Expected:
- population: 10,369
- working population: 10,097
- scored POIs: 2,519
- non-null 43D: 6,209
- Visit Profiles: 23
- Access/static links: 1,538
- residual identity records: 5,920

## Phase 0 — Baseline / audit ingestion
Must report:
- upstream exact head:
- current-view reproduction:
- residual 5,920 checksum:
- local 296MB inspect file found:
- audit summaries loaded/regenerated:
- Registry/Master Code/candidateKey invariants:
- result:

## Phase 1 — Resolver calibration
Must report:
- calibration corpus size:
- tuning rows:
- holdout rows:
- strata coverage:
- normalization version:
- municipality-history source/version:
- initial weights:
- calibrated weights:
- HIGH threshold:
- MEDIUM threshold:
- margin thresholds:
- Top1 holdout accuracy:
- HIGH precision:
- MEDIUM precision:
- hard-conflict auto-match count:
- deterministic repeat:
- calibration iterations:
- result:

Required minimum:
- Top1 accuracy >= 98.5%
- HIGH precision >= 99.0%
- MEDIUM precision >= 98.0%
- hard-conflict auto-match = 0

## Phase 2 — 5,920 residual identity adjudication

| Batch | Candidates | HIGH | MEDIUM | PROVISIONAL | ALIAS/HIST | DUPLICATE | AREA | NOT_POI | INVALID | AMBIG_EXCLUDE | QA |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| R-0001 | TBD | TBD | TBD | TBD | TBD | TBD | TBD | TBD | TBD | TBD | TBD |
| ... | ... | ... | ... | ... | ... | ... | ... | ... | ... | ... | ... |
| R-0030 | TBD | TBD | TBD | TBD | TBD | TBD | TBD | TBD | TBD | TBD | TBD |

Final reconciliation:
```text
5920
=
MATCHED_HIGH
+ MATCHED_MEDIUM
+ MATCHED_PROVISIONAL
+ HISTORICAL_OR_ALIAS_MATCH
+ DUPLICATE_OF_EXISTING
+ AREA_OR_DISTRICT_ENTITY
+ NOT_A_POI
+ SOURCE_RECORD_INVALID
+ SOURCE_RECORD_AMBIGUOUS_EXCLUDE
```

Forbidden final counts:
```text
DEEP_RESEARCH_REQUIRED = 0
EVIDENCE_EXHAUSTED_UNRESOLVED = 0
generic UNRESOLVED = 0
open IDENTITY_CONFLICT_HOLD = 0
```

## Resolver identity statistics
Must report:
- municipality-first blocks:
- municipality-unique matches:
- historical municipality remaps:
- exact/alias name matches:
- address/locality disambiguations:
- official URL/operator disambiguations:
- station/nearby-context disambiguations:
- Top1 score distribution:
- Top1-Top2 margin distribution:
- hard-conflict count:
- excluded record reasons:
- provisional count and risk summary:

## Phase 3 — Immediate enrichment after accepted identity
Must report:
- accepted identities:
- accepted identities enriched same pass:
- direct new 43D:
- inferred new 43D:
- superseded:
- provenance written:
- Visit attempted/added:
- Access attempted/added:
- canonical applied:
- canonical rejected by reason:

## Phase 4 — Final 43D completion sweep

| Batch | Candidates | Semantic annotation | Existing loaded | Preserved | Direct add | Inferred add | Superseded | Provenance | Remaining null | QA |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| F-0001 | TBD | TBD | TBD | TBD | TBD | TBD | TBD | TBD | TBD | TBD |
| ... | ... | ... | ... | ... | ... | ... | ... | ... | ... | ... |

Must report:
- dynamic accepted-POI queue size:
- candidates processed:
- exactly-43 decision failures:
- low-yield batches remediated:
- source-saturation audits:
- direct additions:
- inferred additions:
- superseded:
- provenance:
- remaining unsupported-after-exhaustive-search:

## 43D final coverage
Must report:
- scored POIs before / after:
- non-null 43D before / after:
- direct new:
- inferred new:
- superseded:
- preserved:
- remaining null:
- all 43 feature counts before:
- all 43 feature counts after:
- coverage bands:
  - >=1
  - >=10
  - >=20
  - >=30
  - 43/43

## Visit / Access final
Must report:
- Visit before / after / added / superseded:
- Access before / after / added / superseded:
- supported facts preserved:

## Source / evidence statistics
Must report:
- official target sources:
- government/prefecture/municipality sources:
- tourism/DMO:
- cultural-property/museum/park/religious:
- official operator:
- official SNS:
- authoritative map/reference:
- authoritative secondary:
- retained texts:
- semantic annotations:
- direct provenance:
- inferred provenance:
- locator/hash validations:
- rejected evidence:
- contradictory evidence:

## Canonical reconciliation
Must report:
- projected additions:
- canonical applied:
- duplicate already canonical:
- rejected identity:
- rejected evidence:
- rejected contract:
- superseded:
- unexplained delta: MUST BE 0

## Self-healing incidents
For each meaningful automatic remediation:
- phase/batch:
- failure type:
- diagnosis:
- repair:
- rerun result:
- user intervention required: expected false for routine failures

## Required QA outputs
Must exist:
- `docs/qa/TASK-075-B/resolver-calibration.md`
- `docs/qa/TASK-075-B/resolver-calibration.json`
- `docs/qa/TASK-075-B/resolver-holdout-errors.jsonl`
- `docs/qa/TASK-075-B/residual-identity-final.md`
- `docs/qa/TASK-075-B/residual-identity-final.jsonl`
- `docs/qa/TASK-075-B/excluded-source-records.md`
- `docs/qa/TASK-075-B/excluded-source-records.jsonl`
- `docs/qa/TASK-075-B/43d-evidence-exhausted.md`
- `docs/qa/TASK-075-B/43d-evidence-exhausted.jsonl`

## Integrity
Must report exact before/after:
- Registry checksum:
- candidate identity checksum:
- Master Code registry checksum:
- resolver freeze manifest:
- residual population checksum:
- final output manifest:

Required invariants:
```text
Master Code allocation = 0
Registry rebind = 0
candidateKey changes = 0
```

## Final QA
Must report:
- deterministic resolver repeat:
- deterministic final rebuild:
- targeted identity tests:
- targeted POI/43D tests:
- Visit tests:
- Access tests:
- full repository tests:
- lint:
- typecheck:
- format:
- build/deployment/artifact:
- whitespace:
- exact current-head GitHub Quality Gate:

## GitHub delivery
Must report:
- execution branch:
- Draft PR:
- implementation/evidence head:
- exact final PR head:
- Quality Gate run ID:
- conclusion:
- heartbeat deleted:
- auto-merge: false

## Final acceptance

### COMPLETE
Only if:
- resolver calibration gates PASS;
- 5,920/5,920 have final dispositions;
- no generic unresolved/deep-research/conflict-hold remains;
- every accepted POI receives immediate enrichment;
- every accepted POI with remaining nulls receives final 43D sweep;
- every added/superseded value has provenance;
- remaining nulls are only UNSUPPORTED_AFTER_EXHAUSTIVE_SEARCH with audit trail;
- Visit/Access supported data does not regress;
- canonical unexplained delta = 0;
- deterministic QA PASS;
- exact current-head GitHub Quality Gate PASS.

### PARTIAL / BLOCKED
Only for a true hard blocker defined by TASK-075-B, and the exact blocker must be named.
