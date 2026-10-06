# CODEX — TASK-050-A Canonical POI v1 Execution Command

Use this command in a new Codex conversation.

```text
请在 TravelAssist 仓库中完整执行现有 Issue #399 / TASK-050-A：Canonical POI Schema / Validator / Candidate Admission Boundary。

Repository:
https://github.com/kanzakimy0/TravelAssist

Tracking Issue:
#399

Authoritative Task:
docs/tasks/TASK-050-a-canonical-poi-schema-validator-candidate-admission-boundary.md

Architecture / Audit:
docs/design/ai-planner-realtime-final-architecture-freeze-and-implementation-order.md
docs/design/data-governance-data-version-provenance-freshness-quality-gate-model.md
docs/design/cache-materialized-view-search-index-data-serving-model.md
docs/audits/final-architecture-gap-audit-2026-09-21.md

Implementation branch:
codex/a-poi-canonical-schema

开始前必须执行：
git status --short
git branch --show-current
git fetch --all --prune
git rev-parse origin/develop
git log --oneline -20 origin/develop

必须从执行时最新且干净的 origin/develop 创建/刷新 codex/a-poi-canonical-schema。

禁止：
git clean -fd
git reset --hard
git push --force
git push --force-with-lease
自动合并 PR
修改 B 的 POI candidate/evidence corpus
创建第二套 43D / Master Code / Region / Planning projection
调用或购买真实 Provider
增加 DB migration

执行前完整读取：
1. Task 文件
2. Issue #399
3. docs/architecture/poi-master-schema-v0.2.md
4. docs/architecture/poi-feature-preference-codebook-v0.1.md
5. src/shared/contracts/planning/poi.ts
6. src/shared/contracts/planning/features.ts
7. src/shared/contracts/planning/facts.ts
8. canonical Master Code Registry
9. Region Graph canonical identities
10. FINAL Architecture Gap Audit

实现原则：
- 先 audit 当前仓库，复用现有 contract，不复制。
- Canonical POI 与 candidate/admission 必须分离。
- POI Internal ID、Master Code、candidateKey、Provider ID、Region ID、Transport Node ID、AI Local ID、DB PK 必须保持不同语义。
- 43D 必须继续使用冻结的 43 key / 0..9|null，null 绝不能转 0/5。
- Visit Profile 必须复用现有 Planning 语义。
- Canonical POI 必须可确定性投影到 PoiPlanningProjectionV1。
- Static POI Master 不得写入 live timetable/fare/weather/crowd。
- Provider raw / rights-restricted transient fields不得进入 canonical persistence model。
- 所有 parser / admission validator fail closed。

按 Task 完成所有 positive / negative fixtures、QA evidence、compatibility report、pilot report、Result 和 WBS 更新。

验证至少执行：
npm ci
npm run test:planning-contracts
npm run test:planning-soak
npm run test:routing
新增 TASK-050 focused tests
所有与 POI / Region / Master Code / Planning contract 直接相关的现有测试
npm run lint
npm run typecheck
npm run build
git diff --check

如果全仓已有独立 baseline failure，必须在 latest develop 上复现并记录，不得为了 PASS 修改门槛或删除测试。

完成后：
- 生成 docs/tasks/RESULT-TASK-050-a-poi-schema.md
- 更新 WBS 7.4 = 待审查
- commit
- push codex/a-poi-canonical-schema
- 创建一个 Draft PR → develop
- 不自动合并
- 不自动开始 7.6 / 7.7 / 7.9

最终回复必须列出：
- Status
- execution-time develop SHA
- branch / final head
- files changed
- canonical identity model
- admission states/gates
- Planning projection compatibility
- test / lint / typecheck / build results
- QA evidence paths
- Draft PR number
- remaining blockers / deferred items
```