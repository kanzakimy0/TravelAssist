# TASK-048-A Candidate Pipeline Pilot Report

## Outcome

Completed / Candidate Pipeline reference ready for human review.

## Scope

- 14 deterministic Pilot scenarios.
- 10 ordered stages from Region Candidate through Top-N.
- Contract-valid POI fixtures only; no production POI identity or scoring claim.
- Region Graph revision: `task-041-japan-pilot-2026-09-11-r2` (50 nodes).
- AI calls, provider calls and production DB writes: 0.

## Acceptance

| Gate                                   | Result |
| -------------------------------------- | -----: |
| deterministicRepeat                    |   true |
| byteStableNormalizedResult             |   true |
| hardRejectBypass                       |      0 |
| mustGoSilentlyDropped                  |      0 |
| needsFactSilentlyPromoted              |      0 |
| danglingRegionPoiCandidateRefs         |      0 |
| improperParetoSurvivors                |      0 |
| diversityResurrectedRejectedCandidates |      0 |
| unboundedLoopOrRetry                   |      0 |
| decisionTraceStageCoveragePercent      |    100 |
| aiOrProviderCalls                      |      0 |
| productionDatabaseWrites               |      0 |
| scoringParameterChanges                |      0 |
| regionGraphSemanticChanges             |      0 |
| masterCodeGovernanceChanges            |      0 |
| plannerOrStepUiChanges                 |      0 |
| allDiagnosticsPass                     |   true |
| negativeCasesRejected                  |   true |

## Boundary

No Human Gold, TASK-039 reviewer answer, candidate-0457 result, production scoring
weight, Region Graph semantic, Master Code governance, Planner/Step UI or DB
migration was read or changed. The score input is an explicit Pilot projection
boundary and does not freeze production calibration.
