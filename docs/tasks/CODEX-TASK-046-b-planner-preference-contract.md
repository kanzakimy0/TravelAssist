# CODEX — TASK-046-B / WBS 5.14

请执行 TravelAssist 的 TASK-046-B，仅执行 WBS 5.14 Planner-readable Preference Contract v1。

Repository: `https://github.com/kanzakimy0/TravelAssist`
Issue: `#321`

## 开始前

```bash
git status --short
git branch --show-current
git fetch --all --prune
git rev-parse origin/develop
git log --oneline -15 origin/develop

git show origin/task/b-wbs-5-14-planner-preference-contract:docs/architecture/planner-preference-contract-v1.md
git show origin/task/b-wbs-5-14-planner-preference-contract:docs/tasks/TASK-046-b-planner-preference-contract.md
git show origin/task/b-wbs-5-14-planner-preference-contract:docs/tasks/CODEX-TASK-046-b-planner-preference-contract.md
git show origin/develop:docs/project/WBS-TravelAssist.md

gh issue view 321 --repo kanzakimy0/TravelAssist
gh pr view 221 --repo kanzakimy0/TravelAssist --json number,state,isDraft,headRefName,headRefOid
```

确认 5.11、5.16 已完成；从执行时最新的干净 origin/develop 创建独立 worktree：

```text
codex/b-account-wbs-5-14-planner-preference-contract
```

禁止从规格分支或 PR #221 开发；禁止 feature/**、hard reset、git clean、force push；保护原工作区。确认中央 WBS 5.14 = 进行中；其他行保持。

## 本 Task 必须交付

1. `src/shared/contracts/preferences` 公共只读合同、严格 parser、版本、fixtures 与静态强度语义。
2. 5.11 唯一 core 向 shared 机械提升；旧 B 路径兼容 re-export；不得复制第二份 registry，不得 shared 反向依赖 features。
3. `LongTermPreferenceReadV1`：contractVersion/scope/sourceRevision/sourceUpdatedAt/preference，原样保留 23-key sparse 事实，独立深度只读数据。
4. 浏览器 GET-only 和 server-only 请求级读取入口，复用 5.16 verified Auth/read/RLS；服务器组合调用须回传刷新 Cookie 与 private/no-store headers。
5. 401/503/网络失败/非法响应/未知版本/取消是失败或取消，绝不能伪装成空 Preference。
6. 保持现有 GET/PATCH/reset HTTP wire、写入 CAS、SQL、RLS、UI 行为不变。
7. 独立 A-like consumer 测试、传递依赖边界检查，以及真实 Local Supabase/Auth/API 回归。
8. `docs/contracts/preference-read-v1-handoff.md`；明确 A 集成审查状态，不伪造人工通过。

特别注意：现有 planning/features.ts 的 EffectivePreferenceV1 是 43 维 1–9 评分输入，不是长期 23-key Preference。禁止直接 cast、编造权重、补 43 个 neutral 5、伪造 snapshotRef/overrideRevision 或改 A 的合同来迁就。

## 必需 QA

以正式 Task 为准，运行新增 contract/facade/consumer 测试、5.11 pure/真实 DB、5.16 pure/真实 API/browser、相关 Profile/Companion DB 回归、全仓 tests、lint/typecheck/build、本地部署 gates、改动文件格式与 git diff --check。

真实 Local 验收至少两名临时 Auth 用户，验证 Cookie/Bearer、读不建行、更新后读取、跨用户隔离、旧 CAS/Reset 行为和回传 Cookie。DB 套件顺序执行，只能重置经验证的专用可丢弃 Local 实例；不得接远端数据库。缺少 Docker/browser 必须报 Partial/Blocked，不跳过伪报 PASS。

## 交付与停止

实现及必需 QA 完成后，将实际 `docs/project/WBS-TravelAssist.md` 的 5.14 一行改为“待审查”，而不是仅写旁路记录。创建：

```text
docs/tasks/RESULT-TASK-046-b-planner-preference-contract.md
```

同步 Issue #321 的 Result/PR/阶段，保持 Open。Push 实现分支并创建或复用 Draft PR：

```bash
git push -u origin codex/b-account-wbs-5-14-planner-preference-contract
gh pr create --repo kanzakimy0/TravelAssist --base develop --head codex/b-account-wbs-5-14-planner-preference-contract --draft --title "[TASK-046-B] Publish Planner-readable Preference Contract v1" --body "Refs #321. WBS 5.14 producer implementation and required QA; integration review and user acceptance tracked in Result. Do not auto-merge."
```

返回完整 Result、最终 head、PR、真实测试计数、A review 状态及 Master WBS 精确变更，然后停止。不标 Ready、不合并、不关闭 #321。

不启动 4.18、5.13、5.17、5.18、5.19、8.6、AI/Engine/POI/scoring；不改 PR #221 / Issue #207。完成 5.14 不代表 Planner 已接线或 43 维映射已实现。
