# TravelAssist 文档索引

> 本目录是 TravelAssist 的正式设计与开发依据。聊天中的讨论只有在整理进 `docs/`、`assets/design/` 或 GitHub Issue 后，才视为可执行 / 可追踪规格。

## 0. 项目主档

- [项目决策与设计总档](decisions/project-design-master.md) — 截至 2026-09-04 的产品、页面、偏好、AI、视觉、开发、协作和未确定事项总览
- [已确认设计决策](decisions/confirmed-decisions.md) — 只记录已经可以作为开发依据的正式决定
- [设计图资产索引](../assets/design/README.md) — 首页、行程工作区、偏好面板、AI 数据流 SVG 概念图

---

## 1. 核心设计书

### 产品

- [产品总体设计书](product/product-overview.md) — 产品定位、核心流程、系统组成、已冻结与未确定事项
- [功能一览](product/feature-list.md) — P0 / P1 / P2 功能范围与后续 Issue 拆分依据

### UI / UX

- [页面设计一览](ui/page-overview.md) — 页面分类和第一阶段核心页面
- [首页设计](ui/home-page.md) — 首页入口、AI 浮层、视觉方向
- [行程主页面详细设计](ui/trip-planner.md) — 地图、时间轴、右侧设置和多方案推荐
- [UI Design System](ui/design-system.md) — 视觉原则、语义 Token、核心组件、地图浮层、响应式与可访问性基线

### 偏好系统

- [偏好系统设计](preferences/preference-system.md) — 大 / 中 / 小三级偏好、同行人、交通、景点与 AI 同步

### AI

- [AI 行程生成与调整流程](ai/trip-generation-flow.md) — 从自然语言到 Trip / Preference State，再到地图与时间轴的流程
- [AI 行程双阶段判断规格](ai/trip-judgement-two-phase.md) — 行程前 Planning Review 与 T-48h 后 Execution Monitor 的判断规则

### 技术架构

- [Web 工程架构](architecture/web-architecture.md) — App Router 源码边界与未来 App 共用代码原则
- [DB / ORM / Migration 总体方案](architecture/db-orm-migration-standards.md) — Supabase PostgreSQL、Drizzle、RLS、PostGIS 与 Migration 全局规范
- [方案数据模型与 AI 接管架构设计书](architecture/trip-plan-data-ai-takeover.md) — Trip / Plan / Day / Item、版本、ChangeSet、Runtime、Booking、多人同步、离线与 AI 接管边界
- [技术架构规划](architecture/README.md) — 已建立与后续待冻结的架构专题索引

### 开发规划

- [两人开发分工与接手机制](planning/team-allocation.md) — A 70% / B 30%、Issue、分支、PR 与临时接手机制
- [开发 WBS](planning/development-wbs.md) — Phase 0 / Web MVP 执行顺序、A/B 分工、DoD 与 Codex/GPT 通用执行提示

### Web 工程

- [开发环境配置](development/setup.md) — Requirements、安装、启动、验证与 Git workflow

---

## 2. 设计图

GitHub 可直接预览：

- [首页概念图](../assets/design/home-concept.svg)
- [行程主工作区概念图](../assets/design/trip-planner-concept.svg)
- [三级偏好面板概念图](../assets/design/preference-panel-concept.svg)
- [AI → Trip State 数据流图](../assets/design/ai-trip-flow.svg)

> 设计图负责表达布局和视觉关系；业务规则以对应 Markdown 为准。

---

## 3. 目录结构

```text
TravelAssist/
├─ assets/
│  └─ design/
│     ├─ README.md
│     ├─ home-concept.svg
│     ├─ trip-planner-concept.svg
│     ├─ preference-panel-concept.svg
│     └─ ai-trip-flow.svg
└─ docs/
   ├─ README.md
   ├─ product/
   │  ├─ README.md
   │  ├─ product-overview.md
   │  └─ feature-list.md
   ├─ ui/
   │  ├─ page-overview.md
   │  ├─ home-page.md
   │  ├─ trip-planner.md
   │  └─ design-system.md
   ├─ preferences/
   │  └─ preference-system.md
   ├─ ai/
   │  ├─ trip-generation-flow.md
   │  └─ trip-judgement-two-phase.md
   ├─ architecture/
   │  ├─ README.md
   │  ├─ web-architecture.md
   │  ├─ db-orm-migration-standards.md
   │  └─ trip-plan-data-ai-takeover.md
   ├─ development/
   │  └─ setup.md
   ├─ design/
   │  └─ README.md
   ├─ planning/
   │  ├─ team-allocation.md
   │  └─ development-wbs.md
   └─ decisions/
      ├─ confirmed-decisions.md
      └─ project-design-master.md
```

---

## 4. 文档状态规则

### 已冻结

已经可以交给 Codex / 开发人员直接实现。

### 方向已定

产品或视觉方向已经形成，但具体技术、Token、枚举或数值尚未最终冻结。

### 候选

讨论过并保留，但不允许实现者将其默认升级为正式规则。

### 未确定事项

不得由 Codex 自行决定。需要回到产品设计讨论后再更新文档。

---

## 5. 开发前阅读顺序

每个开发任务建议按以下顺序读取：

```text
README.md
  ↓
CONTRIBUTING.md
  ↓
docs/decisions/project-design-master.md
  ↓
docs/product/product-overview.md
  ↓
对应专题设计文档
  ↓
相关 assets/design 设计图（UI 任务）
  ↓
GitHub Issue
  ↓
开始实现
```

如果 Issue、设计图与设计书冲突：

1. 以最新正式专题 Markdown / 已确认决策为最高产品依据。
2. 暂停实现冲突部分。
3. 在 Issue 中指出冲突。
4. 更新设计文档 / 设计图。
5. 再继续开发。

---

## 6. 当前优先补充文档

下一阶段继续冻结技术规格：

1. `architecture/system-overview.md` — Web / App / Backend / AI / Map 总体技术架构
2. `architecture/preference-state.md` — Preference State 数据结构
3. `architecture/api-design.md` — 核心 API 详细边界
4. App 阶段再补充 Offline SQLite Schema / Merge Algorithm

原计划的 `architecture/trip-state.md` 核心职责已经由 `architecture/trip-plan-data-ai-takeover.md` 覆盖，不再作为一个独立前置缺口。

UI Design System 已建立 v0.1，最终颜色、字体、圆角、地图覆盖层等 Token 在 UI 实装验证后继续冻结。

这些项目应按 `planning/development-wbs.md` 与对应 GitHub Issues 的执行顺序推进。

---

## 7. 文档维护规则

- 优先使用 Markdown；图形优先保存可版本管理的 SVG，最终视觉稿可追加 PNG / JPG / Figma 导出。
- 一个主题尽量一个文件。
- 已确定规则明确标注为“已冻结”。
- 尚未决定的问题统一放在“未确定事项”。
- 修改产品设计时同步更新 `docs/`，不只保留在聊天记录里。
- 视觉方向变化时同步更新 `assets/design/`。
- 影响实现的设计修改应同步更新对应 GitHub Issue。
- Codex 不得自行补充未确认的产品业务规则。