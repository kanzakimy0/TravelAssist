# TASK-024-A Result

> TASK-028-A 于 2026-09-10 将本实现整合到 `origin/develop@171900698180b80220017c9c4bec551b72792f27` 后重新验收。当前证据、已知基线债务与 Deferred 项以 `RESULT-TASK-028-a-observability-acceptance-closeout.md` 为准；本文件保留为原始 TASK-024-A 交付记录。

## Status

Partially Completed / 待验收。

本地隐私优先观测基础、可复跑性能基线、预算门、实际浏览器/服务端故障链路和真实 Mapbox 条件样本已经完成。外部 Collector、真实用户 p75、报警送达和生产部署保持 Deferred，因此不把 WBS 9.11 标记为已完成。

## Tracking

- GitHub Issue: #235（保持 Open）
- WBS: 9.11
- Implementation Base: `e74904830cbf8e6745b2013b2888e38984ccf96d`
- Branch: `codex/a-performance-observability`
- Commits: `03bd72a`, `6ae71d0`（最终 tracking 提交见 PR）
- Draft PR: #245 — `codex/a-performance-observability` → `develop`

## Conflict Audit

- 在独立 worktree 中从最新 `origin/develop` 开发，没有叠加未合并实现分支。
- TASK-023-A 已通过 PR #241 合入基线；本任务复验其路线集成测试，没有修改 Planner 业务语义。
- 原工作目录中的 Planner 未提交内容完整保留，本任务没有读取、暂存或覆盖这些变更。
- WBS 2.11 已有错误/日志规范，但基线中没有统一的客户端 Web Vitals、客户端未处理异常、Next request error 和受控本地 sink 入口；本任务仅补齐所需最小单一边界。

## Implemented

- 建立版本化、显式 allowlist 的错误与性能事件契约。
- 建立客户端 `error` / `unhandledrejection`、Web Vitals 和路由切换观测；支持卸载清理，避免重复监听。
- 使用 Next.js 16 当前安装版本的 `instrumentation.ts` / `onRequestError` 建立服务端请求错误入口。
- 建立有界队列、采样、去重、批量上限、超时和有限重试；sink 失败不递归且不阻塞产品流程。
- 默认只使用可注入内存 sink 与脱敏服务端 logger；未建立公开收集端点，外部观测传输为零。
- 建立仅测试环境可开启的服务端故障注入路由，默认 fail closed。
- 建立 1/3/7 日和 10/50/200 节点的隔离合成 fixtures。
- 建立 production build 性能采集、预算比较、实际故障链路和真实 Mapbox 条件验收脚本。
- 编写性能/隐私运行手册、回滚边界和版本化 QA 证据。

## Privacy and Security

事件契约拒绝未知字段，并丢弃 Cookie、Authorization、token、API key、数据库连接串、完整 URL/query/fragment、邮箱、电话、个人资料、偏好、同行人、精确坐标、行程内容、DOM 文本、表单、原始 request/response、Provider payload、原始 error message 与 stack。

相关测试覆盖嵌套敏感值 canary、完整 URL、队列满、sink 抛错/超时、禁用采样和监听器清理。浏览器 bundle 边界复验未发现服务端观测模块或配置泄漏。

## Performance Baseline and Budget

环境：Next production build、Chrome 152.0.7977.77、Node v24.19.0、cold context、关闭缓存、reduced motion、无 CPU/网络节流；Home / Start / Planner / Detail 均在 1440×900 与 390×844 各运行 3 次。320×740 单独执行溢出检查。

| 场景            | Baseline JS |   Head JS |  JS 增量 | Baseline LCP | Head LCP |
| --------------- | ----------: | --------: | -------: | -----------: | -------: |
| Desktop Home    |   168,041 B | 174,045 B | +6,004 B |       112 ms |   108 ms |
| Desktop Start   |   195,014 B | 201,018 B | +6,004 B |       172 ms |   188 ms |
| Desktop Planner |   261,990 B | 267,994 B | +6,004 B |       260 ms |   264 ms |
| Desktop Detail  |   261,990 B | 267,994 B | +6,004 B |       304 ms |   292 ms |
| Mobile Home     |   168,041 B | 174,045 B | +6,004 B |       104 ms |   104 ms |
| Mobile Start    |   195,014 B | 201,018 B | +6,004 B |       180 ms |   168 ms |
| Mobile Planner  |   261,990 B | 267,994 B | +6,004 B |       184 ms |   160 ms |
| Mobile Detail   |   261,990 B | 267,994 B | +6,004 B |       212 ms |   212 ms |

- 预算结果：PASS；全部场景 JS 增量低于 `max(20 KiB, baseline × 5%)`。
- CLS：全部为 0，Desktop Planner 保持约 0.002。
- INP：仅 Desktop Detail 获得 16 ms 的合格实验室交互样本；其余场景明确记录 N/A，没有用 0 或 TBT 代替。
- 320×740：四条核心路由均无横向溢出。
- Planner ↔ Detail 20 轮：全部完成，DOM 节点首尾均为 659；fallback 模式无 Mapbox canvas，heap 仅作为实验室趋势，不宣称证明绝无泄漏。
- 已有 Home 静态资源 404 为 baseline 中既存债务，head 没有新增运行时错误。

证据：`docs/qa/task-024/baseline.json`、`head.json`、`budget.json`。

## Runtime and Browser QA

- 实际浏览器 `ErrorEvent`：PASS，并进入脱敏本地 sink。
- 实际未处理 `AbortError`：PASS，分类为 expected cancellation / info。
- 实际 Next request error：PASS；本任务事件中不含原始消息、stack 或 request。
- 外部观测请求：0。
- 真实 Mapbox 条件样本：Desktop/Mobile × Planner/Detail × 3，共 12 次；全部选择 `mapbox` engine、保持 1 个 canvas、无运行时错误。公开 Token 仅通过本机环境注入，未写入仓库或证据。
- 最终构建在移除 Mapbox 环境变量后通过，证明构建不依赖真实 Token。

证据：`docs/qa/task-024/observability-runtime.json`、`mapbox.json`。

## Validation

- `npm ci`: PASS
- `npm run test:observability`: PASS（10/10）
- `node --test "tests/*.test.mjs"`: PASS（689/689）
- `npm run test:routing`: PASS（28/28）
- `npm run lint`: PASS
- `npm run typecheck`: PASS
- `npm run build`: PASS（无 Mapbox Token）
- `npm run qa:performance:budget`: PASS
- Changed-file Prettier check: PASS
- `git diff --check`: PASS
- Repository-wide `npm run format:check`: Existing baseline debt; 7 个本任务未修改的历史文档不符合 Prettier。本任务文件全部通过，未批量格式化无关文档。

## WBS Update

WBS 9.11 更新为“待审查”，并明确本地子集完成、线上 Collector / p75 / 报警送达 Deferred。只有 PR 合入且后续线上能力独立验收后，才可标记“已完成”。

## Deferred / Known Limitations

- 未接入外部 SaaS、Collector 或公开 ingest endpoint。
- 没有真实用户数据，因此没有生产 RUM p75 结论。
- 报警规则、报警送达、保留期、访问控制与生产部署均 Deferred。
- Mapbox 数据仅是本机网络条件下的小样本，不代表真实用户分布。
- 未实现 Session Replay、行为 Analytics、CSP / 全局限流、部署或 TASK-025。

## Manual Acceptance

审查 Draft PR 的事件 allowlist、故障注入 fail-closed、基线/预算证据与运行手册。合入前无需启用任何外部传输；若未来接入 Collector，必须另行完成目标、保留期、访问控制、防滥用和隐私评审。
