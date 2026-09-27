# WBS 7.4.1 — Real 100 POI Canonical Admission + Runtime Import Gate

Date: 2026-09-27  
Task: TASK-083-A  
Issue: #438  
Owner: A  
Priority: P0

## Why this sub-WBS exists

WBS 7.4 established the Canonical POI contract and Candidate Admission rules, but TASK-081-B proved that there is still no admitted real application Canonical POI inventory:

- Master Code Registry POI allocations = 0;
- v1.66 contains real rows but is not itself Canonical admission;
- candidate enrichment remains `CANDIDATE_ONLY_NO_CANONICAL_IMPORT`;
- the merged POI Detail API still has no real runtime datasource.

WBS 7.4.1 is the bridge from contract to first real runtime Canonical inventory.

## Scope

Exactly 100 real v1.66 POIs:

`real row -> identity/evidence -> Master Code -> 14-gate ADMIT -> CanonicalPoiDatasetV1 -> runtime repository`

Then hand the exact 100 IDs back to TASK-081-B.

## State

**A / 进行中** by user authorization on 2026-09-27.

Completion requires:

- 100/100 ADMIT;
- 100 active conflict-safe POI Master Code allocations;
- canonical dataset validation PASS;
- separately authorized Pilot-100 runtime manifest;
- runtime repository + real Detail API smoke;
- exact handoff to TASK-081-B;
- full QA + exact-head Quality Gate;
- user acceptance and merge before marking 已完成.

## Boundary

This WBS does not score the 4,300 Feature43 cells and does not import the remaining 10k+ candidate/workbook rows.
