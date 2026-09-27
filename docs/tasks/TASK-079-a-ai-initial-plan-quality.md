# TASK-079-A — AI Initial Itinerary / Recommendation Explanation / Quality Benchmark

> Issue: #421
> WBS: 6.7 / 6.9 / 6.12
> Owner: A
> Priority: P0
> Branch: `codex/a-ai-initial-plan-quality`

## Hard gate

Do not implement until all are accepted/merged:
- WBS 7.4 Canonical POI;
- WBS 7.9 recommendation scoring;
- PR #372 Candidate Pipeline latest-develop resync/acceptance;
- Candidate Retrieval + Planner Solver/Validator/Ranking runtime;
- TASK-077-A.

## Goal

Implement AI initial itinerary generation as orchestration over deterministic Planning services; implement evidence-backed recommendation explanation; establish AI quality/Golden benchmark.

AI must not replace feasibility or ranking.

## Flow

```text
User Intent
↓
Context Builder
↓
Candidate Retrieval
↓
Recommendation / Planner
↓
Validator
↓
Ranking
↓
Structured Reason/Evidence
↓
AI Explanation
```

## Explanation

Every user-facing reason must map to structured reason/evidence/delta. No unsupported claims.

## Quality benchmark

Include:
- first-time Tokyo/Kyoto/Osaka;
- walking-sensitive/senior/family;
- no-solution;
- stale/expired facts;
- route/provider failure;
- preference conflict;
- explanation grounding;
- deterministic replay fixtures.

## Acceptance

Initial plan uses only validated/ranked candidates, no fabricated facts, explanations are evidence-grounded, benchmark gates pass, and AI provider failure degrades without corrupting Planner output.
