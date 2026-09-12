# TASK-044-A — Canonical Master Code Registry Governance Acceptance

## Review target

- Repository baseline: `origin/develop` at `065e74d6ed7e9ff87de37192d350efbd73c95672`
- Candidate branch: `codex/a-master-code-registry`
- Candidate head: `3cac68b89097db9853ae881b43c8675b329e12dd`
- Candidate pull request: #326, Open / Draft at review start
- Upstream issue: #311, Open at review start
- Acceptance issue: #347, Open at review start

The review was performed in the isolated `codex/a-master-code-governance-acceptance`
worktree. The latest `origin/develop` was merged into that review branch so the
candidate could be tested against the current repository baseline. PR #326 itself
was not modified, retargeted, merged, or closed.

## Independent review method

The acceptance did not rely on the TASK-043 Result as evidence. It independently:

1. loaded the canonical JSON registry and parsed it through the public validator;
2. compared TASK-041's 50 source Region identities with the TASK-043 allocation
   manifest and the active registry entries;
3. projected those allocations onto the unchanged partial graph to test the
   production-complete zero-null rule;
4. exercised independent negative mutations for uniqueness, lifecycle,
   supersession, immutability, append-only, identifier safety, and fail-closed
   resolution;
5. compared candidate changes with `origin/develop` to audit the change boundary;
6. reran focused and repository regression suites.

Machine-readable evidence is in `registry-invariant-check.json`.

## Governance consistency

The candidate reuses the repository's existing five-digit segmented Master Code
namespace. It does not introduce a second grammar. The following values are
rejected as canonical Master Codes:

- `JP-RG-*`, `JP-PREF-*`, and `JP-MACRO-*` side-channel identifiers;
- destination IDs such as `jp-tokyo`;
- administrative, transport-node, POI, AI-local, and database identifiers.

The registry remains a governance candidate until owner approval. This acceptance
does not label it Frozen.

## Single source of truth

`src/shared/data/master-code-registry.v1.json` is the only hand-maintained
allocation registry found in the candidate. TypeScript resolvers and validators
load that file; they do not maintain a second handwritten allocation list.
`docs/qa/TASK-043/region-allocation-50.json` is a generated/auditable consumer
manifest and is not an allocation authority.

## Registry invariants

- 51 total entries: 1 reserved sentinel and 50 active Region allocations.
- 51/51 unique Master Codes.
- 50/50 unique active entity allocations.
- All codes conform to the inherited five-digit ASCII grammar and permitted
  segmented ranges.
- Active allocation changes fail immutability checks.
- Removal/rewrite fails the append-only comparison.
- Deprecated codes cannot be recycled.
- Missing supersession targets and supersession cycles fail closed.
- Unknown lifecycle values, malformed codes, unsafe entity references, unknown
  codes, and identifier-family masquerading all fail closed.

No objectively necessary correction was found in TASK-043-owned governance code,
data, or tests.

## Region allocation acceptance

- Source TASK-041 Region nodes: 50.
- Allocation rows: 50.
- Region IDs preserved exactly: 50/50.
- Unique canonical Master Codes: 50/50.
- Active registry resolution: 50/50.
- Unknown Region references: 0.
- Null Master Codes in allocation manifest: 0.
- TASK-041 graph topology files changed by TASK-043: 0.

The allocation manifest therefore satisfies the governance gate without changing
Region identity or graph topology.

## Consumer contract decision

Option A, `masterCode: string | null`, is acceptable with the documented
publication gate:

- `null` is allowed only for explicitly Partial, draft, or unallocated
  intermediate Region data;
- production-complete Region data requires zero `null` values;
- every non-null value must resolve to an active canonical registry entry;
- `null` is not a valid final production allocation state.

The existing TASK-041 partial graph has 50 null values. Applying the reviewed
allocation manifest produces a 50-node production projection with 0 null values
and 50/50 active resolutions. Performing that integration remains a separate task
after owner approval and merge of PR #326.

## Change-boundary audit

The candidate does not change TASK-041 graph topology, Planner/Step UI, database
schema or migrations, Candidate Pipeline, POI production allocations, or unrelated
identifier families. TASK-044 adds only independent acceptance tooling, tests,
evidence, Result, and WBS tracking.

## Validation

- TASK-044 focused: 5/5 passed.
- TASK-043 focused: 15/15 passed.
- TASK-041 Region Graph: 17/17 passed.
- Planning Contracts: 21/21 passed.
- Planning Soak: 6/6 passed.
- Routing: 28/28 passed.
- Trip / Engine focused: 124/124 passed.
- Canonical full Node regression: 2459/2459 passed with full local filesystem
  access. A restricted-sandbox run first produced four esbuild path-access errors;
  the identical command passed after removing that environment restriction.
- ESLint: passed.
- TypeScript: passed.
- Production build: passed.
- TASK-owned Prettier: passed.
- `git diff --check`: passed.

## Owner gate

The candidate is technically ready for owner approval. PR #326 must remain Open /
Draft until the owner authorizes its merge. Issues #311 and #347 remain Open, WBS
2.18 remains `待审查`, and WBS 4.48 remains `Partial`. No TASK-041 integration or
Candidate Pipeline work was started.

ACCEPT
