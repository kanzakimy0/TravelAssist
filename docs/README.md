# TravelAssist 文档索引

> 本目录是 TravelAssist 的正式设计与开发依据。聊天中的讨论只有在整理进 `docs/` 或 GitHub Issue 后，才视为可执行规格。

## 1. 核心设计书

### 产品

- [产品总体设计书](product/product-overview.md) — 产品定位、核心流程、系统组成、已冻结与未确定事项
- [功能一览](product/feature-list.md) — P0 / P1 / P2 功能范围与后续 Issue 拆分依据

### UI / UX

- [页面设计一览](ui/page-overview.md) — 页面分类和第一阶段核心页面
- [首页设计](ui/home-page.md) — 首页入口、AI 浮层、视觉方向
- [行程主页面详细设计](ui/trip-planner.md) — 地图、时间轴、右侧设置和多方案推荐

### 偏好系统

- [偏好系统设计](preferences/preference-system.md) — 大 / 中 / 小三级偏好、同行人、交通、景点与 AI 同步

### AI

- [AI 行程生成与调整流程](ai/trip-generation-flow.md) — 从自然语言到 Trip / Preference State，再到地图与时间轴的流程

### 开发规划

- [两人开发分工与接手机制](planning/team-allocation.md) — A 70% / B 30%、Issue、分支、PR 与临时接手机制
- [开发 WBS](planning/development-wbs.md) — Phase 0 / Web MVP 执行顺序、A/B 分工、DoD 与 Codex/GPT 通用执行提示

### 决策记录

- [已确认设计决策](decisions/confirmed-decisions.md) — 只记录已经可以作为开发依据的正式决定

---

## 2. 目录结构

```text
docs/
├─ README.md
├─ product/
│  ├─ product-overview.md
│  └─ feature-list.md
├─ ui/
│  ├─ page-overview.md
│  ├─ home-page.md
│  └─ trip-planner.md
├─ preferences/
│  └─ preference-system.md
├─ ai/
│  └─ trip-generation-flow.md
├─ architecture/        # 后续：技术架构、数据结构、API、状态管理
├─ planning/
│  ├─ team-allocation.md
│  └─ development-wbs.md
└─ decisions/
   └─ confirmed-decisions.md
```

---

## 3. 文档状态规则

### 已冻结

已经可以交给 Codex / 开发人员直接实现。

### 候选 / 方向

已经形成产品方向，但具体枚举、数值或 UI 细节尚未最终确认。

### 未确定事项

不得由 Codex 自行决定。需要回到产品设计讨论后再更新文档。

---

## 4. 开发前阅读顺序

每个开发任务建议按以下顺序读取：

```text
README.md
  ↓
CONTRIBUTING.md
  ↓
docs/product/product-overview.md
  ↓
对应专题设计文档
  ↓
GitHub Issue
  ↓
开始实现
```

如果 Issue 与设计书冲突：

1. 暂停实现冲突部分。
2. 在 Issue 中指出冲突。
3. 更新正式设计文档。
4. 再继续开发。

---

## 5. 当前优先补充文档

下一阶段建议继续形成：

1. `architecture/system-overview.md` — Web / App / Backend / AI / Map 总体技术架构
2. `architecture/trip-state.md` — Trip State 数据结构
3. `architecture/preference-state.md` — Preference State 数据结构
4. `architecture/api-design.md` — 核心 API 边界
5. `ui/design-system.md` — 色彩、圆角、字体、间距、浮层和地图组件规范

这些项目已经开始转化为 GitHub Issues，执行顺序见 `planning/development-wbs.md`。

---

## 6. 文档维护规则

- 优先使用 Markdown。
- 一个主题尽量一个文件。
- 已确定规则明确标注为“已冻结”。
- 尚未决定的问题统一放在“未确定事项”。
- 修改产品设计时同步更新 `docs/`，不只保留在聊天记录里。
- 影响实现的设计修改应同步更新对应 GitHub Issue。
- Codex 不得自行补充未确认的产品业务规则。
