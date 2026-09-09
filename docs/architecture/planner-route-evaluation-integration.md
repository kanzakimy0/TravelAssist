# Planner 开发期路线查询边界

## 目的

TASK-023-A 在不改变 Planner 主数据模型、不持久化 Provider 结果、也不把
Evaluation 能力带入生产环境的前提下，把既有 Route Contract 与駅すぱあと
Evaluation Adapter 接入 Planner 的“移动段”编辑区域。

本接线是开发期核对工具，不是实时交通保证、路线自动应用、路线几何叠加或生产
Provider 承诺。

## 请求链路

1. 用户打开一个现有移动段并显式点击“查询路线”。
2. Planner 使用当前 trip fixture、方案、天、相邻项目、日期、出发时间和模式创建
   不可变请求快照。
3. 只有两端都存在于已核验站点注册表时，客户端才投影 canonical
   `RouteRequest`；景点名、占位地点和歧义地点保持 unresolved。
4. `POST /api/routes/calculate` 再次校验请求体、canonical contract、JST、站点注册
   表、认证、并发上限和服务器功能门。
5. 入口调用既有 server-only Routing Service 与 Ekiworld Adapter，响应只包含
   canonical `RouteResult`，并使用 `private, no-store`。
6. 客户端验证响应 envelope，并且只在快照 key、请求序号和 AbortSignal 仍匹配时
   应用结果。切换方案、日期、端点、关闭面板或卸载都会使旧结果失效。

## 启用与生产保护

本地开发必须同时满足：

- `ROUTING_PLANNER_QUERY_ENABLED=true`
- `ROUTING_PROVIDER_MODE=evaluation`
- 非 `NODE_ENV=production`
- 非 Vercel `preview` / `production`
- 可信 `AUTH_SITE_URL` Origin 与经过 Supabase `getUser()` 验证的用户会话
- 服务器存在合法的 `EKIWORLD_ACCESS_KEY`

任何一项不满足都安全失败，并且不会调用 Provider。客户端无法提交 Provider URL、
key、entitlement 或 fixture 开关。Evaluation 在生产与 Preview 始终 fail closed。

## 已核验站点注册表

注册表位于 `src/shared/routing/planner-verified-stations.ts`，同时供 Planner 投影和
Route Handler 的二次校验使用。首期只覆盖当前 fixture 中可明确映射的少量站点，
不会从坐标自动寻站，也不会接受任意数字 ID 或 `jp-*` 内部 POI ID。

| Planner 地点   | Provider 输入          | 证据                         |
| -------------- | ---------------------- | ---------------------------- |
| 东京晴空塔     | とうきょうスカイツリー | 东武铁道站点页               |
| 银座散步       | 銀座                   | 东京 Metro 站点页            |
| 东京站出发     | 東京                   | JR 东日本站点页              |
| 富士急乐园     | 富士急ハイランド       | 富士山麓电气铁道官方沿线图   |
| 箱根汤本       | 箱根湯本               | 箱根 Navi / 小田急官方交通页 |
| 雕刻之森美术馆 | 彫刻の森               | 箱根 Navi / 小田急官方交通页 |

新增站点必须补官方证据、客户端投影测试和服务端拒绝未登记值的测试。显示名中
的冒号或控制字符会在 Adapter 构造 `viaList` 前被拒绝，避免分隔符注入。

## 会话、保存和地图边界

- 结果仅存在于 React 组件内存；不进入 TripState、localStorage、sessionStorage、
  IndexedDB、Service Worker、数据库、导出或分享。
- 选择备选路线只改变当前查询卡片，不改写项目时间、预约、锁定或后续项目。
- `geometry=null` 显示为无可展示几何；既有地图仍保留“示意路线”身份。
- 本 Task 不把 Provider geometry 叠加到 Mapbox，也不实现永久应用、全程扇出、
  7.10 缓存或 7.11 多 Provider 降级。

## 失败语义

页面区分 disabled、idle、loading、ready、stale、no_route、unsupported 和 error。
未知票价、距离和时间继续使用 `null` 语义，不转换为零。取消会终止可终止的请求，
并通过序号与快照保护阻止迟到结果回写。429、超时和暂时不可用可显式重试；非法
端点和不支持约束不会伪造成功。

## 验证

- 路线专项测试覆盖 contract、Adapter、生产保护、受控入口、竞态和持久化边界。
- 浏览器 harness 使用脱敏 canonical fixture 拦截本地 Route Handler 请求，覆盖
  四种 viewport、Planner↔Detail、范围切换、键盘焦点、锁定项和地图 fallback。
- 无合法駅すぱあと凭据时，live Evaluation smoke 必须标记 Deferred；不得索要或
  伪造凭据。
