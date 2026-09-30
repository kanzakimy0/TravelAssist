# AMENDMENT — TASK-085-B Access Topology / Route Metrics Split v2

Date: 2026-09-30  
Parent Task: TASK-085-B / Issue #442 / WBS 7.15  
Current PR: #464  
Current checkpoint head: `2891bdf806536c039b1071a169e1f38b6f07d3e4`  
Owner: B  
Runtime / API / Planner owner: A (unchanged)

## 1. Why this amendment exists

The first full-coverage attempt correctly refused to fabricate route data, but it over-coupled two different facts:

1. **Access topology** — whether a Canonical POI is legitimately associated with a TransportNode as a useful visitor gateway.
2. **Route metrics** — exact direction-specific walking/transit/taxi distance, duration, cost, stairs, accessibility, detour and other movement facts.

The current checkpoint found 1,887 task-local admitted topology nodes and 772 directed candidates, yet published 0 accepted edges because every edge was required to have a legally reusable, independently evidenced complete directional route.

That interpretation is too strict for TASK-085.

TASK-085 must preserve unknown route metrics as unresolved, but a confirmed official access relationship must not disappear merely because exact walking geometry/time is unavailable.

This amendment keeps the previous no-fabrication / full-coverage rules and changes the acceptance model so topology completeness and route-metric completeness are evaluated separately.

## 2. Preserve current work; do not restart

Continue on:

`feature/b-poi-transport-node-access-edges`

Reuse, audit and improve the current checkpoint artifacts. Do not discard/rebuild from zero unless deterministic input invalidation requires it.

Preserve:

- 1,887 admitted topology nodes after revalidation
- HOLD/rejected identity decisions
- 772 current directed candidates as discovery evidence
- source archives/hashes
- official access research
- batch/resume/deterministic infrastructure
- QA tests and receipts

Any record that fails the new rules must be corrected or removed; existing counts are not guaranteed acceptance.

## 3. Two-layer acceptance model

### Layer A — Access Topology

A POI↔TransportNode relationship may be topology-confirmed when one or more approved evidence types establish that the node is a genuine visitor access gateway for the POI.

Accepted topology evidence includes, in priority order:

1. official POI / venue access page naming the station/terminal/port/stop;
2. official operator or government access guidance naming the POI/gateway relationship;
3. official tourism authority access guidance;
4. approved GTFS/service source plus independently validated POI gateway evidence;
5. legally usable routing evidence that binds the exact POI endpoint to the node.

Spatial proximity alone is not enough.

MLIT S12 topology alone is not enough.

A topology-confirmed edge may exist even if walking/transit/taxi metrics remain unresolved.

### Layer B — Directional Route Metrics

Each directed edge keeps its own mode states.

Metrics may be:

- RESOLVED
- UNRESOLVED
- UNAVAILABLE

with explicit reason and source.

Do not mechanically mirror route metrics between directions.

The same official topology relationship may support both directed edge records, but each direction's walking/transit/taxi metrics are evaluated separately.

Unresolved route metrics MUST NOT delete an otherwise valid topology-confirmed access edge.

## 4. Revised edge state

Each directed access edge must explicitly distinguish topology from metrics, using existing contracts where possible.

At minimum express equivalent semantics:

```ts
type AccessTopologyStatus =
  | "CONFIRMED"
  | "REJECTED"
  | "REVIEW_REQUIRED";

type DirectedPoiTransportAccess = {
  edgeId: string;
  from: GraphRef;
  to: GraphRef;
  directed: true;

  accessRole:
    | "nearest_local"
    | "major_hub"
    | "tourism_gateway"
    | "special_access";

  topologyStatus: AccessTopologyStatus;
  topologyEvidenceRefs: string[];
  topologyEvidenceType: string[];
  topologyConfidence: number;

  straightDistanceM: number;

  modes: {
    walking: ModeResolution;
    localTransit: ModeResolution;
    taxi: ModeResolution;
  };

  sourceRefs: string[];
  generatedAt: string;
};
```

Do not create a second Planner/runtime public contract. Use a task-owned additive wrapper/adapter if the current TASK-082 contract lacks topology-specific metadata.

## 5. What counts as a usable access node

For TASK-085 topology completeness, a TransportNode counts as **useful** only when:

- node identity is task-local downstream admitted;
- POI identity is runtime-authorized Canonical;
- a real POI↔node gateway relationship is supported by approved evidence;
- accessRole is justified;
- it is not merely a remote hub added to increase node count;
- there is no known barrier proving the relationship false.

A confirmed topology relationship may count as usable even when exact route metrics are unresolved.

This is intentionally different from the previous checkpoint, where unresolved route metrics made every topology relationship unusable.

## 6. Full coverage target remains strict

The user requirement remains:

- scan coverage = 100%
- explicit result coverage = 100%
- useful topology access coverage = 100% of valid active Canonical POIs
- target = 3–8 useful distinct TransportNodes per POI where geography actually supports it
- mean useful topology nodes/POI >= 3
- median useful topology nodes/POI >= 3
- zero-node POIs = 0 among valid accessible Canonical POIs
- every <3-node POI must have a complete candidate exhaustion proof

Do NOT pad with useless nodes.

## 7. Mandatory second discovery pass for the current 98 unproven POIs

The previous checkpoint explicitly states:

`globalDiscoveryFixpointProven=false`

and 98/100 under-target POIs have no established exhaustion proof.

Therefore the task MUST continue.

For every one of those 98 POIs, perform staged source discovery until one of the following is proven:

### A. Sufficient topology

At least 3 useful distinct topology-confirmed nodes, unless geography legitimately supports fewer.

### B. Candidate exhaustion

A machine-readable proof shows that all reasonable access categories and approved sources were searched and fewer than 3 legitimate nodes actually exist.

The proof must include:

- official POI/venue access source search
- official tourism authority search
- rail/operator access search
- local bus/GTFS/open-data search where relevant
- ferry/port search for islands/coasts
- ropeway/cable/funicular search for mountains
- airport rail/bus gateway search where relevant
- staged geographic search
- all credible candidates considered
- accepted/rejected reasons
- source/license status
- why adding more nodes would be fake or non-useful

A proof that only says "route metrics unavailable" is NOT candidate exhaustion.

## 8. Official access pages must create topology edges when identity joins

Examples already present in the current checkpoint must be re-evaluated.

If identity joins are valid:

- 増上寺 official access guidance naming 浜松町 / 御成門 / 芝公園 / 大門 / 赤羽橋 / 神谷町 must create topology-confirmed gateway relationships; missing directional walking geometry remains a metric-level unresolved state.
- 大阪ドーム official access guidance naming ドーム前 / ドーム前千代崎 / 大正 / 九条 must create topology-confirmed gateway relationships.
- 葛城市相撲館 access guidance naming 当麻寺 may establish topology even if only approximate/official access time exists.
- 横浜スカイビル official access guidance may establish 横浜 / YCAT only after exact node identity is resolved.
- mountain/ski/ferry cases require special-access gateway identity and current service/public-access review.

Do not hard-code these POIs. Fix the general evidence-to-topology rule and rerun all POIs.

## 9. Directionality rule after the split

For every confirmed POI↔node topology relationship, create two directed edge records:

- POI → Node
- Node → POI

Both may cite the same topology evidence if the source establishes the undirected gateway relationship.

However:

- route metrics must remain direction-specific;
- do not copy resolved metrics solely because the reverse direction exists;
- if one direction has a documented prohibition, mark that direction unavailable/rejected accordingly.

This satisfies directed graph semantics without requiring two independent official access pages for the same physical gateway.

## 10. Route metric enrichment remains strict

No regression in truthfulness is allowed.

### Walking

Resolve only with legal, endpoint-bound evidence.

Keep distinct:

- straightDistanceM
- walkingRouteDistanceM
- walkingDuration
- detourRatio

Never substitute Haversine for walking.

### Transit / taxi

Resolve only with legally reusable evidence.

Provider rights remain fail-closed.

Unresolved route metrics do not block topology acceptance, but must remain visible in coverage statistics and unresolved ledgers.

## 11. Revised acceptance gates

The final acceptance file must separate **Topology Gates** and **Metric Gates**.

### 11.1 Hard Topology Gates — ALL must PASS for TASK-085 READY_FOR_REVIEW

- Canonical scan coverage = 100%
- explicit result coverage = 100%
- Canonical supporting manifest integrity = PASS
- valid active Canonical POIs with >=1 confirmed useful topology node = 100%
- mean useful topology nodes/POI >= 3
- median useful topology nodes/POI >= 3
- zero-node valid accessible POIs = 0
- under-target POIs without exhaustion proof = 0
- accepted topology node provenance = 100%
- accepted topology edge provenance = 100%
- accepted topology essential fields = 100%
- duplicate topology edges = 0
- invalid node identities = 0
- rejected v1 usage = 0
- unreviewed v2 bulk promotion = 0
- deterministic rebuild = PASS
- batch resume/checksum/corruption gates = PASS
- graph growth guard = PASS
- global topology discovery fixpoint = PROVEN

### 11.2 Metric Gates — quality dimensions, not edge-existence gates

Report independently:

- POIs with >=1 walking metric resolved
- POIs with >=1 transit metric resolved
- POIs with >=1 taxi metric resolved
- route metric resolution by direction
- accessibility known coverage
- stairs/elevation coverage
- detour-auditable coverage
- P90 coverage where supported

Metrics may remain unresolved only with explicit reason/provenance.

Do not claim metric completeness when it is not complete.

## 12. Canonical contradictions are upstream defects, not reasons to zero all 100 POIs

The current checkpoint identified at least:

- J-WORLD TOKYO: permanently closed
- レインボープール: operations ended/redeveloped
- 舳倉島: general tourist access restricted
- 鶴見つばさ橋: visitor endpoint/access semantics problematic

Create/update:

`data/transport/access/canonical-adjudication-required.json`

Classify each as:

- LIFECYCLE_INVALID
- PUBLIC_ACCESS_RESTRICTED
- CANONICAL_ENDPOINT_AMBIGUOUS
- OTHER

TASK-085 must continue completing all unaffected POIs.

For final PASS, the denominator must still come from the authoritative Canonical runtime manifest. B must not silently remove records.

If upstream Canonical ownership has not corrected invalid records by final review, return:

`READY_EXCEPT_CANONICAL_ADJUDICATION`

only after every other topology gate passes and all affected records have exact evidence.

Do not use two closed POIs as a reason to stop discovery for the other 98.

## 13. Fix the Canonical supporting hash gate

The current checkpoint reports a mismatch between the runtime manifest's declared sampleManifestSha256 and the actual sample manifest file.

Do not silently rewrite either side.

Audit commit history and authoritative TASK-083 records to determine whether:

- the manifest hash is stale, or
- the supporting file drifted.

Produce:

`docs/qa/TASK-085-B/canonical-supporting-hash-audit.md`

If the fix belongs to A/Canonical ownership, record exact correction required and keep the gate explicit.

TASK-085 must not broaden Canonical membership while resolving this.

## 14. Required outputs for v2

Keep previous outputs and add/update:

```text
data/transport/access/
  poi-transport-access-edges.jsonl
  topology-confirmed-edges.jsonl
  route-metric-unresolved.jsonl
  poi-access-completeness.json
  under-target-pois.json
  candidate-exhaustion-proofs.jsonl
  canonical-adjudication-required.json
  node-downstream-admission.jsonl
  candidate-node-decisions.jsonl
  auto-fix-iterations.jsonl
  final-acceptance-gate.json
```

Also update:

- docs/qa/TASK-085-B/README.md
- docs/tasks/RESULT-TASK-085-b-poi-transport-node-access-edge-generation.md
- WBS 7.15
- PR #464 body

## 15. Automatic completion loop

Do not stop after implementing the split.

After every full replay:

1. run topology gates;
2. list failed POIs;
3. perform next discovery/admission pass;
4. regenerate topology edges;
5. update exhaustion proofs;
6. rerun deterministic QA;
7. repeat.

Only stop when:

### PASS path

All topology hard gates PASS and global topology discovery fixpoint is proven.

Set:

`PASS / READY_FOR_REVIEW`

WBS 7.15 = 待审查.

### Canonical-only blocker path

All non-Canonical topology gates pass, but authoritative Canonical defects remain outside B ownership.

Set:

`READY_EXCEPT_CANONICAL_ADJUDICATION`

WBS 7.15 remains 进行中/待上游裁决, not completed.

### Genuine blocked path

A true external source/license/identity blocker prevents topology completion after exhaustive discovery.

Return a specific BLOCKED status with exact evidence.

Do NOT stop with:

- globalDiscoveryFixpointProven=false
- 98 NOT_ESTABLISHED exhaustion proofs
- 0 topology edges merely because route metrics are unresolved

## 16. Tests to add/update

At minimum test:

- official access gateway creates confirmed topology edge with unresolved metrics
- unresolved walking metrics do not delete topology edge
- same topology evidence may support both directed records without mirroring metrics
- direction-specific prohibition remains asymmetric
- spatial-only candidate does not become confirmed topology
- S12-only proximity does not become confirmed topology
- official gateway name must identity-join before acceptance
- <3-node POI requires exhaustion proof
- canonical lifecycle contradiction is isolated, not generalized to other POIs
- topology and metric acceptance gates are separate
- deterministic replay remains byte-identical

## 17. Git governance

Continue PR #464.

- Draft only
- no merge
- no auto-merge
- no TASK-086 start
- exact-head Quality Gate required after the final correction head

Only user acceptance may authorize merge / WBS completion.
