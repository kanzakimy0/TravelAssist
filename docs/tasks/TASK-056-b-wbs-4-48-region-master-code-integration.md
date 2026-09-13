# TASK-056-B — WBS 4.48 Region Graph Master Code Integration / Revalidation

## Status

Authorized / Ready for Codex implementation.

## Tracking

- WBS: `4.48 Travel Region Graph Pilot / Reference Dataset`
- Canonical Owner: **B** (explicit user reassignment; see `docs/project/WBS-4.48-owner-correction.md`)
- Priority: P0
- Publication baseline: execution-time latest `origin/develop`; owner-correction publication followed `develop@92b3057a8a81698ab1af21d15e9233b90a30f991`
- Historical producer: TASK-041-A / Issue #305 / PR #306 (merged)
- Historical governance producer: TASK-043-A / PR #326 (merged)
- Superseded unexecuted A follow-up: TASK-045-A / Issue #349 (historical only; do not execute in parallel)
- Planned implementation branch: `codex/b-wbs-4-48-region-master-code-integration`

## 1. Objective

Complete WBS 4.48 by integrating the already-approved canonical Master Code allocations into the already-merged 50-node Japan Travel Region Graph and independently revalidating the full Region Graph/reference dataset.

This Task is **not** a Region Graph redesign and **not** a new Master Code governance task.

The desired state is:

```text
Merged TASK-041 Region Graph (50 nodes, 50 null masterCode values)
        +
Merged canonical Master Code Registry / 50 governed Region allocations
        ↓
50/50 production Region nodes with active canonical Master Codes
        ↓
0 unresolved/null production Region master codes
        ↓
0 semantic topology change
        ↓
Focused + full regression + exact-head Quality Gate
```

## 2. Source-of-truth inputs

Codex must read the execution-time latest `origin/develop` and use only accepted repository sources. At minimum verify:

- TASK-041 Region Graph implementation/result/QA from the merged PR #306 lineage;
- canonical Master Code Registry, resolver/validator and Region allocation manifest from merged PR #326 lineage;
- TASK-044-A governance acceptance evidence if present in `develop`;
- current Planning public Region Graph contract/validator and fixtures;
- current Master Code registry contract/validator;
- latest Master WBS and owner-correction record.

Do not revive rejected legacy `JP-RG-*`, `JP-PREF-*`, `JP-MACRO-*`, destination IDs, admin codes, transport IDs, POI IDs or DB IDs as canonical Master Codes.

## 3. Required implementation

1. Locate the canonical 50-node Region Graph now in `develop`.
2. Locate the canonical 50-Region allocation manifest / registry entries now in `develop`.
3. Join only by the governed entity identity defined by the registry; do not infer codes from names/labels/order unless the accepted registry explicitly defines that identity.
4. Populate all production Region nodes so all 50 canonical allocations resolve 1:1.
5. Preserve every existing `regionId` exactly.
6. Preserve node type, parent identity, labels, aliases, provenance, relations, TravelEdges, variants and ordering unless a strictly necessary compatibility correction is demonstrated.
7. Keep shared contract semantics accepted by governance: `masterCode: string | null` may remain permitted only for explicit draft/partial/unallocated representations; the completed production/reference graph must contain zero nulls.
8. Add/refresh focused validation and machine-readable before/after evidence.
9. Do not add a second registry, duplicate allocation list or side-channel lookup table.
10. If an actual registry/graph incompatibility is discovered, fail closed and return Partial/Blocked rather than inventing a mapping.

## 4. Mandatory invariants

The candidate must prove all of the following:

- Region nodes = exactly 50.
- Existing Region IDs preserved = 50/50.
- Canonical Master Codes populated = 50/50.
- Production/reference Region `masterCode = null` = 0.
- Active canonical registry resolution = 50/50.
- Duplicate Master Codes = 0.
- Duplicate active Region allocations = 0.
- Unknown/deprecated/invalid-superseded allocations used by production graph = 0.
- Rejected legacy substitute identifiers = 0.
- RegionRelation semantic diff = 0 unless a compatibility correction is separately justified.
- TravelEdge semantic diff = 0 unless a compatibility correction is separately justified.
- TravelEdgeVariant semantic diff = 0 unless a compatibility correction is separately justified.
- Corridor reachability preserved.
- No change to Live Route Fact boundaries.

## 5. Required evidence

Create at minimum:

- `docs/qa/TASK-056/README.md`
- `docs/qa/TASK-056/region-master-code-integration.json`
- `docs/qa/TASK-056/region-master-code-integration-report.md`
- `docs/tasks/RESULT-TASK-056-b-wbs-4-48-region-master-code-integration.md`

The machine-readable evidence must include:

- execution baseline SHA;
- exact graph source paths;
- exact registry/allocation source paths;
- before/after null counts;
- 50 Region ID preservation result;
- 50 canonical Master Code resolutions;
- duplicate/unknown/lifecycle-invalid counts;
- semantic hashes or equivalent topology identity evidence for nodes excluding the intended `masterCode` field, RegionRelations, TravelEdges and variants;
- test commands/results;
- exact final head and Quality Gate URL/status.

## 6. Required QA

At minimum run execution-time canonical equivalents of:

- `npm ci`
- baseline full repository Node regression before candidate changes
- TASK-041 / Region Graph focused validation
- Master Code registry focused validation
- Planning Contracts
- Planning Soak / consistency QA
- Routing focused regression
- Trip / Engine focused regression relevant to shared contracts
- TASK-056 focused tests / integration evidence
- candidate full repository regression
- `npm run lint` (or exact documented unchanged baseline debt plus clean-repository CI lint)
- `npm run typecheck`
- `npm run build`
- repository deployment validate/build/artifact checks currently required by Quality Gate
- scoped formatting
- `git diff --check`
- exact final-head GitHub Quality Gate PASS

No mandatory suite may be reported PASS if it was skipped/not executed.

## 7. WBS / ownership tracking

WBS 4.48 canonical owner is now B by explicit user decision. This is a single-WBS exception and does not globally move Planner/Map/Route ownership from A to B.

At implementation start, Codex must read the latest complete Master WBS. If the 4.48 row still reflects historical A ownership/status, minimally synchronize it to:

```text
Owner: B
Status: 进行中（TASK-056-B / <new B Issue>；承接已合并 TASK-041-A）
```

After implementation + mandatory QA + Draft PR:

```text
Owner: B
Status: 待审查（TASK-056-B / <new B Issue>；Draft PR #<number>）
```

Only explicit user acceptance and merge may set WBS 4.48 to `已完成`.

Do not overwrite unrelated A/B WBS changes.

## 8. Historical task handling

Preserve these as historical input, not active parallel implementation:

- TASK-041-A / Issue #305 / PR #306 — Region Graph producer.
- TASK-043-A / Issue #311 / PR #326 — canonical registry/governance producer.
- TASK-044-A — independent governance acceptance evidence.
- TASK-045-A / Issue #349 — superseded for execution ownership by this explicit B reassignment.

Do not delete or rewrite their historical Task/Result files.

## 9. Out of scope

- Candidate Pipeline / itinerary candidate generation.
- POI scoring calibration / Human Gold.
- POI production Master Code mass allocation.
- Region taxonomy redesign.
- Region ID renumbering.
- Planner UI / Map UI changes.
- Route Provider/live timetable/fare work.
- DB persistence/migration for Region Graph.
- AI behavior.
- Engine 4.22–4.24.
- unrelated A/B refactors.

## 10. Completion behavior

Create a **Draft PR → `develop`** and return the complete Result.

Do not auto-merge. Do not auto-start Candidate Pipeline, POI work, Engine work or another downstream Task.
