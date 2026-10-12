# TASK-083-A — Canonical owner correction and access adjudication

Status: owner decisions FINAL; corrected Canonical authorization verified. This is a correction to TASK-083-A, not a new task and not a TASK-085 topology change.

Base develop: `5b951195698d3e421f34a9922393b454412fa4bb`. Branch: `codex/a-canonical-access-adjudication`. The user explicitly authorized these five owner decisions, unchanged membership, and normal merge into develop after validation. TASK-085 PR #464 at `f70c154a881fd6aa620481639aef0b2e76ff6a46` is the downstream reference, not this PR's implementation branch.

## Corrected authorization

| Artifact | Current revision / SHA-256 |
| --- | --- |
| Runtime manifest | `src/shared/data/canonical-poi-pilot100.runtime-manifest.v1.json` |
| Runtime manifest file SHA-256 | `b4f714078d2780324f9e98fbaf58001177040dbc30d9693e7bfef1019d6643df` |
| Dataset revision | `task-083-a-pilot100-owner-adjudication-v2` |
| Dataset file SHA-256 | `c3ed64d518913be8c9c8d4ec07ed85bf4a446228e73ca1ac19026057efd1c6af` |
| Dataset semantic SHA-256 | `0a91f0ec36c193b4a95c15dcad01338286ea91afb5003f3e1abdf7c7a9366ad5` |
| Correct sampleManifestSha256 | `6d6187e53f6235abc757795896b8ba441736ce078e1e5b3e0c70df14c4709d51` |
| Owner decision file | `src/shared/data/canonical-poi-pilot100.access-adjudication.v1.json` |
| Owner decision revision | `task-083-a-access-adjudication-20260930-v1` |
| Owner decision file SHA-256 | `b80ae442d6a5fe883e9491fce6d242c7edce1d4c119e03975a1df43fd0be3d85` |

The sample itself is unchanged. The previous declaration `77e239e0b5092f38e85f1d4e7035cf2ece2956128b5c01dbabdffc11b08d2c82` hashes the reconstructed CRLF representation; the actual committed LF bytes hash to the corrected value above. TASK-085's audit traces this to TASK-083 authorizing commit `32154893fc314844760d059d59a3ef141d462882`. There was no later membership drift.

The existing TASK-083 generator reissued the runtime manifest, handoff and validation receipt after all 100 Canonical records passed all 14 admission gates. Its supporting-file hash helper now refuses CRLF rather than silently authorizing checkout-specific bytes. This is owner reauthorization through the normal generator, not a downstream hash bypass.

## Five final decisions

| Canonical identity | Lifecycle | Public-access / entity decision | Visitor endpoint |
| --- | --- | --- | --- |
| J-WORLD TOKYO / 41201 | permanently_closed | Retain the closed venue identity; effective closure 2019-02-17. | null; no Sunshine City substitution |
| レインボープール / 41211 | permanently_closed | Retire the ended pool operation; exact closure date unknown. The park or future water facility is a different entity. | null |
| 舳倉島 / 31513 | temporarily_closed | Unavailable to ordinary tourists while ferry access is limited to residents/recovery workers. Island identity is retained. | null; no inferred reopening date |
| 鶴見つばさ橋 / 11056 | active | Retain the operating road bridge; NOT_A_VISITOR_ENDPOINT. Active infrastructure does not authorize pedestrian arrival or a safe drop-off. | null; no substituted viewpoint/parking |
| 我善坊谷 | active | Retain a historical catalog entity; HISTORICAL_RECORD_ONLY, not an active visitor destination. No assertion that the geographic valley ceased to exist. | null; no Azabudai Hills or memorial-park rebind |

All five decisions have `decisionStatus=FINAL`, `owner=A_CANONICAL`, `generalTouristAccessEligible=false`, `replacementPoiRef=null`, and identity-reference-only location semantics. The unchanged coordinates are not arrival points. No new visitor entrance coordinate, TransportNode reference, opening date or route metric was invented.

Lifecycle denotes the entity/catalog state; visitor eligibility is separately recorded in the hash-bound owner adjudication. This distinction avoids falsely declaring an operating expressway bridge closed, or treating a historical place name as a new development. For 舳倉島, temporary closure is explicitly scoped to ordinary tourism. New official evidence requires a new authorized owner revision; time passing alone never reopens it.

Evidence rechecked on 2026-09-30:

- [J-WORLD operator history](https://bandainamco-am.co.jp/company/asobito/article25.html) states the 2019-02-17 closure.
- [Rainbow Pool official operator](https://www.showakinen-koen.jp/facility/facility-615/) states operations ended because of ageing/redevelopment.
- [Wajima official tourism](https://wajimanavi.jp/tourism/hegurajima) describes resident/recovery-worker-only ferry access.
- [Bridge operator](https://www.shutoko.co.jp/activities/database/bridge/tsubasa/) and [expressway entry restrictions](https://www.shutoko.jp/driving/precautions/keepout/) establish infrastructure identity and pedestrian/bicycle exclusion. No safe drop-off endpoint is established by these sources.
- [Minato place-name history](https://www.city.minato.tokyo.jp/kouhou/kuse/gaiyo/chimerekishi/index-azabu.html), [municipal redevelopment record](https://www.city.minato.tokyo.jp/matizukurikeikakutan/erimanekatudou.html) and [project history](https://www.mori.co.jp/projects/azabudaihills/background/) support retaining the historical identity separately from the current development. Historical-only eligibility is the explicit Canonical owner decision.

Only short factual summaries and source references are persisted. New Canonical source references are reference-only / restricted; no raw source pages or Provider payloads are imported.

## Preservation and runtime safety

[reauthorization.json](../qa/TASK-083/canonical-owner-correction/reauthorization.json) independently compares the corrected dataset with the frozen develop base:

- 100/100 internal IDs, order and Master Codes preserved.
- Only five records changed, limited to lifecycle, source references and record revision; names, classification, original coordinates, Region relations and external identities unchanged.
- Other 95 records unchanged; sample manifest, registry and original admission results byte-identical.
- Feature43 baseline artifact and all 4,300 values byte-identical. Only its binding manifest and strict code pin were updated to the new authorized Canonical revision.
- The dependent TASK-084-A scoring QA was replayed to refresh revision provenance; no score, ranking, scoring contract or policy changed. This scoring fixture is not proof of present tourist access.
- Candidate authorization remains false; no membership expansion or reallocation.
- TASK-085 Transport data, generator and QA are unchanged.

The server runtime validates the owner artifact's hash/revision, exact identity/code/lifecycle bindings, final ownership, allowed eligibility states and exclusion set. Missing/stale/tampered decisions fail closed. The existing Detail API continues to return all 100 catalog identities and exposes corrected lifecycle through its existing DTO; no new public endpoint or Planner contract is introduced.

## Handoff to B after merge

B should synchronize latest develop on PR #464, validate the corrected runtime and owner-artifact hashes, and consume the final owner decisions as authoritative Canonical assessment exclusions. Keep all 100 explicit outcomes; the general-tourist access assessment excludes these five exact IDs and leaves 95 records. An exclusion is not an accepted topology edge, a fabricated exhaustion proof, or deletion from membership.

Replace unresolved Canonical-owner review classification only when the matching final decision and hashes validate. These five cases no longer require B to guess lifecycle or endpoint. The other nine B-side source/identity boundaries are unaffected; this correction does not claim TASK-085 overall PASS.

Existing licensed archives, official gateway facts, admissions and discovery evidence can be reused because identity, location and membership did not change. Recompute affected Canonical hashes/receipts and deterministic derived inputs, and replay final acceptance. This is not authorization to restart national source discovery. B's topology and final acceptance are deliberately not regenerated in this PR.

## Verification and merge receipt

Focused runtime/owner/baseline/replay tests: 20/20 PASS. Full regression: 2,829/2,829 PASS on develop plus this correction (PR #464's extra 17 tests are on its separate B branch). Lint, typecheck, formatting, deployment/build and artifact checks are recorded in [QA](../qa/TASK-083/canonical-owner-correction/README.md).

The correction PR body records final head, exact-head Quality Gate and normal merge commit, followed by the exact merged-develop Quality Gate. No auto-merge is used and PR #464 remains Draft and unmerged.
