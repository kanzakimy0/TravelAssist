# CODEX — TASK-075-B v2.2 Resume Until Gate

Continue the existing TASK-075-B / Issue #416. Do not create TASK-076.

This instruction clarifies unattended behavior for Correction v2.2.

The current state:
- inspect live lookup completed 5920/5920;
- inspect source is valid;
- difficult development calibration has not yet passed;
- production identity and semantic write-through have not started.

A development calibration failure is a ROUTINE SELF-HEALING CONDITION, not a hard blocker.

## Required behavior

Read the current local artifacts first:

- docs/qa/TASK-075-B/correction-v2.2-blocked.json
- all resolver calibration v2.1/v2.2 JSON/JSONL artifacts
- current Result Markdown
- Correction v2.2 / v2.1 / v2 amendments

Do not discard the current checkpoint.

Then continue automatically:

1. Reconcile raw numerator/denominator metrics.
2. Generate a machine-readable list of every development Recall@5 miss.
3. Classify every miss into the v2.2 failure taxonomy.
4. For each miss class, repair GENERAL candidate-generation rules only.
5. Rerun development validation.
6. Repeat 2–5 until the development gate passes.

Do NOT return to the user merely because a development iteration fails.

## Candidate-generation repair order

For every Recall@5 miss, try these general rescue layers before concluding the resolver rule is insufficient:

1. exact municipality + normalized Japanese name;
2. municipality + verified aliases / English / romanization;
3. historical municipality remap;
4. address / locality / ward / chome rescue;
5. official URL / domain ownership rescue;
6. category-softened candidate generation;
7. station / bus stop / access / nearby landmark context;
8. official municipal / prefectural / tourism / cultural / operator discovery;
9. verified official SNS;
10. authoritative map/reference/knowledge and reliable secondary discovery.

Union candidate sets before ranking.

Search snippets may discover URLs only. Open/retain the underlying source before using it as identity evidence.

## Benchmark-label defect handling

If an apparent miss is actually caused by a bad benchmark label:

- require source-backed proof that the expected identity label is wrong/obsolete;
- record BENCHMARK_LABEL_DEFECT;
- remove/replace the defective benchmark row;
- replace it with a new known-good row from the same stratum;
- keep the validation-set size and stratum requirements intact.

Do not silently edit labels to improve metrics.

## No hardcoded identities

Do not add:
- candidateKey-specific whitelists;
- source-row-specific name exceptions;
- benchmark-answer lookups.

Only general normalization, candidate-generation, municipality-history, source-discovery and ranking rules are permitted.

## Development gate

Continue repair iterations until all pass:

- Recall@5 micro >= 99.0%
- Top1 micro >= 98.5%
- HIGH precision >= 99.0%
- MEDIUM precision >= 98.0%
- PROVISIONAL precision >= 97.0%
- hard-conflict auto-match = 0
- deterministic repeat PASS

Record each iteration:
- evaluatedCount
- hit@1 numerator/denominator
- hit@5 numerator/denominator
- Top1 numerator/denominator
- miss counts by taxonomy
- rescue counts by strategy
- resulting metrics

## After development PASS

Do not stop.

Automatically:

1. freeze resolver rules/thresholds;
2. run the new final blind set required by v2.2;
3. if blind fails, create blind-failure taxonomy, repair only general rules, create a replacement blind set, and repeat until blind PASS;
4. rerun all 5920 production identities under the corrected resolver;
5. perform the provisional precision audit if triggered;
6. run the v2.1 semantic write-through Canary;
7. if Canary misses thresholds, diagnose/repair/rerun automatically;
8. after Canary PASS, run the full accepted-POI semantic 43D sweep;
9. reconcile canonical additions per batch;
10. run final QA and exact-head GitHub Quality Gate.

Do not return an intermediate PARTIAL/BLOCKED result unless a TRUE hard blocker occurs.

## True hard blocker only

A return to the user is allowed only when one of these is proven:

- force/history rewrite is required;
- repository credentials/permissions are unavailable;
- a new paid-provider authorization is required;
- an irreducible formal Registry/Master Code governance decision is required;
- infrastructure remains unusable after bounded retries and prevents progress.

Development Recall/Top1 gate failure is NOT a true hard blocker.
Blind-validation failure is NOT a true hard blocker.
Semantic Canary low yield is NOT a true hard blocker.
Normal source/network/test/projection failures are NOT true hard blockers.

## Git / safety

Continue ordinary non-force work on:
codex/b-task-075-japan-poi-entity-resolver-43d-completion

Do not:
- force push;
- rewrite history;
- reset/clean destructively;
- push develop/main;
- auto-merge;
- allocate Master Codes;
- rebind Registry;
- production import.

Update:
docs/tasks/RESULT-TASK-075-b-japan-poi-entity-resolver-43d-completion.md

Only final PASS or a proven true hard blocker should be returned to the user.
