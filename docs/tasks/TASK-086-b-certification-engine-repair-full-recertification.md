# TASK-086-B REPAIR — Certification Engine Scope Repair + Full Quarantine Re-certification + National Connectivity Re-evaluation

## Authority

User directive: 2026-10-06.

This is a **repair amendment inside the existing TASK-086-B / WBS 7.16**, not a new WBS task.

Repository: `kanzakimy0/TravelAssist`  
Branch: `feature/b-transport-node-mobility-backbone`  
Existing PR: #466  
Issue: #443  
Owner: B

This amendment has higher authority than earlier TASK-086 closeout instructions wherever they conflict about certification behavior, evidence dependency scope, or whether existing quarantined entities must be re-evaluated.

The user requires:

> Do not assume the current quarantine is correct. Repair the certification engine first, then re-certify **all currently quarantined nodes, edges and transfers**. Determine whether national corridors are actually unavailable or were made unavailable by certification logic. Only items that remain genuinely unverified after the repaired, fact-scoped certification process may remain route-disabled/readmittable.

Do not create TASK-087, a second implementation branch, or a second PR.

---

# 1. Why this repair is required

The existing final-closeout implementation can create large false-negative cascades.

At commit `21d83d853a1e04c256beddf64e5740f2b3a5d226`, inspect the current/latest equivalents of the following behaviors before editing:

## 1.1 Global license-string certification conflicts with existing fact-only rights semantics

In `tools/transport/task-086-final-closeout.mjs`, `classifySource()` determines `explicit` via a fixed license-string regex and adds:

`NO_EXPLICIT_RIGHTS_BASIS_FOR_PERSISTENCE_DERIVATION_AND_RUNTIME`

when the string does not match.

However, `tools/transport/task-086-model.mjs::sourceAllowed()` already has structured semantics for:

- `DERIVED_STATIC_FACTS_ALLOWED`
- `TOPOLOGY_FACT_ONLY_ALLOWED`
- reviewed `MINIMAL_NONEXPRESSIVE_TOPOLOGY_FACTS`
- raw-payload-not-retained constraints
- derived-data / redistribution decisions

A source/fact path that is permitted by the repository's existing structured fact-only policy must not be rejected merely because `license` is empty or does not match the raw-persistence license regex.

**Do not invent a new legal rule.** Reuse and make the final certification engine consistent with the repository's already-reviewed rights model.

Public availability alone is not an open license.

## 1.2 Node certification currently aggregates all recursive evidence dependencies

Current code builds:

`nodeDeps = sourceDeps(n.evidenceRefs)`

and then quarantines a node when **any** recursively discovered source dependency is not globally `CERTIFIED`.

This can incorrectly make a non-essential station-map, corroboration, metric, auxiliary, or unrelated nested source fatal to the complete station identity.

Station identity, current service, line service, transfer, walking access and metric evidence are different facts and must not share one all-or-nothing source gate.

## 1.3 Edge certification has the same over-broad dependency problem

Current code unions:

- `edge.topologyEvidenceRefs`
- full `servicePattern.evidenceRefs`
- `accessContract.sourceEvidenceRefs`

into one dependency set and quarantines the edge if **any** dependency source is not globally certified.

This must be replaced with fact-scoped required evidence.

## 1.4 One uncertified calling node can quarantine an entire service pattern

Current service-segment logic includes behavior equivalent to:

`pattern.callingNodes.some(c => !certifiedNodeIds.has(c.nodeId)) -> UNCERTIFIED_PATTERN_CALLING_NODE`

This can quarantine an otherwise valid segment because a remote station elsewhere in the same pattern is not certified.

For an edge A→B, only evidence actually required to prove:

- A identity,
- B identity,
- ordered service/direction for A→B,
- boarding/alighting constraints for that segment,
- any through-service boundary actually crossed by that segment,

may be fatal.

A remote unresolved calling node not used by that segment must not automatically disable A→B.

## 1.5 Certified projection can reintroduce the same over-broad requirement

Audit `collectEvidence()`, `certifiedPatterns`, and every call to `verifyEvidence()` / `sourceAllowed()`.

The final route-enabled projection must require only evidence necessary for the enabled fact. It must not fail because a pattern or station object contains unrelated auxiliary evidence.

---

# 2. Mandatory first step — reproduce the false-negative before changing code

Before modifying certification code, create a focused regression fixture/report that proves the current failure mode.

At minimum include:

1. 東京 station identity.
2. 上野 station identity.
3. 東京→上野.
4. 上野→東京.
5. One JR East source family/group currently failing only the final usage-basis / license-string gate while its retained fact/snapshot integrity otherwise passes.
6. A case where one auxiliary/non-essential source is non-certified but an independent required identity fact is valid.
7. A service pattern where one remote calling node is quarantined and an unrelated local segment should remain certifiable.

Do not hard-code Tokyo/Ueno as a production exception.

The regression must fail under the old logic and pass only because the engine semantics are repaired.

---

# 3. Source certification must become capability-scoped, not one global boolean

Do not use a single global `sourceStatus === CERTIFIED` as the only admissibility decision for all facts.

Introduce or reuse a structured capability result equivalent to:

- `rawPersistence`
- `rawRedistribution`
- `identityFact`
- `serviceTopologyFact`
- `directionBoardingFact`
- `transferFact`
- `walkingAccessFact`
- `metricFact`
- `runtimeDerivedFact`

Exact names may follow existing repository conventions.

A source can be valid for one minimal derived/topology fact while not being valid for raw-byte persistence or for unrelated metrics.

### Hard rule

A capability may become allowed only when the existing repository rights/evidence policy supports that exact use.

Do not infer:

`public webpage = unrestricted license`.

If an official page is used only to verify a minimal factual statement and the existing rights policy allows a reviewed fact-only derivation without retaining raw expressive content, record:

- source URL,
- observedAt,
- response/content hash when available,
- locator,
- exact minimal fact record,
- structured review/rights decision,
- raw retention = false where required.

Do not commit raw HTML/screenshots or large source payloads when rights do not allow repository retention.

---

# 4. Fact-scoped dependency model

For each node/edge/transfer, classify evidence dependencies by **role**.

Reuse existing fields where possible. If current schemas cannot express role cleanly, add the smallest deterministic sidecar or schema extension.

Required semantic roles:

- `REQUIRED_IDENTITY`
- `REQUIRED_SERVICE_TOPOLOGY`
- `REQUIRED_DIRECTION_BOARDING`
- `REQUIRED_TRANSFER`
- `REQUIRED_WALKING_ACCESS`
- `CORROBORATING`
- `AUXILIARY`
- `METRIC_ONLY`
- `RAW_ARCHIVE_ONLY`

Equivalent names are acceptable.

## 4.1 Node eligibility

A node is route-eligible when its **required identity facts** pass.

A failed:

- station map,
- amenity page,
- auxiliary source,
- metric source,
- optional corroboration,

must not disable the station identity when an independent valid identity evidence path exists.

## 4.2 Service edge eligibility

A service segment A→B is eligible when:

- A required identity passes;
- B required identity passes;
- required ordered-service evidence for A→B passes;
- direction passes;
- pickup/dropoff / boarding-alighting rules for A→B pass;
- any operator-boundary evidence actually crossed by A→B passes.

Do not require every other station in the full service pattern to be certified.

Do not require unrelated auxiliary pattern evidence.

## 4.3 Transfer eligibility

A transfer is eligible only when:

- both endpoints are valid;
- the physical/interchange relationship is specifically proven;
- directionality and conditional access are preserved;
- walking/transfer time remains unknown if it is not reliably evidenced.

Do not merge stations merely because names or coordinates are close.

## 4.4 Metrics

A metric evidence failure must degrade that metric to `unknown/unresolved` unless the metric is structurally required for the edge itself.

It must not automatically delete otherwise proven topology.

---

# 5. Audit every use of sourceAllowed / verifyEvidence / sourceStatus

Search all TASK-086 code for:

- `sourceAllowed(`
- `verifyEvidence(`
- `sourceStatus`
- `certifiedSources`
- `UNCERTIFIED_IDENTITY_SOURCE_DEPENDENCY`
- `UNCERTIFIED_EDGE_SOURCE_DEPENDENCY`
- `UNCERTIFIED_PATTERN_CALLING_NODE`

For each use, document whether it is:

- still correct,
- changed to a capability/fact-scoped check,
- removed because it was an over-broad cascade.

Do not simply bypass verification.

Add negative tests proving essential evidence still blocks the exact dependent fact.

---

# 6. Tokyo ↔ Ueno mandatory repair acceptance

Use current authoritative JR East evidence and existing retained TASK-086 evidence to verify the actual service facts.

Authoritative starting points include the current JR East timetable/station pages:

- Tokyo timetable: https://timetables.jreast.co.jp/en/timetable/list1039.html
- Ueno timetable: https://timetables.jreast.co.jp/en/timetable/list0204.html
- Tokyo station: https://www.jreast.co.jp/estation/stations/1039.html
- Ueno station: https://www.jreast.co.jp/estation/stations/204.html

Do not copy the full webpages into the repository unless allowed. Persist only the reviewed minimal fact/evidence receipts required by repository policy.

## Required acceptance

After repair:

1. 東京 station identity must not be quarantined solely because an unrelated JR East/JR Central map or auxiliary source lacks the raw-persistence license-string form.
2. 上野 station identity must satisfy the same fact-scoped rule.
3. There must be at least one legal certified passenger path 東京→上野 using actual line/service semantics.
4. There must be at least one legal certified passenger path 上野→東京.
5. If the data contains an actual direct Ueno-Tokyo Line service segment in a reviewed pattern, that segment must not be quarantined because of an unrelated pattern calling node.
6. Yamanote / Keihin-Tohoku / Ueno-Tokyo / Shinkansen facts must not be conflated. Report exactly which certified service path(s) satisfy the acceptance.
7. Joban Line through-running must only be represented for actual reviewed Ueno-Tokyo through services; do not assume every Joban service continues through Tokyo.
8. Preserve pickup/dropoff and direction restrictions.

If Tokyo↔Ueno still fails after the engine repair, return the exact remaining fact-scoped blockers. A generic “source dependency uncertified” result is not acceptable.

---

# 7. Tokyo ↔ Otemachi identity/transfer acceptance

東京 and 大手町 remain distinct physical/canonical stations.

Do not zero-time merge them.

A walking/interchange relation may be enabled only with reviewed evidence for the actual connection.

If a reliable walking duration is unavailable:

- keep the topology only if the connection itself is proven;
- leave duration unknown;
- do not invent zero minutes.

Add a regression proving a failed auxiliary source does not collapse or incorrectly disable either station identity.

---

# 8. Full re-certification — every quarantined entity must be re-evaluated

The previous closeout recorded approximately:

- 2,887 quarantined nodes
- 6,949 quarantined edges
- 1,035 quarantined transfers

Read the actual current branch values and use those as authoritative.

After repairing the engine, run **every currently quarantined entity** through the new certification logic.

No sampling.

No “only major corridors”.

No reusing old quarantine decisions without recomputation.

## Pass A — retained-evidence re-evaluation

First re-certify all quarantined items using existing retained evidence only.

Produce exact transition counts:

- QUARANTINED → CERTIFIED
- QUARANTINED → STILL_UNRESOLVED_RIGHTS
- QUARANTINED → STILL_UNRESOLVED_IDENTITY
- QUARANTINED → STILL_UNRESOLVED_SERVICE
- QUARANTINED → STILL_UNRESOLVED_TRANSFER
- QUARANTINED → REJECTED
- other explicit categories

This pass should reveal how much quarantine was caused purely by engine overreach.

## Pass B — grouped targeted evidence repair

For the still-unresolved set, group by shared root cause/source family.

Do not search 6,949 edges independently if one source-family review can resolve the same factual capability correctly.

Prioritize:

1. national rail backbone;
2. Shinkansen;
3. major conventional rail;
4. metro/private rail interchanges;
5. airport access;
6. ferry gateways;
7. highway/intercity bus;
8. local bus needed for required gateways;
9. remaining isolated components.

Use new authoritative evidence when required and permitted.

## Pass C — final full re-certification

Run the entire frozen candidate inventory again after evidence repairs.

Every final enabled item must have a complete fact-scoped proof.

Every final disabled item must have a precise terminal reason.

---

# 9. National connectivity must be re-evaluated from actual graph paths

Do not assume that an old `BLOCKED` corridor is truly unavailable.

For every existing national corridor:

1. query the candidate graph;
2. query the repaired certified graph;
3. if candidate path exists but certified path does not, compute/report the concrete blocked cut:
   - exact node IDs,
   - exact edge IDs,
   - exact fact capability that fails,
   - exact source/root;
4. attempt re-certification of those cut facts;
5. re-run the corridor.

At minimum re-evaluate:

- 東京 ↔ 京都
- 東京 ↔ 大阪
- 東京 ↔ 名古屋
- 東京 ↔ 河口湖
- 大阪 ↔ 京都
- 大阪 ↔ 三ノ宮
- 大阪 ↔ 奈良
- 博多 ↔ 熊本
- 札幌 ↔ 旭川
- 札幌 ↔ 函館
- Hokkaido ↔ Honshu
- Tohoku ↔ Kanto
- Kanto ↔ Chubu
- Tokyo ↔ Kansai
- Kansai ↔ Chugoku
- Honshu ↔ Shikoku
- Chugoku ↔ Kyushu

### If candidate graph itself has no path

Do not call this a certification failure.

Classify it separately as a **topology coverage gap**.

For P0 national backbone corridors, perform a bounded targeted topology audit using authoritative sources and add only necessary, evidenced nodes/segments if the missing topology is clearly within TASK-086 scope.

Do not invent edges.

---

# 10. Required reports

Create compact machine-readable and Markdown reports, without duplicating giant raw evidence.

At minimum:

## 10.1 certification-engine-repair-audit

Must include:

- old behavior;
- repaired behavior;
- code paths changed;
- source capability model;
- dependency role model;
- negative tests;
- why the repair does not create a blanket unlock.

## 10.2 quarantine-recertification-diff

For every previously quarantined entity:

- stable ID;
- previous status/reasons;
- new status/reasons;
- required fact evidence;
- source capabilities used;
- whether external evidence was added;
- route eligibility.

Must be machine-readable. Split into deterministic chunks if too large.

## 10.3 source-family-recovery-summary

For each affected source family:

- previous source/global status;
- actual supported capabilities after repair;
- affected nodes/edges/transfers;
- recovered counts;
- still-disabled counts;
- rights/raw-retention constraints.

## 10.4 corridor-cut-audit

For every national corridor:

- candidate reachability;
- repaired-certified reachability;
- chosen certified witness path when PASS;
- exact cut blockers when unavailable;
- whether failure is certification, identity, topology, or rights.

---

# 11. Final quarantine semantics

Only after the repaired engine and full re-certification may a remaining item become route-disabled/readmittable.

Final route-disabled reasons must be fact-scoped, for example:

- `RIGHTS_UNVERIFIED_FOR_REQUIRED_FACT`
- `IDENTITY_UNRESOLVED`
- `SERVICE_DIRECTION_UNRESOLVED`
- `BOARDING_ALIGHTING_UNRESOLVED`
- `TRANSFER_RELATION_UNRESOLVED`
- `TOPOLOGY_COVERAGE_GAP`
- `SOURCE_SNAPSHOT_INTEGRITY_FAILED`
- `REJECTED_BY_EVIDENCE`

Do not use generic reasons that merely repeat:

- `UNCERTIFIED_SOURCE_DEPENDENCY`
- `UNCERTIFIED_PATTERN_CALLING_NODE`

without identifying the exact required fact.

Remaining disabled items are preserved for future re-admission.

---

# 12. Safety / anti-overcorrection tests

The repair must not turn into “everything is allowed”.

Add tests proving:

1. Empty license + no structured rights/fact-only review still fails the relevant persistence/runtime capability.
2. Public webpage alone does not imply raw redistribution permission.
3. An essential identity source failure still blocks that identity if there is no independent valid path.
4. An essential service-direction source failure blocks that segment.
5. Invalid boarding/alighting evidence blocks that segment.
6. Invalid transfer evidence blocks the transfer.
7. A metric-only failure does not delete topology.
8. An auxiliary failure does not delete unrelated topology.
9. A remote pattern-node failure does not delete an unrelated segment.
10. No disabled entity leaks into route-enabled export.

---

# 13. Graph integrity after recovery

Final route-enabled graph must retain:

- dangling references = 0
- self edges = 0
- duplicate edge IDs = 0
- duplicate canonical identities = 0
- invalid direction = 0
- impossible mode transition = 0
- invalid endpoint serialization = 0
- invalid transfer = 0
- deterministic projection = PASS
- deterministic serialization/replay = PASS

Do not trade graph integrity for connectivity.

---

# 14. Large-file policy

Do not reintroduce any >100MB blob.

Historical raw large evidence remains local with SHA256/compact receipt.

For new re-certification outputs:

- prefer JSONL chunks;
- compact manifests;
- hashes;
- reproducible generation receipts.

If all individual tracked files are GitHub-compliant but Codex cannot push because of environment/network/total transfer size:

stop retrying and return:

- exact branch;
- local HEAD;
- `git status --short`;
- ahead/behind status;
- exact normal push command:

`git push origin feature/b-transport-node-mobility-backbone`

If an individual blob itself exceeds GitHub's limit, manual push is not a solution. Keep it local and commit only compact/hash evidence.

No force push.
No LFS migration unless separately authorized.

---

# 15. Validation order

To avoid another multi-hour false loop:

1. focused certification-engine unit/regression tests;
2. Tokyo/Ueno regression;
3. auxiliary-evidence / remote-pattern-node regression;
4. full quarantined-item re-certification generation;
5. corridor-cut audit;
6. graph integrity;
7. TASK-086 focused suite;
8. TransportNode v2 / Route Schema suite;
9. lint;
10. typecheck;
11. formatting/diff;
12. build/artifact audit;
13. exact-head GitHub Quality Gate.

Do not run a long full gate before the focused false-negative regressions pass.

Do not predeclare CI PASS.

---

# 16. Final acceptance criteria for TASK-086

TASK-086 may close only when all of the following are true:

- certification engine no longer uses unrelated evidence as a fatal dependency;
- source certification is capability/fact-scoped and consistent with existing rights policy;
- full previous quarantine set has been re-evaluated;
- every recovered node/edge/transfer has a fact-scoped proof;
- every still-disabled item has an exact terminal reason;
- no algorithmic false-quarantine category remains;
- 東京→上野 PASS;
- 上野→東京 PASS;
- 東京/大手町 identity remains separate and walking relation is not zero-time fabricated;
- every national corridor has a new candidate-vs-certified path/cut result;
- route-disabled items do not leak into route-enabled output;
- graph integrity gates pass;
- final exact-head Quality Gate passes.

If some national corridors remain unavailable after this work, TASK-086 can still close **only if** the report proves that each remaining cut is a genuine rights/identity/topology evidence gap rather than a certification-engine cascade.

---

# 17. WBS / Result / PR closeout

Append a final section to:

`docs/tasks/RESULT-TASK-086-b-japan-mobility-backbone.md`

Title:

`Final Certification Engine Repair + Full Quarantine Re-certification`

Report exact:

- before/after certified nodes;
- before/after certified edges;
- before/after certified transfers;
- recovered counts;
- still-disabled counts;
- source-family recovery;
- Tokyo/Ueno witness paths;
- national corridor PASS/unavailable results;
- remaining genuine blockers/exclusions;
- final graph integrity;
- final branch SHA;
- exact-head CI URL/conclusion;
- push mode;
- PR/merge result.

Preserve all historical BLOCKED evidence; do not rewrite history.

When all final gates pass and PR #466 is published:

- normal merge PR #466 is authorized;
- do not enable auto-merge;
- do not force-push;
- close Issue #443;
- set WBS 7.16 to:

`B / 已完成（认证引擎误隔离修复 + 全量隔离项重新认证完成；可认证项恢复至 route-enabled；剩余项均有真实、事实级终态原因并 fail-closed，可未来 re-admission）`

If manual push is required, do not falsely mark merged/completed until the remote state is observed.

---

# 18. Final response required from Codex

Return:

1. FINAL STATUS
2. branch
3. final local HEAD
4. remote PR head
5. certification-engine bugs confirmed
6. files/functions changed
7. previous quarantined counts
8. recovered nodes / edges / transfers
9. final certified nodes / edges / transfers
10. final disabled nodes / edges / transfers
11. source families recovered
12. 東京→上野 exact certified witness
13. 上野→東京 exact certified witness
14. 東京↔大手町 handling
15. national corridor table
16. topology-vs-certification gap table
17. remaining disabled reason counts
18. graph integrity summary
19. focused tests
20. full tests/gates
21. exact-head CI URL + conclusion
22. Result path
23. repair audit path
24. re-certification diff path
25. corridor-cut audit path
26. WBS 7.16 status
27. Issue #443 status
28. PR #466 merge SHA if merged
29. intentionally local large files
30. exact manual push command if needed

The core goal is:

**Repair false-negative certification first. Re-certify the entire quarantine set. Prove whether routes are truly unavailable. Only then keep genuine unresolved items disabled.**
