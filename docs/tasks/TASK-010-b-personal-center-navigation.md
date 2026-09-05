# TASK-010-B — Personal Center 反向导航与继续规划入口

## Metadata
- Task ID: `TASK-010-B`
- Owner: `B`
- Issue: `#79`
- Status: `Planned`
- Depends On: `TASK-010-A / #78` deep-link contract available on develop for final acceptance
- Design Source: `docs/ui/navigation-flow.md` v1.1
- Branch: `feature/b-personal-center-navigation`

## 1. 目标

让 Personal Center 不再成为与主系统割裂的信息岛，补齐：

- 点击 TravelAssist Logo 返回首页；
- 继续当前规划；
- 从 Personal Center 开始一趟新旅行时直接进入 Start Flow **Step 3**。

只修改 Personal Center 自己的导航与现有 Mock 页面入口，不修改 A 的 Planner / Start 业务。

---

## 2. 当前实际状态

已存在：
- `/personal-center`
- `/personal-center/trips`
- `/personal-center/preferences`
- `/personal-center/companions`
- `/personal-center/account`

内部五项导航正常。

缺失：
- TravelAssist Logo 回全局首页；
- Personal Home `继续规划`；
- `开始新旅行`；
- Trips placeholder 的主系统出口。

---

## 3. Sidebar / Mobile Brand

当前 TravelAssist Brand 指向 `/personal-center`。

修改为：

```text
TravelAssist Logo → /
```

同时：

```text
我的首页 → /personal-center
```

继续由现有 primary nav 承担。

这两个入口必须语义分离。

### 3.1 首页返回唯一规则

**Personal Center 返回产品首页只通过 TravelAssist Logo。**

不要新增：

- `返回 TravelAssist`
- `返回首页`
- Home menu item

等第二套首页返回入口。

如果 Mobile / 窄屏不显示桌面 Sidebar，也必须在移动布局中保留一个可见 TravelAssist Logo，并让该 Logo → `/`。

---

## 4. Personal Home

将目前 disabled 的：

```text
继续规划
```

改为可用 Link：

```text
继续规划 → /planner
```

辅助说明明确这是当前 Mock 行程预览，不能暗示 Saved Trip 已接入。

新增：

```text
开始新旅行 → /start?entry=step3
```

注意：**不是 `/start` 普通 Step 1 入口。**

`开始新旅行` 的产品语义是：

> 用户已经在 Personal Center 中，直接进入新旅行的 Step 3（目的地 / 日期 / 同行人 / 交通 / 预算 / 已确定安排），跳过前面的首次熟悉度与兴趣引导。

现有：

```text
查看全部 → /personal-center/trips
```

保留。

---

## 5. Trips Placeholder

真实 Saved Trips 尚未实现前，至少提供两个动作：

```text
开始新旅行 → /start?entry=step3
返回当前规划 → /planner
```

页面明确：
- 当前没有真实保存列表；
- 这些只是导航入口；
- 不伪造数据库内容。

不得把 `开始新旅行` 链到普通 `/start`。

---

## 6. Avatar Popover

内部五项目标继续保留。

**不要新增 `返回 TravelAssist / 返回首页` 菜单项。**

首页返回统一由 TravelAssist Logo 完成。

如果移动端需要全局品牌入口，应显示 Logo，而不是新增文本导航项。

---

## 7. 与 A 的 Deep-Link Contract

B 不负责实现 Step 3 路由解析。

B 只调用 A 提供的稳定入口：

```text
/start?entry=step3
```

A / TASK-010-A 负责保证：

```text
/start?entry=step3
→ Start Flow UI Step 3
```

当前 Start Flow 内部是 0-based，UI Step 3 对应 `currentStep = 2`，但 B 不依赖内部实现。

### 7.1 依赖规则

B 可以先完成自己的 Link 代码，但最终验收前必须确认 TASK-010-A 的 deep-link contract 已合入 develop。

B 禁止修改：

```text
src/features/start-flow/
```

去“修好” Step 3 跳转。

---

## 8. 必须保留

- active nav；
- aria-current；
- account / preferences / companions / trips 路由；
- avatar popover close / Esc / focus restore；
- responsive；
- Personal Center 现有视觉体系。

---

## 9. 不包含

- Auth / Session / Logout；
- Saved Trip backend；
- Planner source；
- Start source；
- Preference / Companion 业务实现；
- Profile Preference → Step 3 的真实预填逻辑。

---

## 10. 验证

```bash
npm ci
npm run lint
npm run typecheck
npm run test --if-present
npm run format:check
npm run build
git diff --check
```

浏览器验证：

```text
Personal Center Logo → /
Personal Home 继续规划 → /planner
Personal Home 开始新旅行 → /start?entry=step3 → UI Step 3
Trips 开始新旅行 → /start?entry=step3 → UI Step 3
Trips 返回当前规划 → /planner
```

并验证：
- back / forward；
- 1440×900；
- 390×844；
- 320×740；
- Mobile 有可见 Logo 返回首页；
- Avatar Popover 没有重复“返回首页”项。

---

## 11. Tracking

最终更新 WBS / Result，Issue #79 与 Task / Branch / Commit / PR 一致；不自动 merge。

完成后停止。
