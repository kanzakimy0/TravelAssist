# AMENDMENT — TASK-082-A Parallel Local Edge / Transport Integration v1

Date: 2026-09-28  
Parent Task: TASK-082-A / Issue #439 / WBS 7.13  
Status at amendment: PARTIAL / BLOCKED  
Current develop baseline when amendment was written: `511508c9a59c3b94c7d72cedbf5ff559da69ded8`

## 1. Why this amendment exists

TASK-082-A already delivered the fail-closed POI mobility edge foundation, but the real Pilot was blocked because develop had zero admitted Canonical POIs and no accepted real TransportNode inventory.

The project now separates the remaining work into two independently executable phases so A and B do not wait on each other unnecessarily.

## 2. Frozen ownership

### A owns

- POI→POI local mobility contract and candidate generation
- Planner read-only integration boundary
- Route runtime / Provider adapter / production integration
- final integration acceptance of B-produced transport data

### B owns

- offline TransportNode master production
- POI↔TransportNode access-edge data production
- TransportNode↔TransportNode static / quasi-static mobility backbone production
- batch execution, provenance, deterministic rebuild, QA artifacts

B must reuse A's accepted runtime contract where available and must not create a second Planner / Route runtime contract.

## 3. Phase A — Real Canonical POI local-edge Pilot

### Gate

Phase A starts only after TASK-083-A / PR #444:

1. is synchronized with the latest develop;
2. passes full local regression on the refreshed head;
3. passes an exact-head Quality Gate;
4. receives user acceptance;
5. is merged into develop.

### Pilot size

The first real run uses the admitted Canonical inventory available at that time.

Expected first run after #444:

```text
Pilot target: 500
Legal admitted Canonical POIs: 100
Run: 100
Shortfall: 400
```

Do not invent or promote candidate-only rows to fill the target.

### Phase A outputs

Run the real POI→POI bounded candidate graph and report:

- real Pilot POI count
- shortfall
- directed candidate edge count
- mean / median / min / max outgoing degree
- distance distribution
- nearby / same_area / same_city / regional classification counts
- rejected nodes / edges
- symmetric pair coverage
- deterministic replay result
- route-mode unresolved distribution

Walking / driving / transit / taxi may remain unresolved when licensed batch/cache/retention/production rights are not established.

### Phase A completion state

Passing the local POI graph Pilot does **not** by itself complete WBS 7.13.

After Phase A:

```text
7.13 = PARTIAL / TRANSPORT_INTEGRATION_PENDING
```

unless the TransportNode integration gates below are also satisfied.

## 4. Phase B — Transport integration

Phase B begins after TASK-084-B has an accepted TransportNode Master.

B data tasks:

- TASK-084-B / WBS 7.14 — Japan TransportNode Master
- TASK-085-B / WBS 7.15 — POI↔TransportNode Access Edge
- TASK-086-B / WBS 7.16 — TransportNode↔TransportNode Mobility Backbone

A then performs an integration refresh against those accepted artifacts.

Integration must verify:

- B TransportNode IDs map cleanly into the A graph contract
- no duplicate runtime contract exists
- POI→TransportNode and TransportNode→POI remain directed
- TransportNode network edges remain transport-to-transport
- no nationwide POI all-pairs graph was introduced
- unresolved dynamic fields stay unresolved
- source / freshness / rights metadata survives ingestion
- Planner repository remains fail-closed when required data is absent

## 5. Parallel execution dependency graph

```text
                         TASK-083-A / PR #444
                                │
                 sync latest develop + revalidate
                                │
                                ▼
                         user acceptance
                                │
                                ▼
                     100 Canonical POIs merged
                                │
                                ▼
                     TASK-082-A Phase A
                    real POI ↔ POI Pilot
                                │
                                │
                                │
TASK-084-B ─────────────────────┘
TransportNode Master
     │
     ├──────────────► TASK-086-B
     │                Node ↔ Node backbone
     │
     └── + Canonical POIs ─────► TASK-085-B
                                  POI ↔ Node access

TASK-084/085/086 accepted
             │
             ▼
TASK-082-A Phase B integration refresh
             │
             ▼
WBS 7.13 final acceptance review
```

## 6. TASK-084-B independence rule

TASK-084-B must **not** be blocked merely because #444 has not merged.

084 may build and accept the national TransportNode backbone from authoritative transport sources without Canonical POI membership.

The POI-driven node expansion subsection is optional/deferred until admitted POIs exist.

Initial 084 acceptance should be based on:

- T0/T1 backbone coverage
- required T2 interchange nodes
- stable IDs
- hub/component relationships
- provenance
- national corridor / prefecture coverage
- deterministic rebuild

A later POI-driven expansion can add T3/local gateway nodes without invalidating the accepted backbone.

## 7. TASK-085-B gate

TASK-085-B requires both:

```text
TASK-084-B accepted
AND
Canonical POIs admitted into develop
```

For the first run after #444, process the legally admitted 100 POIs. Do not wait for 500.

## 8. TASK-086-B gate

TASK-086-B requires:

```text
TASK-084-B accepted
AND
Route Schema 7.5 available
```

It does not require #444.

086 can therefore run while A runs the 100-POI local graph Pilot.

## 9. TASK-083-A / PR #444 refresh gate

Current PR #444 metadata at amendment time:

- Draft / Open / mergeable
- old exact head: `21713eabfeb2e8507b30ed39bb84b5013bc9e199`
- old exact-head Quality Gate #475: SUCCESS
- original base: `ef388cdcd0ff5f15ebd404337b4ed29fb3435058`
- current develop: `511508c9a59c3b94c7d72cedbf5ff559da69ded8`
- branch is diverged from current develop

The old Quality Gate is historical evidence only and is **not** sufficient for current merge acceptance.

Before user acceptance:

1. merge latest `origin/develop` normally into the PR branch;
2. preserve #445 POI edge foundation and #446 governance repair;
3. resolve conflicts without dropping either side;
4. rerun TASK-083 QA and all relevant POI / Planner / governance regression;
5. rerun full repository tests, lint, typecheck, build, deployment artifact checks;
6. obtain a new exact-head Quality Gate SUCCESS;
7. keep PR Draft until user acceptance.

## 10. Provider boundary

Provider rights remain independent from the static graph topology work.

If batch/cache/retention/production or derivative persistence rights are unconfirmed:

- do not make prohibited bulk requests
- do not save raw Provider payloads
- keep route modes unresolved
- permit topology / geodesic candidate generation only where legal
- record the exact blocker

## 11. WBS state rule

### Current

```text
7.13 = 阻塞
```

### After #444 merge and Phase A starts

```text
7.13 = 进行中
```

### After successful real local Pilot but before transport integration

```text
7.13 = 待审查（Local Pilot PASS / Transport integration pending）
```

or an equivalent explicit partial-review status; do not mark complete.

### Final

Only after accepted transport integration and user acceptance:

```text
7.13 = 已完成
```

## 12. Git governance

The repository governance repair merged via PR #446.

For all subsequent `feature/**` pushes:

- auto-created PR must be Draft
- no workflow may auto-merge
- exact-head Quality Gate is required for review
- merge still requires explicit user authorization

Do not treat Draft→Ready as merge authorization.
