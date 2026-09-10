# TASK-PLANNER-INTEGRATION-A — Restore local Planner changes

## 合并验收收尾（2026-09-08，当前状态）

- Status: 已完成（本次 UI / 本地 Mock 范围）。GitHub Issue: #203。
- PR #204 已合并；统一整合 PR [#211](https://github.com/kanzakimy0/TravelAssist/pull/211)，develop merge: `13a316a408d2be58f8319efc68d88aa555e39884`。
- Branch: `codex/planner-independent-tracks-plan-actions`；最终整合 head: `7c4bcbe`；文档收尾分支: `codex/planner-integration-merge-closeout`。
- 合并文件树与已验收整合 head 完全相同；保留最新数据库 Foundation / B Engine / Japan-only资产。561 tests、lint、typecheck、build通过；27份既有格式文档与develop基线逐字节相同，未新增格式失败。
- 合并版本四尺寸浏览器工作方案/拖拽/草稿验证及桌面手机预约渠道验证通过，无pageerror。预览3113继续使用同一代码；Token仅本机，未上传缓存、个人草稿或真实预约信息。
- 原有待验收、发布受阻、Draft/未合并等段落保留为历史；以本节及Metadata为准。Mock不等于服务器引擎、真实比价/预约、Auth或云保存完成。

## Metadata

- Task ID: TASK-PLANNER-INTEGRATION-A
- Owner: A
- Status: 已完成（已合并验收，本Task范围）
- WBS: 4.37 / 4.38 / 4.40 / 4.41 / 7.12
- GitHub Issue: #203
- Branch: `codex/planner-local-integration-20260908`
- Depends On: merged Planner / Detail workspace in develop
- Base: `6386c83c21ecd4b8172d9faa39aef2b01fdf315c`
- Commit: `0006814de1492128deb6a41a7cd95cb4bc330095` (implementation; subsequent tracking-only commit on the same branch)
- Pull Request: #204 Merged；整合 #211 Merged，`13a316a408d2be58f8319efc68d88aa555e39884`

## User request

Recover the latest local Planner changes missing from the preview, combine them with current develop and upload to GitHub. The user explicitly permits the existing public Mapbox token for local preview only; never commit local configuration or credentials.

## Scope

- Audit both original working directories; preserve their uncommitted changes.
- Integrate the later Planner timeline, Detail actions, hotel endpoints and range-aware secondary panels onto current develop, without importing superseded layout/header code.
- Preserve current shared map/workspace lifecycle, browser-only explicit Detail saving, B Personal Center, Japan-only assets and Engine ownership.
- Restore local Mapbox, retain interactive fallback, fix reproducible integration/runtime errors.
- Reconcile local WBS IDs without overwriting Engine entries; preserve historical Result records with an explicit ID cross-reference.

## Acceptance

- Install existing locked dependencies; lint, typecheck, production build and all Node tests.
- Full format check with byte-for-byte base comparison for pre-existing failures; no new format failures.
- Desktop real Mapbox and forced fallback; desktop/mobile timeline editing, lock, keyboard movement, +15 minute insertion, range switching and Detail reminder handling. Desktop pointer drag and fixed bottom height.
- Redacted QA report in Git, screenshots in ignored local QA output; no token or production asset catalog changes.
- Update Result / WBS / Issue, commit and push; create a Draft PR to develop. No automatic merge.

## Non-goals

No new DB, Auth, AI, Directions, booking service or production credentials. No real hotel booking or payment. No Engine implementation. No global restoration of obsolete feature branches.
