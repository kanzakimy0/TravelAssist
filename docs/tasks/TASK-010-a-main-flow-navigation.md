# TASK-010-A — 主系统页面连接闭环

## Metadata
- Task ID: `TASK-010-A`
- Owner: `A`
- Issue: `#78`
- Status: `Planned`
- Depends On: `TASK-008.3-A / #77` merged
- Design Source: `docs/ui/navigation-flow.md` v1.1
- Branch: `feature/a-main-flow-navigation`

## 1. 目标

形成主系统最小可用路由闭环：

```text
/ 首页
→ /start
→ /planner
↔ /personal-center
```

并提供给 B Personal Center 一个稳定的“开始新旅行”深链接：

```text
/start?entry=step3
→ Start Flow UI Step 3
```

只做导航、入口与最小 Mock bridge，不实现 Auth / DB / Saved Trips / 最终 Trip Contract。

---

## 2. 当前实际状态

- 首页 CTA 已进入 `/start`。
- 首页 Login disabled；没有可用 Personal Center 入口。
- Start Logo 已回 `/`。
- Start 头像只是 button，没有目标。
- PlanSelectionStep 只能选中方案，不能进入 Planner。
- Planner Brand 已回 `/`。
- Planner 已有 `/personal-center` 链接。
- Start Flow 当前是单一路由 `/start`，内部 `currentStep` 使用 0-based：UI Step 3 对应 `currentStep = 2`。

---

## 3. 首页

保持极简首页，不做大型 Navbar。

新增轻量：
- `个人中心 / 头像（Mock）` → `/personal-center`

真实 Login 仍保持未接 Auth 的边界，不能把 Personal Center Mock 入口伪装成“已登录成功”。

主 CTA：

```text
/
→ /start
```

仍从普通 Step 1 开始，不改成 Step 3。

---

## 4. Start Header

- Logo → `/` 保留。
- 右上头像从无动作 button 改为可访问 `/personal-center` 的 Link / 语义触发。
- 不修改 Step 1–3 内容结构。

---

## 5. Personal Center → Start Step 3 深链接契约

本 Task 必须在 A-owned Start Flow 中实现：

```text
/start?entry=step3
```

效果：

```text
直接显示 UI Step 3
```

当前实现内部注意：

```text
UI Step 3 = currentStep 2
```

不能错误跳到：

```text
currentStep 3 = 生成方案
```

### 5.1 实现要求

- 不创建 `/start/step3` 新 page。
- 不复制 `TripBasicsStep`。
- 使用现有 `/start` 和 StartFlowShell。
- query 参数只负责入口位置，不进入 Trip State 正式业务模型。
- `/start` 无 query 时行为保持 Step 1 / 原草稿规则。
- 无效 `entry` 回退普通 `/start`。
- Step 3 深链接刷新后仍应合理停留 / 恢复在 Step 3，而不是随机回 Step 1 或跳生成页。
- 深链接进入后焦点落到 Step 3 合理标题 / 内容区域。

### 5.2 草稿安全

当前 Start Flow 已有 localStorage 草稿恢复。

实现深链接时必须写出明确测试规则，保证：

- 普通 `/start` 草稿恢复不被破坏；
- `entry=step3` 可以覆盖“入口 Step”但不能损坏已有 Draft Schema；
- 不因为 query 导航建立第二套 draft store。

未来 Profile Preference Contract 可以为 Step 3 预填长期偏好；本 Task 不伪造该能力。

---

## 6. Plan Selection → Planner

选中生成方案后增加明确主 CTA：

```text
使用此方案并进入地图
```

目标：

```text
/planner
```

必须保留选择意图，可使用：
- query；
- 现有 localStorage selectedPlanId；
- 明确命名的 temporary Mock adapter。

Planner 至少能映射到对应的三个预览方案之一。

禁止：
- 复制第二套 Trip State；
- 将 Start Draft 冒充最终 Contract；
- 为导航写真实数据库。

---

## 7. Planner Header

保留：
- Brand → `/`
- Personal Center → `/personal-center`

补充：
- A 主系统 `新建旅行` → 标准 `/start`

注意：本轮只明确 **B Personal Center 的“开始新旅行”直达 Step 3**。Planner 自身的新建入口仍走标准 Start Flow，除非后续产品决策另行修改。

如果 TASK-008.2 / 008.3 已重做 Header，必须适配最新结构，不回滚视觉。

---

## 8. Back / Forward

验证：

### 标准首次流程
```text
/ → /start → /planner
```

### Personal Center 快捷新建流程
```text
/personal-center
→ /start?entry=step3
→ /planner
```

检查：
- browser back / forward；
- Step 3 深链接不产生 redirect loop；
- selected plan Mock bridge 不造成 redirect loop；
- query 参数不会污染普通 `/start`。

---

## 9. 可访问性

- Link 语义正确；
- 不用 `href="#"`；
- focus-visible；
- keyboard 可达；
- Step 3 深链接进入后的焦点合理；
- Mobile 可操作；
- 无横向溢出。

---

## 10. 与 TASK-010-B 的责任边界

A 本 Task 提供：

```text
/start?entry=step3
```

B 只负责在 Personal Center 链接到这个 URL。

B 不应修改：

```text
src/features/start-flow/
```

因此 TASK-010-B 最终验收应在本 Task deep-link contract 合入后进行。

---

## 11. 不包含

- Personal Center 内部文件修改（由 TASK-010-B）；
- Auth / Session；
- Saved Trips；
- 最终 Start→Trip Contract；
- Planner v0.3 业务重做；
- Profile Preference → Step 3 的真实数据预填。

---

## 12. 验证

```bash
npm ci
npm run lint
npm run typecheck
npm run test --if-present
npm run format:check
npm run build
git diff --check
```

浏览器至少验证：
- 1440×900；
- 1024×768；
- 390×844。

必须额外验证：

```text
/start                    → 普通流程正常
/start?entry=step3        → UI Step 3
/start?entry=invalid      → 安全回退
/personal-center → Step3  → 可 back/forward
```

---

## 13. Tracking

最终更新 WBS / Result，Issue #78 与 Task / Branch / Commit / PR 一致；不自动 merge。

完成后停止。
