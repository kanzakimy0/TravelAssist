# TASK-083-A — WBS 7.4.1 Real 100 POI Canonical Admission + Runtime Import Gate

> Issue: #438  
> Owner: A — Main Travel System / Shared POI Architecture  
> Priority: P0  
> WBS: 7.4.1  
> Implementation branch: `codex/a-task-083-real-poi-canonical-admission`  
> Publication baseline: `develop@2dcf22cca48b920d99bfad416c5e79b13e599327`  
> Upstream: WBS 7.4 / PR #417 merged; TASK-081-B preflight / Draft PR #437  
> Downstream: TASK-081-B Real 100 POI Pilot

## 1. Goal

Create the first **100 real, admitted application Canonical POIs** and the first explicitly authorized Canonical runtime datasource.

This Task exists only to close the prerequisite gap identified by TASK-081-B / PR #437:

```text
real v1.66 POI rows
  -> identity / duplicate / region / provenance / rights preparation
  -> active conflict-safe Master Code allocation
  -> existing WBS 7.4 Candidate Admission 14 gates
  -> exactly 100 ADMIT
  -> CanonicalPoiDatasetV1
  -> runtime-authorized server repository
  -> real Detail API / repository smoke
  -> TASK-081-B unblock handoff
```

This Task does **not** perform the 100 × 43 = 4,300 Feature43 Pilot. TASK-081-B owns that work after this gate passes.

## 2. Current authoritative state

At publication:

- WBS 7.4 Canonical POI v1 / strict parser / 14-gate Candidate Admission is merged into `develop`.
- TASK-081-A / PR #432 is merged and `GET /api/pois/[poiRef]` exists.
- The Detail API deliberately uses an unavailable repository until a real Canonical runtime import is authorized.
- `src/shared/data/master-code-registry.v1.json` has 51 entries and **0 POI allocations**.
- Its governance status remains `candidate`; do not change the registry contract merely to make this Task pass.
- `data/poi/full/manifests/current-candidate-review.v1.json` remains `CANDIDATE_ONLY_NO_CANONICAL_IMPORT` and `runtimeImportAuthorized=false`.
- The real workbook exists at:
  `data/poi/full/registry/travelassist-japan-poi-master-registry-v1.66-B-5xxxx-7xxxx-feature43-phase2c-review-v2.xlsx`
- TASK-081-B preflight observed 10,585 Registry rows with `internal_uuid`, but those rows are not automatically Canonical.
- PR #437 must remain BLOCKED until this Task supplies a lawful 100-POI handoff.

## 3. Non-negotiable identity boundary

Preserve:

`Canonical internalId != Master Code != internal_uuid source field != candidateKey != Provider ID != Region ID != transportNodeRef`

For the 100 admitted POIs, a workbook `internal_uuid` may be used only as deterministic input to a stable canonical identifier **after uniqueness/format audit**. Preferred mapping if valid and unique:

`internal_uuid x -> internalId "poi:" + lower-case canonical UUID text`

Do not use candidateKey as the canonical internalId.

Do not mutate candidateKey or rewrite the candidate corpus to pretend it is Canonical.

## 4. Phase 0 — Freeze inputs and prove the blocker

Record exact SHA/checksum and row counts for:

- execution-time latest `origin/develop`;
- v1.66 workbook;
- current Master Code Registry;
- current Region Graph canonical identity set;
- TASK-075 identity/adjudication artifacts used as supporting evidence;
- candidate manifest;
- PR #437 preflight.

Reconfirm:

- 43 planning feature codes = 43;
- current POI Master Code allocations before this Task = 0 unless develop legitimately advanced;
- candidate runtime import remains unauthorized;
- Detail API exists and its production repository is unavailable.

If develop has legitimately changed these facts, adapt to the newer accepted state and document it; never overwrite newer accepted work.

## 5. Phase 1 — Build a real admission-eligible pool

Read the v1.66 workbook with a deterministic parser. Do not edit the workbook.

A row may enter the eligibility pool only when all facts needed for canonical admission can be supported:

1. unique stable source identity / `internal_uuid`;
2. real-world identity resolved to one entity;
3. duplicate disposition resolved;
4. Japan location valid;
5. canonical Region relation resolvable;
6. canonical primary classification mappable to one existing WBS 7.4 classification;
7. at least one retained source/provenance reference;
8. persistence/redistribution policy can be represented truthfully;
9. no unresolved material evidence conflict;
10. no use of candidateKey / Provider ID / legacy code as canonical identity.

Use existing TASK-075 identity evidence where valid, but do not blindly trust a disposition if the target facts do not satisfy current WBS 7.4 gates.

When evidence is missing, perform bounded target-specific resolution using the existing evidence hierarchy. Prefer official/government/operator/tourism sources. Search snippets are discovery only.

### Feature43 boundary

This Task is **not a 43D scoring task**.

Preferred canonical admission representation for the Pilot 100 is:

- `features: null`, unless a feature set already has complete canonical provenance and importing it is required by an existing accepted contract.
- Do not create a new score.
- Do not copy workbook numbers merely to make admission easier.
- Do not convert unknown to 0/5.

This leaves the 4,300 field decisions to TASK-081-B.

Visit Profiles and Access Anchors may also remain absent/empty unless existing supported canonical facts can be transferred without new scoring/inference.

## 6. Phase 2 — Deterministic 100-POI sample

Build the sample only from the admission-eligible real pool.

Freeze exactly 100 records before final allocation/admission.

Required deterministic rule:

1. Fixed canonical classification order:
   `cityscape_landmark, culture_history, nature, experience, museum_art, religious_historic, shopping`.
2. Within each classification, group by canonical prefecture.
3. Within each bucket, order by `SHA-256("TASK-083-A|pilot100|" + internal_uuid)`, then `internal_uuid`.
4. Round-robin across classification/prefecture buckets until 100 are selected.
5. Require all 7 classifications when the eligible pool supports them.
6. Target at least 15 prefectures and avoid >20 records from one prefecture when the eligible pool permits.
7. If these diversity targets are impossible, document the exact eligible distribution and use deterministic best-effort; the hard requirement remains exactly 100 safely admissible real POIs.

Publish a frozen sample manifest containing:

- sample index 1..100;
- workbook row/key;
- source `internal_uuid`;
- canonical `internalId`;
- name;
- prefecture / municipality;
- classification;
- identity evidence refs;
- candidate linkage if any;
- sample selection hash.

Repeat generation must produce byte-identical membership/order.

## 7. Phase 3 — Master Code allocation

Use only the existing Master Code registry grammar and classification ranges:

- cityscape_landmark: 10000–19999
- culture_history: 20000–29999
- nature: 30000–39999
- experience: 40000–49999
- museum_art: 50000–59999
- religious_historic: 60000–69999
- shopping: 70000–79999

### Historical-code safety

Before allocating, build a conservative occupied/exclusion set from all applicable sources, including at minimum:

- current `src/shared/data/master-code-registry.v1.json`;
- agreed legacy claims;
- Master Code conflict ledgers;
- unmapped/unknown historical claims;
- v1.66 legacy/master-code columns;
- other repository allocation evidence discovered during audit.

**A code seen in an unresolved, unknown, historical or conflicting claim is not free.**

Never infer that an unregistered code is free merely because the application registry currently has 0 POI allocations.

### Legacy preservation rule

A legacy POI code may be preserved only when all are true:

- one exact identity owns the claim;
- namespace matches final canonical classification;
- no conflicting/historical competing claim exists;
- no current registry allocation conflicts;
- source lineage supports preservation;
- the decision is recorded in the allocation audit.

Otherwise allocate deterministically from the lowest safe free code in the correct classification range after applying the full exclusion set.

### Registry update

Append exactly 100 active POI allocations to the existing registry.

Do not remove/recycle/rebind any existing allocation.

Use:

- `entityType = "poi." + canonical classification`;
- `entityRef = canonical internalId`;
- `lifecycleStatus = active`;
- explicit source refs;
- `allocation_review` provenance;
- a new deterministic registry revision.

The registry's schema/governance status must stay valid under existing `parseMasterCodeRegistryV1` and transition validation. Do not change validator semantics solely for this Task.

## 8. Phase 4 — Existing Candidate Admission, no bypass

For each of the 100 selected records, construct the existing `CandidateAdmissionEnvelopeV1` and run the existing evaluator against:

- the updated Master Code Registry;
- the current canonical Region ID set;
- the sample's existing canonical POI set;
- retained evidence IDs.

All 14 gates must execute.

Hard acceptance requirement:

- ADMIT = 100
- REVIEW_REQUIRED = 0
- BLOCKED = 0
- MERGE_TARGET = 0 within the final selected sample
- INSUFFICIENT_EVIDENCE = 0

If any selected record fails:

1. do not weaken the gate;
2. repair evidence/region/classification/rights/identity if legitimate;
3. if still non-ADMIT, remove it from the eligible sample;
4. deterministically take the next record under the frozen sampler rules;
5. record replacement lineage;
6. repeat until 100 ADMIT or prove the real eligible pool cannot produce 100.

No fixture/manual override may force ADMIT.

## 9. Phase 5 — Canonical dataset

Create one authoritative Pilot-100 dataset using existing `CanonicalPoiDatasetV1`.

Suggested canonical artifacts:

- `data/poi/canonical/pilot-100/sample-manifest.v1.json`
- `data/poi/canonical/pilot-100/admission-results.v1.jsonl`
- `data/poi/canonical/pilot-100/allocation-audit.v1.json`
- `data/poi/canonical/pilot-100/runtime-manifest.v1.json`
- runtime-safe dataset under a path that Next server can bundle/read deterministically, e.g. `src/shared/data/canonical-poi-pilot100.v1.json`

Exact paths may follow stronger repository conventions after audit, but there must be one clear authoritative runtime dataset.

Hard dataset gates:

- records = 100;
- unique internalId = 100;
- unique active Master Code = 100;
- all master codes resolve back to exact entityRef/classification;
- `parseCanonicalPoiDatasetV1` PASS;
- all 100 individual `parseCanonicalPoiV1` PASS;
- no Provider raw payload;
- no candidateKey as canonical ID;
- no live facts;
- deterministic byte/checksum repeat PASS.

## 10. Runtime authorization boundary

Do **not** flip the old candidate manifest to runtime-authorized.

Create a separate Canonical runtime manifest for only the admitted Pilot 100.

It must explicitly identify:

- schema/dataset revision;
- exact dataset path/hash;
- exactly 100 internal IDs;
- source sample manifest/hash;
- Master Code registry revision/hash;
- admission result hash;
- `scope = CANONICAL_POI_PILOT_100` or equivalent;
- `runtimeImportAuthorized = true`;
- authorizing Task/Issue;
- explicit statement that the other 10k+ candidate/workbook rows remain unauthorized.

## 11. Server runtime repository

Implement a server-only Canonical POI runtime repository that loads **only** the authorized Pilot-100 canonical dataset and validates it fail-closed.

It must support at least:

- lookup by canonical `internalId`;
- deterministic iteration/read needed by downstream Pilot QA;
- dataset revision exposure.

No filesystem path may be user-controlled.

No candidate file may be read as fallback.

Wire the already-merged POI Detail API production default to this repository so:

- admitted Pilot-100 canonical internalId -> 200;
- unknown valid canonical internalId -> 404;
- Master Code used as path identity -> 400;
- candidateKey used as path identity -> 400;
- invalid/corrupt dataset -> fail closed.

If TASK-080 / WBS 7.6 Search API is merged into develop by execution time, wire it to the same canonical repository through its existing repository boundary. If it is still unmerged, do not cherry-pick or merge #433 just for this Task; instead leave a tested adapter/handoff compatible with its repository contract.

## 12. Runtime / rights safety

The runtime dataset must not include:

- workbook-only workflow state;
- raw Provider JSON;
- credentials;
- raw HTML/source copies;
- transient-only fields;
- exact live timetable/fare/delay;
- live crowd/queue;
- live weather;
- booking/inventory state.

Source/provenance metadata may be retained server-side only as allowed by existing canonical contract/rights.

Client DTO remains the existing rights-safe Detail API projection.

## 13. TASK-081-B unblock handoff

Produce:

`docs/qa/TASK-083/pilot100-handoff.json`

containing at minimum:

- exactly 100 canonical internalIds in sample order;
- exact 100 Master Codes;
- dataset revision/hash;
- registry revision/hash;
- sample manifest hash;
- admission-results hash;
- 100/100 ADMIT proof;
- runtime repository module;
- Detail API smoke summary;
- explicit statement that Feature43 cells were not evaluated by TASK-083;
- exact command/entry point TASK-081-B should use to process the 100 records.

Also produce a human-readable handoff in the Result.

If GitHub credentials allow, comment on Draft PR #437 with the handoff path/checksum and state that the structural blocker is removed. Do **not** merge #437 and do not execute its 4,300-cell scoring scope inside TASK-083.

## 14. Required QA

At minimum:

### Admission / identity
- sample 100/100 real rows;
- unique source internal_uuid;
- unique canonical internalId;
- identity/duplicate dispositions resolved;
- 100/100 existing Candidate Admission = ADMIT;
- deterministic repeat.

### Master Code
- previous registry parses;
- next registry parses;
- transition validation PASS;
- exactly 100 POI active allocations added;
- no existing allocation removed/rebound;
- no code collision against all conservative legacy/unknown/conflict sources;
- classification namespace match 100/100.

### Dataset
- Canonical dataset 100/100 parser PASS;
- Region refs valid;
- provenance refs valid;
- rights gate PASS;
- null semantics preserved;
- no Provider raw/live fact leakage.

### Runtime
- server runtime loader 100/100;
- Detail API 100 canonical IDs -> success;
- unknown -> 404;
- Master Code/candidateKey path substitution -> 400;
- corrupt/tampered manifest/dataset -> fail closed;
- candidate corpus not imported;
- standalone build contains only intended canonical runtime dataset, not the workbook.

### Regression
- TASK-050 canonical POI tests;
- Master Code registry tests + QA;
- Region/Master Code integration tests;
- Planning contract tests;
- TASK-081-A detail API tests;
- TASK-080 tests if 7.6 is merged at execution time;
- full repository Node tests;
- lint;
- typecheck;
- build;
- deploy validate/build/verify artifact;
- format/diff check;
- exact-current-head GitHub Quality Gate.

## 15. Result / WBS

Create:

- `docs/tasks/RESULT-TASK-083-a-real-poi-canonical-admission-runtime-import.md`
- `docs/qa/TASK-083/README.md`
- machine QA artifacts above.

WBS 7.4.1 lifecycle:

- start -> `进行中`
- implementation + QA + Draft PR -> `待审查`
- only explicit user acceptance + merge -> `已完成`

TASK-081-B / PR #437 remains BLOCKED until this Task has a successful accepted result. After acceptance, it becomes eligible to resume; do not mark its 4,300 cells complete.

## 16. Hard prohibitions

- no automatic merge;
- no force push;
- no weakening Candidate Admission or Master Code validation to make records pass;
- no whole 10k+ corpus import in this Task;
- no 43D scoring/enrichment of the Pilot 100;
- no WBS 7.9 recommendation scoring;
- no AI-generated unsupported identity/facts;
- no candidate manifest `runtimeImportAuthorized=true`;
- no treating workbook `FROZEN` as `ADMIT`;
- no treating old/unknown code claims as free namespace.
