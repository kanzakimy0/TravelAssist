# TASK-041-A — Travel Region Graph Pilot / Reference Dataset

> Issue: #305  
> WBS: **4.48 — Travel Region Graph Pilot / Reference Dataset**  
> Owner: **A — Main Travel System / Planning Engine**  
> Priority: **P0 Pilot**  
> Publication base: `fede48bb2a4916bcc6070be325ec5b450fa6fbd1`

---

## 1. Goal

Build the first evidence-backed Japan Travel Region Graph pilot that can later feed the Candidate Pipeline without depending on the ongoing WBS 7.9 scoring blind review.

This Task validates the P0 Region Graph design as executable data:

```text
real region identities
→ RegionRelation
→ TravelEdge
→ TravelEdgeVariant
→ validation / connectivity / reachability
→ evidence report
→ Draft PR
→ STOP
```

The Task does **not** build live routing, itinerary generation, scoring calibration or Candidate ranking.

---

## 2. Preconditions

Required and already merged to `develop`:

- TASK-036 / WBS 4.47 Planning contracts / validators / fixtures;
- TASK-037 Planning contract soak/fuzz QA;
- `docs/architecture/travel-region-graph-codebook-v0.1.md`;
- `src/shared/contracts/planning/` public Region Graph contract and parser.

TASK-038 / TASK-039 / TASK-040 are **not dependencies**.

Do not read human-review answers or scoring candidate results to construct the graph.

---

## 3. Canonical semantics

The implementation must preserve:

```text
RegionRelation
≠ TravelEdge
≠ TravelEdgeVariant
≠ Live Route Fact
```

### RegionRelation

Stable or relatively stable administrative / spatial / tourism relation.

Allowed P0 relations:

```text
contains
adjacent
overlaps
gateway_of
```

`part_of` is derived and must not become a second independently maintained truth source.

### TravelEdge

Directional Planning prior: whether two regions are sensible consecutive travel areas for itinerary search.

It is **not** a timetable, booking result, live fare or provider route.

### TravelEdgeVariant

A broad mode-specific prior for the same TravelEdge:

```text
rail
bus
car
flight
ferry
mixed
```

Typical duration/range/reliability fields may be present only when supported and must remain broad priors. Exact departure/arrival minutes are forbidden for planning priors.

### Live Route Fact

Out of scope. No current timetable/fare/availability/provider payload is stored in the pilot graph.

---

## 4. Pilot geography

Cover the four P0 corridors from the architecture backlog:

### Corridor A — Tokyo

At minimum represent Tokyo plus useful district / stay-cluster / gateway structure such as evidence-supported examples of:

```text
Tokyo
Shinjuku
Shibuya
Asakusa / Ueno area where appropriate
Tokyo Station / central gateway concept where contract semantics permit
Haneda gateway where appropriate
```

Do not force every example if identity or region semantics do not fit the codebook.

### Corridor B — Hakone / Fuji

At minimum cover evidence-supported region/gateway structure around:

```text
Hakone
Odawara
Fuji / Fuji Five Lakes area
Fujikawaguchiko / Kawaguchiko area
representative gateway / onsen-resort nodes
```

### Corridor C — Alpine / Hokuriku

At minimum cover:

```text
Nagano
Matsumoto
Takayama
Kanazawa
```

Add useful travel regions / gateways such as Kamikochi / Shirakawa-go only when their region semantics and evidence fit the contract.

### Corridor D — Kansai

At minimum cover:

```text
Kyoto
Nara
Osaka
Kobe
```

Add representative district / stay-cluster / gateway nodes where useful and justified.

---

## 5. Region node requirements

Each node must use the existing `TravelRegionGraphV1` contract and contain a stable project region ID plus evidence-backed identity.

Use only codebook-supported region types:

```text
country
macro_area
prefecture
municipality
travel_region
district
stay_cluster
onsen_resort
gateway
```

Requirements:

- stable deterministic IDs;
- no duplicate semantic identities under different IDs without explicit reason;
- evidence/provenance reference per real identity;
- no Master Code renumbering or replacement scheme;
- lifecycle/revision fields valid under the public parser;
- administrative identity and tourism/planning grouping must not be conflated silently.

If a tourism grouping is editorial rather than official administrative geography, mark/provenance it accordingly.

---

## 6. RegionRelation requirements

Create only relations that can be defended by identity/geography/tourism structure.

Mandatory validations:

- no dangling region refs;
- no `contains` cycles;
- no duplicate relation IDs;
- no reverse duplicate for symmetric relations such as `adjacent`;
- no impossible self relation;
- `gateway_of` target semantics must be sensible;
- relation provenance exists where required.

Generate relation diagnostics by type and corridor.

---

## 7. TravelEdge requirements

TravelEdges are directional.

Build representative edges inside and between the four corridors to test realistic planning transitions, including where evidence supports:

```text
Tokyo ↔ Hakone / Fuji
Tokyo ↔ Nagano / Matsumoto
Matsumoto ↔ Takayama
Takayama ↔ Kanazawa
Tokyo ↔ Kyoto / Osaka
Kyoto ↔ Nara / Osaka
Osaka ↔ Kobe
```

Do not interpret the arrows above as requiring symmetric identical priors. Directional variants may differ.

Each edge must:

- reference valid region nodes;
- have a stable ID;
- represent itinerary-search usefulness rather than adjacency alone;
- distinguish direct corridor preference from live route truth;
- carry evidence/provenance or an explicit pilot-editorial planning-prior marker;
- avoid exact timetable/booking/fare claims.

---

## 8. TravelEdgeVariant requirements

For representative TravelEdges, include multiple mode variants where justified.

Target at least several examples covering multiple modes across the pilot, rather than every mode on every edge.

Validate:

- variant IDs unique within edge;
- mode enum valid;
- range ordering valid (`low <= typical <= high`) where a range exists;
- no NaN / Infinity / negative duration;
- planning-prior source cannot contain exact departure/arrival minutes;
- unsupported fare/reliability/transfer detail remains absent/unknown;
- provider raw payload is never stored.

---

## 9. Pilot scale

Use a sparse, reviewable graph.

Suggested observational target:

```text
30–60 region nodes
40–120 RegionRelations
40–100 directional TravelEdges
multiple TravelEdgeVariants on representative edges
```

These are **Pilot targets, not production constants**.

If the evidence-backed graph is smaller, return `Partial` rather than fabricating nodes/edges to reach a number.

Do not create a dense all-to-all graph.

---

## 10. Required diagnostics

Produce deterministic QA covering at least:

### Structural

- node count by region type;
- relation count by type;
- edge count and variant count by mode;
- unique IDs;
- dangling ref count;
- self-loop count;
- contains-cycle count;
- symmetric duplicate count;
- invalid range count.

### Coverage

- each of the four pilot corridors has required core anchors;
- representative gateway/stay-cluster/onsen-resort coverage where evidence permits;
- connectivity within each corridor;
- cross-corridor TravelEdge coverage.

### Reachability

Use a provider-free graph traversal to verify at least representative planning paths such as:

```text
Tokyo → Hakone
Tokyo → Matsumoto → Takayama → Kanazawa
Kyoto → Nara → Osaka → Kobe
Tokyo → Kyoto / Osaka
```

This is graph reachability only, not real-time route validation.

### Semantic negative tests

Must fail closed on fixtures for:

```text
dangling node ref
contains cycle
reverse symmetric duplicate
invalid range ordering
duplicate IDs
unknown enum
planning-prior exact timetable fields
```

Reuse public Planning parsers; do not create a parallel validator.

---

## 11. Data sources and provenance

Prefer:

1. existing resolved Japan destination material already in the repository;
2. existing repository source catalog/evidence;
3. stable open identity sources when repository evidence is insufficient.

Rules:

- no paid API;
- no LLM as a factual authority;
- no prohibited scraping;
- no production provider query;
- no fabricated precision;
- broad planning priors must be labeled as such;
- if a relation or variant cannot be supported, omit it and report the gap.

---

## 12. Suggested implementation files

Keep implementation isolated, for example:

```text
tools/qa/region-graph-pilot.mjs
tests/task-041-region-graph-pilot.test.mjs

docs/qa/TASK-041/region-nodes.json
docs/qa/TASK-041/region-relations.json
docs/qa/TASK-041/travel-edges.json
docs/qa/TASK-041/graph-validation.json
docs/qa/TASK-041/corridor-reachability.json
docs/qa/TASK-041/evidence-index.json
docs/qa/TASK-041/pilot-report.md

docs/tasks/RESULT-TASK-041-a-region-graph-pilot.md
```

The exact file split may differ if the repository conventions strongly prefer another layout.

Do not introduce a production DB schema or migration in this Task.

---

## 13. Acceptance criteria

TASK-041 is acceptable only when:

- [ ] implementation branch starts from execution-time latest `origin/develop`;
- [ ] all four pilot corridors are represented;
- [ ] core named regions are present or a precise evidence/semantic reason is documented;
- [ ] graph uses the existing public Region Graph contract/parser;
- [ ] RegionRelation / TravelEdge / TravelEdgeVariant semantics remain distinct;
- [ ] no Live Route Fact masquerades as a planning prior;
- [ ] no exact timetable claim exists in planning-prior variants;
- [ ] all committed graph data parses successfully;
- [ ] dangling refs = 0;
- [ ] contains cycles = 0;
- [ ] invalid symmetric duplicates = 0;
- [ ] invalid ranges = 0;
- [ ] representative reachability tests pass;
- [ ] provenance/evidence coverage is reported;
- [ ] unsupported facts are omitted/unknown rather than invented;
- [ ] no Master Code renumbering;
- [ ] no scoring parameter / Human Gold / candidate logic change;
- [ ] focused TASK-041 tests pass;
- [ ] Planning contract + soak regressions pass;
- [ ] routing / Trip / Route / Engine contract regressions pass;
- [ ] full Node regression is run and exact result reported;
- [ ] lint/typecheck/build pass;
- [ ] TASK-owned formatting and `git diff --check` pass;
- [ ] WBS and Result are synchronized;
- [ ] Draft PR only; no auto-merge.

---

## 14. Explicitly out of scope

Do not:

```text
- modify TASK-038/039/040 human-review data
- read reviewer answers
- accept/freeze candidate-0457
- retune POI scoring
- build Candidate Pipeline ranking/runtime
- call live routing/timetable/fare APIs
- query booking/weather/inventory providers
- store Provider Raw
- implement Planner UI
- create DB migrations
- mutate production DB
- freeze final Japan Region count or graph density
- renumber Master Codes
- auto-merge any PR
- start TASK-042 automatically
```

---

## 15. WBS tracking

Introduce:

```md
| 4.48 | Travel Region Graph Pilot / Reference Dataset | A | P0 | 4.47 | 进行中 / 待审查 / 已完成按阶段更新 |
```

Status rules:

```text
implementation start → 进行中
completed implementation + Draft PR → 待审查
evidence blocker → Partial / 阻塞 with exact gap
merged + user acceptance → 已完成
```

TASK-041 must not change WBS 7.9 human blind-review status.

---

## 16. Required Result

Create:

```text
docs/tasks/RESULT-TASK-041-a-region-graph-pilot.md
```

Include:

```text
Status
Base SHA
Issue
Branch
Commits
Draft PR
Files changed
Data source summary
Node counts by type
Relation counts by type
TravelEdge / Variant counts
Mode coverage
Four-corridor coverage
Gateway / Stay Cluster / Onsen coverage
Evidence coverage / unknown gaps
Structural validation
Reachability results
Semantic negative tests
No-live-route confirmation
Master Code unchanged confirmation
Focused tests
Planning / Routing / Trip-Route-Engine tests
Full Node regression
lint/typecheck/build
format/diff status
WBS update
Recommended next action
```

Measured evidence and assumptions must be clearly separated.

---

## 17. Completion boundary

TASK-041 validates that a sparse Travel Region Graph can be represented and consumed safely.

It does **not** prove:

```text
production graph completeness
live route correctness
provider licensing
final edge density
candidate ranking quality
scoring calibration quality
AI quality
```

After Result + Draft PR, STOP. Do not automatically start Candidate Pipeline.