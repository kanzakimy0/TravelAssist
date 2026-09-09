# TravelAssist AI 旅行助手主画面设计候选 v0.1

> 状态：**待审查 / 开发可执行设计候选**  
> 日期：2026-09-10 JST  
> Owner：A / Main AI UX Design  
> WBS：1.19  
> Issue：#262  
> 适用：Home、Planner、Trip Detail；Web 优先，后续原生端复用语义  
> 基线：`origin/develop@171900698180b80220017c9c4bec551b72792f27`

本文件定义 AI 助手的**用户界面与交互边界**，不是 AI Provider、Prompt、Agent、Engine 或数据库实现。用户验收前不得把 1.19 标记为已完成。

## 1. 产品定位

AI 助手是 TravelAssist 的自然语言交互层，不是新的行程事实源，也不是一个能绕过确认直接改行程的聊天机器人。

```text
用户语言
  ↓
AI 解释 / 建议 / Proposed ChangeSet
  ↓
确定性校验与影响预览
  ↓
用户确认（需要时）
  ↓
Trip Engine 应用并返回新 revision
  ↓
Planner / Detail 显示已应用结果
```

界面必须持续区分三件事：

1. `AI 回复`：说明或建议，不代表事实已改变；
2. `待应用建议`：有结构化目标和影响范围，但尚未写入 Trip；
3. `已应用变更`：仅在可信 Engine 返回成功结果和新 revision 后成立。

## 2. 现有产品基线

### 2.1 Home

当前 Home 已有右下 `AI 助手`入口、暖白浮层、关闭按钮、Escape 和焦点返回；输入区明确标注服务尚未接入。后续实现应演进现有 `HomeAIAssistant`，不复制第二套 Home AI Shell。

### 2.2 Planner

Planner 的地图、右侧设置/方案、底部六个执行 Tab 共享一个 Trip State。AI 主画面不得创建“AI 行程”副本，也不得遮蔽“重新生成路线”与方案切换的既有职责。

### 2.3 Detail

Detail 与 Planner 共享 Trip Workspace。现有右栏已区分正常、需确认、有问题和待预约，并提供本地“重新检查 / 调整后续行程”示例。AI 主画面负责解释、提出变更和承接确认；当日状态计数与执行仪表盘继续属于 Detail，而不是被聊天记录替代。

## 3. 信息架构

AI Shell 从上到下固定为：

```text
┌────────────────────────────────────┐
│ 标题 / 当前模式 / 关闭             │
├────────────────────────────────────┤
│ 上下文条：Trip / Plan / Day / Item │
├────────────────────────────────────┤
│ 对话与状态流（唯一滚动区）         │
│  ├─ 消息                           │
│  ├─ 依据摘要                       │
│  ├─ 建议动作                       │
│  └─ 变更提案 / 校验 / 确认         │
├────────────────────────────────────┤
│ 推荐提问（空状态或回复后）         │
├────────────────────────────────────┤
│ Composer / 引用 / 发送             │
└────────────────────────────────────┘
```

- Header、上下文条和 Composer 固定；只有消息区滚动。
- Proposal 卡属于消息流，但视觉上必须与普通回答分离。
- 不使用“思考中……”展开区，不展示 Chain-of-Thought、系统提示或工具原始日志。

## 4. 三个入口场景

### 4.1 Home：从想法开始

入口：现有右下 `AI 助手`按钮。

打开后：

- 标题：`AI 旅行助手`；
- 初始问候：`您好，想去哪里？`；
- 上下文条：`尚未关联行程`；
- 推荐提问：`规划第一次日本之旅`、`整理我的旅行想法`、`我需要准备什么`；
- 用户描述形成的内容只能是**旅行需求草案**，不能显示为已生成/已保存行程；
- 未来若提取出日期、目的地、同行人，显示可移除的事实候选 Chips，并提供 `带着这些信息开始规划`，由后续正式流程决定进入 `/start` 或生成服务。

Home 不显示当前方案 revision、路线 Provider 或执行状态。

### 4.2 Planner：围绕当前候选方案

入口建议放在 Workspace 的全局浮动工具层，不塞入右侧五张快速设置卡，也不改变 75%/25% 和底部约 25dvh 的既有布局。

上下文条至少显示：

```text
旅行名称 · 当前工作方案
第 N 天 / 连续 3 天 / 全日
已选项目（如有）
```

推荐提问随上下文变化：

- 未选项目：`比较三个方案的取舍`、`让第二天轻松一点`、`解释当前路线`；
- 选中地点：`为什么推荐这里`、`移到其他日期会怎样`、`查看附近替代`；
- 选中移动段：`解释这段移动`、`查看少换乘方案`。

Planner 中的 AI 修改默认只产生 Proposal。未进入 Engine Preview 前不得改变地图、时间轴、锁定、预约或当前方案。

### 4.3 Detail：围绕执行与风险

入口与 Planner 使用同一 Shell，不创建第二个会话窗口。上下文条显示：

```text
旅行名称 · 当前方案
第 N 天 · Planning Review / Execution Monitor
当前项目或下一项硬约束（如有）
```

推荐提问：

- `检查今天剩余行程`；
- `解释这个需确认项目`；
- `预览调整后续行程`；
- T-48h 后且真实数据可用时：`查看当前延误的影响`。

Detail 的 `正常 / 需确认 / 有问题`属于 AI/规则判断；`已确认 / 待预约`属于预约事实。两套状态在对话中也不得互相覆盖。

## 5. Viewport 与容器规格

### 5.1 宽屏桌面（≥ 1440px）

- Home：右下非全高浮层，宽 `420–456px`，最大高 `min(720px, calc(100dvh - 112px))`，距右/下 `24–40px`。
- Planner / Detail：右侧 Sidecar，宽 `440–480px`，位于既有右栏左侧、覆盖地图边缘但不重排 Workspace；顶部与页面工具区对齐，底部不遮住底部执行栏的主要控制。
- Sidecar 为非模态 `aside`；地图仍可查看与操作。打开、关闭不得引起 Grid layout shift 或重建 Mapbox。

### 5.2 标准/紧凑桌面（1024–1439px）

- 使用右侧 Modal Sheet，宽 `min(440px, calc(100vw - 24px))`，高 `100dvh`；
- 背景 `inert`，使用轻量 dim；
- Planner/Detail 右栏或底栏已经以 Overlay 展开时，打开 AI 前先关闭旧 Overlay，禁止叠两层焦点陷阱；
- 地图、Trip State 和当前选中项不卸载。

### 5.3 平板（768–1023px）

- 同标准桌面 Sheet；宽 `min(420px, 92vw)`；
- Composer 避开软键盘，消息区根据 `visualViewport`/动态视口缩短；
- 不依赖 Hover 暴露操作。

### 5.4 手机（≤ 767px，含 390×844 / 320×740）

- 使用全屏 Dialog，`inset: 0`、`height: 100dvh`；
- 顶部和底部使用 safe-area inset；
- 不保留露出的地图窄条，也不让用户误以为可同时操作背景；
- 上下文条超过一行时横向滚动或折叠为摘要，不推走 Composer；
- Proposal 的主/次按钮纵向排列且每个点击目标至少 44×44px。

## 6. 视觉层级

- 页面语言：暖白/象牙白半透明面、深蓝灰文字、珊瑚红主操作、低对比边框、轻阴影；复用主系统 Token，不在本文件冻结新 HEX。
- 用户消息：浅樱粉；助手说明：暖白；系统/规则结果：中性灰蓝；Proposal：暖白卡 + 明确的 `尚未应用`标签。
- `warning` 必须同时有 `⚠ + 文案`，`critical` 必须有 `❗ + 文案`；颜色不是唯一信息。
- “应用”主按钮只在 Preview 可应用且已满足确认条件时使用强调色。
- AI 图标只标识消息来源，不用于表示校验成功。

## 7. 消息角色与可见元数据

| UI 角色           | 用户看到什么               | 必须显示                                                        | 禁止显示                                   |
| ----------------- | -------------------------- | --------------------------------------------------------------- | ------------------------------------------ |
| User              | 用户提交的文字/引用        | 发送时间（会话内相对时间即可）、引用 Chips                      | 内部用户 ID、完整 Profile                  |
| Assistant answer  | 结论、解释、取舍           | `AI 建议`、数据新鲜度/不确定性（适用时）                        | 隐藏推理、系统提示、模型/provider 原始字段 |
| Context notice    | 上下文变化、离线、范围改变 | 清晰状态和恢复动作                                              | 假装成助手回答                             |
| Proposal          | 结构化变更候选             | `尚未应用`、目标范围、改动/不改动、已知影响                     | “已完成”或伪造 revision                    |
| Validation result | Engine/规则校验结果        | accepted / needs confirmation / blocked / unsupported、问题摘要 | 原始异常、SQL、Provider payload            |
| Applied receipt   | 权威应用回执               | 新 revision、应用时间、变更摘要、可恢复入口（能力存在时）       | 乐观成功冒充提交成功                       |

消息时间不需要每条常驻显示；同一发送组末尾显示一次。模型名、Token 数量和内部 tool call 不属于默认用户信息。

## 8. Composer 与引用

### 8.1 固定结构

```text
[＋ 引用] [当前 Trip / Day / Item chips]
[ 告诉 AI 您想了解或调整什么……      ][发送]
```

- `Enter`发送；`Shift+Enter`换行；输入法组合期间不得发送；
- 空输入禁用发送；发送中允许 `停止生成`；
- 发送失败保留输入和引用，允许重试；
- 不使用仅图标、无 accessible name 的按钮。

### 8.2 P0 引用类型

- 当前 Trip；
- 当前方案；
- 当前 Day/范围；
- 当前地图地点；
- 当前 Itinerary Item/移动段；
- 当前已显示的规则/预约状态。

每个引用显示人类可读名称并可单独移除。引用只传稳定公开 ID 与构建请求所需的最小摘要，不能把 Planner private Store 全量塞进消息。

### 8.3 附件边界

P0 不开放任意文件、图片、预订邮件或票据上传。附件按钮只承载结构化页面引用。未来上传必须另行定义文件类型、大小、病毒扫描、隐私、保留、删除和 OCR 边界；未实现时不显示可用入口。

## 9. 上下文条

上下文条必须让用户知道“AI 正在看哪一趟、哪一天、哪一项”。

| 场景    | 最小内容                             | 用户控制                                |
| ------- | ------------------------------------ | --------------------------------------- |
| Home    | 尚未关联行程 / 已提取的需求候选      | 移除单个候选                            |
| Planner | Trip、工作方案、范围、选中对象       | 切换/移除选中对象；不在 AI 内改方案选择 |
| Detail  | Trip、方案、Day、阶段、选中/下一项目 | 切 Day/项目后显示“上下文已更新”         |

上下文更新不会自动重新发送上一条问题。会话中的旧回答保留其当时作用范围，并显示 `基于第 N 天旧上下文`，避免用户误认为答案随页面选择实时改写。

## 10. 建议动作

推荐动作是填充/提交清晰意图，不是直接执行 Trip 修改。

- 纯解释动作可直接生成回答；
- 可能改变行程的动作必须先产生 Proposal；
- 涉及酒店、已确认预约、付款、航班/长途交通、用户锁定或费用变化的动作永远不得一键静默应用；
- `查看建议`、`预览影响`、`保持原计划`、`采用建议`必须是不同按钮和状态。

同一屏最多常驻 3 个推荐动作；其余进入 `更多建议`。上下文变化后重新计算文案，但不自动调用 AI。

## 11. Proposal → Preview → Apply 状态机

```text
[AI answer]
     │ 用户要求调整
     ▼
[proposal / 尚未应用]
     │ 预览影响
     ▼
[validating]
     ├─ blocked ───────────► [保留原计划 / 修改请求]
     ├─ unsupported ───────► [说明当前不支持]
     ├─ needsConfirmation ─► [确认范围与取舍]
     └─ accepted ──────────► [可应用 Preview]
                                  │ 用户采用
                                  ▼
                               [applying]
                                  ├─ committed + revision ► [已应用]
                                  ├─ stale/conflict ──────► [重新加载并重新预览]
                                  ├─ rolled back ─────────► [未更改，可重试]
                                  └─ outcome unknown ─────► [核对状态，禁止重复提交]
```

### 11.1 Proposal 卡必备字段

- `AI 建议 · 尚未应用`；
- 目标：Trip / Plan / Day / Item；
- `将改变`列表；
- `不会改变`列表，特别标出锁定、已确认预约和硬约束；
- 预计时间、费用、移动和预约影响；未知值明确写 `尚无法确认`，不得写 0；
- 使用的事实更新时间/有效性摘要；
- `保持原计划`与`预览影响`。

### 11.2 Preview

Preview 必须是 detached before/after，不得修改当前地图和正式时间轴。可在地图/轨道上使用明确的“预览层”，关闭 Preview 后恢复原状态。

### 11.3 Confirmation

`needsConfirmation`列出确认原因和影响对象。确认授权必须 scope-bound、一次操作可辨识；一个“同意”不能授权未展示的取消、付款或跨日变更。

### 11.4 Applied / Failed

- 只有 Engine 返回 `committed`和新 Trip/Plan revision 后显示 `已应用`；
- stale revision 必须重新读取和 Preview，不得自动覆盖；
- rollback 显示 `原行程未改变`；
- outcome unknown 禁用重复应用，先提供 `核对当前行程`；
- UI 不显示数据库错误、Provider 错误原文或堆栈。

## 12. 对话与运行状态

| 状态                     | 界面                                      | 可恢复动作                      |
| ------------------------ | ----------------------------------------- | ------------------------------- |
| Empty                    | 场景化问候、3 个建议、Composer            | 输入或选择建议                  |
| Loading                  | 消息骨架/简短阶段文案、停止按钮           | 停止；不伪造百分比              |
| Streaming                | 逐步显示最终可见回答；`aria-live`节流     | 停止；完成后一次朗读摘要        |
| Timeout                  | `响应时间较长，尚未完成`                  | 重试、保留输入                  |
| Offline                  | 顶部离线条；可浏览已在内存/本地允许的数据 | 保存草稿；禁用需联网的发送/应用 |
| AI unavailable           | 明确 `AI 服务暂不可用`                    | 返回手动 Planner/Detail 操作    |
| Partial                  | 显示已确认范围和缺失范围                  | 补充信息、仅预览已知部分        |
| Safety refusal           | 简短安全说明，不泄露规则文本              | 修改问题、使用普通规划功能      |
| Rate/entitlement limited | 说明可恢复时间或能力边界                  | 稍后重试；不伪造服务错误        |
| Stale context            | 标出 Trip/Day 已变化                      | 更新上下文后重新提问/预览       |

“正在查询实时交通/天气”只在真实工具正在运行且授权有效时出现；否则写 `尚未连接实时数据`。等待动画不得暗示正在使用并不存在的 Provider。

## 13. Planning Review 与 Execution Monitor

- T-48h 前默认 `Planning Review`：检查整趟结构、偏好、冲突、预约准备和备选；遥远未来天气不标成确定红色问题。
- T-48h 起且运行能力真实可用时使用 `Execution Monitor`：聚焦当前、今天剩余、下一硬约束和未来 24–48h 高风险。
- 没有实时 Provider/位置/事件数据时保持 `Planning Review`或显示 `执行监控数据不可用`，不得因为日期接近就伪造实时判断。
- 每条动态事实显示更新时间；过期信息标为过期，不用于 all-clear。

## 14. 数据与持久化边界

### 14.1 仅本地 UI 状态

- Shell 开/关、尺寸模式、滚动位置；
- Composer 未发送草稿与尚未提交的引用；
- 当前展开的消息/Proposal 区块；
- 流式响应的临时缓冲和 optimistic 视觉；
- 当前 Preview 图层；
- Guest 会话默认只在当前浏览器会话内存在。

这些状态不是 Trip 事实，不进入 TripPlanSnapshot。

### 14.2 未来可保存的最小会话记录（WBS 8.7 后）

- 会话 ID、所属用户/Trip 的安全引用；
- 用户已发送消息；
- 助手最终展示文本，不保存隐藏推理；
- 用户可见的 safe evidence 摘要与 freshness；
- Proposal/ChangeSet 引用、校验结果、最终 applied revision；
- 创建/更新时间和保留/删除状态。

保存会话必须先有 Auth、授权、保留期限、导出/删除和跨用户拒绝设计。当前 Task 不创建表、API 或 localStorage 契约。

### 14.3 永不进入会话展示/普通记录

- System Prompt、hidden reasoning、模型内部 scratchpad；
- Provider raw payload、SDK object、access token、Cookie、授权头；
- Service Role、数据库连接信息；
- 与当前请求无关的完整用户资料、历史行程、联系人或付款数据；
- 未脱敏订单确认码、私人地址/备注或日志堆栈。

## 15. 模块边界

| 模块             | AI Shell 可读取/发起                                          | AI Shell 不得做                                         |
| ---------------- | ------------------------------------------------------------- | ------------------------------------------------------- |
| Planner / Detail | 当前公开 Trip/Plan/Day/Item 引用、选中上下文、显示 Preview    | 读取/持久化 private Store 快照；直接改地图/时间轴       |
| Trip Contract    | 版本化公开 Snapshot/Resume 引用                               | 发明 ID、把数组索引当 durable ID                        |
| Engine           | 提交受限 Proposed ChangeSet，显示 validate/preview/apply 结果 | 绕过 permission/lock/booking/CAS/confirmation           |
| Route            | 请求未来受控 route fact/alternative，显示 null/unknown        | 在客户端持有 Provider key；把 evaluation 结果当生产保证 |
| POI              | 引用 canonical POI 或保留 unresolved                          | 猜坐标/Provider ID；用 AI 图冒充真实景点                |
| Preference       | 读取未来 5.14 最小有效 Contract                               | 把当前旅行临时要求静默写回长期偏好                      |
| Booking          | 显示可信规范化状态和操作入口                                  | 直接购买、取消、改签或伪造最低价                        |
| AI API           | 发送最小 Context + 用户意图，接收结构化可见结果               | 暴露 Provider payload、秘密、任意 SQL/工具权限          |

## 16. Keyboard、Focus 与辅助技术

### 16.1 打开/关闭

- 入口按钮具有 `aria-label`、`aria-expanded`、`aria-controls`；
- 打开后焦点移到标题或 Composer（空会话优先 Composer，有阻断/确认状态优先状态标题）；
- Escape：先关闭最内层确认/引用菜单，再关闭 AI Shell；
- 关闭后焦点返回原入口或触发本次打开的 Planner/Detail 控件；
- Modal Sheet/手机 Dialog 使用 `role="dialog"`、`aria-modal="true"`、焦点陷阱和背景 `inert`；
- 宽屏非模态 Sidecar 使用 `aside`/`complementary`，不捕获页面外焦点。

### 16.2 消息与状态

- 消息历史使用语义列表；每条有隐藏/可见来源标签；
- 普通流式 token 不逐字 `aria-live`；状态改变使用 polite，阻断/apply 失败使用 assertive 的短摘要；
- Proposal 标题、目标、影响和按钮可通过 heading 顺序浏览；
- Validation 状态不用颜色单独表达；
- 长回答提供 `跳到最新消息`和`跳到输入框`。

### 16.3 触控与目标尺寸

- 主要操作和关闭按钮至少 44×44px；
- Hover 内容也能通过 Focus/点击获得；
- 不把 swipe 作为关闭/展开的唯一方式。

## 17. Motion

- Shell 进入/退出：180–240ms opacity + 轻微 translate；
- Proposal/Preview 状态变化不使用庆祝动画或强弹跳；
- 地图 Preview 过渡不得重建地图；
- `prefers-reduced-motion: reduce`时取消位移、打字光标和自动滚动，只保留即时显示/轻淡入；
- 任何状态信息不能依赖动画才能看到。

## 18. 安全与诚实反馈

- `AI 建议`不写成`系统已确认`；
- `基于示例/本地规则`不写成`实时检查`；
- 价格、营业、路线和预约状态未知时显示未知；
- 说明“为什么”只展示可验证摘要、规则和 safe evidence，不展示隐藏推理；
- 冲突、权限、锁定、过期数据和 stale revision 必须 fail closed；
- AI 拒绝或工具失败不得擦除用户输入、当前 Trip 或正式方案。

## 19. Implementation handoff

后续 6.13 实现建议拆分而非复制现有页面：

```text
AssistantEntry             场景入口/展开状态
AssistantShell             viewport 容器、focus、Escape
AssistantContextBar        最小 Trip/Day/Item 摘要
AssistantMessageList       可见消息和状态
AssistantComposer          输入与结构化引用
ChangeProposalCard         尚未应用建议
ChangePreviewCard          validate/preview/confirm/apply 状态
AssistantStatusNotice      offline/timeout/stale/unavailable
```

共享语义可以独立于 React：`AssistantSurface = home | planner | detail`、`AssistantMode = planning_review | execution_monitor`、Proposal/Validation/Apply 状态枚举。具体 wire model 必须等 WBS 6.2/6.4/6.6 冻结，本文不创建第二套 API Schema。

## 20. Acceptance matrix

| ID    | 场景           | 验收步骤                         | 期望结果                                                         |
| ----- | -------------- | -------------------------------- | ---------------------------------------------------------------- |
| AI-01 | Home entry     | 打开/关闭 Home AI                | 复用现有入口；问候和未关联上下文清楚；焦点返回                   |
| AI-02 | Planner entry  | 在 1日/3日/全日打开              | 读取当前范围；不改变 75/25、底栏或 Trip State                    |
| AI-03 | Detail entry   | 从不同 Day/Item 打开             | 显示当前 Day/Item 与判断阶段；状态不和预约混淆                   |
| AI-04 | Context change | AI 打开时切 Day/Item             | 出现上下文已更新；旧回答保留旧范围，不自动重发                   |
| AI-05 | Explanation    | 请求“为什么推荐”                 | 显示结论、取舍、数据新鲜度；无 hidden reasoning/provider payload |
| AI-06 | Proposal       | 请求移动一个项目                 | 先显示`尚未应用`、目标、改变/不改变和未知影响                    |
| AI-07 | Preview        | 点击预览                         | 只显示 detached preview；关闭后正式地图/时间轴未改变             |
| AI-08 | Confirmation   | Proposal 涉及酒店/预约/费用/锁定 | 明确列出 scope；未确认不能 apply                                 |
| AI-09 | Applied        | Engine 返回 committed + revision | 显示已应用和新 revision；各视图从同一 Trip 刷新                  |
| AI-10 | Blocked        | 硬约束冲突                       | 显示原因和可恢复动作；无 Apply                                   |
| AI-11 | Stale          | base revision 已变化             | 阻止覆盖；要求重新加载和 Preview                                 |
| AI-12 | Failure        | timeout/rollback/outcome unknown | 保留原行程；区别可重试、已回滚和需核对                           |
| AI-13 | Offline        | 断网打开/发送                    | 可读允许的本地内容；联网动作禁用；不伪装实时                     |
| AI-14 | Empty/partial  | 无 Trip 或缺坐标/数据            | 明确缺失；允许补充；不猜测或补 0                                 |
| AI-15 | Desktop        | 1600×900、1440×900               | Sidecar/浮层不重排 Workspace，不重建地图                         |
| AI-16 | Compact        | 1280×800、1024×768               | 单一 Modal Sheet；无嵌套焦点陷阱、无横向溢出                     |
| AI-17 | Mobile         | 390×844、320×740                 | 全屏 Dialog、safe-area、Composer 不被键盘永久遮挡                |
| AI-18 | Keyboard       | Tab/Shift+Tab/Enter/Escape       | 顺序可预测；IME 不误发；Escape 分层关闭；焦点恢复                |
| AI-19 | Screen reader  | 浏览消息、Proposal、状态更新     | 角色/标题/状态可辨；流式文本不逐 token 轰炸                      |
| AI-20 | Reduced motion | 开启系统减弱动态                 | 无位移/打字/自动滚动依赖，全部功能保留                           |
| AI-21 | Privacy        | 审查 UI、日志和保存候选          | 无 secret、raw payload、hidden reasoning、无关 Profile           |
| AI-22 | No AI runtime  | Provider/API 未配置              | 清楚显示未接入/不可用；不生成假回复或假成功                      |

## 21. Deferred / non-goals

- WBS 6.1–6.8 的能力边界、消息 wire model、Prompt、Provider、Agent/Tool runtime、AI API、偏好读取、生成和修改；
- WBS 6.10–6.12 的运行降级、成本和质量测试具体实现；
- WBS 8.7 会话数据库、保留与删除策略；
- 真实 Route/POI/Weather/Booking 查询和付费调用；
- 真实 T-48h 后台监控、通知、Native App；
- Autopilot 阈值、付费套餐和高风险交易授权；
- 本 Task 不修改 Home/Planner/Detail 运行时代码。

## 22. Review questions

用户验收前需要确认：

1. 宽屏 Planner/Detail 是否采用不重排 Workspace 的非模态 Sidecar；
2. 1024–1439px 是否统一转右侧 Modal Sheet；
3. 手机是否采用全屏 Dialog，而不是保留地图窄条；
4. P0 是否只支持结构化页面引用，暂不提供文件/票据上传；
5. Home 的结构化需求候选是否通过后续正式流程创建 Trip，而不是在本 Task 定义新路径。

这些问题不阻止文档进入待审查，但用户确认后才能把 WBS 1.19 标记为已完成并作为 6.13 的冻结输入。
