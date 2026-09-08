# TASK-017-B：Preference / Trip Draft 持久化边界

## 状态与所有权

- B 的持久化候选实现；整体 **Partial，不是完整 Step 服务器迁移**。
- 消费已合并冻结的 A `TripDraftFactsV1` / `WizardProgressV1`，不复制或扩展 A 主 Trip Plan 模型。
- 新增浏览器安全接口：`src/shared/contracts/preferences/`。
- 内部 Drizzle Repository / SQL 字段不作为 Planner 对外读取契约；5.14/4.18/5.19/8.5 未实施。
- 不改变现有 Personal Center / Start / Planner UI。当前 UI 仍使用原有本地/内存状态，不能宣称跨设备同步已上线。

## 数据模型选择

选择关系型所有权、版本、唯一键 + 受验证的版本化 JSONB 内容，不存整个 UI state。

| 表                        | 内容                                                                 | 约束                                                                                        |
| ------------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| travel_preferences        | owner、payload、revision、审计时间                                   | auth.users FK；一用户一根；payload 版本及已冻结 category.item key/value 校验                |
| trip_drafts               | id、owner、creation_key、status、facts、progress、revision、审计时间 | owner+creation_key 唯一；owner+id 复合唯一；owner+updated_at 索引；facts/progress 消费 A v1 |
| trip_preference_snapshots | draft、owner、payload、source_preference_revision、created_at        | owner+draft 复合 FK；一草稿一不可变快照                                                     |
| trip_preference_overrides | draft、owner、payload、revision、审计时间                            | owner+draft 复合 FK；一草稿一稀疏覆盖根                                                     |

- JSONB 中不混存 owner、UI labels、Radar 坐标/摘要、样例方案或正式 itinerary。
- SQL 校验 Preference 全部已支持键值及 envelope；Draft SQL 检查大小/版本/基本结构，服务器入口和读回均执行 A 完整语义解析（日期、货币、时区等），两层职责不冒称完全等价。
- 迁移唯一真源：`supabase/migrations/20260908130000_create_trip_preference_drafts.sql`；Drizzle 仅镜像；generated types 来自 Local CLI。

## 偏好语义

- 当前支持的 30 个 key 来自已有 Mobility / Attraction / Dining / Accommodation / Budget / Experience 与 Step 兴趣/六条滑轨，不新增商品规则或 Provider 枚举。
- 缺失 key：长期层代表未设置，Override 层代表继承；不注入 UI Mock 默认值。
- `false`、`neutral`、空兴趣列表都是明确值；`unset` 数组删除覆盖 key，恢复继承。不能同时 set/unset 同一 key。
- 有效偏好 = Snapshot.values + Override.values。组合后再次验证，互相冲突的喜欢/不喜欢被拒绝。
- 既有五档滑轨仅 1–5，0 非法，不能为了测试而增加第六档。具体预算金额的 0 在 A Draft facts 中完整保存，不变成 null。
- 无长期记录时快照为空、source revision=0；已有记录时复制当时 payload+revision。创建触发器保证原子建立快照/空覆盖层。
- 更新长期偏好不重写旧 Snapshot；更新 Override 不回写长期偏好。
- 导入相同行程 facts 时仍从当前登录用户的长期偏好取快照。接口不接收原作者 Snapshot。

## 服务入口

`POST /api/travel-persistence`，请求包含 `operation` 与 `input`，仅接受 Bearer 身份，不读取浏览器自报 owner。

| operation              | 输入                                                          |
| ---------------------- | ------------------------------------------------------------- |
| getPreference          | 空对象                                                        |
| updatePreference       | revision + schemaVersion/set/unset patch                      |
| createDraft            | creationKey UUID + facts/progress content                     |
| getDraft               | draft id                                                      |
| listDrafts             | 空对象；最多 50 个当前用户 active draft，非正式 Trip 历史接口 |
| updateDraft            | id + expected revision + 完整验证的 facts/progress content    |
| updateOverrides        | id + expected override revision + 稀疏 patch                  |
| getEffectivePreference | draft id；内部后续交接能力，不等于 5.14 已完成                |

- Supabase `getUser(accessToken)` 验证身份，不用未验证 JWT decode 或 getSession 代替。
- verified owner 写入事务级 RLS claims；`SET LOCAL ROLE authenticated`。连接池不会保留角色/claims。
- 每个 owner 的事务锁串行化服务请求；更新另有 revision compare-and-swap。其他设备的旧版本收到 409。
- create 使用 owner+creationKey 幂等，重试不覆盖已有事实；id/creationKey 不允许更新。
- Snapshot 不允许更新，子表不能迁移到另一个草稿。Auth 用户删除级联，尚未提供产品删除/归档流程。
- 响应不返回 owner、数据库 URL、Token、原始异常；私有响应 no-store；请求流最多 192 KiB。
- 所有私有表 RLS ON，anon 无 CRUD grants，无宽泛 true policy，无 SECURITY DEFINER。

## 自动保存 / 恢复交接

`createServerDraftAutosave` 为可测试的客户端控制器：

1. Auth Core 提供当前 access token；客户端不新建匿名账户、不持久保存 Token。
2. 创建意图 UUID 必须由未来 UI 按用户/草稿保存，不能每次编辑随机重建。
3. 仅在显式有效编辑后 queue；默认 650ms debounce，串行处理在途新编辑。
4. 网络失败保留待保存内容，可 retry；丢失 create 响应仍使用原创建内容，不能覆盖另一设备的新修订。
5. 409 停止写入；只有显式 resume 才采用服务器版本，不能自动丢弃本地编辑。
6. dispose 取消未发出的定时任务；调用方必须先 flush/处理失败再决定离开页面。

**尚未接入实际 StartFlowShell**：当前没有 Auth Core 身份交接入口；旧浏览器金额字段无币种/小数单位上下文；familiarity、兴趣细分、部分交通/付费体验输入尚须完成独立 typed mapping。不能把这些遗漏伪装成自动恢复成功。

目前提供 API 和控制器，而不是把本地草稿静默上传或把默认 Mock 当作用户确认偏好。页面上线需要补齐映射、登录/登出与用户切换清理、离线/冲突可见反馈、草稿选择和跨设备浏览器验收；本次不会擅自实现 Auth Core。

## 验证入口

- `npm run test:preferences`：纯语义、debounce、失败重试、旧版本保护。
- `npm run test:preferences:db`：Local-only，真实 SQL/RLS/Drizzle、Supabase 登录验证、跨用户 API、并发 create/update。事务夹具回滚，Auth API 夹具在 finally 中逐一删除。
- Local 测试仅允许已验证的本机 Docker project travelassist、端口 54321/54322、空 Auth 数据库；不接受云端 URL。
- 既有 TASK-016 测试明确限定原三张 Profile 表，不把新增独立域误认为 Profile 污染。
