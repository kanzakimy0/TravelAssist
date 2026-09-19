# TASK-043-A Result

## Status

Completed / Registry candidate ready for human review.

- WBS 2.18: `待审查`
- Issue #311: Open
- Governance status: `candidate_pending_human_review`
- Automatic merge: not performed
- TASK-041 / WBS 4.48: remains Partial
- Candidate Pipeline: not started

## Base

- Repository: `kanzakimy0/TravelAssist`
- Base branch: `origin/develop`
- Base SHA: `163c4c4e5788e0cf2920a5187c63952db00349cc`
- Implementation branch: `codex/a-master-code-registry`
- Workspace: independent clean worktree; the main Planner / Step workspace was
  not switched, stashed, reset, cleaned, or modified

## Repository-wide Audit

The audit covered repository references to `Master Code`, `masterCode`, and
`master_code`; registry-like files; identifier namespaces; lifecycle/history
semantics; Region, POI, Route, Asset, destination and administrative identities;
and current consumer contracts.

Conclusion:

- A reusable five-digit canonical namespace grammar already existed in
  `trip-engine-poi-ai-provider-design-v0.3.md#8`.
- No repository-owned entity-to-Master-Code allocation registry existed before
  TASK-043.
- TASK-043 reuses the existing ranges and does not introduce a second numbering
  grammar.
- TASK-041 had cleared 35 side-channel codes, 14 destination IDs, and one
  country code; none are restored.

Machine-readable evidence:
`docs/qa/TASK-043/master-code-audit.json`.

## Governance Candidate

The new governance candidate establishes:

- exactly five ASCII digits with inherited range semantics;
- one hand-maintained canonical registry source;
- `reserved`, `active`, `deprecated`, and `superseded` lifecycle states;
- globally unique Master Codes;
- unique active `(entityType, entityRef)` allocation;
- append-only history and immutable allocated identity;
- no recycling after deprecation;
- required provenance, allocation reason, and revision metadata;
- valid, identity-preserving, acyclic supersession;
- fail-closed current-registry and registry-transition validation.

This is not declared Frozen. Human governance review is required.

## Canonical Registry

- Source of truth: `src/shared/data/master-code-registry.v1.json`
- Public module: `src/shared/master-code/index.ts`
- Schema: `MasterCodeEntryV1` / `MasterCodeRegistryV1`
- Registry revision: `task-043-candidate-r1`
- Total entries: 51
- Reserved entries: 1 (`00000` sentinel)
- Active Region entries: 50
- Duplicate Master Codes: 0
- Duplicate active entity allocations: 0

Generated QA reports are derived views and are not a second registry.

## Resolver / Validator

Implemented:

- `resolveMasterCode(masterCode)`;
- `resolveActiveMasterCodeByEntity(entityType, entityRef)`;
- `parseMasterCodeRegistryV1(input)`;
- `validateMasterCodeRegistryTransitionV1(previous, next)`;
- `validateRegionAllocationManifestV1(...)`.

Unknown values resolve to `null`; malformed input and invalid lifecycle or
namespace state fail closed.

## TASK-041 Region Allocation

- Source Region graph: merged TASK-041 QA data, read-only
- Region allocations: 50 / 50
- Unique Region IDs: 50
- Unique canonical Master Codes: 50
- Unresolved allocations: 0
- Region IDs preserved in original order: yes
- `regionId` values modified: no
- Destination IDs reused as Master Codes: 0
- Administrative IDs reused as Master Codes: 0
- Transport IDs reused as Master Codes: 0
- Rejected legacy prefixes restored: 0

The independent generated manifest is
`docs/qa/TASK-043/region-allocation-50.json`. TASK-041 data and PR history were
not modified.

## Consumer Impact / Nullable Decision

Recommendation, pending Consumer Review: **Option A**.

`TravelRegionNodeV1.masterCode` remains `string | null`. `null` means allocation
pending and is allowed only in explicitly Partial/draft data. Production
completeness requires zero nulls and active registry resolution for every
canonical Region.

Option B would require a breaking split between canonical non-null Region nodes
and a separate unresolved/draft representation. The affected consumers,
migration, validators, fixtures, persistence, and completeness semantics for
both options are recorded in `docs/qa/TASK-043/consumer-impact.json`.

- Shared Region contract changed by TASK-043: no
- Breaking consumer change in this PR: no
- Decision frozen: no

## Negative Coverage

Focused tests fail closed on all required families:

1. duplicate Master Code;
2. duplicate active entity allocation;
3. code recycling after deprecation;
4. missing superseded target;
5. supersession cycle;
6. unknown lifecycle;
7. malformed code;
8. entityRef whitespace/control characters;
9. unknown Region allocation;
10. rejected legacy side-channel code;
11. destination ID masquerading as Master Code;
12. administrative ID masquerading as Master Code.

Additional coverage verifies append-only history, active allocation
immutability, deterministic generated reports, exact 50/50 allocation, and both
resolver paths.

## Validation

| Check                             | Result                                     |
| --------------------------------- | ------------------------------------------ |
| `npm ci`                          | Pass; 395 packages installed               |
| TASK-043 focused                  | Pass, 15 / 15                              |
| Planning Contracts                | Pass, 21 / 21                              |
| Planning Soak                     | Pass, 6 / 6                                |
| Routing                           | Pass, 28 / 28                              |
| Trip / Engine contract regression | Pass, 124 / 124                            |
| Full Node regression              | Pass, 1564 / 1564                          |
| `npm run lint`                    | Pass                                       |
| `npm run typecheck`               | Pass                                       |
| `npm run build`                   | Pass; 19 static-generation pages completed |
| TASK-owned Prettier               | Pass                                       |
| `git diff --check`                | Pass                                       |

Node emitted the repository's existing typeless-package ESM performance
warning during direct TypeScript test imports. It did not affect test results
and TASK-043 does not change package module mode.

## Files Changed

- `src/shared/data/master-code-registry.v1.json`
- `src/shared/master-code/index.ts`
- `src/shared/master-code/registry.ts`
- `src/shared/master-code/types.ts`
- `src/shared/master-code/validation.ts`
- `tools/qa/master-code-registry.mjs`
- `tests/task-043-master-code-registry.test.mjs`
- `docs/architecture/master-code-registry-v0.1.md`
- `docs/qa/TASK-043/master-code-audit.json`
- `docs/qa/TASK-043/master-code-governance-decision.md`
- `docs/qa/TASK-043/region-allocation-50.json`
- `docs/qa/TASK-043/registry-validation.json`
- `docs/qa/TASK-043/consumer-impact.json`
- `docs/tasks/TASK-043-a-master-code-registry.md`
- `docs/tasks/CODEX-TASK-043-a-master-code-registry-command.md`
- `docs/tasks/RESULT-TASK-043-a-master-code-registry.md`
- `docs/project/WBS-2.18-master-code-registry-amendment.md`
- `docs/project/WBS-TravelAssist.md`
- `package.json`

No Planner, Step, Trip Detail, production database, migration, Provider, AI, or
UI file was modified.

## WBS Update

WBS 2.18 is added as:

`待审查（TASK-043-A；Issue #311；Governance Candidate；50/50 Region allocation）`

WBS 4.48 remains Partial and is not automatically completed by this task.

## Tracking

- Issue: #311, remains Open
- Implementation commit: `8f450d4`
- Draft PR: [#326](https://github.com/kanzakimy0/TravelAssist/pull/326),
  `codex/a-master-code-registry` → `develop`
- Draft PR state: Open / Draft
- GitHub CI: Pass on `d2ce0a9` (`Install, test and build` and merge-eligibility
  checks both succeeded)

## Follow-ups

After human review and merge of TASK-043, TASK-041 must separately integrate the
50 allocations, rerun its full graph regression and CI, and receive its own
human review. That follow-up is not part of TASK-043.

## Blockers / Known Limitations

- No implementation blocker.
- Concrete allocations and the nullable recommendation remain governance
  candidates until human review.
- No Production DB representation exists by design.
- POI and transport ranges are modeled for validation but receive no production
  allocations in this task.
