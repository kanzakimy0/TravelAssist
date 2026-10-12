# TASK-086-B — TransportNode → TransportNode Japan Mobility Backbone
## Adaptive Execution / Self-Calibration Edition — 2026-10-01

- Issue: #443
- Owner: B
- WBS: 7.16
- Priority: P0
- Execution branch: `feature/b-transport-node-mobility-backbone`
- Base when task was published: `develop@5123966f62dbe9587a3bbe38e877ccf3ea959b80`
- Depends on: TASK-084-B accepted project baseline, Route Schema 7.5
- TASK-085 dependency: **No**. If an accepted/merged TASK-085 artifact later exists it may be consumed as an optional demand/gateway signal, never as an unreviewed source of truth.
- Runtime / Route API / Planner owner: A (unchanged)
- Auto-next: Yes, after per-batch QA PASS
- Auto-merge: No
- Default max batch size: 200 directed edges or one deterministic service-pattern chunk, whichever is smaller

---

# 0. User intent / non-negotiable execution rule

The user explicitly requires TASK-086 to avoid repeated “run once → discover coverage is too small → rework from scratch” cycles.

Therefore this Task uses an **adaptive, deficit-driven generation model**.

The model may dynamically change:

- which mode/source to expand next;
- search radius / route depth;
- service-pattern granularity;
- whether to admit intermediate T2/T3 nodes;
- whether to focus on a missing hub transfer, corridor, airport, ferry, bus or rail component;
- batch/chunk decomposition;
- evidence priority inside the permitted source set.

The model may **not** dynamically weaken acceptance thresholds merely to obtain PASS.

Dynamic adjustment changes the **work plan**, not the definition of truth.

Every adjustment must be deterministic, machine-readable and explained in an iteration ledger.

Do not stop merely because a fixed edge-count target was reached.

Do not restart from scratch merely because the first topology is incomplete.

---

# 1. Goal

Build a nationwide, planner-usable static / quasi-static TransportNode mobility backbone:

```text
TransportNode
   ↕
TransportNode
```

that supports later composition:

```text
POI
→ TransportNode
→ National / Regional Mobility Backbone
→ TransportNode
→ POI
```

The Task must cover the transport structure actually needed by Japanese travel planning, including where supported:

- rail
- Shinkansen
- metro
- private rail
- local / regional rail
- major local bus
- highway bus
- airport bus
- flight
- ferry
- ropeway
- cable car / funicular
- task-relevant tourism transport

This Task owns **offline graph data production** only.

It does not own:

- Planner behavior;
- Route API;
- production provider adapters;
- realtime delay;
- current platform;
- realtime crowding;
- current fare lookup;
- user-facing route choice.

---

# 2. Lessons incorporated from TASK-084 / TASK-085

TASK-086 must not repeat the two failure patterns already seen upstream:

## 2.1 Do not equate “master task closed” with machine authorization

TASK-084 project/WBS closure does not automatically authorize every old node/candidate for 086.

Historical rejected TASK-084 v1 must never be revived.

TASK-084 v2 review/candidate artifacts may be used as discovery/evidence inputs only.

A node enters TASK-086 graph only through explicit 086-local admission or a newer machine artifact that explicitly authorizes it.

## 2.2 Do not couple topology existence to dynamic metric completeness

A real service segment / transfer / route topology may exist even if exact:

- duration;
- fare;
- frequency;
- first/last departure;
- P90;
- realtime state

is unavailable or cannot legally be persisted.

Static topology and dynamic metrics are separate acceptance layers.

Unknown dynamic fields stay unresolved; they do not erase a proven topology edge.

---

# 3. Compatibility gate

Before implementation, read latest:

- TASK-082-A graph contract and implementation;
- TASK-084-B final user-acceptance / review artifacts;
- current Route Schema 7.5;
- current Provider rights / cache / retention decisions;
- current WBS;
- current accepted Canonical / visitor-access adjudication only if needed for demand validation;
- current TASK-085 Result/PR if available.

Reuse existing graph semantics and identifiers where accepted.

Do not create a second Planner public contract.

If TASK-082's graph type is not sufficient for offline service-pattern metadata, use a task-owned additive wrapper/adapter.

---

# 4. Task-local TransportNode admission

TASK-086 is allowed to create an explicit **TASK-086-local admitted node subset** when the accepted national source set lacks a node required to represent a real service pattern.

This does not make the whole TASK-084 v2 master runtime-ready.

Every TASK-086 node must independently satisfy:

- stable deterministic ID;
- valid coordinates;
- nodeKind;
- operator / line / service identity where applicable;
- sourceRefs;
- source hash / evidence reference;
- license / persistence decision;
- duplicate / rebind check;
- parentHub / component semantics where applicable;
- explicit `ADMIT_TASK_086_TOPOLOGY`, HOLD or REJECT decision.

No node may be admitted solely because it is geographically near another node.

No rejected TASK-084 v1 identity may be used.

---

# 5. Graph layers — topology first, metrics second

TASK-086 must model at least four separate concepts.

## 5.1 SERVICE_SEGMENT

A directed topology segment supported by a real line / route / service pattern.

Examples:

```text
Tokyo → Shinagawa
Kyoto → Shin-Osaka
Bus Terminal A → Stop B
Port A → Port B
Airport A → Airport B
```

A segment requires:

- accepted from/to node identities;
- direction;
- mode;
- operator/line/service/service-pattern reference;
- provenance.

It does **not** require exact current timetable or fare.

## 5.2 SERVICE_PATTERN

Represents ordered calling points and service class.

At minimum:

```text
Operator
  ↓
Line / Route
  ↓
Service Pattern / Direction
  ↓
Ordered calling nodes
  ↓
Directed SERVICE_SEGMENT edges
```

Express/local/limited-express/Shinkansen stopping patterns must not be collapsed into one false pattern.

## 5.3 HUB_TRANSFER

Represents real transfer structure between components of a hub.

Topology evidence may establish that transfer is possible even if exact transfer walking minutes are unresolved.

Do not invent transfer between same-name facilities unless physical/official interchange evidence exists.

## 5.4 DIRECT_SERVICE shortcut

Optional planner shortcut for a real through/direct service.

Only add when:

- real direct service exists;
- topology/service evidence supports it;
- it provides clear planner value;
- it does not replace underlying service-pattern edges.

Do not create shortcuts simply because two cities are popular.

---

# 6. Edge contract semantics

Use repository naming where possible, but preserve equivalent meaning:

```ts
type TransportMobilityEdge = {
  edgeId: string;

  fromTransportNodeId: string;
  toTransportNodeId: string;
  directed: true;

  topologyStatus: "CONFIRMED" | "REJECTED" | "REVIEW_REQUIRED";

  edgeKind:
    | "service_segment"
    | "hub_transfer"
    | "direct_service";

  mode:
    | "rail"
    | "shinkansen"
    | "metro"
    | "private_rail"
    | "local_bus"
    | "highway_bus"
    | "airport_bus"
    | "flight"
    | "ferry"
    | "ropeway"
    | "cable_car"
    | "other_tourism_transport";

  operatorRef?: string;
  lineRef?: string;
  serviceRef?: string;
  servicePatternRef?: string;

  topologyEvidenceRefs: string[];
  sourceRefs: string[];
  confidence: number;

  durationTypicalMin?: number | null;
  durationP90Min?: number | null;
  fareTypicalYen?: number | null;
  frequencyTypicalMin?: number | null;

  reservation?:
    | "not_required"
    | "recommended"
    | "required"
    | "unknown";

  firstDeparture?: string | null;
  lastDeparture?: string | null;
  validDays?: string[] | null;
  seasonal?: boolean | null;

  observedAt?: string | null;
  validFrom?: string | null;
  validTo?: string | null;
  freshnessClass?: string | null;

  generatedAt: string;
};
```

Topology evidence and metric evidence must be independently traceable.

---

# 7. Static / dynamic boundary

## 7.1 Static/quasi-static data allowed

When rights permit:

- node identity;
- ordered stop sequence;
- line/operator association;
- service class;
- route topology;
- service-pattern direction;
- hub transfer relationship;
- broad reservation semantics;
- broad seasonal flag;
- stable accessibility facts;
- permitted derived snapshot metrics.

## 7.2 Dynamic/high-change data

Never claim as current truth without source + freshness:

- exact current timetable;
- exact current fare;
- temporary suspension;
- delay;
- platform;
- crowding;
- temporary rerouting;
- live service changes.

If dynamic fields are unavailable, use explicit unresolved reasons.

Topology can still PASS without them.

---

# 8. Source hierarchy and rights

Prefer:

1. official operator route/station/service documents;
2. government / municipal / prefectural transport open data;
3. licensed static GTFS / GTFS-derived data;
4. official airport / ferry / bus operator data;
5. approved structured public sources;
6. secondary sources only as supporting discovery, never sole production proof where primary evidence is required.

Every source must record:

- source URL / ID;
- observed date;
- archive/content hash when retained;
- license/terms decision;
- persistence/derived-data decision;
- attribution;
- source freshness class.

If rights are unclear:

- do not bulk scrape;
- do not persist forbidden payloads;
- do not invent values;
- use permitted static structure if independently supported;
- leave dynamic fields unresolved.

---

# 9. Adaptive model — deficit-driven execution

This is the central rule of TASK-086.

Do not run a fixed list of lines once and stop.

After every full graph replay, calculate deficits and choose the next expansion action deterministically.

## 9.1 Deficit classes

At minimum classify:

- `DISCONNECTED_T0`
- `DISCONNECTED_T1`
- `CORRIDOR_UNREACHABLE`
- `MISSING_INTERMEDIATE_NODE`
- `SERVICE_PATTERN_GAP`
- `HUB_TRANSFER_GAP`
- `AIRPORT_SURFACE_GAP`
- `ISLAND_FERRY_GAP`
- `HIGHWAY_BUS_GAP`
- `TOURISM_SPECIAL_MODE_GAP`
- `NODE_IDENTITY_GAP`
- `SOURCE_LICENSE_GAP`
- `DYNAMIC_METRIC_ONLY_GAP`

Dynamic-metric-only gaps do not trigger topology expansion when topology is already valid.

## 9.2 Priority order

Use a deterministic lexicographic priority, not opaque “AI intuition”:

1. broken T0 national connectivity;
2. broken T1 regional/tourism connectivity;
3. missing real service-pattern continuity;
4. missing hub transfer required to connect accepted components;
5. airport / ferry / island / major bus structural gaps;
6. accepted tourism gateway connectivity;
7. optional direct-service shortcut;
8. dynamic metrics.

Within the same class, rank by:

- number of currently disconnected required nodes repaired;
- corridor coverage impact;
- source authority/quality;
- identity certainty;
- license/persistence usability;
- deterministic tie-breaker.

Do not tune ranking weights merely to pass a gate.

## 9.3 Adaptive actions

Depending on deficit type, the model may:

- expand source coverage for a mode;
- increase service-pattern parsing depth;
- add missing intermediate T2/T3 nodes;
- split a large hub into correct operator components;
- add/review HUB_TRANSFER;
- add ferry/flight/bus bridge across disconnected regions;
- ingest a missing route/service pattern;
- reject a false direct edge;
- reduce over-broad service pattern;
- switch from distance-based candidate search to exact official route identity search.

Every action and parameter change must be written to:

`data/transport/network/adaptive-model-iterations.jsonl`

## 9.4 Dynamic parameters

The model may adapt:

- `maxNewNodesPerIteration`
- `maxNewEdgesPerIteration`
- `servicePatternExpansionDepth`
- `routeChunkSize` up to the hard 200-edge maximum
- `hubTransferReviewDepth`
- `modeExpansionPriority`
- `regionalSearchScope`

Each change must include:

- previous value;
- new value;
- observed deficit triggering the change;
- expected improvement;
- actual improvement on next replay.

No parameter may be changed without a trace.

---

# 10. No N×N

Strictly forbid:

```text
all TransportNodes × all TransportNodes
```

Edges come only from:

- real ordered service patterns;
- real hub transfers;
- real direct services;
- explicitly supported special transport.

Spatial proximity may discover candidates but never proves a transport edge.

QA may compute reachability/components over all nodes; that is not edge generation.

---

# 11. Mode-specific modeling rules

## 11.1 Rail / Shinkansen / metro / private rail

Must preserve:

- direction;
- ordered calling points;
- service class;
- skipped stations;
- through-service boundaries;
- operator boundaries;
- hub transfers.

Physical adjacent stations do not imply every service stops there.

## 11.2 Bus

Do not ingest every local stop without purpose.

Adaptive priority:

- airport access;
- highway/intercity bus;
- tourism corridor bus;
- service needed to connect accepted gateway nodes;
- local bus only when needed to close a graph gap.

## 11.3 Flight

Only real airport-airport services.

Track:

- seasonal;
- suspended/inactive;
- operator/service identity;
- freshness.

Do not infer service from airport importance.

## 11.4 Ferry

Prioritize:

- islands;
- tourism-dependent sea routes;
- Hokkaido/Kyushu/Shikoku access;
- major passenger routes;
- known Canonical/transport gateways.

Distinguish current passenger service from historic/vehicle-only relevance.

## 11.5 Ropeway / cable car / funicular

Add when needed for real tourism access or backbone continuity.

Do not treat a tourist attraction facility as a transport node unless it actually functions as one.

---

# 12. Hub transfers

For every accepted multi-component hub used by more than one service pattern, audit whether required transfers are represented.

A topology transfer edge may be confirmed by official interchange/physical-complex evidence while exact transfer minutes remain unresolved.

Audit:

- operator component;
- station/terminal identity;
- physical interchange;
- indoor/outdoor if known;
- barrier/accessibility if known;
- transfer direction restrictions if any.

No blind same-name transfer.

---

# 13. Batch execution

Prefer batches by:

```text
operator / line / route / service pattern / deterministic chunk
```

not random edges.

Hard maximum:

```text
200 directed edges per batch
```

Complex service patterns may use smaller chunks.

Each batch must produce:

- source manifest;
- input node manifest;
- service-pattern input;
- generated edges;
- node-join decisions;
- unresolved ledger;
- QA receipt;
- checksum;
- output hashes;
- next-action deficit summary.

Required behavior:

- crash resume;
- checksum skip;
- deterministic rebuild;
- single-batch rerun;
- corrupted receipt detection;
- changed-source invalidation;
- auto-next only after batch QA PASS.

---

# 14. Iterative execution loop

The task runs:

```text
seed source/node admission
→ service-pattern parse
→ edge generation
→ hub-transfer generation
→ graph replay
→ connectivity QA
→ deficit classification
→ adaptive action
→ source/node/service expansion
→ replay
```

Repeat until one of the defined convergence outcomes is reached.

Do not stop after a predetermined number of iterations.

---

# 15. Convergence / anti-rework rules

## 15.1 Improvement measurement

Each iteration must report deltas:

- required nodes newly connected;
- disconnected T0 count;
- disconnected T1 count;
- corridor failures;
- hub-transfer gaps;
- service-pattern gaps;
- mode gaps;
- accepted nodes added;
- confirmed edges added/removed;
- false edges removed;
- unresolved topology defects;
- metric-only unresolved fields.

## 15.2 Saturation rule

If an iteration adds data but does not improve any hard topology gate:

- do not repeat the same expansion action unchanged;
- change deficit strategy/source/mode;
- or produce a fixpoint proof if the gap is externally blocked.

## 15.3 Fixpoint

A real topology fixpoint is reached only when:

- every remaining failed topology item has an explicit source/license/identity blocker;
- reasonable approved source categories have been checked for that deficit;
- repeating the same search would not add new evidence;
- proof hashes and evidence paths are recorded.

Do not claim “global Internet exhaustion”.

Use:

`SOURCE_LICENSE_IDENTITY_FIXPOINT_PROOF`

or another specific machine-readable reason.

---

# 16. Acceptance inventory

To prevent gaming the denominator, freeze a machine-readable **required-backbone inventory**.

It must include, after task-local admission:

- all accepted T0 nodes;
- all accepted T1 nodes;
- all intermediate nodes required by accepted service patterns;
- all accepted airport/ferry/bus gateways necessary for national/regional connectivity;
- all accepted special transport nodes actually required by the graph;
- accepted TASK-085 gateway nodes only if TASK-085 has been formally accepted/merged or separately revalidated by TASK-086.

The inventory may grow during discovery.

It may not shrink merely to make coverage pass.

Removal requires explicit rejection/deprecation evidence.

Output:

`data/transport/network/required-backbone-inventory.json`

---

# 17. Hard topology acceptance gates

TASK-086 may become `PASS / READY_FOR_REVIEW` only when all applicable hard gates pass.

At minimum:

1. **Input/node identity**
   - accepted graph nodes have stable identity = 100%
   - node provenance = 100%
   - invalid/rebound identity = 0
   - rejected TASK-084 v1 usage = 0
   - unreviewed bulk v2 promotion = 0

2. **Edge truth**
   - topology-confirmed edge provenance = 100%
   - both endpoints admitted = 100%
   - directed semantics = 100%
   - duplicate same-service edges = 0
   - false spatial-only edges = 0

3. **Service-pattern integrity**
   - accepted service-pattern references valid = 100%
   - ordered stop sequences valid = 100%
   - direction resolved for accepted patterns = 100%
   - express/local/Shinkansen stop semantics not silently collapsed

4. **National connectivity**
   - all required T0 nodes belong to the intended national multimodal connected backbone, except audited external-fixpoint exceptions
   - all required T1 nodes have a path into a T0/T1 backbone, except audited external-fixpoint exceptions
   - disconnected required nodes without proof = 0

5. **Hub transfer**
   - every multi-component hub needed by accepted routes has the required transfer topology or explicit proven non-transfer
   - missing required hub transfer without proof = 0

6. **Mode/corridor coverage**
   - Shinkansen backbone continuity PASS
   - major conventional/private/metro hub connectivity PASS
   - airport-to-surface-network structural coverage PASS where service exists
   - ferry/island structural coverage PASS where required
   - major highway/tourism bus structural coverage PASS where required
   - special tourism transport coverage PASS where required

7. **Known corridor QA**
   Must be found by graph query, never by hardcoded patches:
   - Tokyo ↔ Kyoto / Osaka
   - Tokyo ↔ Kawaguchiko area
   - Osaka ↔ Kyoto / Kobe / Nara
   - Fukuoka ↔ Kumamoto
   - representative Hokkaido major-hub routes
   - airport ↔ city access examples
   - ferry-dependent tourism examples

   Expand the suite automatically when the required-backbone inventory contains equivalent critical corridors.

8. **Graph growth**
   - no N×N generation
   - all edges trace to service/transfer/direct-service evidence
   - deterministic growth limits PASS

9. **Execution integrity**
   - batch resume/checksum/corruption detection PASS
   - deterministic rebuild PASS
   - source fingerprint invalidation PASS

10. **Adaptive model**
   - every iteration/parameter adjustment traced
   - no repeated no-improvement loop
   - `globalTopologyDiscoveryFixpoint = PROVEN` at completion

---

# 18. Dynamic metrics acceptance

Dynamic metric completeness is reported separately and does not delete valid topology.

Report:

- duration coverage;
- fare coverage;
- frequency coverage;
- first/last departure coverage;
- reservation metadata coverage;
- calendar coverage;
- seasonal coverage;
- accessibility/transfer-time coverage;
- P90 coverage.

Every resolved dynamic field must have:

- source;
- observedAt;
- validFrom/validTo where available;
- freshnessClass;
- rights decision.

Unresolved fields require explicit reason.

Do not fabricate P90, fare or frequency.

---

# 19. Automatic final statuses

## 19.1 PASS / READY_FOR_REVIEW

Use only when all hard topology gates pass.

Set:

`WBS 7.16 = 待审查`

Do not mark completed.

## 19.2 READY_FOR_USER_ACCEPTANCE_WITH_AUDITED_FIXPOINT_EXCEPTIONS

Allowed only if:

- all integrity/provenance/determinism gates PASS;
- national connectivity is complete except explicitly enumerated external source/license/identity fixpoint cases;
- every exception has a valid proof;
- adaptive loop has converged;
- no ordinary discovery/review work remains.

Set:

`WBS 7.16 = 待审查（audited fixpoint exceptions）`

Stop and give the user the exception table.

## 19.3 BLOCKED_*

Use only for a genuine non-converged blocker:

- identity corruption;
- source/license prevents required topology and alternatives not exhausted;
- deterministic generation failure;
- service-pattern parse cannot be made reliable;
- input authority changed unexpectedly.

Do not call a mere dynamic-metric gap BLOCKED if topology is valid.

---

# 20. Required outputs

At minimum:

```text
data/transport/network/
  required-backbone-inventory.json
  transport-lines.jsonl
  service-patterns.jsonl
  transport-node-edges.jsonl
  service-segment-edges.jsonl
  hub-transfer-edges.jsonl
  direct-service-edges.jsonl
  node-downstream-admission.jsonl
  topology-unresolved.jsonl
  dynamic-field-unresolved.jsonl
  source-rights.json
  connectivity-audit.json
  corridor-query-results.json
  adaptive-model-state.json
  adaptive-model-iterations.jsonl
  fixpoint-proofs.jsonl
  final-acceptance-gate.json
  manifest.json
  batches/
  batch-receipts/
```

Documentation:

- `docs/tasks/RESULT-TASK-086-b-transport-node-mobility-backbone.md`
- `docs/qa/TASK-086-B/README.md`
- source/license decision summary
- connectivity report
- adaptive-model report

---

# 21. Final metrics

Result must report:

- base develop SHA;
- branch;
- final commit;
- Draft PR;
- authoritative input hashes/revisions;
- admitted/rejected/HOLD node counts;
- required-backbone node counts by T-level/kind;
- total confirmed directed edges;
- service_segment / hub_transfer / direct_service counts;
- counts by mode/operator;
- accepted service-pattern count;
- T0 connectivity;
- T1 connectivity;
- disconnected required nodes;
- corridor pass/fail;
- airport/ferry/bus/special-mode coverage;
- dynamic metric coverage;
- unresolved distribution;
- fixpoint exception count;
- adaptive iteration count;
- model parameter changes;
- deterministic rebuild;
- batch QA;
- full regression;
- exact-head Quality Gate;
- WBS status.

---

# 22. Tests

At minimum add tests for:

- no N×N generation;
- real service-pattern sequence → directed edges;
- express/local stop patterns remain distinct;
- through-service semantics;
- operator boundary;
- topology survives unresolved duration/fare/frequency;
- same-name hub without official interchange does not create transfer;
- official hub transfer creates topology with unresolved metrics;
- flight route seasonal semantics;
- ferry current/inactive distinction;
- bus route purpose-bounded expansion;
- deterministic node admission;
- deterministic edge IDs;
- duplicate rejection;
- changed-source invalidation;
- batch resume;
- corrupted receipt detection;
- adaptive deficit classification;
- deterministic next-action selection;
- no repeated no-improvement action;
- fixpoint-proof validation;
- required-backbone inventory cannot silently shrink;
- corridor QA is graph-derived, not hardcoded edge insertion;
- full deterministic rebuild.

Run repository-required:

- focused tests;
- full regression;
- lint;
- typecheck;
- formatting;
- production build / artifact verification as required;
- exact-head GitHub Quality Gate.

---

# 23. Git / governance

Start from latest `origin/develop`.

Use only:

`feature/b-transport-node-mobility-backbone`

WBS when actual implementation begins:

`7.16 = 进行中`

After PASS / review-ready:

`7.16 = 待审查`

or:

`7.16 = 待审查（audited fixpoint exceptions）`

Never mark WBS completed before user acceptance/merge.

Create/update Draft PR only.

No merge.
No auto-merge.
Do not modify A's Route runtime/API/Planner public behavior.

---

# 24. Codex final response

Return one of:

- `PASS / READY_FOR_REVIEW`
- `READY_FOR_USER_ACCEPTANCE_WITH_AUDITED_FIXPOINT_EXCEPTIONS`
- a specific `BLOCKED_*`

Never return “basically complete”, “good enough”, or “future expansion recommended” as a substitute for the acceptance gates.

If exceptions remain, return an exact machine-supported table with:

- affected node/corridor;
- mode;
- missing relation;
- source categories searched;
- precise external blocker;
- proof hash;
- what new evidence would invalidate the fixpoint.
