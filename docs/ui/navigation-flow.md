# TravelAssist 页面连接与主流程导航规范

> 状态：v1.1 / 2026-09-05 修正版  
> 范围：首页、Start Flow、Planner、Personal Center 及其现有子页面

## 1. 当前实际路由

```text
/
├─ /start
├─ /planner
└─ /personal-center
   ├─ /personal-center/trips
   ├─ /personal-center/preferences
   ├─ /personal-center/companions
   └─ /personal-center/account
```

Start Flow 当前仍是单一路由 `/start`，Step 1–4 是该页面内部状态，不拆成独立 page route。

---

## 2. 当前连接审计

| 来源 | 目标 | 当前状态 | 结论 |
|---|---|---|---|
| 首页 `/` 主 CTA | `/start` | 已连接 | 保留 |
| 首页 `/` | `/personal-center` | 缺失 | 补充轻量头像/个人中心 Mock 入口；不得伪造 Auth |
| 首页登录按钮 | Auth | disabled | 保持真实 Auth 边界 |
| `/start` Logo | `/` | 已连接 | 保留 |
| `/start` 头像 | `/personal-center` | 仅 button，无目标 | 补充 |
| `/start` 方案结果 | `/planner` | 缺失 | 选中方案后必须有“使用此方案并进入地图” |
| `/planner` Brand | `/` | 已连接 | 保留 |
| `/planner` | `/personal-center` | 已连接 | 保留 |
| `/planner` | `/start` | 缺少明显新建入口 | A 主系统新建入口仍可进入标准 `/start` 流程 |
| Personal Center 内部五项 | 各子路由 | 已连接 | 保留 |
| Personal Center TravelAssist Logo | `/` | 当前指向 `/personal-center` | **改为 `/`，这是 Personal Center 返回产品首页的标准入口** |
| Personal Home“继续规划” | `/planner` | disabled | 补充 Mock 当前行程入口 |
| Personal Home“开始新旅行” | Start Step 3 | 缺失 | **直接进入 Start Flow Step 3，不从 Step 1 开始** |
| `/personal-center/trips`“开始新旅行” | Start Step 3 | placeholder 死端 | **同样直接进入 Step 3** |

---

## 3. 目标主流程

标准首次进入流程：

```text
首页 /
  ↓ 让我们开始吧
Start /start（Step 1）
  ↓
Step 2
  ↓
Step 3
  ↓
生成 / 选择方案
  ↓
Planner /planner
```

已经进入 Personal Center 的用户，新建旅行采用快捷入口：

```text
Personal Center
  ↓ 开始新旅行
Start /start?entry=step3
  ↓
Step 3（目的地 / 日期 / 同行人 / 交通 / 预算 / 已确定安排）
  ↓
生成 / 选择方案
  ↓
Planner
```

Personal Center 返回首页：

```text
点击 TravelAssist Logo
→ /
```

这是 Personal Center 返回产品首页的唯一标准入口；不再额外增加：

```text
“返回 TravelAssist”
“返回首页”
```

之类的菜单项。

---

## 4. 首页规则

首页保持极简，不增加传统大型 Navbar。

- 主 CTA → `/start`，从 Step 1 开始，保留。
- 当前未接真实 Auth，因此“登录”不能假装完成登录。
- 可新增轻量“个人中心 / 头像（Mock）”入口 → `/personal-center`。
- 未来真实 Session 接入后，由登录态决定显示 Login 或 Avatar。

首页的“开始规划”与 Personal Center 的“开始新旅行”语义不同：

- 首页首次入口：从 Step 1 开始；
- Personal Center 新建旅行：直接进入 Step 3。

---

## 5. Start Flow 规则

- Logo → `/`。
- 头像 → `/personal-center`。
- Step 1–3 现有内容不因导航 Task 被重写。
- 方案生成完成并选中后出现 `使用此方案并进入地图` → `/planner`。
- 最终 Trip Contract 未完成前，仅允许使用明确的 Mock bridge 传递方案选择；不得复制第二套业务数据模型。

### 5.1 Step 3 深链接契约

A 主系统必须提供稳定入口：

```text
/start?entry=step3
```

语义：

> 进入现有 Start Flow，但初始显示用户界面上的 **Step 3**。

注意当前代码内部 `currentStep` 是从 0 开始计数，因此：

```text
UI Step 3
= internal currentStep 2
```

路由层不得把 `step3` 错映射到生成页。

### 5.2 深链接处理原则

- `entry=step3` 只决定进入位置，不创建第二套路由页面。
- 不复制 `TripBasicsStep`。
- 不新建 `/start/step3` 页面。
- 页面刷新后仍应保持合理的 Step 3 入口语义。
- 无效 `entry` 参数回退标准 `/start` 流程。
- 未来如果 Profile Preference Contract 完成，可在此入口预填长期偏好；当前 Task 不伪造该数据联动。

对于现有本地草稿如何复用 / 清理，只能采用明确、可测试的规则，不得因为深链接破坏普通 `/start` 的草稿恢复。

---

## 6. Planner 规则

- Brand → `/`。
- Personal Center → `/personal-center`。
- A 主系统自己的 `新建旅行` 入口暂保持进入标准 `/start`；本轮只明确 B Personal Center 的新建旅行直达 Step 3。
- 导航 Task 不改写 Mapbox、Trip State、预约或 Planner v0.3 业务。

---

## 7. Personal Center 规则

### 7.1 Logo

TravelAssist Logo 是 Personal Center 返回产品首页的**唯一标准入口**：

```text
TravelAssist Logo → /
```

`我的首页` 继续：

```text
/personal-center
```

两者语义必须分离。

### 7.2 Personal Home

```text
继续规划 → /planner
开始新旅行 → /start?entry=step3
```

其中“开始新旅行”必须显示 Start Flow 的 UI Step 3。

### 7.3 Trips 页面

真实 Saved Trips 尚未实现时，placeholder 至少提供：

```text
开始新旅行 → /start?entry=step3
返回当前规划 → /planner
```

### 7.4 Avatar Popover

保留 Personal Center 内部账户导航。

**不额外增加“返回 TravelAssist / 返回首页”菜单项。**

返回产品首页统一通过 Logo 完成。

在窄屏 / Mobile 下如果桌面 Sidebar 收起，也必须保留一个可见的 TravelAssist Logo，并仍由该 Logo → `/`；不要改成额外文字菜单。

所有 Mock 入口必须明确不代表真实保存 / 登录状态。

---

## 8. A / B 接口责任

由于 `/start` 属于 A 主系统，而 Personal Center 属于 B：

### A / TASK-010-A
负责实现：

```text
/start?entry=step3
→ Start Flow UI Step 3
```

并保证普通：

```text
/start
→ Step 1
```

行为不回归。

### B / TASK-010-B
只负责链接到已经约定的目标：

```text
/start?entry=step3
```

B 不修改：

- `src/features/start-flow/`
- Start Flow State
- query 解析逻辑

因此推荐合并顺序：

```text
TASK-010-A
→ TASK-010-B
```

或者并行开发但 **A 的 deep-link contract 必须先合入 develop，B 才能做最终验收**。

---

## 9. 数据桥接原则

Start → Planner 当前只解决“用户选择后能进入相应 Planner 预览”。

允许：

- query parameter；
- 现有 local/session storage 的 selectedPlanId；
- 显式临时 adapter。

禁止：

- 新建第二套 Trip State；
- 把 Start Draft 当最终 Trip Contract；
- 为导航直接写真实数据库。

`entry=step3` 是导航入口参数，不是业务 Trip State 字段。

---

## 10. 可访问性

- 所有导航使用 Link 或语义按钮。
- 不使用 `href="#"`。
- Keyboard 可达、focus-visible 清晰。
- Back / Forward 正常。
- Mobile 无横向溢出。
- Disabled 功能不能伪装成可用导航。
- Step 3 深链接进入后，焦点应落到 Step 3 的合理标题 / 首个主要交互区域。

---

## 11. Owner 边界

A：
- 首页；
- Start 主流程；
- `/start?entry=step3` 深链接；
- Planner；
- 主系统 Header / 入口。

B：
- Personal Center 内部页面；
- Logo 返回 `/`；
- `开始新旅行` 调用 A 提供的 Step 3 深链接。

实现继续拆分为 TASK-010-A / TASK-010-B，避免 A/B 同时修改高冲突文件。
