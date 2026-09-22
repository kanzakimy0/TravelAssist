# AMENDMENT — TASK-075-B Correction v2.3: Resolver Recovery Loop + Parallel 43D Write-Through

## Authority

This amendment extends v2.2. Do not create TASK-076.

A development resolver gate failure is **not** a terminal blocker. It is an automatic repair-loop input.

Current v2.2 state:
- inspect live lookup completed 5,920/5,920
- best development Recall@5 / Top1 remains below gate
- ranking precision is high
- production 5,920 rerun has not started
- semantic write-through canary has not started

The task must continue unattended.

## A. Development FAIL must enter an automatic resolver-repair loop

Do not return PARTIAL/BLOCKED merely because development Recall@5 or Top1 is below threshold.

For every development miss:
1. record raw row id / ground-truth target;
2. determine whether the correct target is absent from candidate generation or incorrectly ranked;
3. classify the miss;
4. apply a general resolver repair;
5. rerun the full development set;
6. repeat until the development gate passes or a true infrastructure/permission blocker exists.

No candidateKey-specific whitelist/hardcode.

## B. Required miss taxonomy

Each miss must be one of:
- LOCAL_POOL_ABSENT
- EXACT_NAME_NORMALIZATION_MISS
- ALIAS_OR_ENGLISH_NAME_MISS
- HISTORICAL_MUNICIPALITY_MISS
- ADDRESS_LOCALITY_MISS
- CATEGORY_OVERFILTER_MISS
- OFFICIAL_URL_DOMAIN_MISS
- ACCESS_CONTEXT_MISS
- EXTERNAL_DISCOVERY_MISS
- AREA_OR_DISTRICT_MODEL_MISS
- RANKING_MISS
- BENCHMARK_GROUND_TRUTH_UNVERIFIABLE
- OTHER_EXPLAINED

Produce counts and row-level evidence.

## C. Multi-stage retrieval with expanded candidate pool

Do not search only Top-5 directly.

Build a candidate pool up to 50 candidates before final reranking.

Union candidates from:
- municipality exact name
- municipality normalized/fuzzy name
- verified alias / English / romanization variants
- historical municipality mapping
- address/locality/chome fragments
- official/source/discovery URL domain
- type/category assisted expansion
- station/bus/locality/nearby context
- local inspect registry
- official/government/tourism/cultural/operator/SNS discovery
- authoritative map/reference/knowledge sources
- reliable secondary sources

Use reciprocal-rank or equivalent deterministic fusion when multiple generators produce overlapping candidates.

Then rerank and evaluate Top1/Top5.

## D. External discovery rescue for every candidate-generation miss

If the expected target is absent after local/structured retrieval:
- search exact Japanese name + municipality + prefecture;
- search normalized/alias name + municipality;
- search official/government/tourism domains;
- use type/locality/station terms;
- open actual target pages;
- retain source text/locator/hash;
- add discovered real-world candidate into the candidate pool.

Search snippets may discover URLs only.

A development row is not allowed to remain a retrieval miss until these rescue strategies have been attempted.

## E. Benchmark-ground-truth verification

A benchmark row may be removed/replaced only as `BENCHMARK_GROUND_TRUTH_UNVERIFIABLE` when:
- the expected target cannot be corroborated from repository provenance, inspect source, or any authoritative/external source after the required rescue ladder; or
- the label is demonstrably stale/wrong/duplicate/non-POI.

Every replaced benchmark row requires an audit record and a new previously unseen replacement row from the same stratum.

Do not improve metrics by silently dropping difficult valid rows.

## F. Development loop acceptance

Primary gates remain:
- Recall@5 micro >=99.0%
- Top1 micro >=98.5%
- HIGH precision >=99.0%
- MEDIUM precision >=98.0%
- PROVISIONAL audited precision >=97.0%
- hard-conflict auto-match =0
- deterministic repeat PASS

Also report:
- Recall@20 / Recall@50
- target-present-in-expanded-pool rate
- miss counts by generator stage

If Recall@20/50 is high but Recall@5 is low, repair reranking.
If Recall@50 is low, repair candidate generation.

Do not lower thresholds.

## G. Final blind remains genuinely blind

After development PASS:
- freeze resolver rules/weights/thresholds;
- create/run >=300 genuinely uninspected blind rows.

If blind fails:
- classify blind failure patterns;
- apply only general resolver repairs;
- retire that blind set from future final acceptance;
- create a new replacement blind set >=300;
- rerun.

Do not repeatedly tune against one blind set.

## H. Start semantic write-through canary in parallel

Do not wait for resolver development PASS before testing the 43D write-through path.

Immediately select >=50 already accepted high-confidence POIs from the authoritative current view that:
- are not part of the 5,920 unresolved production set;
- have meaningful null fields;
- have retained evidence or accessible official/government/tourism sources;
- cover >=10 feature codes and multiple POI types.

Run the v2.1 write-through semantic canary now.

This canary may proceed in parallel with resolver repair because it uses already accepted identities.

Required production path:
search/open → retain text → model_semantic_review_v2_1 → rubric mapping → projection → canonical apply → reconciliation.

Required canary gate:
- candidates >=50
- semanticAnnotationAttempted = candidates
- candidatesWithNewSupported >=30
- canonical new non-null >=100
- >=10 feature codes added
- provenanceWritten >= additions
- unexplained canonical delta =0
- deterministic repeat PASS

If it fails, automatically repair and rerun. Do not return to the user.

## I. After both gates pass

Only after:
1. resolver development PASS + final blind PASS; and
2. semantic write-through canary PASS;

start the formal 5,920 production identity rerun.

Then immediately enrich accepted identities and execute the final all-accepted-POI semantic 43D sweep.

## J. Production residual identity behavior

Every matched/provisional identity must still have:
- real external Top1 target
- expanded candidateSetGenerated
- score/margin
- no hard conflict
- retained discriminative evidence

A local no-match cannot become provisional without external discovery.

If no safe target can be established after the rescue ladder, finalize the source record as:
- SOURCE_RECORD_AMBIGUOUS_EXCLUDE
- SOURCE_RECORD_INVALID
- DUPLICATE_OF_EXISTING
- NOT_A_POI
- AREA_OR_DISTRICT_ENTITY

No generic unresolved.

## K. Result updates

Add a v2.3 section to the existing Result.

Report:

### Resolver recovery
- metric raw counts
- development iteration count
- Recall@5/20/50 progression
- target-present-in-expanded-pool rate
- miss taxonomy per iteration
- each rescue strategy contribution
- benchmark replacements, if any

### Final blind
- blind set size/strata
- raw metrics
- pass/fail
- replacement blind iterations if any

### Parallel semantic canary
- selection composition
- search/pages/text retained
- semantic annotations
- direct/inferred additions
- canonical additions
- provenance
- feature codes
- remediation iterations

### Production
- 5,920 identity final dispositions
- accepted/excluded counts
- immediate enrichment
- final 43D sweep
- canonical coverage changes
- field-level audited nulls

## L. Hard blocker definition

Do not stop for:
- development metric miss
- candidate-generation miss
- low-yield canary
- benchmark row needing replacement
- source 404/timeout
- parser failure
- low margin
- stale municipality
- test failure
- projection/canonical mismatch

These require self-repair.

True hard blocker only:
- repository credentials/permissions unavailable after bounded retry;
- required network/infrastructure completely unavailable after bounded retry;
- force/history rewrite required;
- new paid-provider authorization required;
- irreducible formal Registry/Master Code governance decision.

## M. Completion

TASK-075-B cannot be COMPLETE until:
- development PASS;
- final blind PASS;
- semantic write-through canary PASS;
- 5,920/5,920 production identities finalized;
- accepted identities enriched;
- final accepted-POI semantic sweep complete;
- canonical new non-null >0;
- provenance >0;
- all final nulls have field-level semantic review audit;
- exact current-head GitHub Quality Gate PASS.

Do not create TASK-076.
Do not lower thresholds.
No auto-merge, Registry rebind, Master Code allocation, or production import.
