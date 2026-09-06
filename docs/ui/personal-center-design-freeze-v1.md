# TravelAssist 个人中心设计 Freeze v1

> 文档版本：v1.0  
> 更新日期：2026-09-06  
> 对应 WBS：**1.30 个人中心设计 Freeze v1**  
> Owner：A+B  
> 状态：**设计已确认并冻结**  
> 冻结范围：WBS 1.21–1.29 的信息架构、页面结构、关键交互、视觉方向、响应式与状态规范  
> 说明：本文件是个人中心 v1 的总冻结文档；若与 1.21–1.29 的早期表达存在冲突，以本文件的“冲突裁决 / Freeze 规则”为准。

---

## 1. Freeze 目标

WBS 1.30 不新增业务功能，而是把 1.21–1.29 已确认的个人中心设计整理成一套唯一、可执行、可交付给开发的 v1 基准。

Freeze 后，个人中心 v1 的核心原则固定为：

1. **个人中心是用户的旅行资产与长期资料空间，不是后台 Dashboard。**
2. **用户正在规划“这一次旅行”的页面归主 Planner；用户点击头像后管理“自己”的页面归 Personal Center。**
3. 个人中心统一使用暖米白、轻日式、旅行感的视觉语言，避免灰色 SaaS / Admin 风格。
4. 一级信息架构、账户入口、偏好层级、同行人、旅行库、预订同步、响应式和状态模型在 v1 内不再随意漂移。
5. 概念图、生成图与素材只作为视觉参考；**正式 Markdown 设计规格优先级更高**。

---

## 2. 上游设计与优先级

本 Freeze 汇总以下已确认设计：

| WBS | 正式文档 | 冻结内容 |
|---|---|---|
| 1.21 | `docs/ui/personal-center.md` | Personal Center IA、首页结构、方案 D 视觉基准 |
| 1.22 | `docs/ui/personal-center-shell.md` | Avatar Popover、Sidebar、Shell、全局操作区 |
| 1.23 | `docs/ui/authentication.md` | 登录、注册、找回密码、Auth Shell |
| 1.24 | `docs/ui/profile-account.md` | Profile、基础设置、账户管理入口 |
| 1.25 | `docs/ui/preference-center.md` | 长期旅行偏好中心、雷达图、六类偏好 |
| 1.26 | `docs/ui/companion-management.md` | 同行人资料、常用组合、Trip Snapshot 边界 |
| 1.27 | `docs/ui/trip-library.md` | 我的旅行、草稿、历史、收藏、Reservation Hub |
| 1.28 | `docs/ui/account-security-data-privacy.md` | 登录与安全、数据与隐私、预订与账户同步 |
| 1.29 | `docs/ui/personal-center-responsive-states.md` | Desktop / Tablet / Mobile、Loading / Empty / Error 等状态 |

优先级规则：

```text
本 Freeze（1.30）
  > 后续版本号更高的已确认专项设计
  > 1.29
  > 1.28
  > 1.27
  > 1.26
  > 1.25
  > 1.24
  > 1.23
  > 1.22
  > 1.21
  > 概念图 / 参考图 / 临时 Mock
```

若后续新设计要改变本 Freeze 的规则，必须明确标注为 **v1.1 / v2 或新的 WBS 冻结项**，不得在开发中隐式改写。

---

## 3. A / B 模块边界 Freeze

### 3.1 A：主旅行系统

A 负责：

- 网站首页与主入口
- Planner
- 地图、路线、交通方式、时间轴
- 行程生成 / 重新规划 / 方案切换
- 主系统 AI 助手
- Trip Plan / Planner 核心 Contract

### 3.2 B：Personal Center

B 负责：

- 登录 / 注册 / Session 用户流程
- 个人中心 Shell 与 Avatar 入口
- Profile / Account
- 长期旅行偏好
- 同行人
- 保存行程 / 历史 / 草稿 / 收藏
- 个人中心中的预订与账户同步
- Personal Center 状态、响应式、测试

### 3.3 交叉点

跨模块只通过明确 Contract 连接：

```text
B Preference Contract → A Planner
A Trip Plan Contract → B Saved Trips
B Auth/User Session → A Header / Avatar Entry
```

个人中心 v1 Freeze **不冻结数据库表结构、API Schema 或 Planner 内部 Store 实现**；这些由对应工程 WBS 单独冻结。

---

## 4. Personal Center 一级 IA Freeze

一级导航固定为 5 项：

1. **我的首页**
2. **我的旅行**
3. **旅行偏好**
4. **同行人**
5. **账户**

不新增以下一级入口：

- 订单与预约
- Booking / Agoda / Klook 等 Partner
- 通知
- 帮助 / Legal
- 收藏
- 旅行灵感
- 目的地探索

这些功能必须进入既定二级结构或全局操作区。

---

## 5. Shell / Avatar Freeze

### 5.1 Desktop Shell

Desktop 保持：

```text
┌──────── Sidebar ────────┬──────────────── Content Area ────────────────┐
│ Brand                    │                                🔔   Avatar   │
│ User shortcut            │                                              │
│ 我的首页                 │          Page Content                        │
│ 我的旅行                 │                                              │
│ 旅行偏好                 │                                              │
│ 同行人                   │                                              │
│ 账户                     │                                              │
│                          │                                              │
│ 日式装饰插画             │                                              │
└──────────────────────────┴──────────────────────────────────────────────┘
```

冻结规则：

- Sidebar 是 Personal Center 的主导航，不额外增加第二套顶部全量导航。
- Sidebar 用户头像 / 名称是 Profile 快捷入口。
- 右上 Avatar 是全局账户 Popover 入口。
- 右上仅保留轻量全局操作，例如通知与 Avatar，不增加完整 secondary header。
- Shell 在子页面切换时保持挂载，仅替换 Content Area。

### 5.2 Notification 裁决

**通知不作为 Account 首页主卡片，也不作为 Personal Center 一级导航。**

v1 使用右上角铃铛作为通知入口；通知中心的完整业务能力由后续独立功能承接。

### 5.3 Help / Legal 裁决

**帮助 / Legal 不作为 v1 Account 首页主卡片。**

- Terms / Privacy 等法务链接可放在合适的 Footer、Auth 流程或后续 Help 页面。
- 不为了暴露法务链接破坏 Account 页的主要信息层级。

---

## 6. 我的首页 Freeze

### 6.1 页面顺序

首页内容顺序固定为：

```text
Next Trip Hero
↓
我的旅行 Preview
↓
更多功能模块
```

### 6.2 Next Trip Hero

Hero 必须突出下一次旅行：

- 目的地
- 日期 / 天数
- 同行人数
- 主要旅行方式 / 风格摘要
- “继续规划”主 CTA

真实旅行照片作为主要情绪素材；可使用局部渐变遮罩保证文字可读。

### 6.3 我的旅行 Preview：最终冲突裁决

**Desktop v1 冻结为 3 张等宽旅行卡，不采用“1 大 + 2 小”。**

这是对 1.21 早期“3 等宽或 1 大 + 2 小均可”表达的最终裁决。

卡片内容至少包括：

- 目的地 / 旅程名
- 日期或日期待定
- 天数
- 状态
- 可选同行人数 / 预订摘要

卡片允许使用真实目的地照片；状态 Badge、渐变、箭头、圆角、阴影由 UI/CSS 实现，不制作成截图素材。

### 6.4 更多功能模块

首页二级入口保留：

- 旅行灵感
- 我的收藏
- 目的地探索

其中：

- `我的收藏` → `我的旅行 → 收藏`
- 旅行灵感 / 目的地探索在未实现时可以显示轻量“即将开放”状态
- 三者不进入 Sidebar 一级导航

---

## 7. Authentication Freeze

认证页面使用独立 Auth Shell，不显示 Personal Center Sidebar。

Desktop：

```text
左侧旅行视觉区 + 右侧认证卡
```

冻结流程：

- 登录支持手机号与邮箱。
- 手机号登录：OTP 为主；未注册手机号验证通过后可自动注册并登录，但必须展示 Terms / Privacy 同意信息。
- 邮箱登录：密码为默认方式；OTP 可作为替代方式。
- 未注册邮箱 OTP 不自动注册。
- 注册：邮箱 + 密码 + 确认密码 + Terms。
- 注册阶段不强制完成偏好问卷。
- 找回密码使用邮箱重置链接。
- Google / Apple 保留登录位。
- 登录完成后尽量返回用户原本的上下文 / 目标页面。

---

## 8. Profile / Account Freeze

Account / Profile 负责：

- Avatar
- 昵称（必填）
- 姓名
- 生日
- 性别
- 居住国家 / 城市
- 联系方式摘要（只读）
- 语言 / 地区 / 时区
- 默认货币
- 距离 / 温度 / 时间显示单位
- 可选紧急联系人

只有真正必填字段显示 `*`。

底部账户管理入口固定为：

1. **登录与安全**
2. **数据与隐私**
3. **预订与账户同步**

不使用“绑定第三方账号”作为正式名称。

---

## 9. Preference Center Freeze

### 9.1 定位

个人中心 Preference = **长期默认偏好**。

Planner Preference = **当前 Trip 的临时偏好 / 条件**。

```text
长期偏好 → 新旅行默认读取
Trip 内修改 → 默认只影响当前 Trip
```

### 9.2 业务层级

偏好结构必须遵循：

```text
大项目 → 中项目 → 小项目
```

不得在 Personal Center 建第二套与 Planner 不一致的偏好分类。

### 9.3 两组雷达摘要

内容偏好轴固定为：

- 自然
- 历史
- 人文
- 艺术
- 摄影
- 活动体验

旅行风格轴固定为：

- 轻松
- 经典
- 计划
- 探索
- 参与
- 深度

雷达图默认是摘要 / Read-only，可点击维度进入详情；v1 不要求用户理解复杂数值评分。

### 9.4 六类长期偏好卡

- 移动
- 景点与活动
- 餐饮
- 住宿
- 预算
- 旅行体验

不在长期偏好页重复同行人、日期、Trip 临时条件。

---

## 10. Companion Freeze

同行人是可复用的长期资料，而不是当前 Trip 的即时表单。

冻结规则：

- 年龄层支持 Adult / Child / Infant / Senior。
- 生日可选；填写后按旅行日期计算年龄。
- 只记录用户明确提供的旅行相关需求，不进行敏感属性推断。
- 支持常用出行组合。
- “本人”不可删除。
- Trip 创建时生成 Companion Snapshot。
- 后续修改 / 删除长期 Companion 不应改写历史 Trip Snapshot。

---

## 11. 我的旅行 / Trip Library Freeze

### 11.1 一级标签

Trip Library v1 固定标签：

- 全部
- 即将出发
- 草稿
- 历史
- 收藏

`归档`可作为未来 / 内部能力，不作为 v1 主标签。

### 11.2 新建旅程

`+ 新建旅程` 进入既有旅行创建流程的 Step 3，跳过已由长期资料覆盖的 Step 1 / Step 2。

### 11.3 单次旅行内部结构

固定为：

```text
总览 / 地图 / 日程 / 预订 / 预算 / 设置
```

Reservation Hub 位于某次 Trip 的 `预订` 内，不在 Personal Center 新增“订单”一级导航。

### 11.4 外部预订

Booking.com、Agoda、Trip.com、Klook、GetYourGuide、Viator、OpenTable、TableCheck、航空、铁路、租车等外部预订统一作为 Trip Reservation 来源。

冻结规则：

- Partner 是来源属性，不是导航结构。
- 支持连接账户、确认邮件识别、PDF、订单号、手动导入等入口。
- 外部 Reservation 应匹配到 Trip / Day / Item，并检测重复。
- 支付、退款、履约的 Source of Truth 是 Partner。
- 删除 TravelAssist Trip 或账户 **不会自动取消外部订单**。

---

## 12. Security / Privacy / Booking Sync Freeze

### 12.1 登录与安全

支持：

- Email
- Phone
- Password
- Google
- Apple
- Session / 登录设备管理
- Security Activity

规则：

- OTP 用户可设置密码。
- 不允许移除最后一种可用登录方式。
- 高风险操作需要重新验证身份。
- v1 不强制 TOTP / Passkey / Security Key。

### 12.2 数据与隐私

包含：

- 数据类别说明
- 数据导出
- 删除账户 Danger Region

删除账户流程至少包含：

1. 说明会删除什么。
2. 检查未来 Trip / 外部 Reservation。
3. 建议先导出数据。
4. Re-auth。
5. 输入“删除账户”确认。

Danger 使用明确红色，不与品牌 Coral 混用。

### 12.3 预订与账户同步

正式名称固定为 **预订与账户同步**。

状态至少覆盖：

- 已连接
- 未连接
- 已过期
- 同步中
- 失败
- 需要重新授权
- 断开连接

不保存 Provider 密码；断开同步不取消订单；已导入记录是否删除必须单独管理。

---

## 13. Responsive Freeze

### 13.1 断点

| 模式 | 宽度 | 结构 |
|---|---:|---|
| Wide Desktop | ≥1280px | 完整 Sidebar + 装饰插画 |
| Compact Desktop | 1024–1279px | 80–96px Icon Rail |
| Tablet Portrait | 768–1023px | Top App Bar + Drawer |
| Mobile | <768px | Top App Bar + 固定 5 项 Bottom Nav |

### 13.2 Mobile 主导航

固定为 5 项：

```text
首页 / 旅行 / 偏好 / 同行人 / 账户
```

不得改为 4 项，也不得用“发现 / 我的”替代已冻结 IA。

### 13.3 关键页面移动端规则

- 首页：Next Trip → 我的旅行 → 更多功能模块。
- Auth：照片变为 120–180px banner，表单全宽；键盘弹出时 CTA 不应被遮挡。
- Account：纵向单列；编辑状态底部固定 Cancel / Save。
- Preferences：两个雷达纵向排列；`?` 支持 Tap。
- Companions：单列；编辑使用 Full-screen Sheet。
- Trip Library：Tabs 可横向滚动；卡片单列。
- Trip 内部 Tabs：横向滚动。
- Reservation Detail：Desktop Drawer → Mobile Full-screen。
- 高风险操作：Mobile 优先 Full-screen。

所有点击目标 ≥44×44；Mobile 输入字号 ≥16px。

---

## 14. Global State Freeze

统一页面状态：

```text
PageState
├─ Loading
├─ Ready
├─ Empty
├─ Error
├─ Offline
├─ AuthExpired
└─ PermissionUnavailable
```

模块状态：

```text
ModuleState
├─ Loading
├─ PartialError
├─ Empty
└─ Stale / SyncPending
```

Action 状态：

```text
Idle / Submitting / Success / Error / Disabled
```

冻结规则：

- 首屏显示 Shell + 内容 Skeleton，不使用整页居中 Spinner。
- Skeleton 贴近真实布局，不显示假业务数据。
- Empty State 使用小型图标 / 插画 + 标题 + 1–2 行说明 + CTA，避免巨型插画。
- Offline 保留缓存内容，并显示更新时间。
- AuthExpired 重新登录后尽量返回原目标。
- 普通保存使用轻量 Toast / Inline Success。
- Profile / Preference / Companion / Account 编辑存在未保存内容时必须提示。
- 不对凭证、账户删除、Provider 断开等高风险动作做 Optimistic Update。

---

## 15. 视觉系统 Freeze

个人中心 v1 继承方案 D：

- 暖米白 / Ivory 为主画布。
- 品牌 Coral / Vermilion 用于主要 CTA 和选中状态。
- 少量 Cherry / Washi / Seigaiha 纹理作为背景层，不抢业务内容。
- Sidebar 可以使用鸟居、水面、远山、极少量樱花等日本旅行意象。
- 旅行内容照片使用写实摄影，整体略降低饱和与对比，保持温暖自然。
- 卡片使用轻阴影、较大圆角、充分留白；避免灰色后台卡片墙。

禁止：

- 主内容区大面积富士山 / 鸟居 / 寺庙 / 书法背景。
- Cartoon / 猫等与 TravelAssist 不一致的随机状态插画。
- 过强粉色覆盖导致可读性下降。
- 把按钮、Badge、状态文字烘焙进位图。
- 因概念图出现新导航就绕过正式 IA。

视觉素材路径可以迭代，但 **素材不是业务结构的 Source of Truth**。

---

## 16. 首页视觉参考的最终裁决

用户最终确认的个人中心方向包含：

- 左侧品牌 + 用户头像 + 五项导航 + 下部日式旅行装饰。
- 右侧顶部 Next Trip 京都风格 Hero。
- “我的旅行”Desktop 使用 **3 张等宽图片卡**。
- 下方保留“旅行灵感 / 我的收藏 / 目的地探索”三项轻量入口。

概念图中若出现与本 Freeze 冲突的文字、导航数量、雷达轴、Account 卡片等，以本 Freeze 为准。

---

## 17. Accessibility / Interaction Freeze

- 使用逻辑 Tab 顺序。
- Focus 必须可见。
- Enter / Space 可触发可交互控件。
- Esc 关闭 Popover / Drawer / Dialog。
- Modal / Drawer 做 Focus Trap，并在关闭后返回触发点。
- 支持 `prefers-reduced-motion`。
- Hover-only 的说明必须有 Touch 对应行为；`?` 在触屏使用 Tap。
- 多语言下允许文案扩展，禁止依赖固定按钮宽度。
- 业务信息不得只存在于图片文字中。

---

## 18. v1 非目标 / 后续项

以下内容不由 WBS 1.30 设计冻结判定为“工程已完成”：

- Authentication 核心与真实 Session。
- DB / ORM / Migration。
- Preference / Companion / Trip 数据持久化。
- Planner ↔ Preference Contract 实装。
- Planner ↔ Saved Trip Contract 实装。
- 真实 Partner OAuth / Booking Sync。
- 真实通知中心。
- TOTP / Passkey / Security Key。
- Native Mobile App。
- AI 会话历史。

这些继续由 5.x / 8.x / 9.x / 11.x 等工程 WBS 承接。

---

## 19. Freeze 验收清单

- [x] 1.21–1.29 正式设计均已确认并冻结。
- [x] 一级导航统一为 5 项。
- [x] Shell / Avatar 职责与入口统一。
- [x] 首页 Next Trip / Trip Preview / More Features 顺序固定。
- [x] Desktop “我的旅行”最终裁决为 3 张等宽卡片。
- [x] 通知保留右上铃铛，不作为 Account 主卡片。
- [x] Help / Legal 不作为 v1 Account 主卡片。
- [x] Preference 长期偏好与 Planner 临时偏好边界明确。
- [x] Companion 长期资料与 Trip Snapshot 边界明确。
- [x] 外部订单统一归 Trip Reservation，不新增订单一级导航。
- [x] “预订与账户同步”正式命名统一。
- [x] Security / Privacy / Delete Account 高风险规则明确。
- [x] Desktop / Tablet / Mobile 响应式规则统一。
- [x] Loading / Empty / Error / Offline / Unsaved 等状态统一。
- [x] 视觉基准、禁止漂移项与 Accessibility 规则明确。
- [x] A/B 模块边界和后续 Contract 责任明确。

---

## 20. Freeze 结论

**Personal Center Design v1 自本文件起正式冻结。**

后续开发任务应以本文件作为个人中心总入口规格，再下钻到 1.21–1.29 对应专项文档。

若实现过程中发现规格冲突：

1. 先查本 Freeze 的冲突裁决。
2. 再查对应专项文档。
3. 不在代码中自行发明第三套交互。
4. 确需改变 v1 冻结规则时，创建明确的新设计版本 / WBS，而不是静默修改。
