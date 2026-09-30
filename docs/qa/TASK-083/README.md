# TASK-083-A QA — Real Pilot-100 Canonical Admission

> Current reauthorization (2026-09-30): [Canonical owner correction QA](canonical-owner-correction/README.md). Same 100 members; supporting hash repaired; five final owner decisions; historical admission is not a public-access guarantee.

Authoritative machine artifacts:

- `pilot100-validation.json`: 422 eligible, exactly 100 sampled, 100 active appended codes, 100/100 ADMIT with 14/14 PASS, Feature43 0/4300.
- `pilot100-handoff.json`: exact sample-order 100 internal IDs and Master Codes, dataset/registry/sample/admission/runtime hashes, TASK-081-B entry point.
- `data/poi/canonical/pilot-100/eligible-pool.v1.json`: retained per-row source identity, QID/revision, location and sampling evidence.
- `data/poi/canonical/pilot-100/sample-manifest.v1.json`: deterministic sampler rule and frozen membership/order.
- `data/poi/canonical/pilot-100/allocation-audit.v1.json`: all 15,617 excluded historical/current codes, source checksums and 100 new allocation decisions.
- `data/poi/canonical/pilot-100/admission-results.v1.jsonl`: one existing 14-gate evaluator result per POI.

Read-only repeat:

```bash
node --import ./tests/register-route-ts.mjs tools/qa/task-083-pilot100.mjs
node --import ./tests/register-route-ts.mjs tools/qa/task-083-pilot100.mjs --ids
node --import ./tests/register-route-ts.mjs --test tests/task-083-a-poi-runtime.test.mjs
```

`--ids` prints the exact 100 canonical internal IDs in frozen sample order for TASK-081-B. The QA script refuses a changed workbook hash, changed historical source hash, changed sample membership/order, code collision, non-ADMIT, non-null Feature43 data, unauthorized candidate import or changed handoff artifacts. The runtime test exercises the actual Detail route for all 100 and fail-closed tampering paths.

Rights boundary: Wikidata structured data CC0; workbook source UUID/classification retained as `master_prior` reference-only lineage. No raw source HTML, Provider payload, candidate workbook scoring or Geoshape coordinates enter the runtime dataset. This admission does not certify live venue opening or any 43D value.

The original candidate manifest remains `CANDIDATE_ONLY_NO_CANONICAL_IMPORT` and `runtimeImportAuthorized=false`. The separate Pilot-100 runtime manifest is the sole authorization for these 100 Canonical POIs. TASK-081-B / PR #437 resumes only after explicit TASK-083-A user acceptance.

Historical candidate replay retains SHA-pinned snapshots at `data/poi/full/sources/master-code-registry.task-043.v1.json`, `enrich-candidates.task-068.mjs` and `review-p0.task-070.mjs`. Candidate tools verify their historical inputs against those snapshots and require the live registry to be an append-only extension. No new Canonical POI is imported into candidate runtime.

After normal merge of `develop@ef388cdcd0ff5f15ebd404337b4ed29fb3435058`: full Node regression 2,756/2,756 PASS; focused Pilot runtime/Detail/Search-handoff 5/5 PASS; POI contracts 24/24; Master Code registry 15/15; Region integration 6/6; Planning contracts 21/21. Lint had zero errors (nine existing warnings); typecheck, Next build, local deployment validate/build/verify, formatting and whitespace checks passed. See [Draft PR #444](https://github.com/kanzakimy0/TravelAssist/pull/444) for the exact-head GitHub Quality Gate.
