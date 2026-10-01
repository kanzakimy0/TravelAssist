# AMENDMENT — TASK-085-B Post-Canonical Final Replay

Date: 2026-09-30
Parent: TASK-085-B / Issue #442 / WBS 7.15
Existing Draft PR: #464
B branch before this amendment: feature/b-poi-transport-node-access-edges
Canonical owner correction: PR #465, merge 5123966f62dbe9587a3bbe38e877ccf3ea959b80

## 1. Purpose

Canonical owner correction is now merged into develop. TASK-085 must perform one final replay against the corrected Canonical authority.

This is a **replay / denominator / fingerprint refresh**, not a new nationwide discovery pass.

Do not restart TASK-085 from zero.
Do not restart national source discovery.
Do not start TASK-086.
Do not merge PR #464.

## 2. Mandatory latest-develop integration

PR #464 currently diverged from develop. Before replay:

1. fetch latest origin/develop;
2. normal merge latest origin/develop into feature/b-poi-transport-node-access-edges;
3. do not force push;
4. preserve all TASK-085 transport artifacts and logic;
5. accept PR #465 Canonical files as authoritative where conflicts occur;
6. preserve newer WBS facts from develop;
7. record merge commit and exact develop SHA in Result/QA.

Canonical authority after PR #465:

- develop merge: 5123966f62dbe9587a3bbe38e877ccf3ea959b80
- dataset revision: task-083-a-pilot100-owner-adjudication-v2
- runtime manifest SHA256: b4f714078d2780324f9e98fbaf58001177040dbc30d9693e7bfef1019d6643df
- dataset file SHA256: c3ed64d518913be8c9c8d4ec07ed85bf4a446228e73ca1ac19026057efd1c6af
- corrected sampleManifestSha256: 6d6187e53f6235abc757795896b8ba441736ce078e1e5b3e0c70df14c4709d51
- access adjudication SHA256: b80ae442d6a5fe883e9491fce6d242c7edce1d4c119e03975a1df43fd0be3d85
- total Canonical membership remains 100
- general-tourist access assessment exclusions = exactly 5

## 3. Five owner-adjudicated records

Consume the authoritative access-adjudication artifact.

These five remain Canonical members but are excluded from general-tourist access assessment according to A's final owner decision:

- J-WORLD TOKYO — permanently_closed
- レインボープール — permanently_closed
- 舳倉島 — temporarily_closed / ordinary tourism unavailable
- 鶴見つばさ橋 — active identity, NOT_A_VISITOR_ENDPOINT
- 我善坊谷 — active historical identity, HISTORICAL_RECORD_ONLY

Do not delete, rebind or replace these records.
Do not generate fake visitor topology for them.

All 100 remain explicit in raw outputs.
The topology acceptance assessment denominator is the authoritative 95-record general-tourist subset.

## 4. Replay existing TASK-085 evidence

Reuse and revalidate the current TASK-085 evidence:

- 5,200 admitted topology nodes
- 344 HOLD records
- 680 confirmed directed topology edges
- 340 confirmed POI↔node relationships
- current candidate decisions
- topology-review evidence
- source rights and hashes
- 9 SOURCE_LICENSE_IDENTITY_FIXPOINT_PROOF records
- deterministic batch/receipt infrastructure

Do not redo national S12/P11/GTFS discovery merely because Canonical hashes changed.

Only rerun source discovery if the canonical correction changes an affected non-excluded POI identity/coordinate in a way that invalidates existing evidence. PR #465 states membership is unchanged and TASK-085 transport data is unchanged, so the expected path is replay only.

## 5. Required replay changes

Refresh:

- Canonical runtime/dataset/adjudication fingerprints
- inputFingerprint
- authorized assessment denominator
- Canonical hash gate
- canonical-adjudication-required representation
- per-POI completeness
- under-target list
- final acceptance gate
- Result / QA / WBS / PR body
- deterministic receipts if fingerprint invalidation requires regeneration

The old CRLF/LF hash failure must become PASS if the authoritative merged files match PR #465.

The five owner-adjudicated records must no longer count as unresolved A-owned failures.

## 6. B-side source/license/identity fixpoint remains factual

Do not convert the nine B-side fixpoint cases into fake CANDIDATE_EXHAUSTION_PROOF.

Current cases:

- 飛水峡
- 御影大橋
- 田倉山
- 池原橋
- まほろば湖
- みさき公園
- 阿瀬川橋
- 韮崎中央公園陸上競技場
- ミュージアム都留

Their SOURCE_LICENSE_IDENTITY_FIXPOINT_PROOF remains valid only if all bound source/admission hashes still match after develop sync.

For each, replay exact proof validity and report:

- confirmed useful node count
- missing evidence type
- source/license/identity boundary
- proof hash validity
- whether any new develop-side authoritative evidence invalidates the proof

Do not perform broad new web/source discovery in this replay.

## 7. Final gate policy

After canonical correction replay, classify gates into:

### A. Resolved upstream gates
Expected PASS:
- Canonical supporting manifest integrity
- Canonical lifecycle/public-access/endpoint adjudication ingestion

### B. Normal topology gates
Recalculate against the authoritative 95-record assessment subset:
- >=1 confirmed topology coverage
- zero-node count
- mean / median useful nodes
- provenance
- essential fields
- deterministic rebuild
- graph growth
- batch integrity

### C. Audited external-fixpoint exceptions
Keep separately:
- under-target records with valid SOURCE_LICENSE_IDENTITY_FIXPOINT_PROOF
- zero-node record(s) with valid external-fixpoint proof

Do not silently convert these to PASS under the old physical-exhaustion criterion.
Do not restart discovery solely to satisfy a mathematically impossible threshold with fake nodes.

## 8. Allowed final statuses

### PASS / READY_FOR_REVIEW
Only if every existing hard topology gate passes without exception.

### READY_FOR_USER_ACCEPTANCE_WITH_AUDITED_FIXPOINT_EXCEPTIONS
Use only if:
- all A/Canonical gates PASS;
- Canonical assessment denominator is correct;
- globalTopologyDiscoveryFixpoint remains PROVEN;
- all non-exception topology integrity/provenance/determinism gates PASS;
- the only remaining failures are the explicitly enumerated 9 SOURCE_LICENSE_IDENTITY_FIXPOINT_PROOF cases;
- no additional non-fixpoint failure exists.

This status does **not** mark WBS 7.15 completed.
Set WBS 7.15 = 待审查（audited fixpoint exceptions）.
User must decide whether those 9 exceptions are acceptable for final merge/closure.

### BLOCKED_*
Use if any new non-fixpoint failure exists, proof hashes are invalid, the Canonical merge introduces unexpected membership/identity drift, or existing topology artifacts no longer replay deterministically.

## 9. Required final report

Report at minimum:

- latest develop SHA consumed
- normal merge commit into B branch
- final branch head
- Draft PR #464
- Canonical revision/runtime/hash/adjudication hash
- raw Canonical count = 100
- assessment denominator = 95
- confirmed topology coverage numerator/denominator
- zero-node assessment records
- POIs >=3 useful nodes
- mean/median nodes per assessed POI
- confirmed relationships / directed edges
- 9 fixpoint proof validity results
- exact remaining failed gates
- deterministic rebuild
- full regression
- exact-head Quality Gate
- WBS 7.15 state

## 10. Git governance

Continue Draft PR #464 only.
No auto-merge.
No merge.
No TASK-086.
Do not mark WBS 7.15 已完成.

If final status is READY_FOR_USER_ACCEPTANCE_WITH_AUDITED_FIXPOINT_EXCEPTIONS, stop and return the exact 9-case acceptance table for user decision.
