# TASK-PLANNER-AUDIT-A Result

## Status

实现与本地验收完成，待审查；不自动合并。仅本次七项 A 范围审计修复，不代表真实路线、AI、预约或云保存完成。

## Tracking

- Owner: A
- Issue: [#223](https://github.com/kanzakimy0/TravelAssist/issues/223)
- Base: `18afee5f02ed45505b81636f7b25b568270b2bf9`（最新 `origin/develop` 启动基线）
- Branch: `codex/a-planner-audit-fixes`
- Commit: `ecbf022ba8c8813b416afca3e4bd81947017c508`（实现；后续仅追踪文档同步）
- Draft PR: [#224](https://github.com/kanzakimy0/TravelAssist/pull/224) → `develop`；Open / Draft，未合并
- Task: `docs/tasks/TASK-planner-audit-fixes.md`
- WBS: 4.2 / 4.25 / 4.26 / 4.32 / 4.42 / 4.46 的审计补充，修复待审查；历史合并记录保留。

## Implemented / Regression Evidence

| 问题                                     | 本次修复                                                                                     | 验证                                                                                                                                                     |
| ---------------------------------------- | -------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Planner 修改进入 Detail 后失去未保存保护 | 进入详情不再重设已保存基线                                                                   | 浏览器保存经典方案 → 返回推荐 → 锁定浅草寺 → 进入详情 → Logo：出现三选项未保存提醒；320 宽弹窗完整                                                       |
| 向导新方案被旧保存覆盖                   | 单一初始化入口消费一次性选择；明确确认、取消保留旧行程、可先归档；新方案在保存前补齐酒店端点 | 实际经过 `/start` 四步选择深度慢游；取消后仍为经典工作方案；确认归档后为深度工作方案；同名新方案也确认；草稿数 0→1→2；刚保存不误报未保存；刷新不重复确认 |
| 还原推荐造成日期不一致及保存失败         | 按当前日期范围重建目标方案；比较时忽略展示日期格式/对象键序                                  | 3 / 4 / 7 / 60 天逐个还原三个方案；其他方案不变，全部能通过 `parseSavedTrip`                                                                             |
| Detail 与 Movement 冲突不一致            | 既有未手改交通同样参与检查及建议；未知交通保留需确认                                         | 默认羽田→浅草寺 50 分交通、0 分空档判红；建议不早于前项结束+交通+缓冲；模型验证剩余冲突不会误判正常；不再用错误的“无交通信息=正常”测试预期               |
| 取消后固定安排无法释放                   | 取消仍保持保护；增加独立勾选确认的释放操作，保留取消状态                                     | 示例晴空塔取消后按钮禁用，勾选才能释放；释放后可编辑时间；未取消/未确认时 reducer 拒绝释放                                                               |
| 完成检查漏掉空三餐、住宿                 | 卡片与完成检查共用 `missingArrangements`；提醒携带日期/类型/餐次                             | 完成检查出现第1天早餐/晚餐等；点击早餐进入项目详情的餐厅区域，不误跳航班；不要求返程日夜间住宿                                                           |
| 真实 Mapbox 图层按钮无效果               | 切换现有水域、用地、植被/地形填色层；保留道路、文字、项目和路线                              | 真实 Mapbox 截图观察开→关→开，海湾与植被填色变化；路线/标签仍在；fake map 单测验证原本隐藏图层保持隐藏，不触碰业务图层；无 Token 构建仍可操作 fallback   |

## Validation

- `npm ci`: PASS，395 packages，0 vulnerabilities。
- 全仓 `node --test tests/*.test.mjs`: **631 / 631 PASS**（实际用 PowerShell 展开测试文件列表；仓库无 `npm test` script）。新增独立审计回归测试 10 项。
- `npm run lint`: PASS，最终无新增 warning。
- `npm run typecheck`: PASS；最终 build 内 TypeScript 也通过。
- `npm run build`: PASS，不需真实云数据库或 Mapbox Token。
- `npm run format:check`: **既有 28 份文档失败**；逐路径与基线 `18afee5` 比较，28 份均未修改；本次改动的格式失败为 0。未重排无关设计文档，未通过忽略规则掩盖失败。
- `git diff --check`: PASS。
- 浏览器：1440×900 / 1280×800 / 1024×768 / 390×844 / 320×740 检查；实际 DOM 宽度与视口一致，无新增页面横向溢出。真实 Mapbox、无 Token fallback、保存/放弃/确认、取消保护及空槽跳转检查通过；读取到的 console error 为 0，无 hydration error。
- QA 使用隔离端口 3114（本地 Token）/ 3115（无 Token 生产构建），不修改原 3113 的浏览器保存。截图在本次会话验收中查看，不提交测试浏览器数据或地图 Token。

## Files Changed

- `src/features/navigation/main-flow-navigation.ts`：一次性向导选择消费。
- Planner 保存/页面组件：`use-browser-trip.ts`、`planner-page.tsx`。
- Planner 模型：`recommendation-actions.ts`、`detail-card-actions.ts`、`detail-workspace.ts`、`trip-model.ts`、`trip-preparation.ts`；新增 `required-arrangements.ts`。
- 详情组件：`detail-itinerary-board.tsx`、`detail-reservation-panel.tsx`。
- 地图：`planner-map-shell.tsx`、`map-layer-toolbar.tsx`、`map-provider.ts`；新增 `base-geography.ts`。
- Tests：新增 `planner-audit-regressions.test.mjs`；修正 `detail-card-actions.test.mjs` 与 `trip-preparation.test.mjs` 中“未知交通可判正常/没有航班就没有任何缺失”的旧预期。
- Tracking：本 Task、Result、Master WBS。

## Conflict Audit / Non-goals

从最新 develop 新建独立 worktree；原主目录的脏分支与未提交内容原样保留。未叠在 B 的 TASK-017 分支上，未修改 B 的 Auth、Preference、草稿服务或数据库 Schema；未修改 Planner CSS / UI 比例、地图生命周期、首页构图或 `/start` 页面实现。向导仍是既有 Mock 方案 ID 桥接，不声称已接正式 Trip Plan runtime 或真实路线生成。

## Known Limitations / Follow-ups

- 真实预约取消、价格查询、路线可行性与云同步仍不在本次范围；释放操作只改本地记录，未知交通仍需核实。
- 所有演示预约验证只操作隔离浏览器的 fixture，未生成真实订单。
- 全仓历史格式问题单列；待独立文档清理任务处理。
- Draft PR 待用户审查后决定是否合并；未自动继续下一 WBS。
