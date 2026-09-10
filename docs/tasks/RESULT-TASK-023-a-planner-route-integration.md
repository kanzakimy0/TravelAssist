# TASK-023-A Result

## Status

已完成。用户明确要求合并后，Stage A 合并后复验与 Stage B Planner 开发期路线接线
已随 PR #241 合入 `develop`。真实駅すぱあと Evaluation 与真实 Mapbox 验收因本独立
工作区未提供合法凭据而按 Task 规则列为 Deferred。

## Tracking

- Issue: #234（合并收尾时关闭）
- Branch: `codex/a-planner-route-integration`
- Base develop: `5383501192359abbd06c4585311d0362e9e7dbea`
- Merged develop: `30851531b94be42703b0e9f9f69ec0f506ee5a69`
- TASK-022 merge: PR #233 / `1af72af0d7151af4dd59073ee0b015a70b267064`
- Implementation commit: `98b5404`
- PR: #241（Merged）— https://github.com/kanzakimy0/TravelAssist/pull/241

## Prerequisite And Conflict Audit

- origin 指向 `https://github.com/kanzakimy0/TravelAssist.git`。
- PR #233 已合并，merge commit 是最新 develop 的祖先。
- 原工作区 `feature/a-planner-v03-interactions` 的未提交 Planner 修改完整保留；未
  switch、stash、清理或覆盖。
- 实现从最新 `origin/develop` 创建独立 worktree；未叠加 PR #230、TASK-017-B、
  Planner 历史分支或其他未合并实现。
- 最终 fetch 后 develop 未前进，未发生需要整合的并行冲突。

## Stage A — Post-merge Revalidation

- 对 RouteRequest 补齐 mode、mode family、alternative preference、JST/local
  datetime、locale、walking 与 accessibility 的 runtime validation。
- Adapter 对 flight、无法保证的步行/无障碍约束和超出 requestedModes 的结果明确
  返回 unsupported/no_route，不再静默忽略。
- `viaList` 构造前拒绝冒号和控制字符，避免端点分隔符注入。
- 复验日本时间、跨日、票价/距离单位、unknown/null、Provider 错误、timeout、
  abort 与 bounded retry。
- 生产 browser bundle 复验确认不包含 Adapter、服务器变量名或凭据。

## Stage B — Server And Planner Integration

- 新增受控 `POST /api/routes/calculate`：16 KiB body、最多 2 个进程内并发、
  `private/no-store`、canonical validation、安全错误与 request AbortSignal。
- 入口默认关闭，只允许非生产/非 Preview 的 Evaluation 模式，并要求可信 Origin 与
  Supabase 服务器用户验证；禁用/未授权/未配置时零 Provider 调用。
- 新增共享的已核验站点注册表。客户端和服务端共同拒绝未登记站名、`jp-*` POI
  ID、任意 numeric reference、coordinate-only 端点与 `(0,0)`。
- Planner 移动段新增显式开发期查询、取消、重试、备选选择、来源/entitlement、
  查询时间、JST 出到达、耗时、换乘、票价、距离与 geometry 说明。
- 查询身份包含 trip/plan/day/segment/端点/日期/时间/模式/序号；取消、卸载、切换
  或编辑后的迟到结果不能应用。
- Provider 结果和派生字段只保留当前组件内存，不进入 TripState 或浏览器保存；不
  自动修改时间、预约、锁定项，不叠加 Mapbox geometry。

## Validation

- `npm ci`: PASS
- `npm run test:routing`: PASS，28/28；并在 production build 后再次 PASS
- `node --test`: PASS，679/679
- `npm run lint`: PASS
- `npm run typecheck`: PASS
- `npm run build`: PASS；`/api/routes/calculate` 为动态 Route Handler
- `git diff --check`: PASS
- `npm run format:check`: BASELINE DEBT；27 个未修改历史文档仍不符合 Prettier，
  本 Task 新增/修改文件单独格式检查通过，未批量改写历史文档
- Browser QA: PASS，真实 Chromium 交互覆盖 1440×900、1024×768、390×844、
  320×740；报告：`docs/qa/TASK-023/report.json`
- Browser 覆盖：canonical fixture ready、unresolved 零请求、无持久化、焦点恢复、
  锁定项保留、1日/3日/全日、Planner→Detail→返回、地图 fallback、无横向溢出、
  无 console/hydration error
- Live Evaluation smoke: Deferred（未读取、索要或伪造 credential）
- Real Mapbox: Deferred / conditional（隔离 worktree 未提供 Token；fallback 已验收）

## Security And Persistence

- 未提交任何 Provider、Supabase 或 Mapbox Secret。
- Client bundle 不包含 `EKIWORLD_ACCESS_KEY`、Provider endpoint、server gate 或
  Adapter 实现。
- 无公共 fixture 成功开关；浏览器 fixture 仅由本地 Playwright transport 拦截注入。
- Provider raw payload、带 key URL、响应与派生票价/时长均未保存或记录。
- Evaluation 在 `NODE_ENV=production`、Vercel preview/production 下 fail closed。

## Files Changed

- Route contract / adapter hardening：`src/shared/contracts/routes/**`、
  `src/server/routing/providers/ekiworld.ts`
- Verified station registry：`src/shared/routing/planner-verified-stations.ts`
- Server gateway：`src/app/api/routes/calculate/route.ts`、
  `src/server/routing/{http,config,index}.ts`
- Planner session integration：`src/features/planner/model/route-query.ts`、
  `src/features/planner/components/planner-route-query.tsx` 及既有移动段最小接线
- Tests / QA：`tests/task-022-*.test.mjs`、
  `tests/task-023-planner-route-integration.test.mjs`、
  `tools/qa/task-023-route-integration-check.mjs`、`docs/qa/TASK-023/report.json`
- Docs / tracking：本 Task、Command、共同计划、本文、架构说明与 Master WBS

## WBS Update

- 7.3 保持 `待确认`：开发期 Provisional Provider = 駅すぱあと；生产商务 Gate 未关。
- 7.5 更新为 `已完成`：TASK-022 Contract 与 TASK-023 合并后复验/hardening 已合入。
- 7.8 保持 `进行中`：TASK-023 Evaluation/development Planner subset 已合入，但生产
  Gate 未关闭。
- 4.6 / 4.14 保持 `进行中`，仅登记本轮路线查询子集已合入，不把完整视觉/重规划标
  完成。
- 7.10 / 7.11 未开始；未借本 Task 标记缓存或多 Provider 降级完成。

## Deferred And Manual Gates

- 提供合法且明确授权的駅すぱあと Evaluation credential 后，才能进行一次少量串行
  live smoke；不在聊天或仓库中粘贴 key。
- 生产 Provider、价格、保存/再展示、Mapbox 混合展示、Web/iOS/Android、缓存与
  retention 权利仍需商务确认。
- 永久应用路线、Engine 接线、全程自动扇出与真实 geometry 展示均属于后续独立
  Task。

## Known Limitations

- 首期只登记六个有官方证据的站点映射；其他景点/酒店/餐饮/机场显示名保持
  unresolved，不尝试坐标寻站。
- 当前查询为时间表结果，不是实时运营保证；unknown 票价/距离不会显示为零。
- 查询结果刷新、关闭面板或切换快照后可丢弃，且设计上不会随浏览器保存恢复。
- 浏览器 ready 状态使用 sanitized canonical fixture；真实 Provider 与真实 Mapbox
  结果未宣称通过。

## Stop

PR #241 已按用户明确指令合并；未执行 TASK-024 或其他后续 Task。
