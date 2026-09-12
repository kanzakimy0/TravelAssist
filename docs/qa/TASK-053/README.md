# TASK-053-B QA

基线 `4da2b8883069cd415eee6e18129c874383286653`，从最新 origin/develop 创建独立实现分支。使用真实 Local Supabase、Auth A/B/anon、PostgreSQL、Next production 和 Microsoft Edge，无 Local/browser skip。

## 验收证据

- `local-evidence.json`：20 个真实场景（含父测试共 21 tests）。9 个模板分别点击、保存、刷新；点击零 mutation；取消/未保存刷新、分类清空、global reset、custom、409、A/B 隔离和 anon 拒绝。
- `legacy-audit.md`：旧默认值逐类划分 lossless / presentation-only / ambiguous，说明保留及不转换原因。
- `quality-gates.json`：基线/候选、指定回归、真实 DB 与本地 Quality Gates，含既有 lint 差异证明。
- `boundary-and-cleanup.json`：受保护源码无变化、Master 仅 5.13 行、生产 browser 图与清理结果。

5.14 verified request-scoped read 返回 canonical Preference 和 source revision；Trip Library draft/save 与真实 DB snapshot 同样只有 canonical 值和来源 revision，没有模板 ID/名称。负向 409/401 是预期拒绝。

## 浏览器

1440×900 desktop 与 390×844 mobile；模板按钮使用现有个人中心样式、aria-pressed 精确选中、aria-live 自定义状态。真实 Save、Cancel、清空、切换模板、手动编辑与双会话复验通过；页面 JS errors = 0，mobile 无横向溢出。

截图保存在本地 `.artifacts/task053/desktop.png` 与 `mobile.png`，不加入产品资产目录；机器证据提交到本目录。原始运行日志仅在 ignored `.artifacts/task053`。证据不包含用户 UUID、email、Cookie、Bearer、密码或 Secret。

## 复现

1. `npm ci`；使用仓库 Local-only wrappers：`npm run db:start`、`npm run db:status`、`npm run db:reset`。仅重置授权的专用本地测试库。
2. `npm run build`；配置 `CODEX_PLAYWRIGHT_PATH` 为已安装的 Playwright module，准备 Microsoft Edge。
3. `npm run test:preference-presets`、`npm run test:preference-presets:local`。后者要求初始 Auth 用户为 0，创建 A/B 合成用户，finally 删除本测试用户并关闭自有 production server。
4. 顺序运行 Task 要求的 Preference DB/API/Contract/Trip Library 回归；Local suites 共用专用端口，不并行启动。
5. 运行全仓 `node --import ./tests/register-route-ts.mjs --test "tests/*.test.mjs"` 及 lint/typecheck/build/deploy gates。无 migration/generated type 变化，不运行 db:types。

最终 exact PR head 的 GitHub Quality Gate 结果由 PR 的审查记录给出；每次新增 commit 都必须重新 PASS，不复用旧 head。
