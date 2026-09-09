# TASK-023-A — 路线合并后验收与 Planner 开发期路线接线

## Metadata

- Task ID: TASK-023-A
- Owner: A / Main Travel System / Routing
- Status: 待开始
- WBS: 4.6 / 4.14 路线接线子集；7.5 / 7.8 合并后复验
- Priority: P0
- GitHub Issue: #234
- Branch: `codex/a-planner-route-integration`
- Spec Branch: `task/a-route-observability-deployment-20260909`
- Depends On: TASK-022-A / PR #233 已合并；执行时复检
- Commit: PENDING（实现未开始）
- Pull Request: PENDING（实现 PR）
- Authoring Base: `1af72af0d7151af4dd59073ee0b015a70b267064`
- Result File: `docs/tasks/RESULT-TASK-023-a-planner-route-integration.md`

## 1. 目标

复用既有 Route Contract 和 server-only 駅すぱあと Adapter，把“Planner本地交通估算”推进到“可取消、可校验、能说明来源的开发期路线查询与当前会话预览”。先做合并后复验，复验通过再接页面；不重写 TASK-022。

不等待偏好三级列表或全量景点。以少量已核验站点和独立 synthetic fixtures 验证；不承诺所有景点之间已经可算真实路线。

本任务必须连同 `docs/project/A-TASK-023-025-execution-plan.md` 执行。

## 2. 前置与必读

PR #233 merge `1af72af0d7151af4dd59073ee0b015a70b267064` 必须是最新 develop 的祖先。检查以下真实文件存在并读完整实现：

- `src/shared/contracts/routes/**`
- `src/server/routing/{config,service,types,index}.ts`
- `src/server/routing/providers/ekiworld.ts`
- `tests/task-022-*.test.mjs` 与 `tests/fixtures/ekiworld-course.json`
- `docs/architecture/route-contract.md`
- `docs/architecture/ekiworld-evaluation-routing.md`
- `docs/tasks/RESULT-TASK-022-a-ekiworld-route-evaluation.md`
- `src/features/planner/**` 中实际 Workspace、交通段、保存序列化和 Map 生命周期代码
- 已合并的 Trip Plan Contract、Auth helper、安全 returnTo 与跨模块 Contract 规则

#227 主行程数据库、#231 安全扫描、#221 偏好草稿不是本 Task 硬依赖。不得借本任务合并或复制其未合并实现。

## 3. Stage A — 合并后验收

重新运行 `npm run test:routing`、全仓测试、lint/typecheck/build、生产 browser-bundle 边界检查。报告当前测试数，不复述旧的16/646作为本轮结果。

审查端点编码/非法分隔符、站点引用语义、支持的mode、departure/arrival/JST跨日、价格与距离单位、未知字段、取消与重试。特别验证：同一个请求在不同机器时区不改变日本出发日期；非法或不支持的约束必须报错/明确不支持，不得忽略后表示“已满足”。

已知入口使用 displayName/referenceId，而不是裸经纬度自动寻站。必须区分已验证站点引用与内部POI ID。禁止以 `jp-*`、景点显示名或 `(0,0)` 假充 Provider 站点。名称歧义需要显式未解析状态。首期只接受已确认的站名/引用；坐标扩展只有官方格式和独立测试都确认后才能纳入，不能顺便实现7.2/7.6地点搜索。

发现本 Task 所必需的 Adapter 缺陷可在本分支最小修复、补失败测试并记录与022的差异；发现需要突破核心Contract或B边界的问题，停止受影响子阶段，保留已完成证据，不擅自另建模型。

## 4. Stage B — 服务端与 Planner 接线

### 4.1 服务端入口

复用现有 server-only service，在项目约定下新增或复用唯一受控 Route Handler（建议 `/api/routes/calculate`，实际先查路由避免重复）。只接收 canonical RouteRequest，验证结构、大小、日期、端点和支持模式；服务器固定Provider端点，不接受客户端自定义URL、API key、raw payload或entitlement。

默认路线功能关闭；入口必须有服务器端启用门。真实Evaluation仅限已授权的本地开发会话：复用可信Auth校验或本地loopback限定的开发入口，不能仅相信Host/Origin头作为身份。缺乏可靠控制时禁用live，继续fixtures。

请求使用POST和no-store；响应只返回规范化RouteResult和安全诊断码。对入口增加最小请求体限制、并发上限和有界重试防重复消费，不扩展成全局9.9限流。可用时连接request.signal；即使底层取消不可靠，客户端过期结果仍必须丢弃。

固定状态含未配置/未授权/不支持/无路线/超时/取消/Provider错误，不返回堆栈、带key的URL或原始响应。不得向公共环境暴露fixture成功入口，也不得通过客户端参数切换成“假成功”。

### 4.2 请求快照与竞态

以 trip/plan/day/segment 和当前端点、日期时间、模式、请求序号形成会话级请求身份。结果只可应用于仍匹配的请求快照；切换方案/日期、编辑端点、重排项目、取消、卸载后，旧请求不得覆盖新界面或重新出现。

相邻项目修改只失效受影响连接；用户显式请求后才重新查询。不在拖拽每一帧调用接口，不自动对全程每一段扇出请求。提供短暂合并/取消和明确重试入口；不保存跨会话缓存。

路线结果作为现有Workspace内可丢弃的会话级查询状态，不建立第二份可持久化Trip主模型。选择路线只影响当前会话预览；不自动改写用户设置的时间、预约、锁定项或后续行程。不越权实现Engine apply。未来永久应用与保存等待权利及对应Contract。

### 4.3 页面行为

保持现有布局、色彩、地图实例和交通段组件几何，仅在已有区域接入状态与必要说明：

| 状态 | 页面要求 |
| --- | --- |
| idle / disabled | 不发请求；说明仍为估算或未启用 |
| loading | 可取消；不清空用户行程 |
| ready | 展示可用时长、换乘、出到达、票价、来源及查询时间 |
| stale | 明确已过期，不作为新条件下有效路线 |
| no_route / unsupported | 可理解说明，保留用户原方案 |
| error | 安全错误信息、适当重试；不自动伪造替代成功 |

未知票价不是0，未知距离不是0；票价仅该Provider返回口径，不自行乘同行人人数或推导儿童优惠。时间表查询不是实时运营保证。

`geometry=null` 时不连直线冒充真实轨迹；原示意线只能保持明确的示意/估算身份。未经Mapbox混合展示许可不新增真实Provider几何叠加；可在地图旁已有交通卡显示允许的开发期信息并保留归属说明。

## 5. Evaluation、存储与测试边界

保留 `NODE_ENV=production` 拒绝Evaluation和生产entitlement门。`next build/next start` 的Preview同样不能偷偷启用Evaluation。禁止通过改NODE_ENV、强设生产已批准、test flag或把key移到NEXT_PUBLIC来绕过。

开发期真实结果仅短期内存展示：不得进入localStorage、sessionStorage、IndexedDB、Service Worker cache、DB、导出、分享或日志。规范化结果、派生时长/票价也受该规则约束，不只是raw JSON。序列化测试必须证明保存仍保存用户原方案，不夹带Evaluation字段；保存前有必要提示“查询结果不会随行程保存”。

没有合法凭据时，使用server transport/test harness注入fixtures验证真实页面路径；明确显示测试数据。公开构建中不得存在可绕过授权的测试开关。live smoke单列Deferred，不能因此跳过可完成的接口/UI接线。

拥有已经明确允许使用的开发配置时才执行少量串行live smoke；记录日期、代码版本、成功/失败与来源类型，不保存Provider原文。禁止负载测试、并发轰炸、重试拉满或使用生产凭据。

## 6. 验收矩阵

至少包括：正常站间路线；替代路线；未知票价；无geometry；不支持模式；无路线；非法端点；超时；abort；429/5xx；乱序响应；连续更改日期；跨方案隔离；卸载；锁定项不动；保存/恢复不含Provider数据；无key；production拒绝Evaluation且零Provider出站。

浏览器真实验证1440×900、1024×768、390×844、320×740。覆盖Planner→Detail→返回、1日/3日/全日范围、已有保存保护、键盘/焦点、地图fallback与有条件的真实Mapbox。使用现有QA harness；不存在浏览器runtime时明确Blocked/Deferred，不把DOM快照当交互通过。

## 7. 交付与完成规则

交付：受控入口、canonical投影/请求控制器、最小UI接线、确定性测试、浏览器QA脚本与脱敏报告、实现说明、Result和WBS/Issue/Draft PR记录。

专项命令和证据路径由实现确定并写入Result，建议 `tests/task-023-*.test.mjs`、`tools/qa/task-023-*.mjs`、`docs/qa/task-023/`；原始HAR、截图和真实数据默认留本机忽略目录，提交前审查。

Stage A/B代码通过可进入待验收；live缺失必须列Deferred。只登记4.6/4.14路线接线子集，不把全项、7.3生产Provider、7.8生产路线、7.10缓存、7.11多Provider降级标完成。不得自动合并或继续024。

## 8. 官方参考

核对日期：2026-09-09；实际执行时再核对适用的官方版本与用户entitlement。

- https://docs.ekispert.com/v1/api/search/course/extreme.html
- https://docs.ekispert.com/v1/faq/
- https://docs.ekispert.com/v1/le/faq/

官方API支持的输入形式不等于当前Adapter全部已实现；免费计划也不等于已取得本任务经路探索权限。生产权利以正式确认和现有仓库gate为准。
