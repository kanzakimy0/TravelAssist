# TASK-081-B — Real 100 POI Pilot

## Goal

Run a production-like pilot on **100 real Japan POIs** using the current Canonical POI / Feature43 pipeline. This is an evidence-producing pilot, not a mock/fixture exercise.

## Base

- Repository: `kanzakimy0/TravelAssist`
- Required base: latest `origin/develop`
- Base observed when task was created: `4c7048c4c388068daa0aa49172f6333ac7e262dc`
- Do not copy or redefine the Canonical POI schema.
- Reuse the current canonical identity, Feature43 definitions, evidence/provenance rules and quality gates already in the repository.

## Scope

Select exactly **100 real POIs** from the current canonical Japan POI inventory.

The sample MUST be deterministic and reproducible. It must not cherry-pick easy/high-profile POIs. Prefer an existing stable ID ordering/manifest and record the exact selection rule and the 100 IDs.

The sample must include:
- multiple prefectures / municipalities;
- multiple POI categories;
- major/iconic POIs and ordinary/long-tail POIs;
- records with different current completeness/confidence states.

If repository data cannot satisfy one of these strata, document the limitation rather than silently substituting synthetic data.

## Required execution

For all 100 POIs:

1. Resolve/confirm canonical identity and stable POI ID.
2. Run the repository's real enrichment path.
3. Populate/evaluate all **43 Feature43 dimensions** according to the existing field definitions.
4. Preserve per-field provenance/evidence/confidence where the current contract supports it.
5. Do **not** fabricate a score to achieve 43/43 coverage.
6. Do **not** mass-copy defaults/templates across POIs.
7. When evidence is insufficient, retain the canonical unresolved/unknown/low-confidence representation and count it explicitly.
8. Validate output against the current Canonical POI / Feature43 schema and existing quality gates.
9. Verify the resulting records can be consumed by the current downstream POI data path. If the runtime repository/search endpoint is still intentionally unavailable, prove compatibility at the nearest authorized boundary and report the blocker instead of bypassing it.
10. Produce machine-readable pilot artifacts plus a human-readable result report.

## Pilot artifacts

Create or update repository-appropriate artifacts containing at minimum:

- exact 100 POI IDs and names;
- deterministic selection rule;
- before/after completeness for each POI;
- 43-field completion matrix;
- unresolved fields and reasons;
- evidence/provenance coverage;
- confidence distribution;
- validation errors;
- duplicate/identity conflicts;
- source failures;
- runtime/downstream compatibility result.

Do not commit secrets, paid API keys, private tokens, browser profiles, caches, or raw third-party copyrighted dumps.

## Acceptance gates

The task is PASS only if:

- exactly 100 real canonical POIs were processed;
- 100/100 identities are traceable to canonical IDs;
- the same selection rule reproduces the same sample;
- every POI has an explicit state for all 43 dimensions;
- no fabricated/default-filled values are used to fake completeness;
- schema validation completes for 100/100 records;
- duplicate/identity conflicts are zero, or every conflict is explicitly quarantined and the Pilot is marked PARTIAL;
- evidence/provenance and confidence statistics are reported;
- a field-by-field missing/unresolved summary is reported;
- downstream compatibility is actually tested at the authorized boundary;
- repository lint/typecheck and all relevant POI tests/gates pass;
- a RESULT file is committed.

A result with unresolved Feature43 fields may still be useful, but it must be reported truthfully. Do not call the data “43/43 complete” unless all 43 values satisfy the repository's evidence and confidence requirements.

## Required result

Write:

`docs/tasks/RESULT-TASK-081-b-real-100-poi-pilot.md`

The result must include:

- Status: PASS / PARTIAL / BLOCKED / FAIL
- base SHA, branch, final commit, PR
- exact selection algorithm and sample artifact path
- processed / succeeded / failed counts
- Feature43 total cells = 4,300
- resolved, unresolved and low-confidence cell counts
- per-field coverage table (43 rows)
- evidence/provenance coverage
- identity/duplicate findings
- validation and quality-gate outputs
- downstream compatibility test
- top failure modes
- recommendation for the next production batch

## Stop conditions

Stop and report BLOCKED rather than inventing data if:
- canonical source inventory cannot be located;
- Feature43 contract cannot be located;
- required authorized source/runtime credentials are absent;
- the real enrichment path cannot legally/technically access its required sources.

Do not silently replace a real-source run with fixtures.

## Git / PR rules

- Work in an isolated branch/worktree.
- Never use `git clean -fd`, `git reset --hard`, force push, or destructive cleanup.
- Preserve unrelated local changes.
- Commit Task/Result/artifacts.
- Open a **Draft PR** to `develop`.
- Do **not** merge and do **not** enable auto-merge.
