# TravelAssist 可记录 WBS（Master）

> 版本：v0.3  
> 更新日期：2026-09-04  
> 适用阶段：Web 优先，移动 App 后续  
> 开发方式：A 主开发约 70%，B 协作约 30%，ChatGPT / Codex 辅助开发  
> **v0.3 分工原则：B 主责全部客户界面的画面设计与前端实现；A 主责主系统界面及其余全部核心/工程工作。**

---

## 1. 使用规则

### 1.1 状态枚举

| 状态 | 含义 |
|---|---|
| `未开始` | 尚未进入开发 |
| `待确认` | 需求、设计或依赖仍需确认 |
| `可开始` | 前置依赖已完成，可以创建 Task |
| `进行中` | 已建立 feature 分支并开发 |
| `待审查` | 已完成代码，等待 Review / PR |
| `阻塞` | 因依赖、技术或其他原因无法继续 |
| `已完成` | 已合并到 `develop` 且验收通过 |
| `取消` | 决定不再实施 |

### 1.2 GitHub 记录原则

1. 每个可开发工作项都分配唯一 WBS ID。
2. 真正进入开发前，建立对应 `TASK-xxx-*.md`。
3. **生成新 Task 前，先检查 GitHub 上已经备份的 A / B Task，确认依赖与编号不冲突。**
4. Task 文件统一保存到 `docs/tasks/`。
5. 每个开发 Task 原则上对应一个 GitHub Issue。
6. 使用独立 feature 分支，不直接修改 `develop`。
7. 完成后以 Pull Request 合并到 `develop`。
8. PR 合并并验收通过后，WBS 才标记为 `已完成`。
9. 所有重要设计变更同步到 `docs/design/` 或对应设计文档。
10. Task、Result、WBS 都必须备份到 GitHub。
11. 新 Task 分配负责人时，必须先应用本文件的 A/B 界面责任边界。
12. 已经正式开始的 Task 原则上不中途换负责人；未开始 Task 按 v0.3 新规则重新分配。

---

## 2. A / B 长期责任边界（v0.3）

### 2.1 B：客户界面 Owner

B 主责所有直接面向旅行用户的画面设计与前端实现，包括：

- 首页 / Landing / 导航栏 / 客户侧 App Shell
- 登录、注册、账户资料等客户侧画面
- 行程规划主画面
- 客户地图画面中的可视控件、Pin、区域、路线呈现
- 底部时间轴及行程卡片
- 右侧详细设置、偏好设置、同行人设置
- 推荐方案展示与方案切换交互
- AI 对话面板的客户侧 UI
- 客户行程详情、历史、保存结果等画面
- Loading / Empty / Error / Skeleton 等客户侧状态画面
- 客户侧响应式、可访问性、视觉一致性
- Web MVP 后的 Mobile 客户界面设计与实现

B 默认不负责：

- 后端、数据库、Schema、API 服务
- AI Prompt / Tool / Agent 核心逻辑
- 地图 Provider、路线计算、POI 数据服务
- Planner 核心状态模型和业务编排
- CI/CD、工程规范、安全、监控、部署
- 主系统 / 管理后台界面

除非 Task 明确授权，B 不直接改上述核心模块。

### 2.2 A：主系统 + 核心工程 Owner

A 主责除客户界面之外的全部工作，包括：

- 产品规则、MVP 范围和最终架构决策
- 主系统 / 管理后台的画面设计与前端实现
- Backend / DB / Authentication 核心
- 数据 Schema、迁移、持久化
- AI 能力、Prompt、Tool Calling、行程生成与修改逻辑
- 地图 / POI / Route Provider 与数据服务
- Planner 状态模型、业务编排、推荐算法
- 工程初始化、版本、Lint、CI、测试框架
- 安全、性能、日志、监控、部署、发布
- Web 与 Mobile 的共享核心能力
- B 客户 UI 所消费的数据接口 / Type / Contract

### 2.3 A/B 交界规则

一个客户功能如果同时包含 UI 与核心逻辑，应拆成两个 Task：

```text
A Task：Schema / API / State / Service / Contract
↓
B Task：Customer UI / Interaction / Responsive / Visual QA
```

例如“AI 修改行程”：

```text
A：AI Action + Planner State + API Contract
B：AI 对话中的修改确认、结果展示、状态反馈 UI
```

例如“地图路线”：

```text
A：路线 Provider + Route Schema + 计算/缓存
B：路线在客户地图和时间轴中的视觉呈现
```

### 2.4 建议代码责任边界

最终目录以 WBS 2.6 架构冻结为准，建议方向：

```text
B Owner
src/app/(customer)/
src/features/customer-ui/
src/components/customer/

A Owner
src/app/(system)/
src/features/system/
src/server/
src/core/
src/lib/ai/
src/lib/maps/
src/lib/routing/
src/db/
```

共享 Type / Contract 由 A 定义，B 消费；需要变更共享 Contract 时由 A 先修改或 Review。

---

## 3. 项目级里程碑

| Milestone | 名称 | 目标 | 负责人 | 状态 |
|---|---|---|---|---|
| M0 | 工程基础完成 | 两台电脑稳定开发、测试、提交 PR | A 主 / B 完成工作站初始化 | 进行中 |
| M1 | 产品与画面设计冻结 v1 | 产品规则 + 客户界面 + 主系统界面边界明确 | A 核心 / B 客户画面 | 进行中 |
| M2 | 客户 Web Shell 完成 | 首页、导航、登录入口、AI 入口可用 | B | 未开始 |
| M3 | 行程规划 MVP | B 完成客户界面，A 完成 Planner/地图/推荐核心 | A+B | 未开始 |
| M4 | AI 助手 MVP | A 完成 AI 核心，B 完成客户对话体验 | A+B | 未开始 |
| M5 | 数据与账户完成 | 用户、行程、偏好、保存/读取完整 | A 核心 / B 客户画面 | 未开始 |
| M6 | Web MVP 可发布 | 核心流程端到端可用 | A+B | 未开始 |
| M7 | 主系统 MVP | 管理、配置、运营、监控基础可用 | A | 未开始 |
| M8 | Web Beta | 测试、监控、SEO、性能、安全完善 | A 主 / B 客户 UI QA | 未开始 |
| M9 | Mobile App | 复用核心能力开发移动客户界面 | A 核心 / B 客户画面 | 未开始 |

---

# 4. Master WBS

## 0. 项目管理与协作

| WBS ID | 工作项 | 负责人 | 优先级 | 依赖 | 状态 |
|---|---|---|---|---|---|
| 0.1 | GitHub 仓库与 `develop` 工作流建立 | A | P0 | - | 已完成 |
| 0.2 | A/B feature 分支规则 | A+B | P0 | 0.1 | 已完成 |
| 0.3 | Task 文件编号与存档规范 | A | P0 | 0.1 | 进行中 |
| 0.4 | WBS 主表建立 | A | P0 | 0.1 | 已完成 |
| 0.5 | GitHub Issue / PR 模板 | A | P1 | 0.3 | 未开始 |
| 0.6 | Definition of Done | A | P1 | 0.3 | 未开始 |
| 0.7 | Codex 自动更新 WBS 流程 | A+B | P0 | 0.4 | 进行中 |
| 0.8 | A/B 客户界面责任边界固化 | A | P0 | 0.4 | 进行中 |
| 0.9 | UI/Core 接口交接规则 | A | P1 | 0.8 | 未开始 |

## 1. 产品、交互与画面设计

### 1A. 产品规则与数据设计

| WBS ID | 工作项 | 负责人 | 优先级 | 依赖 | 状态 |
|---|---|---|---|---|---|
| 1.1 | 产品定位与核心价值主张 | A | P0 | - | 进行中 |
| 1.2 | 用户旅程 / 核心使用流程 | A | P0 | 1.1 | 进行中 |
| 1.3 | 页面分类一览与客户/系统归属 | A | P0 | 1.2 | 进行中 |
| 1.8 | 同行人数据模型 | A | P1 | 1.2 | 进行中 |
| 1.9 | 偏好大/中/小项目完整表 | A | P0 | 1.2 | 进行中 |
| 1.10 | 景点与活动标签系统 | A | P1 | 1.9 | 未开始 |
| 1.15 | MVP 功能范围冻结 | A | P0 | 1.1-1.14 | 未开始 |
| 1.16 | 客户界面 / 主系统界面边界冻结 | A | P0 | 1.3 | 进行中 |
| 1.31 | 客户 UI 与核心接口 Contract 规范 | A | P0 | 1.16,2.6 | 未开始 |

### 1B. 客户界面画面设计（B 主责）

| WBS ID | 工作项 | 负责人 | 优先级 | 依赖 | 状态 |
|---|---|---|---|---|---|
| 1.4 | 客户首页设计冻结 v1 | B | P1 | 1.3 | 进行中 |
| 1.5 | 客户行程规划主画面冻结 v1 | B | P0 | 1.3 | 进行中 |
| 1.6 | 客户底部时间轴设计冻结 | B | P0 | 1.5 | 进行中 |
| 1.7 | 客户右侧设置面板三层结构设计 | B | P0 | 1.5,1.9 | 进行中 |
| 1.11 | 客户推荐方案 1/2/3 展示结构 | B | P1 | 1.5 | 未开始 |
| 1.12 | 客户地图视觉 / Pin / 区域标记规范 | B | P1 | 1.5 | 未开始 |
| 1.13 | 客户界面 Design Token / 色彩 / 字体 / 圆角 | B | P1 | 1.4,1.5 | 未开始 |
| 1.14 | 客户界面响应式布局规则 | B | P1 | 1.5,1.13 | 未开始 |
| 1.17 | 客户界面 Screen Inventory | B | P0 | 1.16 | 未开始 |
| 1.18 | 首页详细画面设计 | B | P1 | 1.4,1.13 | 未开始 |
| 1.19 | 登录 / 注册 / 账户详细画面设计 | B | P1 | 1.17 | 未开始 |
| 1.20 | Planner 地图 + 时间轴 + 右栏详细画面设计 | B | P0 | 1.5-1.7 | 未开始 |
| 1.21 | 偏好 / 同行人 / 快速设置详细画面设计 | B | P0 | 1.7,1.9 | 未开始 |
| 1.22 | AI 对话客户侧详细画面设计 | B | P1 | 1.17 | 未开始 |
| 1.23 | 行程详情 / 历史 / 保存结果画面设计 | B | P1 | 1.17 | 未开始 |
| 1.24 | Loading / Empty / Error / Skeleton 画面规范 | B | P1 | 1.13 | 未开始 |
| 1.25 | 客户界面 Desktop / Tablet / Mobile 响应式稿 | B | P1 | 1.14,1.18-1.24 | 未开始 |
| 1.32 | 客户界面设计评审与 Freeze v1 | A+B | P0 | 1.18-1.25 | 未开始 |

### 1C. 主系统界面画面设计（A 主责）

| WBS ID | 工作项 | 负责人 | 优先级 | 依赖 | 状态 |
|---|---|---|---|---|---|
| 1.26 | 主系统 Information Architecture | A | P1 | 1.16 | 未开始 |
| 1.27 | 主系统 Dashboard 画面设计 | A | P2 | 1.26 | 未开始 |
| 1.28 | 用户 / 行程管理画面设计 | A | P2 | 1.26 | 未开始 |
| 1.29 | AI / Provider / 配置管理画面设计 | A | P2 | 1.26 | 未开始 |
| 1.30 | 监控 / 运营 / Feedback 画面设计 | A | P2 | 1.26 | 未开始 |

## 2. 工程初始化与基础架构

> v0.3 起：除已开始的 B 工作站初始化外，工程类工作原则上由 A 负责。

| WBS ID | 工作项 | 负责人 | 优先级 | 依赖 | 状态 |
|---|---|---|---|---|---|
| 2.1 | A 工程初始化 Task | A | P0 | 0.3 | 待审查 |
| 2.2 | B 工程初始化 / 工作站验证 | B | P0 | 0.2 | 进行中 |
| 2.3 | Node / npm / TypeScript 版本固定 | A | P0 | 2.1 | 未开始 |
| 2.4 | ESLint / Prettier / EditorConfig | A | P1 | 2.1 | 未开始 |
| 2.5 | 环境变量规范 | A | P0 | 2.1 | 未开始 |
| 2.6 | 目录架构冻结 | A | P0 | 2.1 | 未开始 |
| 2.7 | 客户界面 UI 组件库 / Design Token 实现 | B | P1 | 1.13,2.6 | 未开始 |
| 2.8 | GitHub Actions CI | A | P1 | 2.3,2.4 | 未开始 |
| 2.9 | 单元测试框架 | A | P1 | 2.1 | 未开始 |
| 2.10 | E2E 测试框架 | A | P2 | 2.1 | 未开始 |
| 2.11 | Error / Logging 基础 | A | P2 | 2.6 | 未开始 |
| 2.12 | Feature Flag 基础 | A | P3 | 2.6 | 未开始 |

## 3. 客户 Web Shell / 首页 / 导航（B 主责）

| WBS ID | 工作项 | 负责人 | 优先级 | 依赖 | 状态 |
|---|---|---|---|---|---|
| 3.1 | 客户侧全局 Layout / Header | B | P1 | 1.13,2.7 | 未开始 |
| 3.2 | 首页动画背景区域 | B | P1 | 1.18 | 未开始 |
| 3.3 | 「让我们开始吧」主入口 UI | B | P0 | 3.1 | 未开始 |
| 3.4 | 登录入口 / 认证客户 UI | B | P1 | 1.19,3.1 | 未开始 |
| 3.5 | 右下 AI 悬浮按钮 | B | P1 | 3.1 | 未开始 |
| 3.6 | AI 对话抽屉 / 浮层 UI | B | P1 | 1.22,3.5 | 未开始 |
| 3.7 | 客户侧 Loading / Empty / Error 状态 | B | P1 | 1.24,3.1 | 未开始 |
| 3.8 | 客户侧无障碍与键盘交互 | B | P2 | 3.1-3.7 | 未开始 |
| 3.9 | 客户侧响应式实现 | B | P1 | 1.25,3.1-3.7 | 未开始 |

## 4. 行程规划核心

### 4A. 客户 Planner 界面（B）

| WBS ID | 工作项 | 负责人 | 优先级 | 依赖 | 状态 |
|---|---|---|---|---|---|
| 4.1 | Planner 页面整体 Grid | B | P0 | 1.20,3.1 | 未开始 |
| 4.2 | 客户地图容器与基础控件 UI | B | P0 | 4.1,7.1 | 未开始 |
| 4.3 | 景点 Pin 组件 | B | P1 | 4.2,1.12 | 未开始 |
| 4.4 | 住宿区域覆盖层 UI | B | P1 | 4.2,1.12 | 未开始 |
| 4.5 | 餐饮区域覆盖层 UI | B | P1 | 4.2,1.12 | 未开始 |
| 4.6 | 多日路线视觉显示 | B | P0 | 4.2,7.8 | 未开始 |
| 4.7 | 交通方式视觉显示 | B | P0 | 4.6 | 未开始 |
| 4.8 | 底部时间轴基础 UI | B | P0 | 1.20,4.1 | 未开始 |
| 4.9 | 时间轴景点卡片 | B | P1 | 4.8 | 未开始 |
| 4.10 | 时间轴交通段 | B | P1 | 4.8 | 未开始 |
| 4.11 | 时间轴餐饮段 | B | P1 | 4.8 | 未开始 |
| 4.12 | 时间轴住宿段 | B | P1 | 4.8 | 未开始 |
| 4.13 | 右侧推荐方案列表 UI | B | P0 | 1.11,4.1 | 未开始 |
| 4.14 | 客户侧方案切换交互 | B | P0 | 4.13,4.6,4.8 | 未开始 |
| 4.18 | Planner UI 接入 A 提供的 Contract | B | P0 | 4.17 | 未开始 |

### 4B. Planner 核心（A）

| WBS ID | 工作项 | 负责人 | 优先级 | 依赖 | 状态 |
|---|---|---|---|---|---|
| 4.15 | Planner 状态模型 / Store | A | P0 | 2.6,5.11 | 未开始 |
| 4.16 | Planner 业务编排 / Day Plan Core | A | P0 | 4.15,7.x | 未开始 |
| 4.17 | Planner UI Data / Action Contract | A | P0 | 4.15,4.16 | 未开始 |

## 5. 偏好与详细设置系统

### 5A. 客户偏好界面（B）

| WBS ID | 工作项 | 负责人 | 优先级 | 依赖 | 状态 |
|---|---|---|---|---|---|
| 5.1 | 快速设置层 UI | B | P0 | 1.21,4.1 | 未开始 |
| 5.2 | 中项目展开层 UI | B | P0 | 5.1 | 未开始 |
| 5.3 | 小项目详细层 UI | B | P1 | 5.2 | 未开始 |
| 5.4 | 同行人设置 UI | B | P0 | 1.8,1.21 | 未开始 |
| 5.5 | 移动偏好 UI | B | P1 | 1.9,5.2 | 未开始 |
| 5.6 | 景点与活动偏好 UI | B | P0 | 1.9,1.10 | 未开始 |
| 5.7 | 拍照 / 体验倾向 UI | B | P2 | 1.10,5.6 | 未开始 |
| 5.8 | 餐饮偏好 UI | B | P1 | 1.9 | 未开始 |
| 5.9 | 住宿偏好 UI | B | P1 | 1.9 | 未开始 |
| 5.10 | 预算偏好 UI | B | P1 | 1.9 | 未开始 |
| 5.14 | 偏好 UI 接入数据 Contract | B | P0 | 5.13 | 未开始 |

### 5B. 偏好核心（A）

| WBS ID | 工作项 | 负责人 | 优先级 | 依赖 | 状态 |
|---|---|---|---|---|---|
| 5.11 | 偏好数据 Schema | A | P0 | 1.9 | 未开始 |
| 5.12 | 默认值 / 快速 Preset / 规则 | A | P1 | 5.11 | 未开始 |
| 5.13 | 偏好数据读取 / 写入 Contract | A | P0 | 5.11,8.4 | 未开始 |

## 6. AI 旅行助手

### 6A. AI 核心（A）

| WBS ID | 工作项 | 负责人 | 优先级 | 依赖 | 状态 |
|---|---|---|---|---|---|
| 6.1 | AI 能力边界定义 | A | P0 | 1.15 | 未开始 |
| 6.2 | 对话消息数据模型 | A | P0 | 3.6 | 未开始 |
| 6.3 | Prompt / System Instruction v1 | A | P0 | 6.1,5.11 | 未开始 |
| 6.4 | AI API 接入层 | A | P0 | 2.5,6.3 | 未开始 |
| 6.5 | AI 读取用户偏好 | A | P0 | 5.11,6.4 | 未开始 |
| 6.6 | AI 修改偏好 Action | A | P0 | 6.5 | 未开始 |
| 6.7 | AI 生成初始行程 | A | P0 | 6.4,7.x | 未开始 |
| 6.8 | AI 局部修改行程 | A | P0 | 6.7,4.15 | 未开始 |
| 6.10 | AI 错误 / 降级逻辑 | A | P1 | 6.4 | 未开始 |
| 6.11 | AI 成本 / Token 监控 | A | P2 | 6.4 | 未开始 |
| 6.12 | AI 结果质量测试集 | A | P1 | 6.7 | 未开始 |
| 6.14 | AI UI Action / Result Contract | A | P0 | 6.6-6.8 | 未开始 |

### 6B. AI 客户界面（B）

| WBS ID | 工作项 | 负责人 | 优先级 | 依赖 | 状态 |
|---|---|---|---|---|---|
| 6.9 | AI 推荐原因展示 UI | B | P1 | 6.7,1.22 | 未开始 |
| 6.13 | AI Loading / Error / 修改确认 / 成功反馈 UI | B | P1 | 1.22,6.14 | 未开始 |
| 6.15 | AI 对话 UI 接入 Action Contract | B | P0 | 3.6,6.14 | 未开始 |

## 7. 地图、地点、路线与推荐数据（A 主责）

| WBS ID | 工作项 | 负责人 | 优先级 | 依赖 | 状态 |
|---|---|---|---|---|---|
| 7.1 | 地图 Provider 选型 | A | P0 | 1.12 | 未开始 |
| 7.2 | Places / POI Provider 选型 | A | P0 | 1.10 | 未开始 |
| 7.3 | Route / Transit Provider 选型 | A | P0 | 1.9 | 未开始 |
| 7.4 | POI 标准数据 Schema | A | P0 | 7.2 | 未开始 |
| 7.5 | 路线数据 Schema | A | P0 | 7.3 | 未开始 |
| 7.6 | 地点搜索 API | A | P0 | 7.2,7.4 | 未开始 |
| 7.7 | POI 详情 API | A | P1 | 7.4 | 未开始 |
| 7.8 | 路线计算 API | A | P0 | 7.3,7.5 | 未开始 |
| 7.9 | 推荐打分 v1 | A | P0 | 5.11,7.4 | 未开始 |
| 7.10 | 缓存策略 | A | P1 | 7.6-7.8 | 未开始 |
| 7.11 | Provider 失败降级 | A | P1 | 7.6-7.8 | 未开始 |
| 7.12 | 客户地图消费 Contract | A | P0 | 7.4-7.8 | 未开始 |

## 8. 后端、账户与数据持久化（A 主责）

| WBS ID | 工作项 | 负责人 | 优先级 | 依赖 | 状态 |
|---|---|---|---|---|---|
| 8.1 | Backend / DB 方案选型 | A | P0 | 2.6 | 未开始 |
| 8.2 | User Schema | A | P0 | 8.1 | 未开始 |
| 8.3 | Authentication 核心 | A | P0 | 8.1 | 未开始 |
| 8.4 | Preference 持久化 | A | P1 | 5.11,8.2 | 未开始 |
| 8.5 | Trip Schema | A | P0 | 4.15,8.1 | 未开始 |
| 8.6 | 行程保存 / 读取 API | A | P0 | 8.5 | 未开始 |
| 8.7 | 行程版本 / 草稿 | A | P2 | 8.6 | 未开始 |
| 8.8 | AI 会话保存 | A | P2 | 6.2,8.2 | 未开始 |
| 8.9 | 数据删除 / 账户删除 | A | P1 | 8.3-8.8 | 未开始 |
| 8.10 | DB Migration 规范 | A | P1 | 8.1 | 未开始 |
| 8.11 | 客户账户 / 行程 UI 数据 Contract | A | P0 | 8.3,8.6 | 未开始 |

## 9. 质量、测试、安全与性能

| WBS ID | 工作项 | 负责人 | 优先级 | 依赖 | 状态 |
|---|---|---|---|---|---|
| 9.1 | 单元测试基线 | A | P1 | 2.9 | 未开始 |
| 9.2 | Planner 核心集成测试 | A | P1 | 4.15-4.17,5.11-5.13 | 未开始 |
| 9.3 | AI 集成测试 | A | P1 | 6.x | 未开始 |
| 9.4 | E2E 主流程自动化 | A | P1 | 3.x-8.x | 未开始 |
| 9.5 | Web 性能预算 | A | P2 | 4.x | 未开始 |
| 9.6 | API Rate Limit | A | P1 | 6.4,7.x | 未开始 |
| 9.7 | Security Headers / CSP | A | P1 | 3.1 | 未开始 |
| 9.8 | Secret 扫描 | A | P1 | 2.8 | 未开始 |
| 9.9 | 错误监控 | A | P2 | 2.11 | 未开始 |
| 9.10 | 客户界面跨浏览器 / 响应式 QA | B | P1 | 3.x-6.x | 未开始 |
| 9.11 | 客户界面视觉回归检查 | B | P2 | 2.7,3.x-6.x | 未开始 |
| 9.12 | 客户界面可访问性 QA | B | P2 | 3.8 | 未开始 |

## 10. 发布与运营准备（A 主责）

| WBS ID | 工作项 | 负责人 | 优先级 | 依赖 | 状态 |
|---|---|---|---|---|---|
| 10.1 | Dev / Preview / Prod 环境 | A | P0 | 2.5,8.1 | 未开始 |
| 10.2 | 自动部署 | A | P1 | 2.8,10.1 | 未开始 |
| 10.3 | Domain / HTTPS | A | P1 | 10.1 | 未开始 |
| 10.4 | Analytics | A | P2 | 3.x | 未开始 |
| 10.5 | SEO / Metadata 技术实现 | A | P2 | 3.x | 未开始 |
| 10.6 | 隐私政策 / Terms | A | P1 | 8.x | 未开始 |
| 10.7 | Beta Feedback 数据流程 | A | P2 | 10.1 | 未开始 |
| 10.8 | MVP Release Checklist | A | P0 | 9.x,10.x | 未开始 |

## 11. Mobile App（Web MVP 后）

| WBS ID | 工作项 | 负责人 | 优先级 | 依赖 | 状态 |
|---|---|---|---|---|---|
| 11.1 | Mobile 技术方案选型 | A | P2 | M6 | 未开始 |
| 11.2 | API 与 Web 解耦检查 | A | P1 | 11.1 | 未开始 |
| 11.3 | Mobile 客户界面 Design System | B | P2 | 1.13,11.1 | 未开始 |
| 11.4 | Mobile 登录 / 账户客户 UI | B | P2 | 8.3,11.3 | 未开始 |
| 11.5 | Mobile 行程查看 / 编辑 UI | B | P2 | 8.6,11.3 | 未开始 |
| 11.6 | Mobile 地图 / 路线客户 UI | B | P2 | 7.x,11.3 | 未开始 |
| 11.7 | Mobile AI 对话客户 UI | B | P2 | 6.x,11.3 | 未开始 |
| 11.8 | Push Notification 核心 | A | P3 | 11.1 | 未开始 |
| 11.9 | App Store / Play 发布 | A | P2 | 11.3-11.8 | 未开始 |
| 11.10 | Mobile 核心集成 / Native 能力 / 数据层 | A | P1 | 11.1,11.2 | 未开始 |

## 12. 主系统界面（A 全责）

| WBS ID | 工作项 | 负责人 | 优先级 | 依赖 | 状态 |
|---|---|---|---|---|---|
| 12.1 | 主系统 Shell / Navigation | A | P2 | 1.26,2.6 | 未开始 |
| 12.2 | Dashboard | A | P2 | 12.1 | 未开始 |
| 12.3 | 用户管理 | A | P2 | 8.2,12.1 | 未开始 |
| 12.4 | 行程管理 / 调试查看 | A | P2 | 8.5,12.1 | 未开始 |
| 12.5 | POI / 内容 / Provider 管理 | A | P2 | 7.x,12.1 | 未开始 |
| 12.6 | AI Prompt / Model / Tool 配置管理 | A | P2 | 6.x,12.1 | 未开始 |
| 12.7 | 监控 / 错误 / API 成本视图 | A | P2 | 6.11,9.9,12.1 | 未开始 |
| 12.8 | Feedback / 运营管理 | A | P3 | 10.7,12.1 | 未开始 |
| 12.9 | 主系统权限 / Role | A | P2 | 8.3,12.1 | 未开始 |
| 12.10 | Audit Log / 管理操作记录 | A | P2 | 12.1 | 未开始 |

---

# 5. 新 Task 自动分配规则

生成任何新 Task 前按以下顺序判断：

1. 先检查 GitHub 上最新 WBS、A/B Task、Issue、PR。
2. 判断工作项是否直接属于客户可见界面。
3. **客户可见画面设计 / 前端交互 → B。**
4. **主系统界面 → A。**
5. **Backend / AI / Data / State / Provider / Infra / CI / Test / Deploy → A。**
6. 混合任务必须尽量拆成 `A-core` + `B-customer-ui` 两个 Task。
7. A Task 优先先定义稳定 Contract，再让 B 接 UI。
8. 不允许 A/B 同时修改同一高冲突核心文件，除非 Task 明确安排。
9. 已开始 Task 不因 v0.3 强制换人；后续尚未开始工作按新规则执行。

### 推荐 Task 命名

```text
TASK-xxx-a-<core-or-system-name>.md
TASK-xxx-b-<customer-ui-name>.md

feature/a-<core-or-system-name>
feature/b-<customer-ui-name>
```

---

# 6. Codex 返回结果时自动更新 WBS（强制规则）

> 本规则适用于 A、B 两台工作站上的所有 Codex Task。Codex 不得只返回执行结果而不更新 WBS。

## 6.1 核心流程

```text
读取 Task
↓
检查 GitHub 上最新 A/B Task、Issue、PR、develop
↓
读取 docs/project/WBS-TravelAssist.md
↓
确认 WBS ID + Owner 是否符合 v0.3 责任边界
↓
执行开发 / 测试 / 文档修改
↓
判断最终执行状态
↓
更新 WBS 对应行
↓
更新 Task Result
↓
git add
↓
git commit
↓
git push
↓
最后才向用户输出 Codex Result
```

**任务完成 = 工作完成 + 测试完成 + WBS 更新完成 + GitHub 推送完成。**

## 6.2 状态映射

- Task 正式启动：`进行中`
- Codex 返回 `Blocked`：`阻塞`
- 实现完成但 PR 未合并：`待审查`
- PR 已合并 `develop` 且验收通过：`已完成`

不得因为 Codex 本地返回 `Completed` 就直接把 WBS 写成 `已完成`。

## 6.3 Mandatory WBS Update

```md
## Mandatory WBS Update

Before returning the final Task Result:

1. Read `docs/project/WBS-TravelAssist.md` from the latest repository state.
2. Confirm this Task's WBS ID and owner against the A/B responsibility rules.
3. Update the WBS based on the actual execution result.
4. If blocked, set status to `阻塞` and record the reason.
5. If implementation is complete but PR is not merged, set status to `待审查`.
6. Only set status to `已完成` after merge to `develop` and acceptance passes.
7. Record Issue, branch, commit and PR when available.
8. Include the WBS update in the same Task commit whenever possible.
9. Push the WBS update to GitHub.
10. Include a `WBS Update` section in the final Codex result.

Do not return a complete Task Result without WBS synchronization.
```

---

# 7. 当前重新分配后的优先队列

> 现有已启动任务保持原负责人；尚未开始任务按 v0.3 分工。

| 顺序 | WBS ID | 工作项 | 负责人 |
|---:|---|---|---|
| 1 | 2.1 | A 工程初始化 PR 合并 / 验收 | A |
| 2 | 2.2 | B 工作站工程初始化 / 验证完成 | B |
| 3 | 2.3 | Node / npm / TypeScript 版本固定 | A |
| 4 | 2.4 | ESLint / Prettier / EditorConfig | A |
| 5 | 2.6 | 目录架构 + A/B 代码责任边界冻结 | A |
| 6 | 1.15 | MVP Scope v1 冻结 | A |
| 7 | 1.16 | 客户 / 主系统界面边界冻结 | A |
| 8 | 1.17 | 客户界面 Screen Inventory | B |
| 9 | 1.13 | 客户 Design Token | B |
| 10 | 1.18 | 首页详细画面设计 | B |
| 11 | 1.20 | Planner 详细画面设计 | B |
| 12 | 1.21 | 偏好设置详细画面设计 | B |
| 13 | 1.22 | AI 对话详细画面设计 | B |
| 14 | 1.31 | 客户 UI / 核心 Contract 规范 | A |
| 15 | 2.7 | 客户 UI 组件库 | B |
| 16 | 4.15 | Planner 核心状态模型 | A |
| 17 | 3.1 | 客户 Web Shell | B |

### 并行建议

A 与 B 后续尽量形成双轨：

```text
A：Core / Backend / AI / Data / System
B：Customer Design / Customer Frontend
```

B 等待 A 的核心接口时，不去抢 A 的核心任务；优先继续客户画面设计、组件库、响应式和独立客户 UI。

---

# 8. 单个 WBS 项目记录模板

```md
## WBS Record

- WBS ID:
- Task ID:
- Title:
- Owner:
- Reviewer:
- Priority:
- Status:
- Dependency:
- Branch:
- GitHub Issue:
- Pull Request:
- Start Date:
- Completed Date:

### Responsibility Type
- Customer UI / System UI / Core / Infra:

### Scope
-

### Deliverables
-

### Acceptance Criteria
- [ ]
- [ ]
- [ ]

### Codex Result
- Status:
- Commit:
- Tests:
- Problems:
- Next Task:
```

---

# 9. 项目统一 Codex 工作原则

1. 开始新 Task 前检查 GitHub 上已有 A/B Task。
2. 检查 `origin/develop` 最新状态和前置依赖。
3. 一个正式 Task 必须对应 WBS ID。
4. 一个正式 Task 原则上对应一个 GitHub Issue。
5. 使用独立 feature 分支，不直接修改 `develop`。
6. Task 文件必须备份 GitHub。
7. Codex Result / Result 文件必须备份 GitHub。
8. Codex 返回结果之前必须更新 WBS。
9. 实现完成但未 merge：WBS = `待审查`。
10. 被依赖阻塞：WBS = `阻塞`。
11. PR 合并并验收通过：WBS = `已完成`。
12. WBS 修改应和该 Task 的最后一次提交一起 push。
13. 下一项 Task 生成前，以 GitHub 上最新 WBS 为准。
14. **B 默认只接客户界面设计/前端相关 Task。**
15. **A 默认接主系统界面和所有 Core / Backend / AI / Data / Infra Task。**
16. 混合需求优先拆成 A Core + B Customer UI，避免所有权模糊。
