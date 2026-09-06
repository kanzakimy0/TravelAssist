# TravelAssist 页面迁移按钮与 Logo 完成度审计

> 审计日期：2026-09-06  
> 审计分支：`develop`  
> 结论：**未全部完成**  
> 关联规范：`docs/ui/navigation-flow.md` v1.2  
> 修复任务：`docs/tasks/TASK-010-b-personal-center-navigation.md` v1.1

## 1. 本次新增产品决策

```text
所有页面中的 TravelAssist 产品 Logo / Brand
→ 点击返回产品首页 /
```

该规则覆盖：

- 首页；
- Start Flow；
- Planner；
- Detail Workspace；
- Personal Center Desktop；
- Personal Center Mobile / Compact；
- Account 及其子页；
- 未来 Auth Shell。

Partner Logo、用户头像、地图图标和纯装饰图不属于此规则。

---

## 2. 审计方法

本次以 `develop` 当前源代码、现有 Issue / Task 与未合并 PR 为依据，区分：

- **已完成**：已存在于 `develop` 并有真实目标；
- **缺失**：当前 `develop` 没有对应动作或目标错误；
- **待合并**：代码存在于 Draft PR，但尚未进入 `develop`；
- **设计阶段**：路由或业务页面尚未实现，不制造假入口。

---

## 3. 页面级结果

| 页面 / 模式 | Logo → `/` | 主要迁移按钮 | 状态 |
|---|---:|---|---|
| 首页 `/` | ❌ Logo 是不可点击 `div` | `让我们开始吧`、个人中心已连接；登录保持 disabled | **部分完成** |
| Start `/start` | ✅ | Step 内部动作、方案进入 Planner、头像进入个人中心均已连接 | **完成** |
| Planner `/planner` | ✅ | 新建旅行、个人中心已连接；进入 Detail 尚未在 `develop` | **部分完成** |
| Detail `/planner?view=detail&day=N` | Draft PR 中 ✅ | Draft PR #102 已实现 Planner→Detail 与 Mode 交互 | **待合并** |
| Personal Center Home | ❌ Desktop / Mobile 都指向 `/personal-center` | 查看全部已连接；继续规划 disabled；开始新旅行缺失 | **未完成** |
| Personal Center Trips | ❌ 继承错误 Logo | 页面仅有文案；开始新旅行、返回当前规划缺失 | **未完成** |
| Personal Center Preferences | ❌ 继承错误 Logo | 一级导航可用；正文仍是占位页 | **导航部分完成 / 业务待后续** |
| Personal Center Companions | ❌ 继承错误 Logo | 一级导航可用；正文仍是占位页 | **导航部分完成 / 业务待后续** |
| Personal Center Account | ❌ 继承错误 Logo | Security / Privacy / Booking Sync 入口已连接 | **迁移完成，Logo 未完成** |
| Account Security | ❌ 继承错误 Logo | 返回账户已连接 | **迁移完成，Logo 未完成** |
| Account Privacy | ❌ 继承错误 Logo | 返回账户已连接 | **迁移完成，Logo 未完成** |
| Account Booking Sync | ❌ 继承错误 Logo | 返回账户已连接 | **迁移完成，Logo 未完成** |

---

## 4. 已完成项目

### 首页与 Start

- 首页主 CTA → `/start`。
- 首页个人中心入口 → `/personal-center`。
- Start Logo → `/`。
- Start 头像 → `/personal-center`。
- `/start?entry=step3` → UI Step 3。
- 选中方案后 `使用此方案并进入地图` → `/planner`。

### Planner

- Planner Logo → `/`。
- `新建旅行` → `/start`。
- `个人中心` → `/personal-center`。
- 日程范围、右栏设置、推荐方案和底栏 Tab 均有真实同页交互。

### Personal Center 已有部分

- 五项一级导航可用。
- `查看全部`与旅行卡进入 `/personal-center/trips`。
- Account 三个子入口可用。
- Account 子页 `返回账户`可用。
- Avatar Popover 内部导航可用，退出登录正确保持 disabled。

---

## 5. 必须修复的缺口

### P0：全局 Logo

1. 首页 TravelAssist Brand 从不可点击 `div` 改为 `Link href="/"`。
2. Personal Center Desktop Logo 从 `/personal-center` 改为 `/`。
3. Personal Center Mobile / Compact Logo 从 `/personal-center` 改为 `/`。
4. 所有 Personal Center 子页通过共享 Shell 自动继承。
5. 不在 Avatar Popover 增加第二个首页入口。

### P0：Personal Home

```text
继续规划 → /planner
开始新旅行 → /start?entry=step3
```

保持 Mock 说明，不伪造 Saved Trip。

### P0：Trips 占位页

```text
开始新旅行 → /start?entry=step3
返回当前规划 → /planner
```

必须从纯文字占位升级为有明确出口的 Empty / Placeholder State。

### P1：Planner → Detail

由现有 `TASK-011-A / Issue #86 / Draft PR #102` 承接。该 PR 未合并前不能标记完成，也不应由 Logo / Personal Center 修复任务重复修改 Planner 高冲突文件。

---

## 6. 不应在本任务中实现

- Auth 路由和真实登录；
- Saved Trips 数据库；
- Preferences / Companions 正文业务；
- 旅行灵感与目的地探索路由；
- Planner / Detail 状态重构；
- 真实 AI、天气、交通、订单 Provider；
- 分享页面；
- 任何 Partner Logo 的首页跳转。

---

## 7. 全部完成判定

页面迁移可标记“核心闭环完成”必须同时满足：

- [ ] 首页 Logo → `/`
- [x] Start Logo → `/`
- [x] Planner Logo → `/`
- [ ] Personal Center Desktop Logo → `/`
- [ ] Personal Center Mobile Logo → `/`
- [ ] Personal Home `继续规划` → `/planner`
- [ ] Personal Home `开始新旅行` → `/start?entry=step3`
- [ ] Trips `开始新旅行` → `/start?entry=step3`
- [ ] Trips `返回当前规划` → `/planner`
- [x] Account 子入口与返回账户可用
- [ ] TASK-011-A / PR #102 合入后，Planner → Detail 和 Detail Logo 复验通过
- [ ] Back / Forward、Keyboard、Focus、Mobile QA 通过
- [ ] 没有无目标 `href="#"`
- [ ] 没有伪造 Auth / DB / Saved Trips

因此，当前不能把“所有迁移按钮”标记为已完成。
