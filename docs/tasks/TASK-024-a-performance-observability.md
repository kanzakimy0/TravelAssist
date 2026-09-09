# TASK-024-A — WBS 9.11 性能预算与错误监控基础

## Metadata

- Task ID: TASK-024-A
- Owner: A / Shared Infrastructure / Observability
- Status: 待验收
- WBS: 9.11
- Priority: P2
- GitHub Issue: #235
- Branch: `codex/a-performance-observability`
- Spec Branch: `task/a-route-observability-deployment-20260909`
- Depends On: 2.11 Error / Logging规范；已核验为规范存在、完整运行时缺失
- Commit: PENDING（提交后同步）
- Pull Request: PENDING（实现 PR）
- Authoring Base: `1af72af0d7151af4dd59073ee0b015a70b267064`
- Implementation Base: `e74904830cbf8e6745b2013b2888e38984ccf96d`
- Result File: `docs/tasks/RESULT-TASK-024-a-performance-observability.md`

## 1. 目标与范围

为Home、Start、Planner、Detail建立可复跑性能基线、回归预算、错误分类和脱敏观测接口。用既有页面与独立fixtures完成，不依赖正式偏好三级列表或全量POI。

本任务完成的是观测工程与本地验收，不默认采购SaaS、不默认收集线上个人行为、不声称云端报警已启用。共同规则见 `docs/project/A-TASK-023-025-execution-plan.md`。

## 2. 审计与唯一入口

先查最新develop的Error/Logging、Feature Flag规范及其实际文件、全局error边界、Map生命周期、Auth与routing日志、QA harness、构建工具。2.11登记为完成不能替代源文件核验。

已有运行时就增量复用；只有规范而无实现时，记录差异并补本Task必需的最小单一入口，不另建大型Logging框架。优先使用安装版本Next提供的instrumentation与Web Vitals接口；检查本机随包文档与官方版本，不升级Next/React/TypeScript来适配新网页示例。

与023独立：其未合并时不读入业务代码、不抢改Planner接线；测当前develop，并预留标准错误码/计时输入。023合并后如在本Task执行范围内，安全整合再测；否则记录后续复验项。

## 3. 事件与隐私规则

采用显式allowlist事件结构：版本、环境、release SHA、route template、来源模块、稳定错误码/类别、严重级别、粗粒度耗时与计数、短期随机correlation ID。不得使用用户/行程/设备的长期标识。

严格丢弃：Cookie、Authorization、token、API key、DB连接串、完整URL/查询/fragment、邮箱/电话/个人资料、偏好和同行人、精确坐标、行程内容、DOM文本、表单、原始request/response和Provider payload。error.message/stack也可能带Secret，不直接序列化；优先稳定code/digest和安全模板。原始DOM attribution或PerformanceEntry必须过滤，不能整包上报。

本地错误与Web Vitals接到可注入test sink和脱敏server logger；外部传输默认关闭。客户端默认no-op或有界本地观测，不创建公开收集端点。未来启用网络sink须有明确批准的目标/保留期/权限与独立入口防滥用验收，未配置就Deferred。

必须有采样、批量上限、去重、退避与队列容量；无用户识别或Session Replay。observer自身异常、序列化失败、sink超时/拒绝不得引起递归错误、页面崩溃或阻塞保存。页面卸载清理监听和队列。

## 4. 采集与异常覆盖

客户端按现有error boundary、受控window error/unhandledrejection和Web Vitals接口接入，避免同一事件被重复记账。服务端使用适配当前版本的request-error/instrumentation入口，别把request headers或raw path整包发出。

保留现有用户错误提示，不以catch-and-ignore掩盖程序缺陷。预期取消、用户输入错误和真正服务异常分开；网络fallback等已知情况只使用窄范围、可追溯例外，不按整个console类别过滤。

观测组件保持最小client边界，不把整个RootLayout改为client，不新增与B个人中心竞争的全局状态。B界面只回归，不改业务代码。

## 5. 性能基线方法

在实际production build测量，记录commit、工具链、构建参数、浏览器/版本、viewport、CPU/网络限制、Mapbox/fallback、fixture版本、cold/warm、缓存策略和运行次数。每个核心冷启动场景至少3次，保留每次结果与中位数；少量实验样本不声称真实用户p75。

页面覆盖Home、Start、Planner与Detail；桌面1440×900、移动390×844，补320×740溢出/功能回归。已有真实Mapbox配置且允许时增加真实底图样本，否则明确Deferred；不能拿fallback数字冒充在线地图性能。

初始素材使用已合并素材，不生成图片。合成行程使用隔离命名的测试fixture：1/3/7日，10/50/200个节点；规模不代表产品承诺或真实景点覆盖，不进入正式目录。

记录LCP、CLS、可测的交互延迟/INP样本、TTFB、首屏加载字节和JS体积；网络/字体/Mapbox/媒体资源分项，别把总dist大小当首屏传输量。字段不支持时记录N/A，不能填0。TBT不是INP。

另外测试Planner↔Detail至少20轮，日期/方案切换、展开/关闭设置、时间轴编辑、地图层开关。记录实例、监听、请求与DOM增长；可用时记录JS heap趋势和测量限制，不能以一次内存截图证明绝无泄漏。

### 本Task预算

| 项目                         | 规则                                                     | 性质                                          |
| ---------------------------- | -------------------------------------------------------- | --------------------------------------------- |
| LCP / INP / CLS              | 2.5s / 200ms / 0.1                                       | 官方良好体验参考；真实用户按p75，实验室仅观察 |
| 新增未处理异常、敏感数据泄漏 | 0                                                        | 硬门                                          |
| 20轮工作区切换               | 不重复初始化存活地图；listener/request无无界增长         | 硬门，按实际生命周期断言                      |
| 固定场景首屏JS gzip增量      | 相对base增加超过 `max(20 KiB, base×5%)` 时失败           | 本Task暂定回归门，非行业标准                  |
| 实验室耗时                   | 同条件中位数增幅>15%且绝对增幅>100ms则复跑；复现后记回归 | 本Task暂定规则，不用一次噪声凑结论            |

先测未改动base，再测实现head，不能以改完后的慢版本当初始base。无法测到base的指标写未建立，不假造。基线与预算必须版本化；超标需优化或带理由人工审查，禁止静默提高阈值、过滤失败或更新baseline掩盖退化。

## 6. 测试与交付

必须验证：事件schema拒绝未知字段；嵌套Secret canary剔除；error.message/URL中的敏感值不泄漏；重复事件合并；采样上限；队列满；sink抛错/超时；取消不升级事故；禁用时零外部观测请求；挂载卸载无重复监听。

实际触发浏览器和服务端错误进入test sink，不只测纯函数。故障注入入口仅测试使用，生产不可触发。再验证RootLayout仍保持原server/client职责、保存与地图行为不变、bundle无服务端敏感模块。

交付：独立观测实现与测试、`tools/qa/` 可复跑性能脚本、`docs/quality/performance-observability.md`、`docs/qa/task-024/` 脱敏报告、Result / Issue / Master WBS / Draft PR。

## 7. 完成边界

本地采集/隐私测试/预算脚本完成可进入待验收；无外部Collector就写“本地观测基础完成，线上Collector/报警送达Deferred”。没有真实用户数据就没有线上p75结论。9.11状态保留已实现子集说明，不冒称线上监控已就绪。

不实现6.11 AI账单、10.4行为Analytics、9.9全局限流/CSP、Session Replay、付费SDK采购或生产部署；不自动合并，不自动开始025。

## 8. 官方参考

核对日期：2026-09-09；以本机安装版本API为实现依据。

- https://nextjs.org/docs/app/api-reference/functions/use-report-web-vitals
- https://nextjs.org/docs/pages/api-reference/file-conventions/instrumentation
- https://web.dev/articles/defining-core-web-vitals-thresholds

Next instrumentation参考包含App Router上下文，仍须在本机确认类型；官方范例直接发送message/request的做法不满足本任务隐私门，不照搬。
