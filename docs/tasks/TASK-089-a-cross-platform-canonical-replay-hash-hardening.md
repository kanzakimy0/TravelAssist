# TASK-089-A — Cross-platform Canonical Replay Hash Hardening

- Issue: #459
- Owner: A
- WBS: 9.14
- Priority: P0
- Base: latest `develop`
- Branch: `fix/a-canonical-replay-cross-platform-hash`
- Auto-merge: No

## Goal

Make TASK-083 Canonical Pilot replay deterministic across LF and CRLF worktrees without changing Canonical identities, Master Codes, sample membership, admission decisions, trusted Feature43 baseline, or runtime semantics.

## Root cause

TASK-083 currently uses raw working-tree byte SHA-256 for text artifacts such as the sample manifest. The recorded hash came from a CRLF materialization while LF checkouts produce different bytes for equivalent text content.

This is a QA/hash portability defect, not a data identity defect.

## Required fix

1. Introduce an explicit versioned stable text hash contract:
   - UTF-8 text
   - normalize CRLF and lone CR to LF before hashing
   - or canonical semantic JSON/JSONL hashing where safer
   - record algorithm/version in metadata.

2. Keep raw-byte SHA-256 for true binary inputs such as XLSX.

3. Update TASK-083 generation/replay:
   - stable text hash for generated JSON/JSONL/text artifacts;
   - normalized text comparison for replay checks;
   - no checkout-specific byte equality for text.

4. Add a correction audit artifact recording:
   - historical recorded hash;
   - actual Git/LF hash;
   - new stable hash;
   - algorithm/version;
   - 100 IDs unchanged;
   - 100 Master Codes unchanged;
   - sample order unchanged;
   - admission decisions unchanged.

5. If runtime manifest/handoff hash fields are corrected, mark this explicitly as metadata correction and update all dependent hashes deterministically.

6. Regression tests:
   - LF fixture and synthetic CRLF fixture produce identical stable hash;
   - binary bytes with one-byte change produce different raw hash;
   - TASK-083 replay passes on normalized LF and CRLF text;
   - Canonical identity and runtime tests remain unchanged.

## Non-goals

- no POI re-admission
- no Feature43 changes
- no trusted baseline changes
- no scoring changes
- no Master Code reallocation
- no data re-sampling

## Validation

Run:
- TASK-083 QA/replay
- TASK-088 baseline tests
- Canonical POI tests
- governance tests
- full Node regression
- lint
- typecheck
- build
- deployment validate/build/artifact
- format
- git diff --check

Exact-head Quality Gate required.

## Deliverables

- RESULT-TASK-089-a-cross-platform-canonical-replay-hash-hardening.md
- docs/qa/TASK-089-A/
- stable text hash helper/tests
- TASK-083 replay update
- metadata correction artifact
- WBS update

Draft PR only.