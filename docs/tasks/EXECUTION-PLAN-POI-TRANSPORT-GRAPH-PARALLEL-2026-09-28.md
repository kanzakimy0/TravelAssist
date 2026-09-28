# POI / Transport Graph Parallel Execution Plan — 2026-09-28

## Current state

- PR #445: retained in develop as TASK-082-A partial foundation; not user acceptance.
- WBS 7.13: Blocked.
- PR #446: governance fix merged into develop at `511508c9a59c3b94c7d72cedbf5ff559da69ded8`.
- PR #444: Draft/Open; old Quality Gate passed, but branch is diverged from current develop and must refresh before acceptance.
- B transport issues: #441 / #442 / #443.

## Parallel lanes

### Lane A

1. Refresh PR #444 against latest develop.
2. Revalidate TASK-083-A.
3. User accepts and merges #444.
4. Resume TASK-082-A Phase A.
5. Run real 100/500 Canonical POI local-edge Pilot.
6. Keep route modes unresolved when rights are not established.
7. Later integrate accepted B transport artifacts.

### Lane B

1. Start TASK-084-B immediately.
2. Build national T0/T1/T2 TransportNode backbone.
3. After 084 acceptance:
   - TASK-086-B may start immediately.
   - TASK-085-B starts once Canonical POIs are merged.
4. Produce Draft PRs only; no automatic merge.

## Non-blocking matrix

| Work | Needs #444 merged? | Needs 084 PASS? | Can start now? |
|---|---:|---:|---:|
| Refresh #444 | No | No | Yes |
| TASK-084-B TransportNode | No | No | Yes |
| TASK-082-A real POI→POI Phase A | Yes | No | No |
| TASK-086-B Node→Node | No | Yes | No |
| TASK-085-B POI↔Node | Yes | Yes | No |
| TASK-082-A final transport integration | Yes | Yes + B outputs | No |

## First convergence point

After #444 merge and 084 PASS:

```text
A: 100 Canonical POIs → POI local graph
B: accepted TransportNode Master
```

At that point:

- B can run 085 and 086 in parallel if capacity allows.
- A does not need to wait for 085/086 to validate local POI topology.
- Final WBS 7.13 completion waits for transport integration review.

## Safety rules

- No N×N graph.
- No candidate-only POI promotion.
- No fake resolution rates.
- No Provider persistence beyond rights.
- No duplicate runtime contract.
- Draft PR only.
- Exact-head Quality Gate before review.
- Explicit user authorization before merge.
