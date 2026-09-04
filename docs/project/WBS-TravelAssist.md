# TravelAssist 可记录 WBS（Master）

> 版本：v0.2  
> 更新日期：2026-09-04  
> 适用阶段：Web 优先，移动 App 后续  
> 开发方式：A 主开发约 70%，B 协作约 30%，ChatGPT / Codex 辅助开发

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

---

## 2. 项目级里程碑

| Milestone | 名称 | 目标 | 负责人 | 状态 |
|---|---|---|---|---|
| M0 | 工程基础完成 | 两台电脑都能稳定开发、测试、提交 PR | A+B | 进行中 |
| M1 | 产品设计冻结 v1 | 核心页面、偏好、行程、AI 交互规则明确 | A 主 / B 辅 | 进行中 |
| M2 | Web Shell 完成 | 首页、导航、基础布局、登录入口可用 | A | 未开始 |
| M3 | 行程规划核心完成 | 地图、时间轴、右侧设置、推荐方案联动 | A 主 / B 辅 | 未开始 |
| M4 | AI 助手 MVP 完成 | AI 对话能读取偏好并修改/生成行程 | A | 未开始 |
| M5 | 数据与账户完成 | 用户、行程、偏好、保存/读取完整 | A 主 / B 辅 | 未开始 |
| M6 | Web MVP 可发布 | 核心流程可端到端使用 | A+B | 未开始 |
| M7 | Web Beta | 测试、监控、SEO、性能、安全完善 | A+B | 未开始 |
| M8 | Mobile App | 基于 Web/API 能力开发移动版本 | 后续 | 未开始 |

---

## 3. Master WBS

### 0. 项目管理与协作

| WBS ID | 工作项 | 负责人 | 优先级 | 依赖 | 状态 | 主要产出物 | GitHub Issue | PR / Commit | 完成标准 |
|---|---|---|---|---|---|---|---|---|---|
| 0.1 | GitHub 仓库与 `develop` 工作流建立 | A | P0 | - | 已完成 | Repository / develop | - | - | A/B 均可拉取 |
| 0.2 | A/B feature 分支规则 | A+B | P0 | 0.1 | 已完成 | Branch convention | - | - | 不直接修改 develop |
| 0.3 | Task 文件编号与存档规范 | A | P0 | 0.1 | 进行中 | `docs/tasks/` 规范 |  |  | 新 Task 可追踪 |
| 0.4 | WBS 主表建立 | A | P0 | 0.1 | 已完成 | 本文件 |  |  | 可记录进度、依赖、Issue、PR |
| 0.5 | GitHub Issue / PR 模板 | B | P1 | 0.3 | 未开始 | `.github/` templates |  |  | Issue/PR 格式统一 |
| 0.6 | Definition of Done | A | P1 | 0.3 | 未开始 | DoD 文档 |  |  | 每个 Task 有统一验收标准 |
| 0.7 | 周期性 WBS 更新规则 | A+B | P1 | 0.4 | 进行中 | 更新流程 |  |  | Codex 自动回写 WBS |

### 1. 产品与设计冻结

| WBS ID | 工作项 | 负责人 | 优先级 | 依赖 | 状态 |
|---|---|---|---|---|---|
| 1.1 | 产品定位与核心价值主张 | A | P0 | - | 进行中 |
| 1.2 | 用户旅程 / 核心使用流程 | A | P0 | 1.1 | 进行中 |
| 1.3 | 页面分类一览 | A | P0 | 1.2 | 进行中 |
| 1.4 | 首页设计冻结 v1 | A | P1 | 1.3 | 进行中 |
| 1.5 | 行程规划主界面冻结 v1 | A | P0 | 1.3 | 进行中 |
| 1.6 | 底部时间轴设计冻结 | A | P0 | 1.5 | 进行中 |
| 1.7 | 右侧设置面板三层结构 | A | P0 | 1.5 | 进行中 |
| 1.8 | 同行人模型 | A | P1 | 1.7 | 进行中 |
| 1.9 | 偏好大/中/小项目完整表 | A | P0 | 1.7 | 进行中 |
| 1.10 | 景点与活动标签系统 | A | P1 | 1.9 | 未开始 |
| 1.11 | 推荐方案 1/2/3 结构 | A | P1 | 1.5 | 未开始 |
| 1.12 | 地图视觉 / 区域标记规范 | A | P1 | 1.5 | 未开始 |
| 1.13 | 设计 Token / 色彩 / 字体 / 圆角 | A | P1 | 1.4,1.5 | 未开始 |
| 1.14 | 响应式布局规则 | B | P1 | 1.5,1.13 | 未开始 |
| 1.15 | MVP 功能范围冻结 | A+B | P0 | 1.1-1.14 | 未开始 |

### 2. 工程初始化与基础架构

| WBS ID | 工作项 | 负责人 | 优先级 | 依赖 | 状态 |
|---|---|---|---|---|---|
| 2.1 | A 工程初始化 Task | A | P0 | 0.3 | 待审查 |
| 2.2 | B 工程初始化 / 工作站验证 | B | P0 | 0.2 | 进行中 |
| 2.3 | Node / npm / TypeScript 版本固定 | B | P0 | 2.1 | 未开始 |
| 2.4 | ESLint / Prettier / EditorConfig | B | P1 | 2.1 | 未开始 |
| 2.5 | 环境变量规范 | A | P0 | 2.1 | 未开始 |
| 2.6 | 目录架构冻结 | A | P0 | 2.1 | 未开始 |
| 2.7 | 基础 UI 组件策略 | A | P1 | 1.13,2.6 | 未开始 |
| 2.8 | GitHub Actions CI | B | P1 | 2.3,2.4 | 未开始 |
| 2.9 | 单元测试框架 | B | P1 | 2.1 | 未开始 |
| 2.10 | E2E 测试框架 | B | P2 | 2.1 | 未开始 |

### 3. Web Shell / 首页 / 导航

| WBS ID | 工作项 | 负责人 | 优先级 | 依赖 | 状态 |
|---|---|---|---|---|---|
| 3.1 | 全局 Layout / Header | A | P1 | 1.13,2.7 | 未开始 |
| 3.2 | 首页动画背景区域 | A | P1 | 1.4 | 未开始 |
| 3.3 | 「让我们开始吧」主入口 | A | P0 | 3.1 | 未开始 |
| 3.4 | 登录入口 UI | B | P1 | 3.1 | 未开始 |
| 3.5 | 右下 AI 悬浮按钮 | B | P1 | 3.1 | 未开始 |
| 3.6 | AI 对话抽屉 / 浮层 | A | P1 | 3.5 | 未开始 |
| 3.7 | Loading / Empty / Error 状态 | B | P1 | 3.1 | 未开始 |

### 4. 行程规划核心界面

| WBS ID | 工作项 | 负责人 | 优先级 | 依赖 | 状态 |
|---|---|---|---|---|---|
| 4.1 | Planner 页面整体 Grid | A | P0 | 1.5,3.1 | 未开始 |
| 4.2 | 地图容器与基础控件 | A | P0 | 4.1 | 未开始 |
| 4.3 | 景点 Pin 组件 | B | P1 | 4.2,1.12 | 未开始 |
| 4.4 | 住宿区域覆盖层 | B | P1 | 4.2,1.12 | 未开始 |
| 4.5 | 餐饮区域覆盖层 | B | P1 | 4.2,1.12 | 未开始 |
| 4.6 | 多日路线显示 | A | P0 | 4.2 | 未开始 |
| 4.7 | 交通方式显示 | A | P0 | 4.6 | 未开始 |
| 4.8 | 底部时间轴基础 | A | P0 | 1.6,4.1 | 未开始 |
| 4.9 | 时间轴景点卡片 | B | P1 | 4.8 | 未开始 |
| 4.10 | 时间轴交通段 | B | P1 | 4.8 | 未开始 |
| 4.11 | 时间轴餐饮段 | B | P1 | 4.8 | 未开始 |
| 4.12 | 时间轴住宿段 | B | P1 | 4.8 | 未开始 |
| 4.13 | 右侧推荐方案列表 | A | P0 | 1.11,4.1 | 未开始 |
| 4.14 | 方案切换 | A | P0 | 4.13,4.6,4.8 | 未开始 |
| 4.15 | Planner 状态管理 | A | P0 | 4.1 | 未开始 |

### 5. 偏好与详细设置系统

| WBS ID | 工作项 | 负责人 | 优先级 | 依赖 | 状态 |
|---|---|---|---|---|---|
| 5.1 | 快速设置层 | A | P0 | 1.7,4.1 | 未开始 |
| 5.2 | 中项目展开层 | A | P0 | 5.1 | 未开始 |
| 5.3 | 小项目详细层 | B | P1 | 5.2 | 未开始 |
| 5.4 | 同行人设置 | A | P0 | 1.8,5.1 | 未开始 |
| 5.5 | 移动偏好 | B | P1 | 1.9,5.2 | 未开始 |
| 5.6 | 景点与活动偏好 | A | P0 | 1.9,1.10 | 未开始 |
| 5.7 | 拍照/体验倾向 | B | P2 | 1.10,5.6 | 未开始 |
| 5.8 | 餐饮偏好 | B | P1 | 1.9 | 未开始 |
| 5.9 | 住宿偏好 | B | P1 | 1.9 | 未开始 |
| 5.10 | 预算偏好 | A | P1 | 1.9 | 未开始 |
| 5.11 | 偏好数据 Schema | A | P0 | 1.9 | 未开始 |
| 5.12 | 默认值与快速 Preset | A | P1 | 5.11 | 未开始 |

### 6. AI 旅行助手

| WBS ID | 工作项 | 负责人 | 优先级 | 依赖 | 状态 |
|---|---|---|---|---|---|
| 6.1 | AI 能力边界定义 | A | P0 | 1.15 | 未开始 |
| 6.2 | 对话消息数据模型 | A | P0 | 3.6 | 未开始 |
| 6.3 | Prompt / System Instruction v1 | A | P0 | 6.1,5.11 | 未开始 |
| 6.4 | AI API 接入层 | A | P0 | 2.5,6.3 | 未开始 |
| 6.5 | AI 读取用户偏好 | A | P0 | 5.11,6.4 | 未开始 |
| 6.6 | AI 修改偏好 | A | P0 | 6.5 | 未开始 |
| 6.7 | AI 生成初始行程 | A | P0 | 6.4,7.x | 未开始 |
| 6.8 | AI 局部修改行程 | A | P0 | 6.7 | 未开始 |
| 6.9 | AI 解释推荐原因 | B | P1 | 6.7 | 未开始 |
| 6.10 | AI 错误 / 降级处理 | B | P1 | 6.4 | 未开始 |
| 6.11 | AI 成本 / Token 监控 | B | P2 | 6.4 | 未开始 |
| 6.12 | AI 结果质量测试集 | A+B | P1 | 6.7 | 未开始 |

### 7. 地图、地点、路线与推荐数据

包含 Provider 选型、POI Schema、路线 Schema、地点搜索、POI 详情、路线计算、推荐打分、缓存和服务降级。

### 8. 后端、账户与数据持久化

包含 Backend/DB 选型、User Schema、Authentication、Preference 持久化、Trip Schema、行程 CRUD、版本、AI 会话和数据删除。

### 9. 质量、测试、安全与性能

包含单元测试、Planner 集成测试、AI 集成测试、E2E、性能预算、Rate Limit、CSP、Secret 扫描、错误监控和跨浏览器测试。

### 10. 发布与运营准备

包含 Dev/Preview/Prod、自动部署、Domain/HTTPS、Analytics、SEO、隐私政策、Feedback 和 MVP Release Checklist。

### 11. Mobile App（Web MVP 后）

Web MVP 完成后再启动 Mobile 技术选型、共享 API、Mobile UI、认证、行程、地图、AI、通知和商店发布。

---

## 4. A / B 默认分工

### A：主开发（约 70%）

负责产品/架构最终决策、主页面、核心交互、行程状态模型、AI、地图路线核心逻辑、数据 Schema、Backend 核心接口与最终集成。

### B：协作开发（约 30%）

负责工程规范与 CI、通用 UI、独立组件、偏好小项、地图 Pin/Overlay、Timeline 子组件、Loading/Error/Empty、测试、安全、性能和文档。

A 延误时，B 优先接手已有稳定接口、低耦合、可独立分支、验收明确且合并冲突低的工作。

---

## 5. 单个 WBS 项目记录模板

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

## 6. Codex 返回结果时自动更新 WBS（强制规则）

> 本规则适用于 A、B 两台工作站上的所有 Codex Task。Codex 不得只返回执行结果而不更新 WBS。

### 6.1 核心流程

```text
读取 Task
↓
读取 GitHub / 当前仓库状态
↓
读取 docs/project/WBS-TravelAssist.md
↓
确认 Task 对应的 WBS ID
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

### 6.2 状态映射

- Task 正式启动：`进行中`
- Codex 返回 `Blocked`：`阻塞`
- 实现完成但 PR 未合并：`待审查`
- PR 已合并 `develop` 且验收通过：`已完成`

不得因为 Codex 本地返回 `Completed` 就直接把 WBS 写成 `已完成`。

### 6.3 Codex 必须更新的字段

| 字段 | 规则 |
|---|---|
| 状态 | 必须 |
| 负责人 | 必须 |
| GitHub Issue | 有则必须记录 |
| Branch | 必须 |
| Commit | 必须 |
| PR | 存在时必须 |
| 完成标准 | 必须检查 |
| 阻塞原因 | Blocked 时必须 |
| 下一步 | 应记录 |

### 6.4 Codex 强制结束检查

```md
### WBS Sync Check

- [ ] 已找到本 Task 对应 WBS ID
- [ ] 已读取最新 WBS
- [ ] 已根据实际结果更新状态
- [ ] 已记录 GitHub Issue
- [ ] 已记录 branch
- [ ] 已记录 commit
- [ ] 已记录 PR（如果存在）
- [ ] Blocked 时已记录阻塞原因
- [ ] 已检查 Acceptance Criteria
- [ ] 已将 WBS 修改加入本次 commit
- [ ] 已 push 到 GitHub
```

### 6.5 每个 Task 必须附带的 Mandatory WBS Update

```md
## Mandatory WBS Update

Before returning the final Task Result:

1. Read `docs/project/WBS-TravelAssist.md`.
2. Find the row matching this Task's WBS ID.
3. Update the WBS based on the actual execution result.
4. If blocked, set WBS status to `阻塞` and record the reason.
5. If implementation is complete but the PR is not merged, set status to `待审查`.
6. Only set status to `已完成` after the PR is merged into `develop` and acceptance criteria pass.
7. Record Issue, branch, commit and PR information when available.
8. Include the WBS modification in the same Git commit whenever possible.
9. Push the WBS update to GitHub.
10. In the final Codex response, include a `WBS Update` section confirming the synchronization.

Do not return `Completed` without performing the required WBS synchronization.
```

### 6.6 标准 Codex Result

```md
# Task Result

## Status
Completed / Blocked

## Task
- Task ID:
- WBS ID:
- Owner:

## Repository
- Repository:
- Branch:
- Base Branch:

## Implementation
-

## Validation
- Lint:
- Typecheck:
- Tests:
- Build:

## GitHub
- Issue:
- Commit:
- Pull Request:
- Push:

## WBS Update
- WBS File: `docs/project/WBS-TravelAssist.md`
- Previous Status:
- New Status:
- Updated Fields:
- WBS Commit Included: Yes / No

## Problems
None / 具体问题

## Next Task
下一项建议执行的 WBS / Task
```

---

## 7. 每次创建新 Task 前检查清单

```md
- [ ] 已拉取最新 `origin/develop`
- [ ] 已检查 GitHub 中 A 的现有 Task
- [ ] 已检查 GitHub 中 B 的现有 Task
- [ ] Task ID 未重复
- [ ] WBS ID 已存在
- [ ] 前置依赖已完成
- [ ] 没有其他人正在修改同一高冲突模块
- [ ] 已建立 GitHub Issue
- [ ] 已建立独立 feature 分支
- [ ] 验收标准明确
- [ ] 测试要求明确
- [ ] 完成后会创建 PR → `develop`
- [ ] Task / Result 会备份到 GitHub
```

---

## 8. 当前最优先队列

| 顺序 | WBS ID | 工作项 | 建议负责人 |
|---:|---|---|---|
| 1 | 2.1 | A 工程初始化合并到 develop | A |
| 2 | 2.2 | B 工作站工程初始化 / 验证 | B |
| 3 | 2.3 | Node / npm / TypeScript 版本固定 | B |
| 4 | 2.4 | ESLint / Prettier / EditorConfig | B |
| 5 | 2.6 | 目录架构冻结 | A |
| 6 | 1.15 | MVP Scope v1 冻结 | A+B |
| 7 | 2.7 | UI 组件策略 | A |
| 8 | 2.8 | CI | B |
| 9 | 3.1 | App Shell | A |
| 10 | 3.7 | Loading / Empty / Error 通用组件 | B |

---

## 9. 项目统一 Codex 工作原则

1. 开始新 Task 前检查 GitHub 上已有的 A / B Task。
2. 检查 `origin/develop` 最新状态和前置依赖。
3. 一个正式 Task 必须对应 WBS ID。
4. 一个正式 Task 原则上对应一个 GitHub Issue。
5. 使用独立 feature 分支，不直接修改 `develop`。
6. Task 文件必须备份 GitHub。
7. Codex Result / Result 文件必须备份 GitHub。
8. **Codex 返回结果之前必须更新 WBS。**
9. 实现完成但未 merge：WBS = `待审查`。
10. 被依赖阻塞：WBS = `阻塞`。
11. PR 合并并验收通过：WBS = `已完成`。
12. WBS 修改应和该 Task 的最后一次提交一起 push。
13. 下一项 Task 生成前，以 GitHub 上最新 WBS 为准。
