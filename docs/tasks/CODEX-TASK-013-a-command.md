# Codex 执行指令 — TASK-013-A

将下面整段复制给 Codex：

```text
请在 TravelAssist 仓库中严格执行 TASK-013-A，不要只做分析或给出建议，要完成代码、素材、清单、校验、测试、文档和 GitHub 追踪。

Repository:
https://github.com/kanzakimy0/TravelAssist

GitHub Issue:
#112 — TASK-013-A 共享素材库底座与日本首发目的地素材包

Remote branch:
feature/a-asset-library-foundation

Task file:
docs/tasks/TASK-013-a-asset-library-foundation.md

Design source:
docs/assets/asset-library-strategy.md

开始前必须执行：

1. 进入 TravelAssist 仓库根目录。
2. 运行：
   git status --short
   git branch --show-current
   git fetch --all --prune
   git rev-parse origin/develop
   git log --oneline -10 origin/develop
3. 不得使用 git clean -fd、git reset --hard、git push --force 或 git push --force-with-lease。
4. 如果工作区存在用户未提交内容，不得删除或覆盖；安全隔离，无法隔离则按 Task 的 Blocked 规则返回。
5. 从远端读取并完整遵守：
   git show origin/feature/a-asset-library-foundation:docs/tasks/TASK-013-a-asset-library-foundation.md
   git show origin/feature/a-asset-library-foundation:docs/assets/asset-library-strategy.md
6. 切换到远端已建立的分支 feature/a-asset-library-foundation，并执行 ff-only pull；不要另建重复分支。
7. 检查最新 origin/develop、Issue、Open PR、WBS、AGENTS.md 和 Task 中列出的全部前置文档；如 develop 已前进，按 Task 的冲突保护规则安全同步，不 rebase 已推送分支、不 force push。

必须完成的核心交付：

- 审计现有 public/media、assets/design、引用路径、Manifest 与 SHA，保护现有已验收素材。
- 建立统一素材目录、稳定 ID、Manifest、Destination Pack、TypeScript Registry 与 fallback。
- 原创完成 64 项全局 SVG 基线：24 个 POI 分类、14 个交通、12 个地图 Marker、8 个占位图、6 个状态插画。
- 建立东京、京都、大阪、富士山—箱根、北海道 5 个试点目的地包和 symbolic placeholder。
- 建立每个 Pack 至少 25 条、总计至少 125 条的素材采购清单。
- 建立 inventory、validator、index、duplicate report、size report 和 tests。
- 不新增 npm 依赖。
- 不修改 Planner、Start Flow、Personal Center 的现有视觉和业务逻辑。
- 不删除、重命名或覆盖 public/media/personal-center 等现有已验收素材。
- 禁止从 Google Images、Google Maps、Tripadvisor、Booking、Agoda、Instagram、小红书、微博等抓取图片。
- 未验证来源、商业使用、缓存和衍生许可的照片不得进入 runtime；使用 acquisition_required、provider_only 和 fallback，不要伪造完成。
- AI / symbolic 素材必须明确标记，禁止声称为真实地点实拍。

必须执行并准确记录：

npm ci
npm run assets:inventory
npm run assets:index
npm run assets:validate
npm run test:assets
npm run lint
npm run typecheck
npm run format:check
npm run build

交付前必须：

1. 更新 docs/project/WBS-TravelAssist.md，新增或使用下一个可用工程基础 WBS ID，并更新 TASK-013-A 追踪行。
2. 创建 docs/tasks/RESULT-TASK-013-a-asset-library-foundation.md，按 Task 指定格式写实际数量、命令结果、版权状态、体积、重复项和限制。
3. 更新 GitHub Issue #112。
4. commit 并 push 到 feature/a-asset-library-foundation。
5. 创建 feature/a-asset-library-foundation → develop 的 Draft PR。
6. 不自动 merge。

不要因为无法一次性获得全部目的地照片而停止；这不是 blocker。通过采购清单、provider reference 和 fallback 正常完成 Phase 1。

最后仅按 Task Result 格式返回：Status、Tracking、Audit、Assets、Destination Packs、Rights、Validation、WBS、Commit、Draft PR、Known Limitations。不要只返回概述。
```
