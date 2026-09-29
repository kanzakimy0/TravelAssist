# RESULT — TASK-087-B Canonical Feature43 Legacy Recovery Audit

Status: **PARTIAL / AUDIT READY FOR REVIEW; PROMOTION BLOCKED**. Issue #452; [Draft PR #454](https://github.com/kanzakimy0/TravelAssist/pull/454). WBS 7.4.2 = B / 待审查. Implementation branch feature/b-canonical-feature43-legacy-recovery, independently created from origin/develop@3fab703d13694fd1205679c96fb8d1d2e8549fbc. No PR was merged and no Canonical runtime import was authorized by this Task.

## Outcome

The repository-only first pass recovered every v1.66 numeric Feature43 cell for the exact TASK-083 admitted Pilot-100 and assigned exactly 4,300 cell-level promotion decisions. The workbook has 43/43 historical scores for all 100 POIs, but neither workbook COMPLETE_43 nor HUMAN_REVIEW summary is a Canonical admission or proof of field-level source/rubric compatibility. The proposed overlay v2 therefore retains all values as null. This is an evidence-gate result, not missing implementation and not a claim that the POIs truly have zero feature strength.

| Metric                                                    |                                    Result |
| --------------------------------------------------------- | ----------------------------------------: |
| Canonical POIs / exact legacy UUID matches                |                                 100 / 100 |
| NO_LEGACY_MATCH / ambiguous identity joins                |                                     0 / 0 |
| Promotion decisions                                       |                             4,300 / 4,300 |
| Historical numeric observations                           | 4,317 (4,300 workbook + 17 PR #437 Draft) |
| Unique cells with historical numeric                      |                                     4,300 |
| P0 / P1 / P2 / P3 observations                            |                        0 / 17 / 4,300 / 0 |
| PROMOTE_AS_IS / PROMOTE_REVALIDATED                       |                                     0 / 0 |
| KEEP_CURRENT_CANONICAL                                    |                                         0 |
| CONFLICT_REVIEW_REQUIRED                                  |                                        17 |
| LEGACY_VALUE_NO_PROVENANCE                                |                                     4,283 |
| LEGACY_VALUE_SCHEMA_MISMATCH / NO_LEGACY_VALUE / REJECTED |                                 0 / 0 / 0 |
| Canonical non-null before / proposed after / delta        |                                 0 / 0 / 0 |
| Proposed 43/43 POIs / unexplained delta                   |                                     0 / 0 |

Each of the 43 Feature43 codes has identical before/found/promotable/final coverage of 0/100/0/0. The full per-code matrix and per-POI/cell decisions are machine-readable in docs/qa/TASK-087-B/coverage-before-after.json and promotion-decisions.jsonl. “Found” never means “promoted.”

## Corpus, identity and provenance

The deterministic inventory hashes 2,385 repository files in data/poi/full and TASK-068–075 Result/QA paths, including the v1.66 workbook (SHA-256 b396723fbe1ed326fc205b7b259dd992019120182ad35044c2a96bd8a54d4014), feature partitions, reviews, sources and manifests. The exact 100 workbook UUIDs, original code claims, feature rows, current QIDs and allocated Master Codes agree without name-only or coordinate-only joins. The original code claim is used only after the frozen UUID Registry row has been proven; it is not rebound as a Canonical Master Code.

The repository's pinned candidate-only baseline has 10,369 records in 52 feature partitions with 860 numeric cells; its current candidate delta view has 6,209 numeric cells. The accepted Pilot-100 sample has no admitted candidateKey link, and none of those candidate rows has an exact Pilot QID sourceRef bridge. A final exact-ID sweep did find one historical candidateKey pointer, wikidata:Q270983 (金閣寺), with the same QID as a Pilot POI. Its candidate Feature43 vector and subsequent TASK-073/074/075 review decisions are all null. The crosswalk now records the pointer by exact QID while retaining its candidate-only governance; it adds no numeric observation or promotion. Candidate runtimeImportAuthorized remains false.

The v1.66 Feature43 sheet identifies seven scoring-source families and records score status, old source, review basis and review-item counts. The Registry supplies POI-level source URLs, and B_Feature43_Merge_Audit supplies 19 Pilot-100 merge summaries. The referenced detailed human-review/score source files are not retained in this repository as replayable field-level evidence. Numeric domain and feature-column labels align with the current single Feature43 registry, but 0–9 magnitude/rubric equivalence, field-level locator/hash and old-source rights for runtime use cannot be established. All 4,300 workbook observations are therefore P2 (POI-level source only), not promotion-eligible. High-change crowd, queue, access, season and weather fields have no live/freshness proof.

PR #437 head 0e2dc3ab8b39258eaf3b53b2d40c47f79f96e360 was snapshotted as UNMERGED_DRAFT_REFERENCE, not a second Canonical source. Its 17 inferred values have pinned QID/revision, claim locator/hash and sourceRef summaries (P1); the raw pinned responses and rubric acceptance are not independently revalidated in this repository-only pass. Eight equal the workbook and nine differ. All 17 are in the conflict/review ledger: the differing nine require numeric conflict resolution, and the equal eight still require old-rubric and unmerged Draft governance review. No conflict was averaged, no Draft value was silently accepted, and no existing Canonical value was removed.

## Promotion decision and #437 disposition

Recommendation: **D — recovery is insufficient; keep TASK-087-B and PR #437 Draft.** Do not merge #437 first, close it as superseded, or merge two competing Feature43 overlays. The present recovery overlay v2 is a candidate with runtimeImportAuthorized=false and zero promoted cells; the TASK-083 admission dataset and server-only repository are unchanged. A next evidence/rubric review may reconcile the 17 Draft cells and restore field-level source artifacts for the workbook values. If this requires broad new external POI evidence, open a separate Task rather than expanding TASK-087-B into another enrichment pass.

## Rebuild and QA

- Generator: tools/poi/task-087-legacy-recovery.py, standard-library workbook reader; it never edits the workbook. Run with --check to regenerate all proposed artifacts in memory and byte-compare hashes.
- Identity crosswalk, complete observation ledger, rubric matrix, 4,300 decisions, conflict/unresolved ledgers, provenance audit, source inventory, coverage report and deterministic input/output hashes: docs/qa/TASK-087-B/.
- Proposed 100-row null-preserving candidate overlay and exact-base/hash-bound manifest: src/shared/data/canonical-poi-pilot100.feature43-recovery-v2.json and companion manifest.
- Targeted tests cover exact membership and code binding, no candidate/name-only promotion, 4,300 decisions, duplicated historical observations, 17 conflicts, rubric/provenance, null preservation, manifest/order/tamper gates and artifact hashes.

Local validation: deterministic --check PASS; TASK-087 targeted 9/9; focused Canonical/Detail/Edge/Planning/Preference/governance 619/619; full Node Quality Gate command 2,785/2,785 with the bundled Python available to the legacy offline test. Lint has 0 errors and 10 pre-existing warnings. Typecheck, production build, local deployment validate/build/verify (1,908 artifact files), deployment formatting and changed-document formatting pass. The initial full-suite run without a valid python executable failed one historical offline source-cache test; it also exposed that an unversioned recovery .manifest.json was misclassified by the asset scanner. The manifest was renamed .manifest.v2.json, after which asset tests passed 51/51 and the full suite passed. The Python-command failure was separately reproduced in an unchanged worktree with the exact origin/develop file tree.

The direct TASK-083 admission QA script still fails on this checkout because its stored sampleManifestSha256 is the CRLF form 77e239e0…, while the actual Git blob and this checkout are the LF form 6d6187e5…. An existing separate Windows worktree with the same commit tree materializes CRLF and passes that script. This cross-check is a pre-existing byte-format portability issue in TASK-083, not a TASK-087 identity or admission change; the focused TASK-083/runtime tests and 100/100 exact identities pass. TASK-087 does not rewrite the admission dataset or its manifest to conceal the discrepancy.

Exact-head GitHub Quality Gate: pending final Draft PR push. No network source search or provider bulk retrieval was performed. Feature43 production coverage remains 0/4,300 on develop; PR #437's 17 remain Draft only.
