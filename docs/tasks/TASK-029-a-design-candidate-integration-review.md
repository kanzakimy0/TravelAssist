# TASK-029-A — 0.9 / 1.10 / 1.12 / 1.13 Design Candidate Integration Review

- Issue: #259
- Owner: A / Integration Review
- WBS under review: 0.9, 1.10, 1.12, 1.13
- Original owners remain unchanged
- Status: Ready

## Objective

Perform one cross-document integration review of four pending design candidates and identify contradictions before more A-line implementation depends on them.

## Sources

- cross-module Contract handoff rules (0.9)
- attraction/activity tag display rules (1.10)
- map visual / Pin / region / route spec (1.12)
- main-system Design Tokens (1.13)
- current Home/Start/Planner/Detail/Personal Center implementation
- current WBS and relevant Result history

## Deliverables

Create `docs/reviews/design-candidate-integration-review-20260909.md` containing:

- source/version/PR matrix;
- conflict matrix;
- compatibility with current runtime;
- contradictions vs already accepted user decisions;
- required minimal amendments;
- downstream impact on 1.14 / 1.17 / 1.20 / 7.2 / 4.x;
- explicit `PASS / CHANGES_NEEDED / USER_DECISION_REQUIRED` per candidate.

Where an objective documentation inconsistency can be fixed without product judgment, apply a minimal patch to the relevant candidate branch or report the exact patch required. Do not silently rewrite product decisions.

## Completion rule

This review cannot itself mark 0.9/1.10/1.12/1.13 `已完成`. Final design acceptance remains a user decision.

## Final result rules

Before returning:

- update the task Result;
- update the current Master WBS truthfully;
- synchronize Issue/PR tracking;
- commit and push all task-owned changes;
- report exact commands/tests run and exact Deferred items;
- stop. Do not start the next task automatically.
