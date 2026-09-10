# TASK-038 100 POI Scoring Pilot

## Decision

Pilot completed / calibration candidate eligible for human review.

This is measured pilot evidence, not a production parameter freeze.

## Evidence boundary

- Identity: 100 traceable Wikidata entities (CC0) with linked English Wikipedia pages. No descriptions or media were copied.
- Features: editorial calibration labels derived from the verified identity and coarse archetype classification; they are not live facts. Unsupported attributes remain null.
- Visit profiles: 55 identity-supported visit-mode shells with unsupported numeric fields kept null. Duration sensitivity is demonstrated only by an explicitly synthetic contract invariant fixture, never attached to a real POI.
- Benchmark: 288 machine-authored pairwise/indeterminate judgments independent of candidate parameters; every row requires human review.
- Runtime: offline and deterministic. No LLM, paid provider, route, weather, booking, inventory, or production database call.

## Distribution

- Regions: 9; prefectures: 37.
- High burden 31; low burden 24; iconic 52; hidden/local 42; crowded/queue-prone 29.
- Tokyo + Kyoto + Osaka: 24; largest prefecture: 10.

## Experiment

- Scenarios: 12. Pairwise judgments: 288 (168 calibration, 96 untouched holdout, 24 indeterminate diagnostics).
- Split: 80 calibration / 20 holdout by stable SHA-256 identity hash.
- Search: 720 bounded candidates; selection used calibration only.
- Candidate: candidate-0457; gamma 2.5; weights {"benefit":0.8,"suitability":1,"cost":0.8,"risk":0.8}; coverage exponent 0; confidence strength 0.
- Calibration high agreement 100.0%; high+medium 99.4%.
- Holdout high agreement 100.0%; high+medium 98.6%.
- Semantic invariants: 12/12.

## Bias and limitations

The sample satisfies the geographic caps, but it is biased toward entities with English open-knowledge coverage. Feature and benchmark labels are editorial and have not yet received independent human adjudication. Numeric Visit Profile facts remain unknown rather than being invented. This candidate may proceed only to human review; it must not be promoted to production from this Pilot alone.

## Follow-up (not started)

Run blinded human review of annotations and pairwise judgments, then issue a new version before any production freeze.
