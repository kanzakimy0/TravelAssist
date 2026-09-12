# TASK-043 Master Code Governance Decision

## Decision

**A reusable canonical namespace scheme already exists.** TASK-043 reuses the
five-digit ranges in `trip-engine-poi-ai-provider-design-v0.3.md#8` and does not
introduce a parallel numbering grammar.

What was missing was a canonical entity-allocation registry. TASK-043 adds that
repository-owned source, lifecycle model, transition guard, resolvers, and the
first 50 Region allocations as a **Governance Candidate / pending human
review**.

## Evidence matrix

| Audit area                | Evidence                                                          | Finding                                                                    |
| ------------------------- | ----------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Number grammar            | `trip-engine-poi-ai-provider-design-v0.2.md#8`, inherited by v0.3 | Five-digit ranges already defined; reuse required                          |
| Canonical allocation data | tracked registry-like files and all `Master Code` references      | No entity-to-code allocation registry existed before TASK-043              |
| Region consumer           | `TravelRegionNodeV1`, graph parser, TASK-041 fixtures             | `masterCode` is nullable pending canonical allocation                      |
| Rejected history          | TASK-041 master-code audit                                        | 35 side-channel codes, 14 destination IDs, and 1 country code were cleared |
| POI consumer              | POI master schema v0.1/v0.2                                       | Requires existing Master Code workflow; does not provide allocations       |
| Route consumer            | canonical Route contracts                                         | Route IDs and Provider facts are distinct; no Master Code registry         |
| Asset consumer            | asset registry/manifests                                          | Asset identifiers are a separate namespace                                 |
| Database                  | migrations and ORM mirror                                         | No production Master Code table or migration; TASK-043 does not add one    |

## Candidate allocation policy

- Preserve the five-digit grammar and range meaning.
- Allocate sequentially inside a type-compatible range without encoding names.
- Use opaque Region identity as `entityRef`, never as the code value.
- Keep reserved, active, deprecated, and superseded history in one registry.
- Require provenance, reason, and revision metadata for every entry.
- Validate both a single registry snapshot and revision-to-revision transitions.
- Generate downstream allocation manifests; do not maintain a second handwritten
  list.

## Region decision

The 50 TASK-041 nodes all have a candidate active allocation. Region IDs remain
unchanged. No destination, administrative, transport, POI, country, AI, or
database identifier is reused as the Master Code.

Country and macro-area nodes use the inherited `00100–00999` large-Region
range. This interpretation and all concrete allocations require human review;
they are not Frozen by this document.

## Nullable contract recommendation

Recommend Option A for the current revision: nullable only while allocation is
pending, with a strict publication gate requiring 50/50 active resolution.
Option B remains a valid future breaking migration if Consumer Review prefers a
separate draft representation. TASK-043 makes no shared contract change.

## Outcome

`Completed / Registry candidate ready for human review` is appropriate once
tests and CI pass. WBS 2.18 remains `待审查` until human review and merge. WBS
4.48 remains Partial until TASK-041 separately integrates and validates the
approved registry.
