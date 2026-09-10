# TASK-037-A Result — Planning Contract Soak / Fuzz / Consistency QA

## Status

待审查。TASK-037-A 的离线确定性 QA、合成规模观测和仓库回归已完成；Draft PR 尚未合入。没有启动真实 100 POI Scoring Pilot。

## Base / TASK-036 base / latest develop integration

- TASK-036 semantic base: `e47b6edf4620dddb3ff8ab0d94f03c4ad37deaea`
- Latest integrated `origin/develop`: `226e2fc18390d5d8795538818ea055640ca25123`
- Integration: TASK-036 分支已经通过 merge commit `e99b8bb` 包含该 develop；TASK-037 创建后再次执行 `git merge origin/develop`，结果为 already up to date。
- TASK-036 review invariants preserved:
  - `EXPIRED` 禁止 `USE` / `USE_WITH_WARNING`；
  - `PoiPlanningProjectionV1` root、FeatureSet 和全部 VisitProfile 的 `poiRef` 必须一致；
  - `source=planning_prior` 禁止携带 exact arrival/departure minutes。

## Issue

- [#297](https://github.com/kanzakimy0/TravelAssist/issues/297) 保持 Open。
- [#291](https://github.com/kanzakimy0/TravelAssist/issues/291) 未关闭、未修改其完成状态。

## Branch

`codex/a-planning-contract-soak-qa`

## Commits

最终 commit 在 Draft PR 建立后同步记录。

## Draft PR + base/head

- Draft PR：待创建
- Base: `codex/a-trip-planning-contract-foundation`
- Head: `codex/a-planning-contract-soak-qa`
- PR #293 保持 Draft，未 merge、未 close、未 retarget。

## Files changed

- `package.json`
- `tools/qa/planning-contract-fuzz.mjs`
- `tests/task-037-planning-contract-soak.test.mjs`
- `docs/qa/TASK-037/planning-contract-coverage.md`
- `docs/qa/TASK-037/planning-contract-coverage.json`
- `docs/qa/TASK-037/soak-report.json`
- `docs/qa/TASK-037/scale-report.json`
- `docs/project/WBS-TravelAssist.md`
- `docs/tasks/RESULT-TASK-037-a-planning-contract-soak-fuzz-qa.md`

## Coverage matrix summary

13/13 required P0 concept groups have concrete design → public contract → parser/owner → positive fixture → negative family → test mappings. Canonical Trip and Route rows explicitly remain owned by their canonical suites rather than being duplicated.

## Parser inventory exercised

15 Planning parsers were exercised:

`parsePoiFeatureSetV1`, `parsePoiVisitProfileV1`, `parsePoiPlanningProjectionV1`, `parseEffectivePreferenceV1`, `parseSparsePreferenceV1`, `parseTravelRegionGraphV1`, `parsePlanningScoreSetV1`, `parseFeasibilityResultV1`, `parseCandidateRunV1`, `parseAiCompactContextV1`, `parseAiDecisionResponseV1`, `parsePlanningFactRefV1`, `parseFactUsabilityV1`, `parseReplanProposalV1`, and `parseDecisionRunV1`.

## Fuzz seed strategy

- Dependency-free `xorshift32` PRNG.
- Fixed seeds: `99536951`, `12648430`, `305419896`, `2654435769`, `3737844653`.
- 800 cases per seed, 4,000 total.
- Same seed set reproduced the identical case-sequence digest: `df528cbfbd5b96c61f098d4afdb9b1069d4f98d4f62fda552293e43924f294ae`.
- Exported fixture fingerprints were unchanged before/after both passes.

## Mutation families

38 mutation families cover unknown/missing fields, version/enum/type/range/nullability/ID failures, duplicate and dangling references, POI identity, graph cycles and reverse symmetric duplicates, range ordering, score/coverage/confidence, AI binding/local-ID/candidate/status/operation invariants, Planning Prior timetable claims, expired fact use, protected replan overlap, raw/provider trace fields, compact neutral semantics, feasibility issue consistency, and invalid fact source values.

## Total generated cases

- Total mutations: 4,000
- Expected rejects: 4,000
- Unexpected accepts: 0
- Unexpected throws: 0
- Unsafe issues / input echoes: 0

## JSON round-trip results

11 wire-safe fixtures passed `JSON.stringify → JSON.parse → parser` and exact JSON round-trip comparison. Evidence confirms preservation of Feature `0` versus `null`, Effective Preference explicit `5`, omitted Sparse Preference neutral values, Local IDs, `EXPIRED` metadata, revision numbers, codebook values, and nullable fields.

## Soak / repeat results

- Five fixed-seed runs completed unattended and bounded.
- Deterministic repeat digest matched.
- Fixture/global-state mutation detected: No.
- The measured primary campaign duration in committed evidence was about 75 ms; timing is observational and machine-dependent.

## Synthetic scale observations

All 9 provider-free observations parsed successfully:

- POI projections: 100 / 1,000
- Candidate records: 100 / 1,000 / 5,000
- Sparse Region Graph nodes: 100 / 1,000
- Decision trace fact/provider rows: 10 / 100

Largest measured payload was 5,000 candidate records at approximately 2,882,122 serialized bytes and about 25 ms in the committed observation. These are local observations only; no production threshold is frozen.

## Planning tests

- `npm run test:planning-soak`: 6/6 passed.
- `npm run test:planning-contracts`: 21/21 passed.

## Trip / Route / Engine tests

- `npm run test:routing`: 28/28 passed.
- Canonical Trip + Route + Engine feasibility suites: 130/130 passed.

## Full Node tests

`node --import ./tests/register-route-ts.mjs --test tests/*.test.mjs`: 829/829 passed.

## lint / typecheck / build

- `npm ci`: passed (395 packages installed; npm reported existing package lifecycle-script approval warnings only).
- `npm run lint`: passed.
- `npm run typecheck`: passed.
- `npm run build`: passed (Next.js 16.3.4 production build).

## format / diff status

- TASK-037-owned file Prettier check: passed.
- `git diff --check`: passed.
- Repository-wide `npm run format:check`: baseline remains failing. Before formatting TASK-037 files it listed 67 files, including 4 new TASK-037 files; after formatting the owned files, TASK-037 adds zero failures and 63 unrelated pre-existing files remain. No unrelated mass-formatting was performed.

## Known baseline failures

- 63 pre-existing repository-wide Prettier warnings remain outside TASK-037 ownership.
- Node emits the existing `MODULE_TYPELESS_PACKAGE_JSON` performance warning for TypeScript modules loaded through the repository test loader; tests remain green.
- No canonical/frozen semantic conflict was found.

## No-network / no-provider confirmation

The QA harness performs no network access and calls no Provider, LLM, paid API, production service, database migration, or production data path. It uses only checked-in synthetic fixtures and writes the four bounded QA evidence files.

## WBS updated

Yes. WBS 9.13 was added as `待审查`; WBS 4.47 remains `待审查` while TASK-036 final closeout is pending.

## Recommended next action

Review the TASK-037 Draft PR after PR #293 review. Do not start the real 100 POI Scoring Pilot until the contract review and this QA evidence are accepted.
