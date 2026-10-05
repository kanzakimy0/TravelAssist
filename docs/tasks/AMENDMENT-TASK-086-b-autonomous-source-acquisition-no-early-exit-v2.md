# AMENDMENT — TASK-086-B Autonomous Source Acquisition / No-Early-Exit v2

Date: 2026-10-01
Parent Task: TASK-086-B / Issue #443 / WBS 7.16
Existing Draft PR: #466
Current checkpoint head: 1236238c89e83088e0454d16c6eb86050e8f935c
Owner: B

## 1. Why this amendment exists

The first TASK-086 adaptive run returned:

`BLOCKED_NATIONAL_SOURCE_IDENTITY_COVERAGE`

while its own machine state simultaneously reported:

- `ordinaryDiscoveryRemaining=true`
- `globalTopologyDiscoveryFixpoint=NOT_PROVEN`
- `validatedExceptionCount=0`
- T0 connected = 0/89
- T1 connected = 0/462
- required nodes connected = 0/1038
- mandatory national corridors = 0/9

This is an **early exit**, not a valid final blocker.

The user's requirement is explicit: when ordinary source discovery, identity review, component review or alternative-source work remains, Codex must continue solving the problem rather than return a result to the user.

Therefore this amendment changes the execution boundary:

> Source acquisition, source-rights review, identity review, component admission, service-pattern extraction and targeted external research are part of TASK-086 execution. They are not manual work outside the runner.

## 2. Superseding stop rule

The following combination is now illegal as a final response:

```text
ordinaryDiscoveryRemaining = true
OR
globalTopologyDiscoveryFixpoint != PROVEN
OR
validatedExceptionCount = 0 while unresolved topology remains
```

If any of those conditions hold, TASK-086 remains **IN_PROGRESS_AUTO_REMEDIATION** and Codex must continue.

Codex must NOT publish a new final Result/stop merely because the currently staged local source packages are exhausted.

"Available licensed local packages exhausted" is a trigger to acquire/review additional sources, not a stop condition.

## 3. Continue same branch / PR; preserve work

Continue:

- Branch: `feature/b-transport-node-mobility-backbone`
- Draft PR: #466

Preserve and revalidate the current checkpoint:

- required inventory: 1,038
- current 327 ADMIT / 711 HOLD
- current 9 lines / 63 service patterns
- current 1,339 directed edges
- 88 batch receipts
- adaptive model history
- current source packages and hashes

Do not restart from zero.

The existing bus/ferry graph is a valid partial backbone and must remain unless evidence invalidates it.

## 4. Autonomous external source acquisition is mandatory

Codex must actively execute every open `next-source-actions.jsonl` action.

The current actions are not documentation-only.

For each action:

1. search official operator / government / municipal / open-data sources;
2. locate source terms / license / usage policy;
3. determine whether TravelAssist may persist:
   - raw source;
   - derived static facts;
   - topology-only factual extraction;
   - attribution-only references;
4. choose the least-restrictive legally supportable representation;
5. acquire/retain only what the rights decision permits;
6. hash retained inputs or hash reviewed evidence pages where appropriate;
7. extract node/service/topology facts;
8. independently admit identities;
9. regenerate only the affected graph scope;
10. replay all national gates.

Do not turn a missing downloadable dataset into a blocker if the required **static factual topology** can be established from official route maps, station lists, service/stopping-pattern pages or other permitted official evidence without copying restricted expressive content.

Do not provide legal conclusions beyond the repository's conservative source-rights decision. If rights are ambiguous, search for another source before declaring a blocker.

## 5. Mandatory source-discovery matrix

For national deficits, the autonomous pass must cover source categories relevant to each mode.

### Rail / Shinkansen

At minimum investigate, where relevant:

- JR Hokkaido
- JR East
- JR Central
- JR West
- JR Shikoku
- JR Kyushu
- major private railway operators
- Tokyo/Osaka/other major metro operators
- MLIT / prefectural / municipal licensed datasets
- GTFS/open-data repositories with dataset-specific rights
- official static route maps / line station lists / service stopping-pattern evidence

Do not require one single nationwide source if multiple operator-specific lawful sources can build the backbone.

### Bus

Search by deficit, not nationally indiscriminate ingestion:

- airport bus
- highway/intercity bus
- critical tourism corridor bus
- required gateway connectors
- licensed regional GTFS/open data

### Ferry

Search:

- public ferry operators
- municipal/prefectural open data
- island access operators
- tourism-critical passenger ferries

### Flight

For topology only, review official airport/airline route-network evidence and rights.

Do not require persisted live timetable data to confirm that an airport-airport service relationship exists.

### Special tourism transport

Review official ropeway/cable/funicular/operator route evidence only when required by inventory/connectivity deficits.

## 6. Source-rights decision hierarchy

For each source, choose one of:

- `RAW_PERSISTENCE_ALLOWED`
- `DERIVED_STATIC_FACTS_ALLOWED`
- `TOPOLOGY_FACT_ONLY_ALLOWED`
- `REFERENCE_ONLY_DISCOVERY`
- `LICENSE_BLOCKED`

A source does not need raw-payload persistence permission to be useful.

If official material lawfully supports factual topology but raw page/data retention is not appropriate, store:

- source URL
- observed date
- source/content fingerprint where available
- reviewed factual statement
- extraction/admission decision
- attribution/terms note

Do not copy large copyrighted tables/pages.

## 7. Identity review is execution work, not a stop reason

The 711 HOLD records and 218 hub scopes must be processed adaptively.

Codex must:

- prioritize T0 before T1 before T2/T3;
- prioritize nodes needed by failed mandatory corridors;
- prioritize components referenced by newly acquired service patterns;
- resolve duplicate/same-name/operator-component questions;
- create deterministic task-local IDs when evidence supports them;
- preserve HOLD when identity cannot be established;
- search better evidence when identity remains ambiguous.

A large HOLD count is not itself a valid final blocker while ordinary identity review remains.

## 8. National rail must be attacked first

Current graph is overwhelmingly Nagasaki bus (1,303/1,339 edges) with zero rail/Shinkansen backbone.

The next adaptive phase must not spend another iteration primarily expanding already-dominant Nagasaki bus topology unless it repairs a higher-priority hard deficit.

Until meaningful national rail/Shinkansen connectivity exists, next-action selection must prefer:

1. Shinkansen source/service-pattern coverage;
2. JR conventional rail backbone;
3. major private/metro hub connectivity;
4. hub transfers required to join those systems;
5. airport-surface structural links;
6. ferry/island gaps;
7. bus/special gaps.

This priority is required because current bus-heavy local improvement does not repair T0/T1 national connectivity.

## 9. Anti-stall / no-noop rule

A new iteration is invalid if it:

- repeats the same source/action strategy after no hard-gate improvement;
- only changes numeric parameters without acquiring new evidence;
- adds edges exclusively inside an already-connected local component while national T0/T1 remain unchanged, unless those edges are prerequisites for the next national connection;
- produces a new Result without reducing ordinary discovery or proving a fixpoint.

After two consecutive iterations with zero improvement on all hard topology gates:

1. freeze that strategy;
2. select a different source category/operator/mode;
3. perform external source discovery;
4. or produce a valid fixpoint proof for that specific deficit.

## 10. No arbitrary iteration limit

Do not stop because 10, 20, or any fixed number of iterations was reached.

Iteration count is diagnostic, not a budget.

Continue until convergence outcome is valid.

## 11. Valid final outcomes

### A. PASS / READY_FOR_REVIEW

All hard topology gates PASS.

### B. READY_FOR_USER_ACCEPTANCE_WITH_AUDITED_FIXPOINT_EXCEPTIONS

Allowed only when:

- `ordinaryDiscoveryRemaining=false`
- `globalTopologyDiscoveryFixpoint=PROVEN`
- every remaining failed topology item has a validated fixpoint proof
- no normal source/identity/component review remains
- national backbone is substantially complete except enumerated exceptions

### C. BLOCKED_EXTERNAL_APPROVAL_REQUIRED

Allowed only if:

- the missing topology requires a specific external permission/approval that Codex cannot grant;
- all reasonable lawful alternative sources have been searched and documented;
- the exact missing nodes/corridors/services are listed;
- fixpoint proof exists;
- ordinary discovery is false.

### D. Other BLOCKED_*

Only for true deterministic/schema/integrity corruption that cannot be repaired in scope.

The current `BLOCKED_NATIONAL_SOURCE_IDENTITY_COVERAGE` checkpoint is **not a valid terminal state** because ordinary discovery remains and fixpoint is not proven.

## 12. Machine gate enforcing no early exit

Update `final-acceptance-gate.json` and tests so that a terminal status is invalid when:

```text
ordinaryDiscoveryRemaining == true
|| globalTopologyDiscoveryFixpoint != "PROVEN"
```

unless all hard topology gates already PASS.

The generator/runner should return an in-progress status such as:

`IN_PROGRESS_AUTO_REMEDIATION`

and continue the execution loop.

A CLI exit/result intended as final delivery must fail tests if it tries to emit BLOCKED while ordinary discovery remains.

## 13. next-source-actions must become executable work queue

Change `next-source-actions.jsonl` semantics.

Replace:

`automaticNetworkExecution:false`

with execution states such as:

- PENDING_RESEARCH
- RESEARCHING
- SOURCE_FOUND
- RIGHTS_REVIEWED
- INGESTED
- NO_SOURCE_FOUND
- EXTERNAL_APPROVAL_REQUIRED
- SUPERSEDED_BY_ALTERNATIVE

Every open action must have:

- attempts
- sources checked
- rights findings
- extracted facts
- affected deficits
- result
- next action

No open PENDING/RESEARCHING action may coexist with a terminal TASK-086 Result.

## 14. Required next phase from current checkpoint

Starting from head `1236238c89e83088e0454d16c6eb86050e8f935c`:

### Phase R1 — national rail / Shinkansen

Goal:
- admit meaningful T0/T1 rail nodes;
- produce real national rail/Shinkansen service patterns;
- reduce T0/T1 disconnected counts;
- make Tokyo↔Kyoto/Osaka and Fukuoka↔Kumamoto graph queries progress.

Do not accept "official timetable redistribution unclear" as an immediate stop. Search official/static/open alternatives and topology-fact-only representations.

### Phase R2 — hub transfers / metro / private rail

Use actual corridor deficits to prioritize 218 held hub scopes.

### Phase R3 — airport / ferry / island

Connect national multimodal components.

### Phase R4 — missing critical bus / tourism special

Only after higher-impact national deficits are addressed.

After every phase, replay full graph and choose the next deficit-driven action.

## 15. Do not wait for user between ordinary iterations

The user has already authorized autonomous remediation.

Do not stop to ask the user:

- which source to try next;
- whether to continue discovery;
- whether to review the next operator;
- whether to run another adaptive iteration.

Make the best evidence-based choice and continue.

Only return to the user when a valid final outcome in section 11 is reached.

## 16. Git governance

Continue the same branch and Draft PR #466.

Do not merge.
Do not auto-merge.
Do not mark WBS 7.16 completed.

Keep WBS 7.16 = 进行中 until a valid review-ready terminal outcome is reached.

## 17. Final report after true convergence

In addition to existing metrics, report:

- how many external source actions were executed;
- sources/operators reviewed by mode;
- rights-decision distribution;
- HOLD→ADMIT identity conversions;
- T0/T1 improvement by iteration;
- mandatory corridor improvement by iteration;
- ordinaryDiscoveryRemaining final value;
- globalTopologyDiscoveryFixpoint final value;
- validated fixpoint proofs;
- any external approval explicitly required.

A final report is invalid if it still says ordinary discovery remains.
