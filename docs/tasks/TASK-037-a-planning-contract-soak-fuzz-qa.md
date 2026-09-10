# TASK-037-A — Planning Contract Soak / Fuzz / Consistency QA

> Issue: #297  
> WBS: **9.13 — Planning Contract Soak / Fuzz / Consistency QA**  
> Owner: **A — Main Travel System / Shared QA**  
> Priority: **P0 QA**  
> Mode: **Night unattended / fail-closed / no auto-merge**  
> Publication base: `e8cf842ac8b51f89bd6445ec9a2d2f822b767fe1`  
> TASK-036 PR: #293 (Draft at publication)

---

## 1. Goal

Harden the new Trip Planning public contracts before the real 100-POI scoring pilot by running a deterministic, unattended QA pass that stresses parsers, cross-contract invariants, JSON wire behavior and synthetic scale.

This Task is intentionally designed for overnight execution:

```text
latest develop compatibility merge
→ static contract inventory
→ deterministic mutation/fuzz suite
→ cross-contract invariant matrix
→ JSON round-trip checks
→ repeated/soak execution
→ synthetic scale observations
→ full repository regression
→ coverage report
→ Result + WBS + Draft PR
→ STOP
```

No human decision should be required during execution. Any semantic conflict with a newer canonical/frozen contract must stop the Task as `Blocked` rather than guess.

---

## 2. Dependency / stacked rule

TASK-036 review-fix semantic head:

```text
e8cf842ac8b51f89bd6445ec9a2d2f822b767fe1
```

At publication, its three review invariants are:

1. `EXPIRED` Fact cannot use `USE` / `USE_WITH_WARNING`.
2. `PoiPlanningProjectionV1.poiRef` must equal the nested FeatureSet and all VisitProfile `poiRef` values.
3. `RouteCompactV1.source=planning_prior` cannot carry exact arrival/departure minutes.

PR #295/#296 have already placed the earlier TASK-036 contract foundation and P0 design documents into `develop`; review-fix #293 remains separate at publication.

Implementation rules:

1. Create `codex/a-planning-contract-soak-qa` from the latest `origin/codex/a-trip-planning-contract-foundation` if PR #293 remains unmerged.
2. Immediately merge latest `origin/develop` into the TASK-037 implementation branch using a normal merge.
3. Preserve the three TASK-036 review invariants above.
4. Do not modify, merge, close, force-push or retarget PR #293.
5. TASK-037's own Draft PR should target `codex/a-trip-planning-contract-foundation` while #293 remains unmerged. If #293 is already merged when execution starts, create from latest `develop` and target `develop` instead.
6. Never force-push.

---

## 3. In scope

### A. Contract coverage inventory

Produce a machine-readable and Markdown matrix mapping:

```text
P0 design concept
→ public TypeScript contract
→ parser/validator
→ positive fixture
→ negative fixture
→ test case
→ status
```

Cover at least:

- 43 POI Feature dimensions
- Effective / Sparse Preference
- Visit Profile / POI Projection
- Region Graph / TravelEdge
- Score / Feasibility
- Candidate Pipeline
- AI Compact Context / Local IDs
- AI Decision / Patch
- Replanning
- Fact Freshness / Provenance
- DecisionRun Trace / Telemetry
- canonical Trip / Route compatibility exports

Output:

```text
docs/qa/TASK-037/planning-contract-coverage.md
docs/qa/TASK-037/planning-contract-coverage.json
```

Do not claim semantic coverage from file existence alone. Each row must identify a concrete parser and test/fixture where applicable.

### B. Deterministic seeded mutation/fuzz harness

Add a dependency-free seeded generator. Do not add Jest, Vitest, fast-check or any new runtime/dev dependency solely for this Task.

Preferred location:

```text
tools/qa/planning-contract-fuzz.mjs
```

or repository-equivalent.

Requirements:

- deterministic PRNG with explicit seed;
- same seed + same source tree → same case sequence and report;
- mutate valid synthetic fixtures rather than creating random unstructured noise only;
- parser failures must return safe `{ path, code }`-style results and must not leak the raw input;
- unexpected thrown exceptions are failures;
- no external I/O except writing QA reports;
- no network;
- no credentials.

Mutation families should include, where applicable:

```text
unknown field
missing field
wrong contract version
wrong enum
NaN / Infinity
negative number
upper-bound overflow
wrong nullable semantics
empty/oversized string
invalid ID whitespace/control chars
duplicate IDs
dangling refs
cross-POI identity mismatch
contains cycle
reverse symmetric relation duplicate
range ordering violation
invalid score >99
invalid coverage/confidence
AI run/task mismatch
AI unknown Local ID
AI non-candidate selection
AI status/payload conflict
AI forbidden operation
planning_prior exact timetable claim
EXPIRED + USE
protected replan overlap
forbidden raw/provider/secret-like trace field
```

Target a meaningful volume such as several thousand deterministic mutations across the public parsers, but keep CI runtime reasonable. Exact case count is an implementation choice and must be reported.

### C. Parser safety invariants

For every public parser exercised by the harness, verify:

```text
valid fixture → success
invalid mutation → fail closed where expected
no uncaught parser exception
failure issue contains only safe path/code fields
failure issue does not echo input object/value
```

Do not implement heuristic secret scanning here; strict schema rejection is the boundary.

### D. JSON wire round-trip

For wire-safe positive fixtures:

```text
fixture
→ JSON.stringify
→ JSON.parse
→ parser
```

must preserve validation and intended semantics, including:

- Feature `0` distinct from `null`;
- Effective Preference explicit `5`;
- Sparse Preference omit-5;
- Local ID values;
- `EXPIRED` Fact metadata;
- null optional fields;
- revision numbers and codebooks.

Do not test non-JSON values as valid wire payloads.

### E. Repeated/soak determinism

Run the focused planning QA repeatedly with multiple fixed seeds. The run must be unattended and bounded.

Requirements:

- deterministic seed list checked into the test/harness or generated from one root seed;
- record cases/run, total cases, failures, elapsed time;
- repeat enough times to expose state leakage but not create an hours-long CI job;
- no random use of `Math.random()` unless seeded/wrapped deterministically;
- repeated execution must not mutate exported fixture singletons or global contract state.

If fixture mutation leakage is detected, fix Task-owned test/harness code or contract parser cloning behavior without changing business semantics.

### F. Synthetic scale observations

Run provider-free synthetic scale checks for representative structures, for example:

```text
POI projections: 100 / 1,000
Candidate records: 100 / 1,000 / 5,000
Region graph: small / medium synthetic sparse graph
DecisionTrace: bounded fact/stage/provider arrays
```

Measure and report:

```text
input count
elapsed ms
approx serialized bytes
success/failure
```

This Task must **not freeze production performance thresholds**. Use the data as observational baseline only. A catastrophic hang, stack overflow or unbounded memory pattern is a Task failure; ordinary machine-to-machine timing variation is not.

Do not create a dense all-to-all Region Graph merely for the benchmark; keep the synthetic graph sparse and representative of the design.

### G. Full regression

After focused QA, run:

```text
npm ci
npm run test:planning-contracts
npm run test:routing
npm run lint
npm run typecheck
npm run build
```

Also run the current repository's relevant Trip / Route / Engine contract suites and the canonical full Node test command discovered at execution time.

Compare repository-wide formatting failures to the current integrated base. TASK-037 must add zero new formatting failures.

---

## 4. Explicitly out of scope

Do not perform any of the following:

```text
- merge/retarget/close PR #293
- merge any PR
- close Issue #291 or #297
- start the real 100-POI scoring pilot
- scrape or create real POI data
- call OpenAI/LLM APIs
- call route/weather/booking/provider APIs
- use paid APIs
- change production configuration
- deploy Preview/Production
- modify Supabase production data
- create DB migrations
- implement scoring weights or gamma calibration
- tune real recommendation thresholds
- implement Candidate search runtime
- implement real Replanning runtime
- modify Planner/Detail UI
- modify Trip Mutation Engine semantics
- renumber Master Codes
- mass-format unrelated files
```

---

## 5. Required safety behavior

Night unattended rules:

1. **No interactive confirmation loops.** Use the Task rules to make deterministic decisions.
2. **Fail closed.** If a newer frozen/canonical contract conflicts with TASK-036 semantics, stop as `Blocked` and document exact paths/SHAs.
3. **No destructive Git operations.** Preserve unrelated work.
4. **No auto-merge.** Create Draft PR only.
5. **No external-cost actions.** Network/provider/LLM calls are forbidden.
6. **No production state mutation.**
7. If a test failure is clearly Task-owned, fix it and rerun. If it is a pre-existing unrelated baseline failure, document exact reproduction against the base; do not hide it.

Forbidden Git commands:

```bash
git clean -fd
git reset --hard
git push --force
git push --force-with-lease
```

---

## 6. Suggested files

Keep implementation narrow. Suggested additions:

```text
tools/qa/planning-contract-fuzz.mjs
tests/task-037-planning-contract-soak.test.mjs
docs/qa/TASK-037/planning-contract-coverage.md
docs/qa/TASK-037/planning-contract-coverage.json
docs/qa/TASK-037/soak-report.json
docs/qa/TASK-037/scale-report.json
docs/tasks/RESULT-TASK-037-a-planning-contract-soak-fuzz-qa.md
```

A focused npm script such as `test:planning-soak` is allowed if consistent with repository conventions.

Do not duplicate public contract definitions merely to test them.

---

## 7. Acceptance criteria

TASK-037 is acceptable only when:

- [ ] latest develop is integrated into the implementation branch without losing TASK-036 review invariants;
- [ ] deterministic seeded fuzz/mutation harness exists with no new dependency;
- [ ] multiple public Planning parsers are exercised, not only one parser;
- [ ] several thousand bounded mutation cases are executed or a clearly justified equivalent volume is reported;
- [ ] no unexpected uncaught parser exception occurs;
- [ ] validation failures expose safe path/code only;
- [ ] JSON round-trip tests preserve `0`, `null`, explicit Preference `5`, Local IDs and revision/freshness semantics;
- [ ] the three TASK-036 review invariants receive regression coverage;
- [ ] repeated fixed-seed runs do not reveal fixture/global-state mutation leakage;
- [ ] synthetic scale observations are produced without freezing final performance constants;
- [ ] design→contract→validator→fixture→test coverage matrix is produced;
- [ ] canonical Trip / Route and B-owned Engine boundaries remain unchanged;
- [ ] focused tests pass;
- [ ] relevant Trip / Route / Engine tests pass;
- [ ] full Node regression is run and exact result reported;
- [ ] lint/typecheck/build pass;
- [ ] TASK-037 adds zero new formatting failures;
- [ ] WBS and Result are synchronized;
- [ ] only a Draft PR is created;
- [ ] no real POI Pilot or external API is started.

---

## 8. WBS tracking

Introduce without renumbering existing rows:

```md
| 9.13 | Planning Contract Soak / Fuzz / Consistency QA | A | P0 | 4.47 / TASK-036 review-fix semantics | 进行中 / 待审查 / 已完成按标准状态更新 |
```

Status rules:

```text
implementation start → 进行中
semantic blocker → 阻塞
implementation complete + Draft PR unmerged → 待审查
merged to develop + user/owner acceptance → 已完成
```

Do not mark 4.47 complete merely because TASK-037 QA passes if TASK-036 final closeout is still pending.

---

## 9. Required Result

Create:

```text
docs/tasks/RESULT-TASK-037-a-planning-contract-soak-fuzz-qa.md
```

Include:

```text
Status
Base / TASK-036 base / latest develop integration
Issue
Branch
Commits
Draft PR + base/head
Files changed
Coverage matrix summary
Parser inventory exercised
Fuzz seed strategy
Mutation families
Total generated cases
Expected rejects / unexpected throws
JSON round-trip results
Soak/repeat results
Synthetic scale observations
Planning tests
Trip/Route/Engine tests
Full Node tests
lint/typecheck/build
format/diff status
Known baseline failures
No-network/no-provider confirmation
WBS updated Yes/No
Recommended next action
```

The Result must distinguish measured evidence from assumptions.

---

## 10. Completion boundary

TASK-037 proves the Planning Contract layer is robust enough to proceed to human review / real pilot preparation.

It does **not** prove:

```text
scoring quality is calibrated
100 real POIs are correct
Region Graph production data exists
AI decisions are high quality
routes are live/production licensed
Replanning runtime works
```

After producing the Draft PR and Result, stop. Do not automatically start the 100-POI Scoring Pilot.