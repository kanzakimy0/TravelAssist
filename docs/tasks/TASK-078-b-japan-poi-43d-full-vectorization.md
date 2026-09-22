# TASK-078-B — Japan POI 43D Full Vectorization / 200-Row Continuous Batch Completion

## 0. User authorization and corrected objective

The user explicitly rejects another evidence-audit-only pass.

The required deliverable is now a **complete operational 43D numeric vector for every one of the 10,369 Japan POIs**.

This task is successful only when:

- population = **10,369**
- values per POI = **43**
- total numeric values = **445,867**
- null values in the TASK-078-B complete-vector layer = **0**
- every POI has exactly one complete 43D vector
- processing is performed in fixed sequential batches of at most **200 POIs**
- expected batch plan = **51 × 200 + 1 × 169 = 52 batches**
- after one batch passes its batch QA, the next batch starts automatically
- no per-batch user confirmation is required

This task supersedes TASK-077-B / Issue #424 before TASK-077 execution.

The purpose is not to pretend every value is a sourced fact. The purpose is to produce a complete Planner-usable score vector while preserving a machine-readable distinction between:

- sourced values;
- rule-based inference;
- model inference;
- calibrated prior fallback.

A modeled score is allowed, but it must never be mislabeled as a direct sourced fact.

---

## 1. Tracking

- Task: **TASK-078-B**
- Issue: **#425**
- Repository: `kanzakimy0/TravelAssist`
- Task branch: `task/b-task-078-japan-poi-43d-full-vectorization`
- Execution branch: `codex/b-task-078-japan-poi-43d-full-vectorization`
- Upstream: TASK-075-B / Issue #416 / Draft PR #423
- Upstream execution branch: `codex/b-task-075-japan-poi-entity-resolver-43d-completion`
- Authoritative upstream head: `d706534dbfd3aa77d2857f3c214f66a8a84d07c3`
- Upstream Quality Gate run: `35731940622` — SUCCESS

If PR #423 is still unmerged, the TASK-078-B Draft PR must target:

`codex/b-task-075-japan-poi-entity-resolver-43d-completion`

Do not auto-merge.

---

## 2. TASK-075-B baseline that must be preserved

Authoritative baseline:

- candidate population: **10,369**
- exact field positions: **445,867 = 10,369 × 43**
- existing non-null supported values: **6,385**
- existing null fields: **439,482**
- POIs already at 43/43: **0**
- existing supported values are sparse but auditable
- identity adjudication is complete
- Registry/Master Code/candidateKey were unchanged
- exact-head Quality Gate passed

Authoritative result:

`docs/tasks/RESULT-TASK-075-b-japan-poi-entity-resolver-43d-completion.md`

Existing TASK-075 supported values must be **frozen** in TASK-078.

TASK-078 is a fill task, not a correction task.

If a suspicious existing supported value is discovered:
- do not silently change it;
- keep the existing value;
- add it to a review queue;
- continue filling the remaining missing values.

Required frozen count at TASK-078 start:

`6385`

If the baseline does not reproduce exactly, diagnose the input view before vectorization.

---

## 3. Frozen 43-feature contract

Use the existing contract:

`src/shared/contracts/planning/features.ts`

Codes and value domain remain:

`0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | null`

The source contract may continue to allow null for other layers, but the **TASK-078 complete operational vector output may not contain null**.

The 43 codes are:

01 scenery  
02 history  
03 architecture  
04 photo  
05 food  
06 shopping  
07 nature  
08 night  
09 onsen  
10 art  
11 entertainment  
12 local  
13 unique  
14 hidden  
15 iconic  
16 family  
17 senior  
18 couple  
19 solo  
20 relax  
21 adventure  
22 educational  
23 interactive  
24 rest  
25 walking  
26 physical  
27 crowd  
28 queue  
29 wheelchair  
30 stroller  
31 morning  
32 daytime  
33 sunrise  
34 sunset  
35 rain  
36 heat  
37 cold  
38 snow  
39 weather_sensitive  
40 spring  
41 summer  
42 autumn  
43 winter

No feature may be removed, renamed, skipped, or left null in the TASK-078 complete-vector dataset.

---

## 4. The critical change from TASK-075

TASK-075 used a conservative evidence policy and left a field null if evidence did not directly support it.

TASK-078 must not repeat that policy.

For every missing field, the scoring engine must descend through the following hierarchy until a numeric value is obtained:

1. `DIRECT_SUPPORTED`
2. `RULE_INFERRED`
3. `MODEL_INFERRED`
4. `PRIOR_FALLBACK`

No missing field may exit the pipeline without one of these four derivation tiers.

This hierarchy is mandatory.

### 4.1 DIRECT_SUPPORTED

Use when retained or newly opened target-scoped sources directly support a score/range under the rubric.

### 4.2 RULE_INFERRED

Use deterministic facts/rules, for example:

- UNESCO / important cultural-property / dated historic fabric -> history/educational inputs;
- viewpoint + mountain/sea/city panorama -> scenery/photo;
- museum exhibits -> art/educational;
- hands-on activity -> interactive;
- documented stairs/slope/route length -> walking/physical;
- ramps/lifts/barrier-free facilities -> wheelchair/stroller;
- indoor/outdoor exposure -> rain/heat/cold/weather_sensitive;
- seasonal flower/foliage/snow attraction -> seasonal features.

The rule ID must be retained.

### 4.3 MODEL_INFERRED

Use when direct/rule evidence is insufficient but enough context exists to make a reasonable operational estimate.

The model may use:
- verified identity;
- entity type/category;
- Japanese/English names;
- prefecture/municipality;
- retained source summaries;
- existing non-null feature neighbors;
- Visit Profile;
- Access facts;
- structured facts extracted from authoritative text;
- comparable same-type POIs.

The output must retain:
- rationale;
- confidence;
- input context checksum;
- model/reasoning identifier if available.

MODEL_INFERRED is an estimate, not a sourced fact.

### 4.4 PRIOR_FALLBACK

This is the mandatory final fallback.

If no direct/rule/model-specific signal is sufficient, compute a calibrated prior from the existing dataset and peer classes.

Backoff order should prefer:

`subtype -> entity type -> macro category -> prefecture/type peer -> national type peer -> global feature prior`

Do not use one universal `5` for everything.

The prior must be derived from existing supported or previously completed batch distributions and must record:
- prior scope;
- peer count;
- mean/median or distribution basis;
- shrinkage/backoff method;
- final score;
- low confidence.

If no peer data exists at all, use a versioned deterministic global feature prior table, not null.

---

## 5. Truth layer vs operational vector layer

Do not overwrite the meaning of TASK-075 evidence provenance.

TASK-078 must produce a separate complete operational vector layer.

Suggested task-scoped output:

`data/poi/full/task-078-b-japan-poi-43d-full-vectorization/poi-43d-complete.jsonl`

or compressed equivalent for publication.

Each POI row must contain at minimum:

- candidateKey
- identity/master reference fields already available
- `vectorVersion`
- `values` — exactly 43 numeric 0–9 values
- `confidence` — exactly 43 confidence values
- `derivationTier` — exactly 43 tier values
- `provenanceRefs` or per-feature trace refs
- batchId
- input checksum
- output checksum

Example shape:

```json
{
  "candidateKey": "...",
  "vectorVersion": "task-078-b-1.0",
  "values": {
    "01": 8,
    "02": 9,
    "...": 0,
    "43": 6
  },
  "confidence": {
    "01": 0.83,
    "...": 0.35
  },
  "derivationTier": {
    "01": "RULE_INFERRED",
    "...": "PRIOR_FALLBACK"
  }
}
```

The Planner-usable vector is complete even when some values are low-confidence modeled estimates.

---

## 6. Confidence bands

Use a stable confidence scale `0.0..1.0`.

Recommended bands:

- DIRECT_SUPPORTED: normally **0.80–1.00**
- RULE_INFERRED: normally **0.65–0.90**
- MODEL_INFERRED: normally **0.40–0.75**
- PRIOR_FALLBACK: normally **0.15–0.45**

These are not hard-coded score values; they are provenance confidence bands.

A complete vector must not hide low-confidence cells.

---

## 7. No separate Canary that blocks real output

Do **not** spend another execution cycle creating a Canary and stopping before user-visible data exists.

Batch 001 is simultaneously:
- the first real production batch;
- the initial calibration batch;
- the first quality sample.

Batch 001 must produce **200 real completed POI vectors**.

If Batch 001 QA fails:
- fix the implementation;
- rerun Batch 001;
- once it passes, commit/push it;
- automatically start Batch 002.

Do not stop after “designing the engine.”

A TASK-078 run that never publishes Batch 001 completed vectors is not acceptable.

---

## 8. Frozen membership and batch plan

Freeze a deterministic ordered list of all 10,369 candidateKeys from the authoritative TASK-075 view.

Required manifest:

`data/poi/full/task-078-b-japan-poi-43d-full-vectorization/population-manifest.json`

The manifest must include:
- total population 10,369;
- ordered candidateKey list or ordered partition refs;
- checksum;
- batch mapping;
- upstream head;
- createdAt.

Batch plan:

- B001: rows 1–200
- B002: rows 201–400
- ...
- B051: rows 10001–10200
- B052: rows 10201–10369 (**169 rows**)

Exactly **52 batches**.

A candidate may not move to a different batch after the manifest is frozen.

---

## 9. Per-batch mandatory output

Every batch must output complete rows, not just audit decisions.

Suggested paths:

`data/poi/full/task-078-b-japan-poi-43d-full-vectorization/batches/B001.jsonl.gz`

through:

`B052.jsonl.gz`

Each batch must also write:

`docs/qa/TASK-078-B/batches/B001-receipt.json`

and corresponding receipts for all batches.

Receipt must include:

- batchId
- candidateCount
- first/last candidateKey
- input checksum
- output checksum
- numericValueCount
- expected numericValueCount = candidateCount × 43
- nullCount = 0
- DIRECT_SUPPORTED count
- RULE_INFERRED count
- MODEL_INFERRED count
- PRIOR_FALLBACK count
- average confidence
- confidence distribution
- per-feature score distribution
- per-feature tier distribution
- preserved TASK-075 supported values count
- changed preserved values count = 0
- invalid/out-of-range values count = 0
- duplicate candidate count = 0
- missing candidate count = 0
- deterministic repeat status
- QA status

---

## 10. Throughput rule: bounded research, mandatory completion

The previous approach spent too much time trying to exhaustively prove null fields.

TASK-078 uses bounded evidence acquisition.

For each POI:

1. reuse retained evidence first;
2. reuse TASK-075/TASK-074/TASK-073 source text and metadata;
3. group feature families rather than issuing 43 searches;
4. if fresh research is useful, use a bounded source budget;
5. after the budget is exhausted, continue to MODEL_INFERRED or PRIOR_FALLBACK;
6. never leave a field null because a page could not be found.

Recommended fresh-source budget per POI:
- up to 3 strong target-scoped authoritative pages;
- optionally 1 authoritative/reliable secondary source;
- do not perform 43 independent searches.

Source failures do not block vector completion.

---

## 11. Feature-family scoring strategy

### 11.1 Core value / attraction family
01–12:
- scenery
- history
- architecture
- photo
- food
- shopping
- nature
- night
- onsen
- art
- entertainment
- local

Use direct facts first, then entity/rule/model inference.

### 11.2 Comparative family
13 unique
14 hidden
15 iconic

Use:
- recognized status;
- tourism prominence;
- source/guide presence where available;
- relative same-type/locality peers;
- known designation/representation;
- calibrated peer priors.

When direct comparative evidence is absent, MODEL_INFERRED or PRIOR_FALLBACK is mandatory.

### 11.3 Audience / style family
16–24:
- family
- senior
- couple
- solo
- relax
- adventure
- educational
- interactive
- rest

Infer from:
- activity type;
- facilities;
- accessibility;
- physical burden;
- experience mode;
- visit duration;
- indoor/outdoor;
- interaction/learning facts;
- peer priors.

### 11.4 Burden / operational family
25 walking
26 physical
27 crowd
28 queue
29 wheelchair
30 stroller

Use:
- Visit Profile;
- route/terrain;
- steps/slope;
- site scale;
- standing burden;
- accessibility;
- attraction type;
- known crowd/queue context;
- calibrated priors.

### 11.5 Time / weather / season family
31–43:
- morning/daytime/sunrise/sunset
- rain/heat/cold/snow
- weather_sensitive
- spring/summer/autumn/winter

Use:
- indoor/outdoor;
- viewpoint/orientation;
- climate/seasonal attraction type;
- gardens/flowers/foliage/snow;
- opening/activity pattern where static;
- entity type;
- geographic context;
- calibrated priors.

---

## 12. Walking and physical semantics

Codes 25 and 26 must be treated as **standard-visit baseline burden**.

Use the recommended/default visit duration where available.

Do not make canonical POI walking/physical vary by itinerary instance.

Planner runtime may later transform the baseline using actual scheduled visit duration.

TASK-078 only needs to ensure every POI has a usable baseline numeric value.

---

## 13. Existing 6,385 supported values are immutable in this task

For every existing TASK-075 supported cell:

- copy the exact numeric value into TASK-078;
- set tier = `PRESERVE_SUPPORTED` or map it to its original support class;
- retain source/provenance reference;
- do not rescore it;
- do not normalize it to a prior;
- do not change it because the new model disagrees.

Required total preserved cells at the start/end:

**6,385**

Any discovered disagreement goes to:

`docs/qa/TASK-078-B/existing-value-review-queue.jsonl`

but the old value remains in the TASK-078 vector.

---

## 14. Filling the 439,482 missing cells

The exact fill target is:

**439,482 previously-null cells -> 439,482 numeric cells**

Every one must finish at 0–9.

At task completion:

```text
before:
  numeric = 6,385
  null = 439,482

after:
  numeric = 445,867
  null = 0
```

This is the central acceptance condition.

---

## 15. Batch QA hard gates

A batch cannot PASS unless:

- candidate count matches frozen manifest;
- candidate order matches manifest;
- every row has exactly 43 keys;
- every value is integer 0..9;
- null count = 0;
- numeric value count = candidateCount × 43;
- all previously supported TASK-075 values in the batch are preserved exactly;
- each newly filled cell has derivation tier;
- each newly filled cell has confidence;
- PRIOR_FALLBACK has prior scope/basis;
- no candidateKey change;
- no Registry rebind;
- no Master Code allocation;
- deterministic rerun over frozen inputs produces identical values/tiers;
- receipt is written only after outputs validate.

Low confidence does **not** fail the batch.

High PRIOR_FALLBACK share does **not** fail the batch.

Instead, both are reported for later quality-improvement passes.

The goal of this task is complete operational coverage.

---

## 16. Automatic next-batch behavior

After batch Bxxx passes:

1. finalize batch file;
2. write receipt;
3. update progress manifest;
4. commit the batch;
5. ordinary push;
6. proceed immediately to Bxxx+1.

Do not ask the user for permission between batches.

Suggested progress file:

`data/poi/full/task-078-b-japan-poi-43d-full-vectorization/progress.json`

Fields:
- completedBatches
- nextBatch
- completedCandidates
- totalCandidates
- completedNumericValues
- totalNumericValues
- current head checksum
- lastSuccessfulBatch
- updatedAt

The process must be resumable from this file after interruption.

Do not redo completed batches unless their checksum/QA fails.

---

## 17. Git checkpoint policy

Because this is a long task, persist progress.

Recommended:
- one commit per completed batch, or
- one commit per small group only if each individual batch is independently recoverable and checksummed.

Ordinary push only.

No force push.

If a transient push fails:
- bounded retry;
- continue only after the batch has a local durable checkpoint;
- never rewrite published batch history.

Issue #425 may receive a concise progress comment every 5 completed batches, plus final completion.

---

## 18. Required implementation

Create reusable tooling under existing `tools/poi/`.

At minimum implement:

- population freeze / batch partition tool;
- prior calibration tool;
- per-POI 43D vectorizer;
- batch runner;
- batch validator;
- batch receipt writer;
- full aggregate builder;
- deterministic repeat validator;
- progress/resume logic.

The runner should support something equivalent to:

```bash
node tools/poi/run-task-078-full-vectorization.mjs --resume
```

and should automatically progress through all unfinished batches.

Do not require the user to manually invoke B002 after B001.

---

## 19. Prior calibration

A prior fallback is a model component and must be reproducible.

Build priors from:
- existing supported TASK-075 values;
- completed earlier TASK-078 batches only after they are tagged by tier;
- entity type/category/locality structure.

Do not let low-confidence PRIOR_FALLBACK outputs recursively dominate the priors.

Preferred prior data source:
1. preserved/direct supported;
2. high-confidence rule inferred;
3. high-confidence model inferred if necessary;
4. never use raw low-confidence fallback as primary calibration evidence.

Use hierarchical shrinkage/backoff so rare categories remain stable.

Store prior version/checksum.

Required:

`data/poi/full/task-078-b-japan-poi-43d-full-vectorization/priors-v1.json`

---

## 20. Model inference consistency

MODEL_INFERRED values must be reproducible enough for deterministic batch QA.

Preferred options:
- fixed prompt/template;
- fixed model/config if a local/authorized model route exists;
- temperature/randomness disabled where configurable;
- cache inference outputs keyed by input checksum;
- never regenerate a cached inference silently.

If no authorized model runtime is available:
- do not block;
- use RULE_INFERRED where possible;
- then PRIOR_FALLBACK.

The task must still finish 43/43 without a paid external provider.

---

## 21. Full aggregate deliverables

After B052 passes, build:

### Main complete dataset
`data/poi/full/task-078-b-japan-poi-43d-full-vectorization/poi-43d-complete.jsonl.gz`

Exactly:
- 10,369 rows
- 43 numeric values each
- 445,867 numeric values
- 0 nulls

### Full provenance/tier dataset
`data/poi/full/task-078-b-japan-poi-43d-full-vectorization/poi-43d-trace.jsonl.gz`

### Aggregate stats
`docs/qa/TASK-078-B/final-coverage.json`
`docs/qa/TASK-078-B/final-coverage.md`

Report:
- 10,369 / 10,369 complete vectors;
- 445,867 / 445,867 numeric;
- null = 0;
- preserved count = 6,385;
- newly filled = 439,482;
- counts by derivation tier;
- counts by confidence band;
- per-feature score distributions;
- per-feature derivation-tier distributions;
- per-feature confidence distributions;
- low-confidence queue size;
- prior-fallback queue size.

### Improvement queue
`docs/qa/TASK-078-B/low-confidence-improvement-queue.jsonl.gz`

This queue is for future quality refinement and must **not** make the current vector incomplete.

---

## 22. Result file

Required:

`docs/tasks/RESULT-TASK-078-b-japan-poi-43d-full-vectorization.md`

The result must state clearly:

- whether all 52 batches completed;
- batch list and checksums;
- 10,369/10,369 rows;
- 43/43 each;
- 445,867 numeric values;
- null count;
- preserved 6,385;
- newly filled count;
- derivation-tier totals;
- confidence distribution;
- exact current-head QA;
- no Registry/Master Code/candidateKey changes;
- no production import;
- no auto-merge.

Do not call the task COMPLETE if any POI has fewer than 43 numeric values.

---

## 23. Final acceptance gates

TASK-078-B = COMPLETE only when all are true:

### Population
- 10,369 / 10,369 POIs present.

### Vector completeness
- every POI has exactly 43 numeric scores;
- 445,867 total numeric scores;
- null = 0;
- out-of-range = 0.

### Preservation
- all 6,385 existing TASK-075 supported values preserved exactly;
- no silent overwrite.

### Fill
- all 439,482 previously-null positions receive a numeric score;
- every newly filled cell has tier + confidence.

### Batches
- exactly 52 batches;
- 51 × 200 + 1 × 169;
- all batch receipts PASS;
- no candidate duplication/omission.

### Determinism
- deterministic repeat/checksum PASS for every batch or frozen cached model output.

### Governance
- Registry rebind = 0;
- Master Code allocation = 0;
- candidateKey changes = 0;
- production import = 0;
- force push = 0;
- auto-merge = 0.

### QA
- targeted TASK-078 tests PASS;
- relevant POI contract tests PASS;
- aggregate validation PASS;
- typecheck/build/format/diff checks PASS;
- exact-current-head GitHub Quality Gate PASS.

---

## 24. Failure handling

Routine failures must not stop the sequence.

Examples:
- source unavailable -> continue down inference hierarchy;
- no direct evidence -> RULE/MODEL/PRIOR;
- model runtime unavailable -> PRIOR fallback;
- parse failure -> alternate parser or fallback;
- batch QA failure -> repair and rerun only that batch;
- transient Git/network failure -> bounded retry;
- process interruption -> resume from progress manifest.

True blocker only if:
- repository credentials unavailable;
- disk/filesystem unusable;
- branch history would require force rewrite;
- authoritative 10,369 membership cannot be reconstructed after bounded repair.

Evidence scarcity is **not** a blocker in TASK-078.

---

## 25. Git safety

Before work:

```bash
git status --short
git branch --show-current
git fetch --all --prune
git rev-parse origin/codex/b-task-075-japan-poi-entity-resolver-43d-completion
git log --oneline -15 origin/codex/b-task-075-japan-poi-entity-resolver-43d-completion
```

Expected upstream SHA:

`d706534dbfd3aa77d2857f3c214f66a8a84d07c3`

Forbidden:

```text
git clean -fd
git reset --hard
git push --force
git push --force-with-lease
direct push to develop/main
auto-merge
Registry rebind
Master Code allocation
candidateKey mutation
production import
```

Use a dedicated clean worktree.

---

## 26. Draft PR

Execution branch:

`codex/b-task-078-japan-poi-43d-full-vectorization`

If PR #423 remains unmerged, base the Draft PR on:

`codex/b-task-075-japan-poi-entity-resolver-43d-completion`

The PR must remain Draft until the final exact-head Quality Gate and all 52 batch receipts pass.

Do not auto-merge.
