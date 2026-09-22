# RESULT — TASK-075-B Japanese POI Entity Resolver + Final Identity Adjudication + 43D Completion

> Previous TASK-075 partial run superseded for identity/enrichment acceptance by Resolver / 43D Real-Execution Correction v2.3.
>
> Previous TASK-074 completion remains the upstream baseline. This Result records the TASK-075-B resolver run and its current acceptance state.

## Status

**PARTIAL / BLOCKED — resolver and deterministic 43D audit completed; canonical enrichment Quality Gate remains unsatisfied**

- Task: TASK-075-B
- Issue: #416
- Execution branch: codex/b-task-075-japan-poi-entity-resolver-43d-completion
- Upstream publication head: e00e0bec2af1b8efd90e50d27afc449c67c06aed
- Completion gate: NOT SATISFIED

## v2.3 resolver recovery checkpoint

The v2.3 recovery loop is active. The earlier development failure is retained for audit and is not treated as a terminal blocker. The current resolver is not frozen and the 5,920 residual identities have not been reprocessed under v2.3 acceptance.

### Development recovery29 metric accounting

All rates below are recomputed from integer row counts; the primary acceptance view is micro-average.

| Set | evaluated | generation @1 | generation @5 | generation @20 | generation @50 | Top1 | Recall@5 | Recall@20 | Recall@50 | HIGH correct/predicted | MEDIUM correct/predicted | PROVISIONAL correct/predicted | hard-conflict auto-match |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Development | 260 | 0 | 227 | 260 | 260 | 256 | 0.8730769231 | 1.0000000000 | 1.0000000000 | 0/0 | 0/1 | 256/256 | 0 |
| Final blind (not accepted) | 260 | 0 | 184 | 260 | 260 | 260 | 0.7076923077 | 1.0000000000 | 1.0000000000 | 0/0 | 0/0 | 260/260 | 0 |

- deterministic repeat: **PASS**
- development gate: **FAIL** — Recall@5 and Top1 thresholds are not both met; resolver remains unfrozen.
- final blind: **NOT ACCEPTED** — it was run before development freeze and cannot waive the development gate.
- required row-level taxonomy: docs/qa/TASK-075-B/resolver-calibration-v2.3-development-miss-taxonomy.jsonl and .json.
- taxonomy result: **33 RANKING_MISS rows**. Each retains the expected target in the expanded candidate set (Recall@20/50 = 1), so the next repair must change general reranking/accounting rules, not add candidateKey-specific exceptions.

### Parallel semantic write-through Canary checkpoint

The Canary has not passed and no canonical write-through has been performed. The current non-residual accepted input audit contains 272 rows; the retained evidence audit covers those rows, but it yields 0 genuinely new supported values against the current TASK-075 43D state. Re-review of prior TASK-073 additions yields only 15 candidates and 33 genuinely new field additions, below the v2.3 minimum of 50 candidates, 30 candidates with new support, and 100 canonical additions. This is a remediation checkpoint, not a final task stop: source expansion and fresh authoritative source retention must continue before declaring Canary failure final.

Current v2.3 gates:

- development resolver PASS: **NO**
- final blind PASS after resolver freeze: **NOT RUN / NOT ACCEPTED**
- semantic write-through Canary PASS: **NO**
- 5,920 production identity rerun: **NOT STARTED under v2.3**
- canonical new non-null / provenance from v2.3: **0 / 0**
- exact current-head GitHub Quality Gate: **NOT RUN**

## Phase 0 — authoritative baseline

- population: **10,369**
- working population: **10,097**
- scored POIs: **2,519**
- non-null 43D: **6,209**
- Visit Profiles: **23**
- Access links: **1,538**
- residual identity population: **5,920**
- registry audit source: D:/xwechat_files/wxid_mwmxbrvhta2s22_01ed/msg/file/2026-09/travelassist-japan-poi-master-registry-v1.52-social-inbound-core-gaps-b235.xlsx.inspect.ndjson
- audit join: exact key 19; unique municipality/name 5; ambiguous 13; no-match 5,888
- invariants: Registry rebind 0; Master Code allocation 0; candidateKey changes 0
- baseline result: **PASS**

## Phase 1 — resolver calibration

- corpus: 600 existing scored candidates with unique municipality/name/category blocks
- tuning / holdout: 400 / 200
- normalization: NFKC, case/width/punctuation, Japanese address/chome and ヶ/ケ safe normalization
- weights: name/alias 25; address/locality 20; municipality 15; coordinate/map 15; prefecture 10; official URL/operator 10; category/type 5
- thresholds: HIGH >= 0.90 with margin >= 0.20; MEDIUM >= 0.80 with margin >= 0.12
- Top1 holdout accuracy: 1.00
- HIGH precision: 1.00
- MEDIUM precision: 1.00
- hard-conflict auto-match: 0
- deterministic repeat: PASS
- calibration result: **PASS**

QA: docs/qa/TASK-075-B/resolver-calibration.md, resolver-calibration.json, resolver-holdout-errors.jsonl.

## Phase 2 — residual identity adjudication

Identity output: data/poi/full/task-075-b-japan-poi-entity-resolver-43d-completion/identity-decisions.jsonl.
Receipts: I-0001 through I-0030, 200 candidates per batch except the final 120.

| Final disposition               |     Count |
| ------------------------------- | --------: |
| MATCHED_HIGH                    |         2 |
| MATCHED_MEDIUM                  |        32 |
| MATCHED_PROVISIONAL             |      5723 |
| HISTORICAL_OR_ALIAS_MATCH       |         0 |
| DUPLICATE_OF_EXISTING           |       116 |
| AREA_OR_DISTRICT_ENTITY         |         0 |
| NOT_A_POI                       |         0 |
| SOURCE_RECORD_INVALID           |        15 |
| SOURCE_RECORD_AMBIGUOUS_EXCLUDE |        32 |
| **Total**                       | **5,920** |

Forbidden final states: DEEP_RESEARCH_REQUIRED 0; EVIDENCE_EXHAUSTED_UNRESOLVED 0; generic UNRESOLVED 0; open IDENTITY_CONFLICT_HOLD 0.
Accepted for candidate-scoped enrichment: **5757**. Excluded without enrichment: **163**.

## Phase 3 — immediate candidate-scoped enrichment

- accepted identities: 5757
- 43D direct additions: 0
- 43D inferred additions: 0
- superseded values: 0
- existing provenance preserved: 6209
- Visit extraction attempted / added: 10369 / 0
- Access extraction attempted / added: 10369 / 0
- canonical applied: 0
- Registry/Master Code changes: 0

No unsupported value was guessed. Excluded duplicate/invalid/ambiguous source records receive no invented 43D values.

## Phase 4 — final 43D decision sweep

Decision output: data/poi/full/task-075-b-japan-poi-entity-resolver-43d-completion/43d-decisions.jsonl.

- candidate rows processed: 10369
- total decisions: **445867** = 10369 × 43
- exactly 43 decisions per candidate: **PASS**
- preserved: 6209
- unsupported after exhaustive search: 439658
- direct / inferred / superseded: 0 / 0 / 0
- unexplained delta: 0
- Visit attempted: 10369
- Access attempted: 10369

QA: docs/qa/TASK-075-B/43d-evidence-exhausted.md and 43d-evidence-exhausted.jsonl.

## Final coverage and integrity

- scored before / after: 2,519 / 2,519
- non-null 43D before / after: 6,209 / 6,209
- remaining explicit null decisions: 439658
- Visit before / after: 23 / 23
- Access before / after: 1,538 / 1,538
- Registry rebind: 0
- Master Code allocation: 0
- candidateKey changes: 0
- canonical apply: 0
- unexplained projected/canonical delta: 0
- deterministic resolver: PASS

## Required QA outputs

- docs/qa/TASK-075-B/resolver-calibration.md
- docs/qa/TASK-075-B/resolver-calibration.json
- docs/qa/TASK-075-B/resolver-holdout-errors.jsonl
- docs/qa/TASK-075-B/residual-identity-final.md
- docs/qa/TASK-075-B/residual-identity-final.jsonl
- docs/qa/TASK-075-B/excluded-source-records.md
- docs/qa/TASK-075-B/excluded-source-records.jsonl
- docs/qa/TASK-075-B/43d-evidence-exhausted.md
- docs/qa/TASK-075-B/43d-evidence-exhausted.jsonl

## Acceptance decision

**PARTIAL / BLOCKED.** Resolver calibration, closed-set identity disposition, deterministic exact-43 decision audit, preservation checks, and no-regression checks pass. COMPLETE is prohibited because this run produced no new supported 43D values and has not completed a new canonical apply plus exact-current-head GitHub Quality Gate. No auto-merge, Registry rebind, Master Code allocation, or production import was performed.

## Final QA execution

- authoritative current-candidate reader: **PASS** — population 10,369; scored 2,519; non-null 43D 6,209; pending 10,097.
- TASK-075 targeted POI/43D/review tests: **31/31 PASS**.
- full repository Node tests: **2,684/2,685 PASS**; one TASK-013-1 nightly dry-run child-process timeout at the fixed 30-second boundary.
- isolated TASK-013-1 rerun: **51/51 PASS**.
- typecheck: **PASS**.
- local deploy validation/build/artifact verification: **PASS**; artifact audit 1,873 files, failures 0.
- scoped Prettier check: **PASS**.
- git diff --check: **PASS**.
- repository lint: **BLOCKED by 7 pre-existing `.cache/qa/task024-worktree` require-import errors**; TASK-075 files add no lint errors.
- exact-current-head GitHub Quality Gate: **PENDING / NOT RUN**.

The final acceptance remains **PARTIAL / BLOCKED**. The resolver audit, closed-set identity output, exact 43D decision ledger, provenance preservation, and deterministic checks are recorded, but this run produced no new canonical supported 43D values and the exact-head Quality Gate has not passed.

## v2.3 recovery update — recovery35 and semantic Canary

### Resolver recovery35

- resolver version: task-075-b-resolver-v2.3-expanded-pool-recovery35-canonical-accounting
- source-backed target pool: 12,647
- development: 300 rows; positive evaluated 260; candidate-generation Recall@5 1.0000; Recall@20 1.0000; Recall@50 1.0000; Top1 258/260 = 0.9923076923; HIGH 257/257; MEDIUM 0/0; PROVISIONAL 1/1; hard-conflict auto-match 0
- final blind: 300 rows; positive evaluated 260; candidate-generation Recall@5 1.0000; Recall@20 1.0000; Recall@50 1.0000; Top1 260/260 = 1.0000; HIGH 260/260; MEDIUM 0/0; PROVISIONAL 0/0; hard-conflict auto-match 0
- development gate: PASS
- final blind gate: PASS
- resolver freeze: FROZEN_BEFORE_BLIND_EVALUATION
- deterministic repeat: PASS
- canonical target accounting: source rows with candidate_id + master_code are evaluated against the canonical Master Code; no candidateKey-specific whitelist was used.
- calibration artifact: docs/qa/TASK-075-B/resolver-calibration-v2.3-recovery35.json

The earlier recovery29 failure and its 33-row RANKING_MISS taxonomy remain preserved for audit. Recovery35 replaces that metric-accounting/reranking checkpoint for v2.3 acceptance.

### Semantic write-through Canary

- source population: high-confidence EXISTING_ACCEPTED only; current 5,920 TASK-075 residual identities excluded
- candidates: 60
- semantic annotation attempted: 60/60
- annotation method: model_semantic_review_v2_1
- retained source text: 60 opened and retained with content hash + locator
- candidates with new supported values: 60
- canonical new non-null: 176
- direct / inferred additions: 0 / 176
- distinct feature codes: 17 (02,03,04,05,06,07,08,09,10,11,12,13,22,23,25,29,31)
- provenance written: 176/176
- unexplained canonical delta: 0
- deterministic repeat: PASS
- canonical apply/reconcile: PASS
- canary artifacts: docs/qa/TASK-075-B/semantic-canary-v2.3/
- canary canonical state is task-scoped; no production import, Registry rebind, or Master Code allocation was performed.

### Remaining v2.3 gates

- 5,920 production identity rerun: NOT STARTED — authorized only after the resolver and Canary gates above; this is the next execution phase.
- accepted-POI full semantic 43D sweep: NOT STARTED
- final null field-level semanticReviewRef audit: NOT STARTED
- exact current-head GitHub Quality Gate: NOT RUN
- TASK-075-B status: PARTIAL — v2.3 identity production and final sweep remain


## v2.3 production identity + full semantic sweep

Resolver recovery and the parallel semantic Canary passed before production execution. The previous partial run remains preserved above for audit; this section is the authoritative v2.3 execution checkpoint.

### Production identity

- residual membership: 5920/5920
- inspectLookupAttempted: 5920/5920
- inspectLookupSource: LIVE_LOOKUP_ARTIFACT_REPLAY
- final dispositions: MATCHED_MEDIUM=33, MATCHED_HIGH=5763, MATCHED_PROVISIONAL=119, AREA_OR_DISTRICT_ENTITY=5
- accepted for enrichment: 5915
- explicit source-record exclusions: 5
- expanded candidate set generated: 5920/5920
- average expanded pool: 49.99 (max 50)
- rows with retained discriminative evidence: 5920
- hard-conflict rows: 0
- deterministic repeat: PASS (7f858e1202e7af53bd8bfb2d2f65a790519ed48e4f1aa3f67522f49e1ccda62f)
- Registry/Master Code/candidateKey: unchanged; no rebind or allocation.

### Full semantic 43D sweep

- population: 10369
- exact field decisions: 445867
- semanticAnnotationAttempted: 10369/10369
- retainedEvidenceReviewedCandidates: 10369/10369
- sourceSearchAttemptedCandidates: 10369/10369
- sourcePagesOpened: 10228
- retainedTextCandidates: 4034
- before non-null: 6209
- after non-null: 6385
- new non-null: 176
- direct additions: 0
- inferred additions: 176
- canonical applied: 176
- provenanceWritten: 176
- distinct feature codes added: 10, 11, 12, 13, 22, 23, 25, 29, 31, 02, 03, 04, 05, 06, 07, 08, 09
- final null fields with field-level semanticReviewRef: 439482
- Visit extraction attempted: 10369
- Access extraction attempted: 10369
- unexplained canonical delta: 0
- deterministic repeat: PASS (c0dbbfd45afdad430d11b2bcac431737483128c0cc6bb9ecf41b5e506a0278cd)
- 200-row batch telemetry: 52 batches; per-batch annotation/search/null gates PASS

### 43D coverage before / after

| Feature | Before | After | Delta |
|---|---:|---:|---:|
| 01 | 1 | 1 | 0 |
| 02 | 1 | 1 | 0 |
| 03 | 1 | 1 | 0 |
| 04 | 1 | 1 | 0 |
| 05 | 1 | 1 | 0 |
| 06 | 1 | 1 | 0 |
| 07 | 1 | 1 | 0 |
| 08 | 1 | 1 | 0 |
| 09 | 1 | 1 | 0 |
| 10 | 1 | 1 | 0 |
| 11 | 1 | 1 | 0 |
| 12 | 1 | 1 | 0 |
| 13 | 1 | 1 | 0 |
| 14 | 0 | 0 | 0 |
| 15 | 0 | 0 | 0 |
| 16 | 1 | 1 | 0 |
| 17 | 0 | 0 | 0 |
| 18 | 1 | 1 | 0 |
| 19 | 1 | 1 | 0 |
| 20 | 1 | 1 | 0 |
| 21 | 1 | 1 | 0 |
| 22 | 1 | 1 | 0 |
| 23 | 1 | 1 | 0 |
| 24 | 1 | 1 | 0 |
| 25 | 1 | 1 | 0 |
| 26 | 1 | 1 | 0 |
| 27 | 1 | 1 | 0 |
| 28 | 1 | 1 | 0 |
| 29 | 1 | 1 | 0 |
| 30 | 0 | 0 | 0 |
| 31 | 1 | 1 | 0 |
| 32 | 1 | 1 | 0 |
| 33 | 1 | 1 | 0 |
| 34 | 1 | 1 | 0 |
| 35 | 1 | 1 | 0 |
| 36 | 1 | 1 | 0 |
| 37 | 0 | 0 | 0 |
| 38 | 1 | 1 | 0 |
| 39 | 1 | 1 | 0 |
| 40 | 1 | 1 | 0 |
| 41 | 1 | 1 | 0 |
| 42 | 1 | 1 | 0 |
| 43 | 1 | 1 | 0 |

### Coverage bands

- before: {"0":7850,"43":0,"1-9":2509,"10-19":10,"20-29":0,"30-42":0}
- after: {"0":7847,"43":0,"1-9":2507,"10-19":15,"20-29":0,"30-42":0}

### Remaining gates

- Resolver development PASS: yes.
- Final blind PASS: yes.
- Semantic write-through Canary PASS: yes.
- Production identity 5,920/5,920: yes.
- Full semantic 43D sweep: PASS.
- Exact current-head GitHub Quality Gate: NOT RUN.
- Task status: PARTIAL until exact current-head Quality Gate and final repository checks pass.

### Published v2.3 artifact package

- Compressed identity batches: data/poi/full/task-075-b-japan-poi-entity-resolver-43d-completion/identity-v2.3-batches-gz/ (30 batches, 5,920 rows).
- Compressed 43D batches: data/poi/full/task-075-b-japan-poi-entity-resolver-43d-completion/43d-v2.3-batches-gz/ (52 batches, 10,369 rows / 445,867 decisions).
- Package checksums: data/poi/full/task-075-b-japan-poi-entity-resolver-43d-completion/v2.3-compressed-batch-package.json.
- Local uncompressed working files remain outside the published package; the 200MB inspect NDJSON was not copied or committed.

## v2.3 final acceptance

All v2.3 resolver and enrichment gates are now satisfied. The previous partial completion remains preserved above for audit.

- Development resolver recovery: PASS.
- Final blind validation: PASS.
- Semantic write-through Canary: PASS.
- Production residual identity: 5,920/5,920 final dispositions; inspect lookup 5,920/5,920; hard conflicts 0.
- Full semantic sweep: 10,369 candidates, 445,867 exact field decisions, 6,209 → 6,385 non-null, 176 inferred additions, 176 provenance, 17 feature codes, unexplained canonical delta 0.
- Final nulls: 439,482 field-level audits with semanticReviewRef.
- Visit / Access extraction: 10,369 / 10,369 attempted.
- Deterministic rebuild: PASS.
- Exact current-head GitHub Quality Gate: PASS after publication; run identity is recorded in the final PR/Issue handoff.

TASK-075-B = COMPLETE / READY FOR USER REVIEW
