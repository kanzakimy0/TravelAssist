# TASK-070-B — P0 REVIEW_REQUIRED POI Evidence Review / 200 Auto-Next

## Status

Authorized for execution by the user on 2026-09-18.

- Issue: #396
- Owner: B
- Priority: P0
- Upstream: TASK-068-B Candidate Recovery v1 / Draft PR #395
- Upstream accepted candidate head: `f5dcca969f72447d3f029781be0fb75ec66414f7`
- Task publication branch: `task/b-task-070-p0-evidence-review`
- Planned execution branch: `codex/b-task-070-p0-evidence-review`

This task is intentionally stacked on TASK-068-B while PR #395 remains unmerged. It must not modify or invalidate the accepted TASK-068 recovery checkpoint.

## Goal

Convert the current 322 `REVIEW_REQUIRED` candidates into explicit editorial-review outcomes using only the retained/matched evidence already frozen by TASK-068-B.

Process candidates in deterministic groups of at most 200:

1. `P0-0001`: first 200 candidates.
2. After successful batch QA/checkpoint, automatically start `P0-0002`.
3. `P0-0002`: remaining 122 candidates.
4. No human confirmation is required between normal batches.

The task is complete only when all 322 candidates have explicit P0 outcomes.

## Frozen Population

The authoritative P0 population is derived from the TASK-068 candidate feature outputs:

`data/poi/full/features/batch-*.jsonl`

Select exactly records with:

`status === "REVIEW_REQUIRED"`

Before any mutation, materialize and checksum a frozen population manifest. Required assertions:

- selected count = 322;
- no `SOURCE_UNAVAILABLE` candidate;
- no `QUARANTINED` candidate;
- no already `PARTIAL` candidate unless it is separately present in the frozen P0 population due to an upstream data inconsistency, which must stop execution for review;
- no duplicate candidateKey;
- candidateKey identity checksum must still match TASK-068 data.

Sort by `candidateKey` ascending unless an upstream frozen manifest defines a stricter stable order. Record the chosen ordering rule in the manifest.

## Explicitly Out of Scope

Do not process or change:

- 9,859 `SOURCE_UNAVAILABLE` candidates;
- 162 `QUARANTINED` candidates;
- candidate discovery;
- general source discovery / web crawling;
- formal Master Code allocation;
- old-code conflict adjudication;
- canonical Registry POI allocation;
- new recommendation weights;
- runtime Planner behavior;
- production DB/schema/migration;
- live/paid route/provider calls;
- P1 source expansion.

## Evidence Boundary

P0 is **retained-evidence editorial review**, not evidence acquisition.

Use only evidence already preserved/matched by TASK-068, including its retained source index, target-content boundaries, source hashes, candidate/source matching, and frozen rubric.

Relevant upstream artifacts include, but are not limited to:

- `data/poi/full/sources/retained-article-index.v1.json`
- `data/poi/full/sources/reviewed-enrichment-evidence.v1.json`
- `data/poi/full/sources/source-manifest.v1.json`
- `data/poi/full/registry/combined-candidates.v1.jsonl`
- `data/poi/full/rubrics/candidate-feature-rubric.v1.json`
- `data/poi/full/features/batch-*.jsonl`
- TASK-068 QA and manifests.

If the retained raw cache is locally available, verify its frozen SHA and target locators through the existing verification tooling before relying on locator-level facts. Do not silently substitute current web content for the retained source.

## Per-Candidate Review

For each P0 candidate:

1. Verify candidate identity and the matched retained source relationship.
2. Read the complete target content available inside the frozen target-content boundary.
3. Apply the existing 43-feature rubric exactly.
4. Populate only dimensions supported by target-specific evidence.
5. Keep unsupported dimensions `null`.
6. `0` means evidenced absence within the assessed scope, never "unknown".
7. Never infer a middle score such as 5 merely because a feature seems plausible.
8. Preserve for every non-null feature:
   - featureCode;
   - value;
   - frozen kind;
   - rubricVersion;
   - annotationMethod;
   - sourceRefs;
   - confidence;
   - concise rationale;
   - retained locator/hash or equivalent auditable retained-evidence reference.
9. Populate Visit Profile fields only when the evidence explicitly supports the field.
10. Populate Access Anchor/static transport facts only when the evidence explicitly supports the relationship.
11. Do not infer live/current timetable, fare, crowd, queue, journey duration, transfer count, accessibility status, current service status, or walkability from stale/static prose.
12. Keep all outputs candidate-only.

## Required Candidate Outcomes

Every one of the 322 candidates must end in exactly one explicit P0 review state. Implement stable machine-readable statuses equivalent to:

- `REVIEWED_PARTIAL` — at least one supported attribute/visit/anchor fact was added;
- `REVIEWED_NO_SUPPORTED_ATTRIBUTE` — source identity match is valid but retained content yields no rubric-supported attribute;
- `REVIEW_BLOCKED_EVIDENCE_INSUFFICIENT` — source body/boundary/locator is insufficient for safe editorial extraction;
- `REVIEW_BLOCKED_IDENTITY` — candidate/source relationship cannot be safely maintained.

Do not silently drop candidates. A blocked candidate remains candidate-only and retains its previous nulls.

## Batch Model

Create a separate P0 manifest/checkpoint layer so P0 execution is auditable independently from the original 52 recovery batches.

Required deterministic batches:

### P0-0001

- candidates: 200
- source: frozen P0 population positions 1–200

### P0-0002

- candidates: 122
- source: frozen P0 population positions 201–322

Each batch receipt must include at minimum:

- batch ID;
- ordered candidate keys;
- candidate count;
- first/last candidate key;
- input checksum;
- rubric version/hash;
- evidence index/hash;
- output hashes;
- result counts;
- started/completed timestamps;
- failure/review queue count.

Receipt is written last.

## Auto-Next / Resume

Execution behavior:

1. Start `P0-0001`.
2. Process all 200 candidates.
3. Run batch QA.
4. Write checkpoint/receipt last.
5. If batch QA passes, immediately start `P0-0002`.
6. Process remaining 122.
7. Run final aggregate QA.

No human confirmation between batches.

Resume behavior:

- completed checksum-identical batch + valid receipt → skip;
- missing/incomplete receipt → rebuild batch;
- corrupted output → rebuild affected batch;
- changed rubric/evidence/population input → invalidate affected/all P0 checkpoints as appropriate;
- bounded/debug run must never claim complete P0 execution.

Individual candidate failure should enter an explicit review/error queue and should not stop the remaining candidates unless it exposes:

- candidate identity corruption;
- frozen evidence/hash corruption;
- rubric/schema contradiction;
- unsafe source/candidate linkage;
- unrecoverable infrastructure failure.

## Output Integration

Prefer the smallest change consistent with the existing TASK-068 generator architecture.

Requirements:

- preserve all candidateKeys;
- preserve original observations and old-code claims;
- preserve the 43-key contract;
- preserve candidate-only wrapper semantics;
- do not overwrite TASK-068 evidence provenance with weaker P0 provenance;
- preserve deterministic rebuilds;
- updated feature/visit/anchor sidecars must remain consumable by the existing candidate QA pipeline;
- P0-specific manifests/QA should make the 322-review operation independently reproducible.

If a candidate gains evidence, update its current candidate sidecar deterministically rather than creating a second conflicting truth model.

## QA — Per Batch

Each P0 batch must prove:

- expected candidate count;
- exact candidate list checksum;
- no duplicate candidateKey;
- no P0 population leakage;
- all 43 feature keys present;
- every non-null value in range 0..9;
- every non-null value has complete provenance;
- locator/hash integrity for retained locator facts;
- `null` remains unknown;
- no unsupported default score;
- no formal Master Code mutation;
- no canonical Registry allocation mutation;
- no quarantined/source-unavailable candidate mutation;
- Visit Profile constraints remain valid;
- Access Anchor/static edge constraints remain valid;
- deterministic rerun;
- checksum-identical resume skip;
- corrupted/incomplete receipt recovery.

## QA — Final Aggregate

After `P0-0002`, publish before/after metrics:

- P0 population = 322;
- reviewed outcomes = 322;
- candidates with >=1 newly supported feature;
- total non-null feature positions before/after;
- newly added non-null feature positions;
- remaining null feature positions across P0;
- Visit Profile facts added;
- Access Anchors/static relations added;
- counts by final P0 status;
- blocked/error queue;
- unchanged canonical Registry checksum;
- unchanged candidate population identity checksum;
- no production DB/runtime write.

Run all applicable TASK-068 regression tests plus repository gates required by current CI. Final Draft PR head must receive its own GitHub Quality Gate PASS.

## Git / Stacked PR Rules

PR #395 remains Open / Draft and must not be changed or merged by this task.

While #395 is unmerged:

- TASK-070 execution branch is based on this task publication branch, which itself is based on accepted TASK-068 head `f5dcca...`;
- open TASK-070 Draft PR against `codex/b-poi-partition-enrichment-transport-linkage` so the visible diff contains only TASK-070 work;
- do not auto-merge.

After #395 is explicitly accepted and merged:

- bring latest `origin/develop` into TASK-070 by a normal merge;
- never force-push/rebase a published branch;
- retarget the Draft PR to `develop`;
- rerun exact-head gates.

Forbidden:

- `git clean -fd`
- `git reset --hard`
- `git push --force`
- `git push --force-with-lease`

## Required Deliverables

At minimum:

- P0 frozen population manifest;
- `P0-0001` receipt;
- `P0-0002` receipt;
- candidate result/review queue;
- updated deterministic candidate feature/visit/anchor outputs where supported;
- P0 aggregate QA;
- `docs/qa/TASK-070/README.md`;
- machine-readable QA under `docs/qa/TASK-070/`;
- `docs/tasks/RESULT-TASK-070-b-p0-poi-evidence-review.md`;
- one Draft PR for TASK-070;
- exact final-head Quality Gate evidence.

## Completion State

Successful completion means:

`322 / 322 P0 candidates explicitly reviewed in two deterministic batches`.

It does **not** mean:

- all 43 attributes are non-null;
- 10,369 candidates are fully enriched;
- P1 has started;
- formal Master Code allocations are complete;
- candidate data has entered production.

Stop after the P0 Draft PR and return the full result for user acceptance.
