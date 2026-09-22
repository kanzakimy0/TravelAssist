# TASK-075-B — Japanese POI Entity Resolver + Final Identity Adjudication + 43D Completion

## Status
Authorized for one-shot unattended execution.

- Issue: #416
- Owner: B
- Upstream: TASK-074-B / PR #415
- Upstream exact head at publication: `6f5526897212605ba918d676a430404d23153ece`
- Upstream Quality Gate: PASS
- Task branch: `task/b-task-075-japan-poi-entity-resolver-43d-completion`
- Planned execution branch: `codex/b-task-075-japan-poi-entity-resolver-43d-completion`

## Objective
Solve the remaining POI identity problem in one task, then complete evidence-backed 43D enrichment without another user feedback loop.

The task must:
1. build a municipality-first Japanese POI Entity Resolver;
2. calibrate it on known-good identities;
3. adjudicate all 5,920 residual identity records to a final state;
4. leave no generic unresolved/deep-research/conflict-hold status;
5. immediately enrich every accepted identity;
6. run a final 43D sweep over every accepted POI with remaining nulls;
7. preserve/expand Visit and Access evidence;
8. integrate every accepted fact canonically per batch;
9. automatically repair routine failures;
10. finish with complete Result Markdown and exact-head GitHub Quality Gate PASS.

No fabricated identities or scores.

If a source record cannot be safely bound to one real-world POI even after resolver + deep search, the problem must be resolved by classifying the source record itself as duplicate/invalid/ambiguous/non-POI/area entity rather than leaving it open.

## Authoritative starting baseline
Expected:
- population: 10,369
- working population: 10,097
- scored POIs: 2,519
- non-null 43D: 6,209
- Visit Profiles: 23
- Access/static links: 1,538
- residual identity population: 5,920
  - 5,755 evidence-exhausted
  - 165 conflict hold

Local auxiliary input when present:
`travelassist-japan-poi-master-registry-v1.52-social-inbound-core-gaps-b235.xlsx.inspect.ndjson`

Known audit:
- ~296MB / 771,726 rows
- 35,149 indexable identity rows
- useful fields: candidate/entity IDs, master_code, Japanese/English names, prefecture, municipality, address, aliases, category/type, canonical/source/discovery URL, source metadata/tier/date, SNS discovery URL
- no usable coordinate/operator coverage
- direct residual join only solved a small number, so this file is auxiliary rather than the resolver backbone

Do not commit the 296MB file.

## Final identity dispositions
Every one of the 5,920 residual records must receive exactly one final disposition:

- `MATCHED_HIGH`
- `MATCHED_MEDIUM`
- `MATCHED_PROVISIONAL`
- `HISTORICAL_OR_ALIAS_MATCH`
- `DUPLICATE_OF_EXISTING`
- `AREA_OR_DISTRICT_ENTITY`
- `NOT_A_POI`
- `SOURCE_RECORD_INVALID`
- `SOURCE_RECORD_AMBIGUOUS_EXCLUDE`

Forbidden at final completion:
- DEEP_RESEARCH_REQUIRED
- EVIDENCE_EXHAUSTED_UNRESOLVED
- generic UNRESOLVED
- open IDENTITY_CONFLICT_HOLD

This is candidate-level adjudication only. No Registry rebind or Master Code allocation.

## Resolver design

### 1. Municipality-first blocking
When authoritative candidate data fixes prefecture + municipality:

`prefecture → municipality → normalized name/alias → candidate set`

Treat prefecture/municipality as strong blocking constraints, not weak scoring features.

Search outside the municipality only if:
- documented historical municipality change;
- municipal merger/rename;
- boundary-spanning geographic feature;
- strong evidence upstream municipality is stale/wrong.

### 2. Japanese normalization
Implement reusable normalization while retaining originals:
- Unicode NFKC
- full/half-width
- whitespace/punctuation
- Japanese/ASCII parentheses
- middle dot
- romanization spacing/hyphens
- safe numeric/chome address normalization
- 一丁目 ↔ 1丁目 style normalization where safe
- ヶ / ケ locality variants where safe
- Japanese/English aliases
- former/historical names only with evidence

Do not collapse semantically distinct names.

### 3. Historical municipality mapping
Build/use documented mapping for:
- municipal mergers
- renamed municipalities
- ward/city reorganization
- old town/village names

Prefer official government/local-government evidence.

### 4. Candidate generation
Generate Top-N candidates from:
- local 296MB inspect source where joinable
- repository candidate/source metadata
- official target site
- prefecture/municipality/government sources
- tourism/DMO
- cultural-property/museum/park/religious sources
- official operator
- verified official SNS
- authoritative map/reference/knowledge sources
- reliable secondary sources
- nearby station/locality/landmark context
- existing Access relationships as reverse identity evidence

Search snippets are discovery only.

### 5. Hard conflicts
Normally hard conflict unless explicitly explained:
- prefecture mismatch
- municipality mismatch after historical mapping
- incompatible entity type
- incompatible address/locality
- official operator/domain is a different entity

Hard conflicts cannot be overridden by soft score.

### 6. Dynamic scoring
Initial relative weights:
- Japanese name / verified alias: 25
- address/locality: 20
- municipality: 15
- coordinate/map context: 15
- prefecture: 10
- official URL/operator ownership: 10
- category/type: 5

Renormalize over available usable evidence. Missing fields must not create artificial penalties.

Additional discriminative signals:
- nearest station
- nearby named landmark
- official organization
- historical rename/relocation relation
- municipality-level uniqueness

### 7. Top1/Top2 margin
Compute:
- Top1 score
- Top2 score
- margin
- hard conflicts

Initial thresholds to calibrate:
- HIGH: score >=0.90, margin >=0.20, >=1 discriminative signal, no hard conflict
- MEDIUM: score >=0.80, margin >=0.12, >=2 independent signals, no hard conflict

Do not freeze thresholds until calibration passes.

### 8. Municipality-unique rule
If within authoritative prefecture+municipality:
- one reasonable normalized-name/alias match exists;
- type compatible;
- no hard conflict;
- >=1 additional official/authoritative discriminative confirmation;

then it may be MATCHED_HIGH even without two unrelated websites.

### 9. Provisional match
MATCHED_PROVISIONAL requires:
- one candidate clearly dominates alternatives;
- prefecture/municipality compatible;
- name/alias compatible;
- >=1 discriminative signal;
- no hard conflict;
- enough evidence for candidate-level enrichment but not formal Registry identity.

If no safe candidate dominates, adjudicate the source record as ambiguous/invalid rather than invent a match.

## Phase 0 — Baseline and audit ingestion
1. reproduce TASK-074 authoritative view;
2. load all 5,920 residual records;
3. locate the local 296MB inspect file if present;
4. load/regenerate `docs/qa/POI-IDENTITY-REGISTRY-AUDIT/` outputs;
5. freeze 5,920 membership/order/checksum;
6. preserve Registry/Master Code/candidateKey invariants.

## Phase 1 — Resolver calibration
Build at least 600 known-good accepted POIs:
- >=400 tuning/calibration
- >=200 untouched holdout

Stratify by:
- prefecture
- urban/rural
- temples/shrines
- parks/nature
- museums/cultural
- stations/transport-adjacent
- shopping/food/entertainment
- onsen/area entities
- common vs unique names
- Japanese/English aliases

Required holdout:
- Top1 accuracy >=98.5%
- MATCHED_HIGH precision >=99.0%
- MATCHED_MEDIUM precision >=98.0%
- zero hard-conflict auto-match
- deterministic repeat PASS

If calibration fails:
- analyze errors
- improve normalization/candidate generation/historical municipality/scoring
- recalibrate
- rerun holdout
- continue automatically

Do not ask the user to tune weights.

## Phase 2 — Adjudicate all 5,920 residual identities
Max 200 per batch; expected 30 initial batches.

For every candidate:
1. municipality-first blocking;
2. name/alias normalization;
3. Top-N generation;
4. retain discriminative evidence;
5. compare locality/address/type/official URL/operator/station/context;
6. score + margin + hard-conflict evaluation;
7. if weak, automatically escalate search;
8. if still unsafe to map, adjudicate the source record itself;
9. produce one final disposition.

Each record must contain:
- candidateKey
- original identity fields
- Top-N candidates
- evidence features
- sourceRefs
- score
- margin
- hardConflicts
- concise reasoning
- finalDisposition
- matched target, duplicate target, or exclusion reason

No generic unresolved result.

## Phase 3 — Immediate 43D/Visit/Access enrichment
Immediately enrich:
- MATCHED_HIGH
- MATCHED_MEDIUM
- MATCHED_PROVISIONAL
- HISTORICAL_OR_ALIAS_MATCH
- AREA_OR_DISTRICT_ENTITY

For each:
- load current 43D/provenance
- preserve supported values
- enumerate nulls
- targeted evidence search
- semantic annotation
- rubric scoring
- Visit attempt
- Access attempt
- canonical apply
- immediate reconciliation

Do not defer to another task.

Excluded duplicates/invalid/non-POI records do not receive invented 43D values.

## Phase 4 — Final 43D completion sweep
Build a dynamic queue of every accepted POI in the 10,369 authoritative population with >=1 null 43D field.

Process max 200 per batch until exhausted.

Every accepted candidate:
- exactly 43 field decisions
- existing supported values preserved
- remaining null families actively searched
- direct or source-backed inferred values may be added
- complete provenance on every add/supersede
- null allowed only after search saturation is documented

Allowed field dispositions:
- PRESERVE_SUPPORTED
- ADD_DIRECT_SUPPORTED
- ADD_INFERRED_SUPPORTED
- SUPERSEDE_SUPPORTED
- UNSUPPORTED_AFTER_EXHAUSTIVE_SEARCH
- NOT_APPLICABLE_BY_ENTITY_TYPE only where rubric permits

ADD_INFERRED_SUPPORTED requires:
- retained source facts
- explicit rubric mapping
- rationale
- confidence
- source refs
- locator/hash

No AI-memory-only score.

## Feature-family search
Group searches efficiently:
- history / architecture / art / local / educational
- scenery / nature / photo / seasonality
- food / shopping / entertainment / night / onsen
- family / senior / couple / solo / relax / adventure
- walking / physical / indoor-outdoor / weather sensitivity
- cost / reservation / duration / access
- unique / iconic / hidden with comparative evidence

Do not issue 43 blind searches.

## Search saturation
Before leaving an accepted POI feature family null:
- review retained target-scoped evidence
- attempt at least two appropriate source families when available
- record source-unavailable exceptions

## Low-yield auto-remediation
If a 200-row 43D batch produces very low additions:
1. sample >=20 low-yield rows;
2. verify search/source targeting;
3. verify semantic extraction;
4. expand query templates/source families;
5. rerun affected batch;
6. continue automatically.

Zero/near-zero additions can PASS only with explicit evidence-saturation audit.

## Visit completion
- preserve supported Visit facts
- search official recommended duration/itinerary/route/facility guidance
- source-backed inference only where rubric permits
- never treat opening hours/transport time as whole-visit duration without support

## Access completion
- preserve current static Access facts
- search official access pages / nearest station / stop / port / last mile
- live timetable/fare/delay/current accessibility remain runtime facts

## Canonical integration
Every batch:
`evidence → semantic facts → projection → canonical apply → diff/reconcile → QA → receipt`

Every projected addition must end as:
- applied
- duplicate already canonical
- rejected with explicit identity/evidence/contract reason
- superseded

No unexplained projected/canonical delta may survive.

## Self-healing
Automatically handle:
- 404/timeout/JS-only → alternate official/government/tourism/operator/SNS/secondary
- parser failure → fallback parser
- low identity margin → deeper candidate generation/search
- stale municipality → historical municipality mapping
- test failure → classify/fix/rerun
- projection mismatch → diff/fix/regenerate
- artifact corruption → rebuild affected batch
- transient Git/network failure → bounded retry
- non-fast-forward → fetch/inspect, safe normal merge only if no history rewrite

Do not stop for routine remediation.

True hard blockers only:
- force/history rewrite required
- unavailable repository credentials/permissions
- new paid-provider authorization required
- irreducible formal Registry/Master Code governance decision
- infrastructure unusable after bounded retries

Continue unaffected work even if one candidate has a true blocker.

## Required QA outputs
Resolver:
- `docs/qa/TASK-075-B/resolver-calibration.md`
- `docs/qa/TASK-075-B/resolver-calibration.json`
- `docs/qa/TASK-075-B/resolver-holdout-errors.jsonl`

Identity:
- `docs/qa/TASK-075-B/residual-identity-final.md`
- `docs/qa/TASK-075-B/residual-identity-final.jsonl`
- `docs/qa/TASK-075-B/excluded-source-records.md`
- `docs/qa/TASK-075-B/excluded-source-records.jsonl`

43D:
- `docs/qa/TASK-075-B/43d-evidence-exhausted.md`
- `docs/qa/TASK-075-B/43d-evidence-exhausted.jsonl`

## Batch telemetry
Record:
- phase / batchId
- model / reasoning
- candidateCount
- queryCount
- municipalityBlockCount
- historicalMunicipalityRemapCount
- candidateSetGeneratedCount
- uniqueMunicipalityMatchCount
- Top1 score distribution
- margin distribution
- hardConflictCount
- final disposition counts
- official/government/tourism/operator/SNS/secondary pages
- retainedTextCount
- semanticAnnotationAttemptedCount
- existingNonNullLoaded
- preservedNonNull
- directAdded
- inferredAdded
- superseded
- provenanceWritten
- featureDecisionCount
- Visit attempted/added/preserved
- Access attempted/added/preserved
- canonicalApplied
- canonicalRejectedByReason
- remainingNullCount
- retry/recovery actions
- checksums
- elapsed

## Hard gates
Batch cannot PASS if:
- membership mismatch
- any residual lacks final identity disposition
- matched identity violates hard conflict
- HIGH/MEDIUM lacks calibrated evidence/margin
- provisional lacks dominant candidate + discriminative evidence
- excluded record lacks reason
- supported value disappears silently
- ADD/SUPERSEDE lacks provenance
- semantic annotation skipped for accepted POIs
- search snippet used as evidence
- 43D decisions incomplete
- projected/canonical delta unexplained
- Visit/Access regression
- Registry/Master Code/candidateKey changed
- deterministic rerun fails
- receipt before outputs

## Final acceptance
TASK-075-B COMPLETE requires:

Identity:
- 5,920 / 5,920 final dispositions
- no generic unresolved/deep-research/conflict-hold state
- unsafe records explicitly excluded/typed instead of guessed

43D:
- every accepted POI has exactly 43 decisions
- every accepted POI with nulls received final targeted evidence sweep
- all additions/supersessions have provenance
- remaining nulls only UNSUPPORTED_AFTER_EXHAUSTIVE_SEARCH
- report scored/non-null before/after
- all 43 per-feature coverage before/after
- coverage bands >=1 / >=10 / >=20 / >=30 / 43/43

Visit/Access:
- preserve supported facts
- report before/after/additions
- no silent regression

Integration/QA:
- no unexplained projected/canonical differences
- authoritative current view rebuilt
- deterministic final QA PASS
- targeted POI tests PASS
- full repository tests PASS
- lint/typecheck/format/build/deployment/artifact/whitespace PASS
- exact current-head GitHub Quality Gate PASS

## Unattended authorization
Allowed:
- one heartbeat automation
- auto-next
- routine self-healing
- failed-batch/check reruns
- bounded source/network retry
- ordinary non-force push to TASK-075 execution branch
- safe normal merge of expected upstream without history rewrite
- Result/QA/PR updates

No per-batch user confirmation.

Forbidden:
- force push/history rewrite
- destructive reset/clean
- push develop/main
- auto-merge
- Master Code allocation
- Registry rebind
- production import
- credential bypass
- new paid external service without authorization

## Git / stacked PR
Execution branch:
`codex/b-task-075-japan-poi-entity-resolver-43d-completion`

While PR #415 remains unmerged, Draft PR base:
`codex/b-task-074-poi-final-unattended-closure`

No auto-merge.
