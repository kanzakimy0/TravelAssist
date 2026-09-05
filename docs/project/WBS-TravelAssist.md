# TravelAssist 可记录 WBS（Master）

> 版本：v0.4  
> 更新日期：2026-09-05
> 适用阶段：Web 优先，移动 App 后续  
> 开发方式：A 主开发约 70%，B 协作约 30%，ChatGPT / Codex 辅助开发  
> **v0.4 分工原则：A 负责旅行主系统（网站入口、地图、路线/行程生成、主规划画面及对应开发）；B 负责用户通过头像进入的个人中心（账户、个人管理、偏好、同行人、保存/历史等界面及对应开发）。**

---

## 1. 使用规则

### 1.1 状态枚举

| 状态     | 含义                           |
| -------- | ------------------------------ |
| `未开始` | 尚未进入开发                   |
| `待确认` | 需求、设计或依赖仍需确认       |
| `可开始` | 前置依赖已完成，可以创建 Task  |
| `进行中` | 已建立 feature 分支并开发      |
| `待审查` | 已完成代码，等待 Review / PR   |
| `阻塞`   | 因依赖、技术或其他原因无法继续 |
| `已完成` | 已合并到 `develop` 且验收通过  |
| `取消`   | 决定不再实施                   |

### 1.2 GitHub 记录原则

1. 每个正式工作项必须有唯一 WBS ID。
2. 进入开发前建立对应 `TASK-xxx-*.md`，统一存放在 `docs/tasks/`。
3. 生成新 Task 前，必须检查 GitHub 上最新 A/B Task、Issue、PR 和 `origin/develop`。
4. 每个开发 Task 原则上对应一个 GitHub Issue 和一个独立 feature 分支。
5. 不直接在 `develop` 上做功能开发。
6. Task、Result、WBS 都必须备份到 GitHub。
7. Codex 返回结果前必须更新本 WBS。
8. 实现完成但 PR 未合并：`待审查`；PR 合并并验收通过：`已完成`。
9. 新 Task 分配负责人时，必须先应用 v0.4 的“旅行主系统 / 个人中心”责任边界。
10. 本次 v0.4 明确覆盖 v0.3 中“所有客户可见界面都归 B”的旧规则。

---

# 2. A / B 长期责任边界（v0.4）

## 2.1 A：旅行主系统 Owner

A 负责用户进入网站后，用来“规划旅行”的主系统画面与对应开发工程。

### A 负责的画面

- 网站首页 / Landing / 动画背景
- 顶部主导航、主 App Shell
- 「让我们开始吧」入口
- 首页登录按钮 / 头像入口在主系统中的位置与触发
- 目的地输入、日期输入、开始规划入口
- 地图主画面
- 景点 Pin、住宿区、餐饮区等地图可视化
- 多日路线、步行/电车/公交等交通路线呈现
- 行程生成 / 路线生成主画面
- 底部时间轴
- 推荐方案 1/2/3
- 行程方案切换
- 主规划画面中的快速调整与临时设置
- AI 旅行助手主对话界面
- AI 修改行程、重新规划、推荐理由等主系统交互
- 主系统 Loading / Empty / Error / 响应式

### A 负责的开发工程

- Planner 状态模型 / Store / Day Plan Core
- Trip Plan / Route / POI 等主系统核心 Schema
- 地图 Provider、POI Provider、Route / Transit Provider
- 路线计算、地点搜索、POI 详情、缓存和降级
- 推荐排序与行程生成逻辑
- AI Prompt / Tool / Action / Agent / 行程生成修改逻辑
- 主系统对应 API、Service、Contract
- 主系统单元测试、集成测试和 E2E
- 全局工程架构、Node/npm/TypeScript、Lint、CI/CD
- 全局日志、安全、性能、监控、部署、发布

> 原则：**用户正在“规划旅行”的页面和功能，默认归 A。**

---

## 2.2 B：用户个人中心 Owner

B 负责用户点击头像后进入的“自己的界面”，以及个人资料、管理和长期偏好相关功能。

### B 负责的画面

- 头像菜单 / Personal Center 入口后的界面
- 登录、注册、忘记密码等账户流程页面
- 个人中心首页
- 用户资料 / Profile
- 账户设置 / 安全设置
- 偏好管理中心
- 旅行偏好大/中/小项目编辑
- 同行人资料管理
- 预算、住宿、餐饮、移动、活动等长期偏好设置
- 用户保存的行程
- 行程历史 / 草稿 / 收藏
- 用户自己的行程管理界面
- AI 会话历史（如果放在个人中心）
- 个人数据管理 / 删除账户
- 个人中心 Loading / Empty / Error / 响应式

### B 负责的开发工程

- User / Profile 模块
- Authentication 用户流程实现
- Preference Schema / Preset / 持久化
- Companion 数据与 API
- 用户账户 / 偏好 / 个人管理相关 API
- 保存行程 / 历史 / 草稿 / 收藏的持久化与个人管理 API
- Personal Center 状态管理
- B 模块自己的单元测试、集成测试和 E2E

> 原则：**用户点击头像后，为“管理自己”而使用的页面和功能，默认归 B。**

---

## 2.3 A/B 边界实例

### 首页 + 登录

```text
A：主页、Header、登录按钮/头像入口的位置和视觉
B：登录页、注册页、账户 Session 用户流程、个人中心
```

### 偏好

```text
B：偏好 Schema + 持久化 + 个人中心偏好编辑 UI
A：Planner 读取 B 提供的偏好 Contract，并用于行程生成/推荐
```

### 保存行程

```text
A：生成 Trip Plan，并定义可保存的 Trip Contract
B：保存/读取/历史/草稿/收藏，以及个人中心的行程管理 UI
A：Planner 中的“保存”按钮调用 B 提供的保存 Contract
```

### 地图与路线

```text
A：地图 UI + Provider + Route Schema + 路线生成 + 可视化 + 时间轴
B：不负责地图/路线主系统，除非未来个人中心需要一个只读小地图组件
```

### AI

```text
A：主系统 AI 对话、Prompt、Action、修改行程和推荐理由
B：个人中心中的 AI 历史/个人数据管理（如实现）
```

---

## 2.4 跨模块工程规则

1. 主系统和个人中心尽量分目录、分 Task、分 Branch。
2. A/B 不同时修改同一高冲突文件。
3. A 负责全局架构与共享基础设施。
4. B 可以独立拥有个人中心模块内部的前端、API、Schema 和测试。
5. A 主系统需要用户偏好/账户数据时，通过 B 模块公开 Contract 消费，不直接绕过模块边界。
6. B 保存行程时，通过 A 定义的 Trip Plan Contract 消费主系统数据。
7. 跨模块 Contract 变更必须在 Task 中明确双方影响。

建议目录方向：

```text
A Owner
src/app/(main)/
src/features/planner/
src/features/map/
src/features/routing/
src/features/ai/
src/core/
src/lib/maps/
src/lib/routing/
src/lib/ai/

B Owner
src/app/(account)/
src/features/personal-center/
src/features/profile/
src/features/preferences/
src/features/companions/
src/features/trip-library/

Shared / A architecture review
src/shared/
src/types/
src/server/
src/db/
```

---

# 3. 项目级里程碑

| Milestone | 名称                      | 目标                                | 负责人                | 状态   |
| --------- | ------------------------- | ----------------------------------- | --------------------- | ------ |
| M0        | 工程基础完成              | A/B 均可稳定开发、测试、PR          | A 主 / B 工作站初始化 | 进行中 |
| M1        | 画面与模块边界冻结 v1     | 主系统与个人中心设计边界明确        | A+B                   | 进行中 |
| M2        | 网站入口 / Main Shell     | 首页、导航、入口、头像跳转可用      | A                     | 未开始 |
| M3        | Planner / 地图 / 路线 MVP | 主规划系统可生成并展示行程          | A                     | 未开始 |
| M4        | 个人中心 MVP              | 账户、偏好、同行人、行程管理可用    | B                     | 未开始 |
| M5        | AI 助手 MVP               | AI 可生成并修改行程                 | A                     | 未开始 |
| M6        | A/B 数据联动完成          | 偏好输入 Planner、Trip 保存个人中心 | A+B                   | 未开始 |
| M7        | Web MVP 可发布            | 端到端主流程通过                    | A+B                   | 未开始 |
| M8        | Web Beta                  | 测试、安全、性能、监控完善          | A 主 / B 模块 QA      | 未开始 |
| M9        | Mobile App                | 延续相同 A/B 模块边界               | A+B                   | 未开始 |

---

# 4. Master WBS

## 0. 项目管理与协作

| WBS ID | 工作项 | 负责人 | 优先级 | 依赖 | 状态 |
|---|---|---|---|---|---|
| 0.1 | GitHub 仓库与 `develop` 工作流建立 | A | P0 | - | 已完成 |
| 0.2 | A/B feature 分支规则 | A+B | P0 | 0.1 | 已完成 |
| 0.3 | Task 文件编号与存档规范 | A | P0 | 0.1 | 已完成 |
| 0.4 | WBS 主表建立 | A | P0 | 0.1 | 已完成 |
| 0.5 | GitHub Issue / PR 模板 | A | P1 | 0.3 | 已完成 |
| 0.6 | Definition of Done | A | P1 | 0.3 | 未开始 |
| 0.7 | Codex 自动更新 WBS 流程 | A+B | P0 | 0.4 | 已完成 |
| 0.8 | A/B 主系统 / 个人中心责任边界固化 | A | P0 | 0.4 | 进行中 |
| 0.9 | 跨模块 Contract 交接规则 | A+B | P0 | 0.8 | 未开始 |

### 当前 Task 追踪记录

| Task ID | WBS ID | Owner | Status | GitHub Issue | Task File | Branch | Commit | Pull Request |
|---|---|---|---|---|---|---|---|---|
| TASK-003-B | 0.7（关联 0.3、0.5） | B | 已完成 | #18 | `docs/tasks/TASK-003-b-tracking-integration.md` | `feature/task-003-b-tracking-integration` | `b591030` | #21 |
| TASK-004-A | 1.4 / 1.16 | A | 已完成 | #20 | `docs/tasks/TASK-004-a-homepage-final-visual.md` | `feature/a-homepage-final-visual` | `bfa5081` | #23 |
| TASK-005 | 3.6 / 3.8 | B | 已完成 | #28 | `docs/tasks/TASK-005-b-trip-wizard-step1-3.md` | `feature/b-trip-wizard-step1-3` | `70b08a8` | #29 |
| TASK-006 | 3.6 / 3.8（扩展），关联 1.11 / 1.18 / 4.13 / 4.14 | B | 已完成 | #31 | `docs/tasks/TASK-006-b-generation-and-modals.md` | `feature/b-generation-and-modals` | `31982a3` | #32 |
| TASK-007 | 3.6 / 3.8（Step 1–5 版式修正，含 v1.0～v1.3） | B | 已完成（定稿背景已接入；用户授权合并，21 项测试通过） | #35 | `docs/tasks/TASK-007-b-wizard-layout-polish.md` | `feature/b-wizard-layout-polish` | `a438b86`（布局）；`25a0805`（背景）；`28a0ec8`（合并） | #61 已合入 develop |
| WBS-5.1-B | 5.1 | B | 已完成 | #34 | `docs/tasks/TASK-WBS-5.1-b-personal-center-shell-navigation.md` | `feature/b-account-wbs-5-1-personal-center-shell` | `53525eb` | #36 |
| WBS-5.2-B | 5.2 | B | 已完成 | #50 | `docs/tasks/TASK-WBS-5.2-b-avatar-menu-navigation.md` | `feature/b-account-wbs-5-2-avatar-menu` | `6f25b25` | #52 |
| WBS-5.2-B-FOLLOWUP | 5.2（completed-task follow-up） | B | 已完成 | #56 | `docs/tasks/TASK-WBS-5.2-b-problem-cleanup-followup.md` | `fix/b-wbs-5-2-problem-cleanup` | `08a06a6` | #57 |
| TASK-008 | 1.5 / 1.6 / 1.7 / 1.11 / 1.14 / 1.17 / 1.18；4.1 / 4.8 / 4.13；4.14 UI shell | A | 已完成（UI shell 已合并；真实 Provider 不在范围） | #51 | `docs/tasks/TASK-008-a-trip-planner-shell.md` | `feature/a-trip-planner-shell-v2` | `e4648c0`（实现），`8920695`（集成验收），`1a4201b`（合并） | [#59](https://github.com/kanzakimy0/TravelAssist/pull/59) 已合入 develop |
| TASK-008.1 | 4.2–4.6 / 4.8–4.9 / 4.11–4.15；7.1（Mapbox / Mock 子集） | A | 已完成（Mapbox / Mock 子集） | #60 | `docs/tasks/TASK-008.1-a-planner-mapbox-interactions.md` | `feature/a-planner-mapbox-interactions` | `673ab6a`（实现），`8682ed2`（集成），`f5d5ef2`（合并） | [#69](https://github.com/kanzakimy0/TravelAssist/pull/69) 已合入 develop |
| TASK-008.2 | 1.5 / 1.6 / 1.7 / 1.14；4.1（Planner 纯视觉精修） | A | 已合并（用户确认的纯视觉范围；参考图限制留档） | #73 | `docs/tasks/TASK-008.2-a-planner-visual-fidelity-polish.md` | `feature/a-planner-visual-fidelity-polish` | `627b73a`（merge），`7e8db2a`（实现） | [#83](https://github.com/kanzakimy0/TravelAssist/pull/83) 已合入 develop；v0.3 新交互转 TASK-008.3 |
| TASK-008.3 | 1.5 / 1.6 / 1.7 / 1.14；4.1（Planner v0.3 交互） | A | 进行中 | #77 | `docs/tasks/TASK-008.3-a-planner-v03-interactions.md` | `feature/a-planner-v03-interactions` | Base `627b73a` | 三级偏好、比例时间轴、三日比较、Morph；不自动 merge |

> TASK-003-B 与 TASK-006 由用户明确分配给 B 执行；本记录不改变相关 WBS 工作项的既有 Owner。

### TASK-008.1 执行记录（2026-09-05）

- 合并复验：用户授权合并 PR #69；无冲突且未落后 develop，lint / typecheck / 50 项 tests / diff-check 再次通过。合并树的实现、测试及依赖与已通过 build / 浏览器验收的 head 完全一致。只补齐本 Task 合并记录，不开始后续任务。

- Owner：A；Issue #60；Status：已完成（本轮 Mapbox / Mock 子集已合入 develop，验收通过）。
- Task：`docs/tasks/TASK-008.1-a-planner-mapbox-interactions.md`；Branch：`feature/a-planner-mapbox-interactions`；实现 Commit：`673ab6aa9a5a8aa58e8838f6200d5ca77981ea1e`；PR：[#69](https://github.com/kanzakimy0/TravelAssist/pull/69)，用户明确授权后已合并；验收 head `36c73c32f004fcb27e7b214d8d6278790c04373f`，merge `f5d5ef249022d74cc89c8300bb8622e85220eda5`。
- PR #59 合并提交 `1a4201b3181460977c4f16b0c34f60c353751687` 已是 origin/develop 祖先；从 clean 基线 `8159c177b732606c4d1bd7433241677c5fdd8a27` 创建分支。历史 Blocked 条件已解除。
- 交付前无冲突同步最新 develop `fd5e4492f202c07567593199baadd25425190367`，集成提交 `8682ed293d19115f173f81c995739f8199f1d33a`；保留其他 Owner 的最新文档状态，未启动后续 Task。
- 范围：4.2–4.6、4.8–4.9、4.11–4.15 的 Mapbox / Mock 交互子集，7.1 冻结 Mapbox；真实 POI / Route / Transit / Booking / AI / Auth / DB 不在范围，不误报完整业务能力完成。
- 4.2–4.5、4.8–4.9、4.11–4.13 与 7.1 的本次 UI / Mapbox 子集已完成；4.6 / 4.14 / 4.15 完整业务继续进行中，真实路线、重新规划、最终跨模块 Store / Contract 未完成。TASK-008 原 UI shell 已完成的历史记录不变。
- 3 个 GeoJSON Source / 13 个角色图层、单日 / 三日 / 城市全行程、两级地点 / 区域详情、统一 TripItem 预约与固定时段保护已实现。无 token fallback 全流程通过，live Mapbox 未验证（token unavailable）。
- 50 项 tests、lint / typecheck / build、七个视口与键盘 / Escape / 焦点恢复通过；npm ci 无漏洞。全仓格式有 7 份上游既有文档失败，本 Task 文件独立格式检查通过。最终证据与例外清单见 `docs/tasks/RESULT-TASK-008.1-a-planner-mapbox-interactions.md`。提交附 `[skip ci]`，未将远端 CI 跳过表述为通过。

## 1. 产品、交互与画面设计

### 1A. 旅行主系统画面设计（A）

| WBS ID | 工作项                                    | 负责人 | 优先级 | 依赖              | 状态   |
| ------ | ----------------------------------------- | ------ | ------ | ----------------- | ------ |
| 1.1    | 产品定位与核心价值主张                    | A      | P0     | -                 | 进行中 |
| 1.2    | 用户旅程 / 核心使用流程                   | A      | P0     | 1.1               | 进行中 |
| 1.3    | 页面分类与 A/B 模块归属                   | A      | P0     | 1.2               | 进行中 |
| 1.4    | 网站首页设计冻结 v1                       | A      | P1     | 1.3               | 已完成 |
| 1.5    | Planner 主画面冻结 v1                     | A      | P0     | 1.3               | 已完成 |
| 1.6    | 底部时间轴设计冻结                        | A      | P0     | 1.5               | 已完成 |
| 1.7    | Planner 右侧临时设置 / 快速调整设计       | A      | P0     | 1.5               | 已完成 |
| 1.10   | 景点与活动标签 / 主系统展示规则           | A      | P1     | 1.5               | 未开始 |
| 1.11   | 推荐方案 1/2/3 展示结构                   | A      | P1     | 1.5               | 已完成 |
| 1.12   | 地图视觉 / Pin / 区域 / 路线规范          | A      | P0     | 1.5               | 未开始 |
| 1.13   | 主系统 Design Token / 色彩 / 字体 / 圆角  | A      | P1     | 1.4,1.5           | 未开始 |
| 1.14   | 主系统响应式布局规则                      | A      | P1     | 1.13              | 进行中 |
| 1.15   | MVP 功能范围冻结                          | A      | P0     | 1.1-1.14          | 未开始 |
| 1.16   | 网站入口详细画面设计                      | A      | P1     | 1.4,1.13          | 已完成 |
| 1.17   | 地图 + 时间轴 + 推荐右栏详细画面设计      | A      | P0     | 1.5,1.6,1.11,1.12 | 进行中 |
| 1.18   | 路线生成 / 重新规划 / 方案切换交互设计    | A      | P0     | 1.17              | 进行中 |
| 1.19   | AI 旅行助手主画面设计                     | A      | P1     | 1.5               | 未开始 |
| 1.20   | 主系统 Loading / Empty / Error / Skeleton | A      | P1     | 1.13              | 未开始 |

### 1B. 用户个人中心画面设计（B）

| WBS ID | 工作项                                | 负责人 | 优先级 | 依赖      | 状态   |
| ------ | ------------------------------------- | ------ | ------ | --------- | ------ |
| 1.21   | 个人中心 Information Architecture     | B      | P0     | 1.3       | 已完成 |
| 1.22   | 头像菜单 / Personal Center Shell 设计 | B      | P0     | 1.21      | 已完成 |
| 1.23   | 登录 / 注册 / 找回密码画面设计        | B      | P1     | 1.21      | 已完成 |
| 1.24   | Profile / 账户设置画面设计            | B      | P1     | 1.21      | 已完成 |
| 1.25   | 偏好管理中心画面设计                  | B      | P0     | 1.21      | 已完成 |
| 1.26   | 同行人管理画面设计                    | B      | P1     | 1.25      | 已完成 |
| 1.27   | 保存行程 / 历史 / 草稿 / 收藏管理设计 | B      | P0     | 1.21      | 已完成 |
| 1.28   | 账户安全 / 数据删除画面设计           | B      | P1     | 1.24      | 已完成 |
| 1.29   | 个人中心响应式 / 状态画面规范         | B      | P1     | 1.22-1.28 | 已完成 |
| 1.30   | 个人中心设计 Freeze v1                | A+B    | P0     | 1.22-1.29 | 进行中 |

## 2. 工程初始化与基础架构

> 跨模块基础设施默认由 A 负责；B 已开始的工作站初始化继续由 B 完成。

| WBS ID | 工作项                           | 负责人 | 优先级 | 依赖    | 状态   |
| ------ | -------------------------------- | ------ | ------ | ------- | ------ |
| 2.1    | A 工程初始化 Task                | A      | P0     | 0.3     | 已完成 |
| 2.2    | B 工程初始化 / 工作站验证        | B      | P0     | 0.2     | 已完成 |
| 2.3    | Node / npm / TypeScript 版本固定 | A      | P0     | 2.1     | 已完成 |
| 2.4    | ESLint / Prettier / EditorConfig | A      | P1     | 2.1     | 已完成 |
| 2.5    | 环境变量规范                     | A      | P0     | 2.1     | 已完成 |
| 2.6    | 目录架构 + A/B 模块边界冻结      | A      | P0     | 2.1,0.8 | 已完成 |
| 2.7    | Shared UI / Contract 基础        | A      | P1     | 2.6     | 已完成 |
| 2.8    | GitHub Actions CI                | A      | P1     | 2.3,2.4 | 已完成 |
| 2.9    | 单元测试框架                     | A      | P1     | 2.1     | 已完成 |
| 2.10   | E2E 测试框架                     | A      | P2     | 2.1     | 已完成 |
| 2.11   | Error / Logging 基础             | A      | P2     | 2.6     | 已完成 |
| 2.12   | Feature Flag 基础                | A      | P3     | 2.6     | 已完成 |

## 3. 网站入口与主系统 Shell（A）

| WBS ID | 工作项                              | 负责人 | 优先级 | 依赖     | 状态   |
| ------ | ----------------------------------- | ------ | ------ | -------- | ------ |
| 3.1    | 全局 Main Layout / Header           | A      | P1     | 1.13,2.7 | 未开始 |
| 3.2    | 首页动画背景区域                    | A      | P1     | 1.16     | 未开始 |
| 3.3    | 「让我们开始吧」主入口              | A      | P0     | 3.1      | 未开始 |
| 3.4    | 登录按钮 / 头像入口在主系统中的实现 | A      | P1     | 3.1,5.3  | 未开始 |
| 3.5    | AI 悬浮入口                         | A      | P1     | 3.1      | 未开始 |
| 3.6    | 目的地 / 日期 / 开始规划入口        | A      | P0     | 3.1      | 已完成 |
| 3.7    | 主系统 Loading / Empty / Error      | A      | P1     | 1.20,3.1 | 未开始 |
| 3.8    | 主系统响应式 / 无障碍               | A      | P2     | 3.1-3.7  | 已完成 |

## 4. Planner / 地图 / 路线生成（A 全责）

| WBS ID | 工作项                        | 负责人 | 优先级 | 依赖         | 状态   |
| ------ | ----------------------------- | ------ | ------ | ------------ | ------ |
| 4.1    | Planner 页面整体 Grid         | A      | P0     | 1.17,3.1     | 已完成 |
| 4.2    | 地图容器与基础控件            | A      | P0     | 4.1,7.1      | 已完成 |
| 4.3    | 景点 Pin 组件                 | A      | P1     | 4.2,1.12     | 已完成 |
| 4.4    | 住宿区域覆盖层                | A      | P1     | 4.2,1.12     | 已完成 |
| 4.5    | 餐饮区域覆盖层                | A      | P1     | 4.2,1.12     | 已完成 |
| 4.6    | 多日路线视觉显示              | A      | P0     | 4.2,7.8      | 进行中 |
| 4.7    | 交通方式视觉显示              | A      | P0     | 4.6          | 未开始 |
| 4.8    | 底部时间轴基础                | A      | P0     | 1.17,4.1     | 已完成 |
| 4.9    | 时间轴景点卡片                | A      | P1     | 4.8          | 已完成 |
| 4.10   | 时间轴交通段                  | A      | P1     | 4.8          | 未开始 |
| 4.11   | 时间轴餐饮段                  | A      | P1     | 4.8          | 已完成 |
| 4.12   | 时间轴住宿段                  | A      | P1     | 4.8          | 已完成 |
| 4.13   | 推荐方案列表                  | A      | P0     | 1.11,4.1     | 已完成 |
| 4.14   | 方案切换 / 重新规划交互       | A      | P0     | 4.13,4.6,4.8 | 进行中 |
| 4.15   | Planner 状态模型 / Store      | A      | P0     | 2.6,5.11     | 进行中 |
| 4.16   | Day Plan / Itinerary Core     | A      | P0     | 4.15,7.x     | 未开始 |
| 4.17   | Trip Plan / Planner Contract  | A      | P0     | 4.15,4.16    | 未开始 |
| 4.18   | Planner 读取用户偏好 Contract | A      | P0     | 4.15,5.14    | 未开始 |
| 4.19   | Planner 调用保存行程 Contract | A      | P1     | 4.17,5.19    | 未开始 |

## 5. 用户个人中心 / 管理 / 偏好（B 全责）

### 5A. Personal Center UI

| WBS ID | 工作项                                        | 负责人 | 优先级 | 依赖     | 状态   |
| ------ | --------------------------------------------- | ------ | ------ | -------- | ------ |
| 5.1    | Personal Center Shell / Navigation            | B      | P0     | 1.22,2.6 | 已完成 |
| 5.2    | 头像菜单与个人中心跳转目标                    | B      | P0     | 5.1      | 已完成 |
| 5.3    | 登录 / 注册 / Session 用户流程                | B      | P0     | 1.23,8.3 | 未开始 |
| 5.4    | Profile / 账户设置 UI                         | B      | P1     | 1.24,5.1 | 未开始 |
| 5.5    | 偏好管理中心 UI                               | B      | P0     | 1.25,5.1 | 未开始 |
| 5.6    | 同行人管理 UI                                 | B      | P1     | 1.26,5.5 | 未开始 |
| 5.7    | 移动偏好 UI                                   | B      | P1     | 5.5      | 未开始 |
| 5.8    | 景点 / 活动偏好 UI                            | B      | P0     | 5.5      | 未开始 |
| 5.9    | 餐饮 / 住宿 / 预算偏好 UI                     | B      | P1     | 5.5      | 未开始 |
| 5.10   | 保存行程 / 历史 / 草稿 / 收藏 UI              | B      | P0     | 1.27,5.1 | 未开始 |
| 5.20   | 个人中心 Loading / Empty / Error / Responsive | B      | P1     | 1.29,5.1 | 未开始 |

### 5B. Personal Center Data / API

| WBS ID | 工作项                               | 负责人 | 优先级 | 依赖      | 状态   |
| ------ | ------------------------------------ | ------ | ------ | --------- | ------ |
| 5.11   | Preference Schema                    | B      | P0     | 1.25,8.1  | 未开始 |
| 5.12   | Companion Schema                     | B      | P1     | 1.26,8.1  | 未开始 |
| 5.13   | Preference Preset / 默认值           | B      | P1     | 5.11      | 未开始 |
| 5.14   | Planner 可读取的 Preference Contract | B      | P0     | 5.11,5.16 | 未开始 |
| 5.15   | Profile / Account API                | B      | P1     | 8.2,8.3   | 未开始 |
| 5.16   | Preference 持久化 API                | B      | P0     | 5.11,8.1  | 未开始 |
| 5.17   | Companion 持久化 API                 | B      | P1     | 5.12,8.1  | 未开始 |
| 5.18   | 保存行程 / 历史 / 草稿数据模型       | B      | P0     | 4.17,8.1  | 未开始 |
| 5.19   | Trip Save / Read / History Contract  | B      | P0     | 5.18      | 未开始 |
| 5.21   | 用户数据删除 / 账户删除              | B      | P1     | 5.15-5.19 | 未开始 |

## 6. AI 旅行助手（A 全责，个人历史除外）

| WBS ID | 工作项                             | 负责人 | 优先级 | 依赖     | 状态   |
| ------ | ---------------------------------- | ------ | ------ | -------- | ------ |
| 6.1    | AI 能力边界定义                    | A      | P0     | 1.15     | 未开始 |
| 6.2    | 主系统 AI 对话消息模型             | A      | P0     | 3.5      | 未开始 |
| 6.3    | Prompt / System Instruction v1     | A      | P0     | 6.1,5.14 | 未开始 |
| 6.4    | AI API 接入层                      | A      | P0     | 2.5,6.3 | 未开始 |
| 6.5    | AI 读取用户偏好                    | A      | P0     | 5.14,6.4 | 未开始 |
| 6.6    | AI 修改 Planner / 临时条件 Action  | A      | P0     | 6.5,4.15 | 未开始 |
| 6.7    | AI 生成初始行程                    | A      | P0     | 6.4,7.x  | 未开始 |
| 6.8    | AI 局部修改行程                    | A      | P0     | 6.7,4.15 | 未开始 |
| 6.9    | 推荐原因展示                       | A      | P1     | 6.7,1.19 | 未开始 |
| 6.10   | AI Loading / Error / 降级          | A      | P1     | 6.4      | 未开始 |
| 6.11   | AI 成本 / Token 监控               | A      | P2     | 6.4      | 未开始 |
| 6.12   | AI 结果质量测试集                  | A      | P1     | 6.7      | 未开始 |
| 6.13   | AI 主对话 UI / 修改确认 / 成功反馈 | A      | P0     | 1.19,6.6 | 未开始 |
| 6.14   | 个人中心 AI 历史（可选）           | B      | P3     | 6.2,5.1  | 未开始 |

## 7. 地图、地点、路线与推荐（A 全责）

| WBS ID | 工作项                        | 负责人 | 优先级 | 依赖     | 状态   |
| ------ | ----------------------------- | ------ | ------ | -------- | ------ |
| 7.1    | 地图 Provider 选型            | A      | P0     | 1.12     | 已完成 |
| 7.2    | Places / POI Provider 选型    | A      | P0     | 1.10     | 未开始 |
| 7.3    | Route / Transit Provider 选型 | A      | P0     | 4.7      | 未开始 |
| 7.4    | POI 标准 Schema               | A      | P0     | 7.2      | 未开始 |
| 7.5    | Route Schema                  | A      | P0     | 7.3      | 未开始 |
| 7.6    | 地点搜索 API                  | A      | P0     | 7.2,7.4  | 未开始 |
| 7.7    | POI 详情 API                  | A      | P1     | 7.4      | 未开始 |
| 7.8    | 路线计算 API                  | A      | P0     | 7.3,7.5  | 未开始 |
| 7.9    | 推荐打分 v1                   | A      | P0     | 5.14,7.4 | 未开始 |
| 7.10   | 缓存策略                      | A      | P1     | 7.6-7.8  | 未开始 |
| 7.11   | Provider 失败降级             | A      | P1     | 7.6-7.8  | 未开始 |

## 8. 数据库与认证基础

| WBS ID | 工作项                        | 负责人 | 优先级 | 依赖               | 状态   |
| ------ | ----------------------------- | ------ | ------ | ------------------ | ------ |
| 8.1    | DB / ORM / Migration 总体方案 | A      | P0     | 2.6                | 未开始 |
| 8.2    | User / Profile Schema         | B      | P0     | 8.1                | 未开始 |
| 8.3    | Authentication 核心           | B      | P0     | 8.1                | 未开始 |
| 8.4    | DB Migration 全局规范         | A      | P1     | 8.1                | 未开始 |
| 8.5    | 主系统 Trip Plan Schema       | A      | P0     | 4.17,8.1           | 未开始 |
| 8.6    | B 个人中心数据 Migration      | B      | P1     | 5.11,5.12,5.18,8.4 | 未开始 |
| 8.7    | AI 会话主系统存储策略         | A      | P2     | 6.2,8.1            | 未开始 |
| 8.8    | 个人 AI 历史关联              | B      | P3     | 6.14,8.2,8.7       | 未开始 |

## 9. 质量、测试、安全与性能

| WBS ID | 工作项                                  | 负责人 | 优先级 | 依赖            | 状态   |
| ------ | --------------------------------------- | ------ | ------ | --------------- | ------ |
| 9.1    | 测试框架与全局基线                      | A      | P1     | 2.9,2.10        | 未开始 |
| 9.2    | Planner / Map / Route 单元与集成测试    | A      | P1     | 4.x,7.x         | 未开始 |
| 9.3    | AI 集成测试                             | A      | P1     | 6.x             | 未开始 |
| 9.4    | 主系统 E2E                              | A      | P1     | 3.x,4.x,6.x,7.x | 未开始 |
| 9.5    | 个人中心单元 / 集成测试                 | B      | P1     | 5.x,8.2,8.3     | 未开始 |
| 9.6    | 个人中心 E2E                            | B      | P1     | 5.x             | 未开始 |
| 9.7    | 跨模块 E2E：偏好→Planner                | A+B    | P0     | 4.18,5.14       | 未开始 |
| 9.8    | 跨模块 E2E：Planner→保存→个人中心       | A+B    | P0     | 4.19,5.19       | 未开始 |
| 9.9    | API Rate Limit / Security Headers / CSP | A      | P1     | 6.4,7.x         | 未开始 |
| 9.10   | Secret 扫描 / 全局安全                  | A      | P1     | 2.8             | 未开始 |
| 9.11   | 性能预算 / 错误监控                     | A      | P2     | 2.11            | 未开始 |
| 9.12   | B 模块响应式 / 可访问性 QA              | B      | P2     | 5.20            | 未开始 |

## 10. 发布与运营准备（A 主责）

| WBS ID | 工作项                    | 负责人 | 优先级 | 依赖     | 状态   |
| ------ | ------------------------- | ------ | ------ | -------- | ------ |
| 10.1   | Dev / Preview / Prod 环境 | A      | P0     | 2.5,8.1  | 未开始 |
| 10.2   | 自动部署                  | A      | P1     | 2.8,10.1 | 未开始 |
| 10.3   | Domain / HTTPS            | A      | P1     | 10.1     | 未开始 |
| 10.4   | Analytics                 | A      | P2     | 3.x      | 未开始 |
| 10.5   | SEO / Metadata            | A      | P2     | 3.x      | 未开始 |
| 10.6   | 隐私政策 / Terms          | A      | P1     | 5.21,8.x | 未开始 |
| 10.7   | Beta Feedback 流程        | A      | P2     | 10.1     | 未开始 |
| 10.8   | MVP Release Checklist     | A+B    | P0     | 9.x,10.x | 未开始 |

## 11. Mobile App（Web MVP 后）

> Mobile 延续相同分工，不再按“前端/后端”切，而按“主旅行系统/个人中心”切。

| WBS ID | 工作项                             | 负责人 | 优先级 | 依赖      | 状态   |
| ------ | ---------------------------------- | ------ | ------ | --------- | ------ |
| 11.1   | Mobile 技术方案选型 / Shared Core  | A      | P2     | M7        | 未开始 |
| 11.2   | Mobile 主旅行入口 / 地图 / Planner | A      | P1     | 11.1      | 未开始 |
| 11.3   | Mobile Route / AI 主系统           | A      | P1     | 11.1      | 未开始 |
| 11.4   | Mobile 个人中心 Shell              | B      | P2     | 11.1      | 未开始 |
| 11.5   | Mobile Profile / Account           | B      | P2     | 11.4      | 未开始 |
| 11.6   | Mobile Preferences / Companions    | B      | P2     | 11.4      | 未开始 |
| 11.7   | Mobile Saved Trips / History       | B      | P2     | 11.4      | 未开始 |
| 11.8   | Push / Native / Release 基础       | A      | P2     | 11.1     | 未开始 |
| 11.9   | App Store / Play 发布              | A      | P2     | 11.2-11.8 | 未开始 |

---

# 5. 新 Task 自动分配规则（v0.4）

生成任何新 Task 前按以下顺序判断：

1. 读取 GitHub 最新 WBS、Task、Issue、PR、`develop`。
2. 判断该工作属于“旅行主系统”还是“用户个人中心”。
3. **网站入口 / Planner / 地图 / 路线 / 行程生成 / 推荐 / 主 AI → A。**
4. **头像进入后的账户 / Profile / 管理 / 偏好 / 同行人 / 保存历史 → B。**
5. 对应模块的前端、API、Schema、状态、测试原则上由同一 Owner 负责。
6. 全局工程架构、CI/CD、安全、部署、共享基础设施默认 A。
7. 跨 A/B 模块的功能必须通过明确 Contract 连接。
8. 不允许因为“这是客户可见页面”就自动分给 B；必须看它属于主旅行系统还是个人中心。
9. 已创建但尚未真正执行的 Task，按 v0.4 重新分配；正在执行的 Task如与新边界严重冲突，应在下一 Task 切换到正确 Owner，并避免中途造成代码冲突。

### Task 命名建议

```text
TASK-xxx-a-main-<name>.md
TASK-xxx-b-account-<name>.md

feature/a-main-<name>
feature/b-account-<name>
```

---

# 6. Codex 返回结果时自动更新 WBS（强制）

```text
读取 Task
↓
检查 GitHub 最新 A/B Task / Issue / PR / develop
↓
读取 docs/project/WBS-TravelAssist.md
↓
确认 WBS ID 与 Owner 是否符合 v0.4
↓
执行开发 / 测试
↓
更新 WBS
↓
更新 Result
↓
git add / commit / push
↓
最后返回 Codex Result
```

### 状态映射

- 正式启动：`进行中`
- Blocked：`阻塞`
- 实现完成但 PR 未合并：`待审查`
- PR 合并 `develop` 且验收通过：`已完成`

### Mandatory WBS Update

```md
## Mandatory WBS Update

Before returning the final Task Result:

1. Read the latest `docs/project/WBS-TravelAssist.md`.
2. Confirm the Task owner using v0.4 responsibility rules:
   - A = main travel system (entry, planner, map, routing, itinerary, AI).
   - B = personal center (account, profile, management, preferences, companions, saved/history).
3. Update status, Issue, branch, commit, PR and blockers.
4. If implementation is complete but PR is not merged, set `待审查`.
5. Only set `已完成` after merge to `develop` and acceptance passes.
6. Commit and push the WBS update before returning the final result.

Do not return a complete Task Result without WBS synchronization.
```

---

# 7. v0.4 重新分配后的优先队列

| 顺序 | WBS ID  | 工作项                            | 负责人 |
| ---: | ------- | --------------------------------- | ------ |
|    1 | 2.1     | A 工程初始化 PR / 验收            | A      |
|    2 | 2.2     | B 工作站初始化 / 验证完成         | B      |
|    3 | 2.6     | 目录架构 + A/B 模块边界冻结       | A      |
|    4 | 1.15    | MVP Scope v1                      | A      |
|    5 | 1.16    | 网站入口详细设计                  | A      |
|    6 | 1.17    | Planner / 地图 / 时间轴详细设计   | A      |
|    7 | 1.18    | 路线生成 / 方案切换交互设计       | A      |
|    8 | 1.21    | 个人中心 IA                       | B      |
|    9 | 1.22    | 头像 / Personal Center Shell 设计 | B      |
|   10 | 1.25    | 偏好管理中心设计                  | B      |
|   11 | 1.27    | 保存行程 / 历史管理设计           | B      |
|   12 | 3.1     | Main Shell                        | A      |
|   13 | 4.15    | Planner State / Core              | A      |
|   14 | 7.1-7.3 | Map / POI / Route Provider 选型   | A      |
|   15 | 5.1     | Personal Center Shell 实现        | B      |
|   16 | 5.11    | Preference Schema                 | B      |
|   17 | 5.14    | Preference Contract               | B      |
|   18 | 4.18    | Planner 接入 Preference Contract  | A      |

### 并行开发模式

```text
A 主线：Website Entry → Planner → Map → Route → Itinerary → AI
B 主线：Avatar → Personal Center → Account → Preferences → Saved Trips
```

这样 A/B 可以长期并行，交叉点主要只有：

```text
B Preference Contract → A Planner
A Trip Plan Contract → B Saved Trips
B Auth/User Session → A Header/Avatar Entry
```

---

# 8. 单个 WBS / Task 记录模板

```md
## WBS Record

- WBS ID:
- Task ID:
- Title:
- Owner: A / B
- Responsibility: Main Travel System / Personal Center / Shared Infra
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
- WBS Updated: Yes / No
- Next Task:
```

---

# 9. 项目统一 Codex 工作原则

1. 开始 Task 前检查最新 GitHub 状态。
2. 一个正式 Task 必须对应 WBS ID。
3. 原则上一个 Task 对应一个 Issue 和一个 feature 分支。
4. 不直接在 `develop` 上开发功能。
5. Task / Result / WBS 全部备份 GitHub。
6. Codex 最终返回前强制更新 WBS。
7. `待审查` 与 `已完成` 必须严格区分。
8. **A 默认处理主旅行系统：入口、Planner、地图、路线、行程生成、推荐、AI。**
9. **B 默认处理个人中心：账户、Profile、管理、偏好、同行人、保存/历史。**
10. 开发工程同样按照上述模块划分，不再简单按“前端 B / 后端 A”分配。
11. Shared Infra / CI / Deployment 默认 A。
12. 跨模块只通过明确 Contract 交接，减少 A/B 同文件冲突。

## TASK-008 验收与范围记录（2026-09-05）

- Owner：A；Issue #51；实现提交 `e4648c031817816fb1cbd0dc44552a542d108c91`。
- 初始基线 `96a8829`；开发期间安全快进同步至 `6e5132b323c5f215a6c1d430eb702c076d8915ac`。TASK-006 PR #32 合并提交 `5bf85a8` 为基线祖先；TASK-007 不是依赖。
- 正式规格：`docs/ui/trip-planner.md v0.2`。1.5 / 1.6 / 1.7 / 1.11 的页面结构设计已随 v0.2 合入；1.14 只验证本 Planner 的响应式，1.17 的真实地图细节、1.18 的真实重规划反馈仍待后续任务，保持进行中。
- 4.1 / 4.8 / 4.13：独立 `/planner` Grid、六 Tab 执行栏、三条推荐方案的 UI shell 已完成，并经用户明确授权通过 PR #59 合入 develop。
- 4.2 / 4.6 / 4.14：仅本地 SVG 地图、多日路线、方案切换与 Mock 刷新交互完成；真实 Map / Route Provider 和真实重规划未接入，保持进行中，不标记完整业务已完成。
- 7 个指定视口均通过；1600×900 右栏 400px、1440×900 右栏 360px（均 25%）；右栏上下各 418px，底栏 225px。右栏在宽度 <1200px 折叠；底栏在高度 <700px 或宽度 <768px 折叠。
- npm ci / lint / typecheck / build / diff check 通过；9 项 Node 单元测试通过；生产预览无 console / hydration 错误。本 Task 修改文件格式通过；全仓仅最新 develop 的 `docs/ui/companion-management.md` 格式失败，不越界修改。
- 详细证据：`docs/tasks/RESULT-TASK-008-a-trip-planner-shell.md`。不修改 `/start`、B 账户文件或工程配置；不接真实 Provider / AI / Auth / DB；完成后停止。
- 发布历史：最初提交附 `[skip ci]` 并保留 Draft 防止误合并；用户后续明确授权后，先同步最新 develop 并完成整合验证，再解除 Draft 合并。未修改工作流、未 force push。
- 最终合并：PR #59，`1a4201b3181460977c4f16b0c34f60c353751687`；集成验收 head `8920695`。lint / typecheck / build / 30 项 tests / 本任务格式 / diff check 通过；Planner、向导、个人中心浏览器复验通过。当前全仓格式的三份基线文档例外详见 Result。未启动 TASK-008.1。
