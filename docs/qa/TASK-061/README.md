# TASK-061-B — Trip Library Live Data Integration

本 follow-up 依据用户明确指定的顺序执行：TASK-060 合入 develop → TASK-061（WBS 5.10 + 5.19，解决 TASK-059 J6）合入 develop → 正常 merge 最新 develop 回 TASK-059 → 重新运行完整验收。启动时未发现独立 TASK-061 规格分支或 Issue，范围依据用户指令与既有 TASK-048/049 B 数据模型及 API/Contract。

- 基线：`86585600689e3a673ba17156c2ff513db24c7a86`（TASK-060 PR #368 merge）；新分支 `codex/b-task-061-trip-library-live-data-integration`。
- Trip Library 页面读取当前用户的真实 B summary DTO，沿既有 API 的 50 条 cursor 分页读取完整集合后计算数量、搜索、目的地筛选、排序和每页 8 条的展示。
- 真实 `draft / saved / history` 决定持久化分类；日历状态复用已接受的 `getTripTiming`。不把过去日期的 saved 记录擅自变成 history，也不丢掉没有日期的记录。
- 读取/错误/空数据是独立状态。错误不会显示假空列表，切换账号后不保留另一个用户的组件数据。
- 草稿删除通过既有 DELETE + If-Match；版本过时需明确重新读取再确认操作。
- 历史复制通过既有 copy + If-Match + creationKey。同一页面对未确认的操作重试时保留幂等键；成功后重新读取实际生成的草稿，原 history 保持不变。复制已确认而列表刷新失败时，保存反馈和读取错误分别表达。
- 未知预订、收藏、封面资料显示未提供，不制造统计、照片关联或本地收藏。继续编辑入口未接通；本轮不实现 A WBS 8.5、9.7/9.8 或任何 Planner 接线。
- 保留现有页面样式、tab、筛选、摘要弹窗及键盘导航；为动态记录移除固定屏幕高度限制，避免裁切。
- 不改 schema/migration/API 合约；不修改 Production/Staging；不执行外部预约 Provider 写操作。

## 可复现 QA

```powershell
npm ci
npm run test:trip-library-ui
npm run build
npm run db:start
# CODEX_PLAYWRIGHT_PATH 使用既有 Playwright；Edge 已安装。
try {
  npm run test:trip-library-ui:local
  npm run test:trip-library-api:local
} finally {
  npm run db:stop
}
node --import ./tests/register-route-ts.mjs --test --test-reporter=tap "tests/*.test.mjs"
npm run lint
npm run typecheck
npm run deploy:validate:local
npm run deploy:build:local
npm run deploy:verify-artifact
npm run format:check:deploy
npx prettier --check docs/qa/TASK-061 docs/tasks/RESULT-TASK-061-b-trip-library-live-data-integration.md
git diff --check
```

复用现有 Node test、Playwright、Local Supabase/Auth、Next production server helpers，不引入第二套框架。Local 浏览器使用两个不同临时用户与桌面/手机视口；A 创建 51 条，B 创建 3 条真实 B records。覆盖 API cursor 与展示分页、实际三种状态、所有者隔离、读取失败、删除失败、真实并发 409、copy 响应丢失后的幂等重试、重新登录持久化。成功数据全部经过既有 B Contract/API；仅指定失败路径注入 HTTP/传输故障。

原始日志与桌面/手机截图保存在忽略目录 `.artifacts/task061/`。正式 evidence 只记录 gate、聚合数量、source hashes 和清理结果，不保存 credentials、cookies、emails 或 user IDs。验收需确认所有临时 users/owned rows/storage 为 0，browser/server 退出且 Local runtime 停止。

TASK-061 的 Local 浏览器验收用于检验接线，不替代 TASK-059 最终候选的 Edge 两轮 J1–J8、Chromium 一轮、9.5 non-Local/Local 与全仓回归。PR #366 继续 Draft，Issue #364 保持打开；全部 J1–J8 PASS 后才将 9.6 更新为待审查。
