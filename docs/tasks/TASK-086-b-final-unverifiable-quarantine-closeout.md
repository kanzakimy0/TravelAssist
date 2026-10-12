# TASK-086-B FINAL — Unverifiable Quarantine Acceptance & WBS 7.16 Full Closeout

> **SUPERCEDING REPAIR AUTHORITY — 2026-10-06**
>
> Before executing this closeout, execute and satisfy:
> `docs/tasks/TASK-086-b-certification-engine-repair-full-recertification.md`.
>
> That repair task has higher authority for certification semantics, evidence dependency scope, source capability handling, full quarantine re-certification, Tokyo/Ueno acceptance, and national connectivity re-evaluation. Do not classify existing quarantined entities as accepted exclusions until they have been re-evaluated by the repaired engine.
>
## Authority

User directive: 2026-10-05.

This is the final acceptance amendment for **TASK-086-B / WBS 7.16 TransportNode→TransportNode Japan Mobility Backbone**.

The user explicitly authorizes **continued bounded certification** of currently non-certified entities before final exclusion. The objective is to certify as much safe, useful coverage as reasonably possible, especially high-value national corridors, gateways and transfer chains. Certification may use existing retained evidence and new authoritative/public evidence or rights evidence when it can be obtained reliably.

This is **not** an instruction to research forever. If an entity still cannot be safely certified after a bounded good-faith certification attempt, it must be retained as an auditable, **non-routable / fail-closed but future-readmittable** exclusion. Such exclusions do not block final TASK-086 completion.

This task exists to end TASK-086-B completely after one final bounded certification-and-classification pass, not to start an open-ended discovery cycle.

Repository: `kanzakimy0/TravelAssist`  
Existing branch: `feature/b-transport-node-mobility-backbone`  
Existing PR: #466  
WBS: 7.16  
Owner: B

---

## 1. Current authoritative baseline

Read the latest branch, PR #466, WBS, Result and QA evidence before making changes.

The current final result records:

- Candidate nodes: **4,061**
- Candidate directed edges: **9,409**
- Certified nodes: **1,174**
- Certified directed edges: **2,460**
- Certified transfers: **37**
- Quarantined / non-certified nodes: **2,887**
- Quarantined / non-certified edges: **6,949**
- Quarantined / non-certified transfers: **1,035**
- Certification roots: **251**
- Final certified graph integrity currently records zero dangling references, zero self edges, zero duplicate edges, zero duplicate canonical identities, zero invalid directions, zero impossible mode transitions, zero invalid endpoint serialization and zero invalid transfers.
- The certified graph is fragmented and does **not** currently satisfy the old “national certified connectivity” acceptance gate.
- This amendment intentionally changes that acceptance policy.

Do not rewrite historical evidence. Preserve the previous BLOCKED findings as historical facts.

---

## 2. Final product decision

### 2.1 New acceptance semantics

TASK-086-B is considered complete when **every frozen candidate entity has a final deterministic routing eligibility state**, not when every candidate entity is source-certified.

The final model is:

1. **ROUTE_ENABLED / CERTIFIED**
   - Evidence and rights/identity requirements are sufficient.
   - Entity may appear in the certified routing export.

2. **ROUTE_DISABLED_UNVERIFIABLE / READMITTABLE**
   - Required evidence could not be obtained or verified after the final bounded certification attempt.
   - Entity remains preserved for audit and future re-admission.
   - Entity must not be used by routing now.
   - A later dedicated re-certification task may promote it to ROUTE_ENABLED when sufficient evidence becomes available.

3. **ROUTE_DISABLED_RIGHTS_UNVERIFIED**
   - Source facts may exist, but runtime/redistribution permission is not sufficiently certified.
   - Preserve candidate data and evidence metadata.
   - Do not expose in route-enabled runtime artifacts.

4. **ROUTE_DISABLED_IDENTITY_UNRESOLVED**
   - Identity, direction, boarding, transfer, or endpoint relationship cannot be safely closed.
   - Preserve the candidate.
   - Never route through it.

5. **ROUTE_DISABLED_REJECTED**
   - Evidence proves the candidate should not be admitted.

Equivalent stable reason-code names may be reused if the repository already has canonical enums. Do not create parallel semantics if an existing status model can express the same states.

### 2.2 Important distinction

A route-disabled item is **not a blocker to closing TASK-086**.

It is a documented coverage exclusion.

Historical blocker counts must remain visible in the old Result/QA evidence. After the final bounded certification pass, unresolved roots must be reported as **accepted readmittable exclusions**, not open TASK-086 work.

### 2.3 No false national PASS claim

Do **not** claim that the certified-only graph is fully connected nationally.

Replace the old acceptance interpretation with:

`COMPLETE_WITH_READMITTABLE_UNVERIFIED_EXCLUSIONS`

or an equivalent unambiguous status.

Regional/corridor reports may say:

- `SUPPORTED_BY_CERTIFIED_GRAPH`
- `UNAVAILABLE_COVERAGE_GAP`
- `UNAVAILABLE_UNVERIFIABLE_EXCLUSION`

They must not say a blocked corridor is actually connected when it is not.

WBS completion means the backbone inventory/classification and safe routing eligibility boundary are complete. It does not mean 100% geographic route coverage.

---

## 3. Final bounded certification rule

Before assigning a route-disabled terminal state, continue certification where there is a realistic path to reliable evidence.

### 3.1 Priority order

Work in this order:

1. non-certified nodes/edges/transfers affecting major national corridors and regional gateway connectivity;
2. Shinkansen / intercity rail / major conventional rail continuity;
3. airport, ferry and major bus gateway access;
4. high-value interchange / transfer relationships;
5. remaining unresolved entities with an identifiable authoritative evidence path;
6. residual items with no practical authoritative evidence path.

Do not optimize counts by certifying low-value items while leaving obvious high-value corridor gaps untouched.

### 3.2 Allowed certification work

You MAY:

- use already retained TASK-086 evidence;
- retrieve new authoritative/public operator, government, GTFS or other repository-approved evidence;
- verify source identity, service direction, boarding/alighting rules, transfer relationships and source/runtime rights;
- certify an item only when the existing TASK-086 certification rules are actually satisfied.

### 3.3 Bounded-stop rule

Do **not** turn this into an unbounded research loop.

For each unresolved certification root:

- first inspect all already-retained evidence;
- if there is a concrete authoritative evidence path, make a bounded good-faith certification attempt;
- avoid repeated equivalent searches or repeated retries against the same unavailable source;
- if authoritative evidence is unavailable, contradictory, inaccessible, insufficient, or rights remain unverified, stop researching that root and assign the appropriate `ROUTE_DISABLED_* / READMITTABLE` terminal state;
- record the attempted evidence path and why certification could not close.

There must be **zero TASK-086 acceptance roots left in an open research state** at final closeout.

### 3.4 Safety rules

- Do **not** invent source rights.
- Do **not** infer identities from proximity alone.
- Do **not** promote REVIEW/QUARANTINE candidates merely to improve connectivity.
- Do **not** relax direction, pickup/dropoff, transfer, identity, serialization, or evidence-integrity rules.
- Do **not** delete candidate/raw evidence because it is non-routable.
- Do **not** silently route through a non-certified entity.
- Route-disabled entities remain eligible for future dedicated re-certification/re-admission.

---

## 4. Required implementation

### 4.1 Freeze the full candidate inventory

Preserve the full frozen candidate inventory and stable IDs.

Every current candidate node, edge, transfer and source dependency must resolve to a terminal routing state.

There must be **zero PENDING acceptance decisions** after this task.

### 4.2 Machine-readable exclusion manifest

Create or update one canonical machine-readable artifact for excluded entities.

It must include, at minimum:

- stable entity ID
- entity kind: node / edge / transfer / source dependency
- final routing state
- reason code
- evidence/source reference(s)
- affected endpoint IDs where applicable
- whether runtime import is permitted
- whether route traversal is permitted
- historical blocker/root ID where applicable
- optional future-remediation note

Do not duplicate huge raw evidence inside this file.

### 4.3 Machine-readable routing eligibility manifest

Create or update a compact authoritative routing eligibility projection.

At minimum:

- all route-enabled node IDs
- all route-enabled edge IDs
- all route-enabled transfer IDs
- all route-disabled IDs or a deterministic reference to the exclusion manifest
- frozen-input/content hash
- schema/version
- generation timestamp only if existing deterministic build policy permits it

The route-enabled projection must be derived deterministically from the final states.

### 4.4 Fail-closed routing boundary

Add/retain tests proving:

1. No `ROUTE_DISABLED_*` node is present in the route-enabled node export.
2. No `ROUTE_DISABLED_*` edge is present in the route-enabled edge export.
3. No `ROUTE_DISABLED_*` transfer is present in the route-enabled transfer export.
4. A route cannot traverse an excluded edge through aliasing, pattern expansion, transfer expansion, reverse-direction synthesis or fallback serialization.
5. If a route cannot be built without an excluded entity, the graph reports an unavailable coverage gap instead of silently using that entity.
6. Unknown metrics remain unknown; no invented duration/cost/service frequency is introduced.
7. Existing legitimate one-way and pickup/dropoff restrictions remain unchanged.

If the actual runtime router is outside WBS 7.16, implement/verify the authoritative eligibility contract and export boundary only; do not expand scope into Planner/UI/Provider integration.

---

## 5. Reclassify the existing 251 certification roots

Do not erase them.

For every currently retained certification root:

- map it to the affected stable IDs;
- assign a final route-disabled reason or confirm the affected entity is already route-enabled;
- record the historical blocker ID;
- after the final bounded certification attempt, mark the root as `CLOSED_AS_READMITTABLE_EXCLUSION` or equivalent when it still cannot be certified;
- ensure no root remains `PENDING`, `MANUAL`, or `TECH_BLOCKED` **for TASK-086 acceptance** after final classification.

Historical ledgers may retain their original labels in immutable historical evidence, but the new final-closeout projection must give each root a terminal closeout disposition.

Do not call a source “rejected” unless the evidence actually supports rejection.

---

## 6. Graph quality acceptance

The final route-enabled graph must preserve or improve the already demonstrated integrity properties.

Required zero counts:

- dangling references
- self edges
- duplicate edge IDs
- duplicate canonical identities
- invalid direction
- impossible mode transition
- invalid endpoint serialization
- invalid transfer

Deterministic projection/serialization must pass.

Disconnected components, orphan route-enabled nodes, unsupported regions and unsupported national corridors are **coverage metrics**, not automatic closeout blockers under this amendment.

They must still be reported accurately.

---

## 7. Final validation

Run the smallest authoritative set first, then the repository-required exact-head gate.

Required before merge:

- TASK-086 focused tests PASS
- TransportNode v2 / Route Schema focused tests PASS
- lint PASS
- typecheck PASS
- formatting/diff checks PASS
- production build / deployment artifact audit PASS where applicable
- deterministic route-eligibility/exclusion generation PASS
- excluded-entity leak tests PASS
- exact-head GitHub Quality Gate **completed successfully on the final branch head**

Do not predeclare a future CI run PASS.

A cancelled, failed, missing or timed-out exact-head final Quality Gate does not satisfy the final merge gate.

Previous successful historical runs remain evidence but do not replace the final exact-head receipt.

---

## 8. Large-file and publication policy

Do not reintroduce the historical >100 MB `core-stage-acceptance.json` blob into Git.

The raw 156,850,452-byte evidence may remain local with its recorded SHA256; Git should retain compact evidence/hash receipts only.

Rules:

1. No newly tracked individual Git blob may exceed GitHub's normal file-size limit.
2. Do not duplicate frozen raw/cache data merely to create another “final” snapshot.
3. Prefer compact manifests, hashes and deterministic regeneration receipts.
4. If a normal push fails because the ChatGPT/Codex environment cannot upload the already-Git-compliant repository volume, **stop retrying** and return:
   - exact local branch name,
   - exact local HEAD SHA,
   - `git status --short`,
   - the exact normal `git push origin feature/b-transport-node-mobility-backbone` command for the user to run manually,
   - any files that remain intentionally local.
5. If push fails because an individual tracked blob is >100 MB, manual `git push` will not solve GitHub's limit. Remove that blob from the publishable commit while preserving it locally plus SHA256/compact receipt; do not use force push or silently rewrite accepted published history.
6. No Git LFS migration unless the user separately authorizes it.

---

## 9. Final Result update

Update:

`docs/tasks/RESULT-TASK-086-b-japan-mobility-backbone.md`

Append a clearly dated **Final User-Directed Acceptance Amendment / Closeout** section.

It must state:

- final bounded re-certification was performed and its scope/counts are recorded;
- old blocker counts are preserved as historical evidence;
- exact counts of newly certified nodes/edges/transfers during this final pass;
- exact list/count of high-value corridor/gateway gaps recovered during this pass;
- unresolved evidence/rights/identity items are now terminal route-disabled, future-readmittable accepted exclusions;
- exact final counts of route-enabled and route-disabled nodes/edges/transfers;
- exact number of terminal exclusion roots;
- zero pending TASK-086 decisions;
- graph integrity results;
- coverage limitations;
- final branch HEAD;
- final exact-head Quality Gate URL/result;
- whether push was automatic or user-manual;
- whether PR #466 was merged;
- final merge SHA if merged.

Do not rewrite the historical BLOCKED sections to pretend they never occurred.

---

## 10. WBS final closeout

After the final exact-head gate passes and the final publishable commit is on PR #466:

### If PR #466 can be normally merged

The user directive authorizes the **final normal merge** of PR #466 after all gates above pass.

- Do not force push.
- Do not squash away required audit history unless repository policy already mandates squash.
- Do not enable auto-merge.

After merge:

Update WBS 7.16 to:

`B / 已完成（最终有界再认证完成；认证项进入可路由子图；仍无法取证/权限未确认/身份未闭合项以可未来重新认证的 route-disabled 终态隔离；覆盖缺口保留但不再阻塞 TASK-086）`

Close Issue #443 as completed with a link to the final Result and merge SHA.

Record that future evidence recovery/re-certification is explicitly allowed as a separate re-admission enhancement task; it does not reopen TASK-086.

### If PR cannot be merged only because publication must be done manually

Do not falsely mark merged.

Complete all local/branch closeout work, return the exact manual push/merge instructions, and keep WBS at `待审查（仅待人工发布）` until the actual merge is observed.

Once the actual merge is observed, mechanically change WBS to `已完成`.

---

## 11. Forbidden outcomes

Do not finish with:

- `BLOCKED_CERTIFIED_NATIONAL_BACKBONE` as the current final acceptance status;
- another open-ended discovery/research cycle after the bounded final certification pass;
- another open-ended “research these sources later” blocker list;
- invented evidence;
- silently enabled unverified edges;
- claims that all Japan corridors are certified;
- deletion of unresolved candidate records;
- route-disabled records appearing in route-enabled output;
- a new TASK-087 merely to finish TASK-086;
- a second implementation branch or second PR for WBS 7.16.

The target final status is:

**TASK-086-B COMPLETE AFTER FINAL BOUNDED RE-CERTIFICATION, WITH REMAINING UNVERIFIED / RIGHTS / IDENTITY EXCLUSIONS FAIL-CLOSED NOW AND EXPLICITLY READMITTABLE LATER.**
