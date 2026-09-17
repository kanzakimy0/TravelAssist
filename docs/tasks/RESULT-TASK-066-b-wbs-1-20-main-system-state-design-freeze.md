# RESULT — TASK-066-B / WBS 1.20 Main System State Design Freeze

## Metadata

- Task: TASK-066-B
- Owner: B（用户授权单项代做）
- Issue: [#389](https://github.com/kanzakimy0/TravelAssist/issues/389) — Open
- Status: 待审查；设计与静态 QA 完成；Draft PR #390
- Execution base: `f5e3ca6fe2989c846be062b5921d0b9527753917`
- Branch: `codex/b-wbs-1-20-main-system-state-design`
- Pull Request: [Draft PR #390](https://github.com/kanzakimy0/TravelAssist/pull/390)
- Final-head proof: exact branch SHA and any executed CI outcome are bound to the PR delivery JSON after the last commit; no self-referential SHA is invented.

## 1. 设计交付

完成[主系统状态设计冻结候选](../ui/main-system-loading-empty-error-skeleton.md)。范围是 Loading、Skeleton、Empty、Error、Retry / Recovery、Partial Degradation；同时区分 first-use / no-result、permission/invalid、generic connection loss 和 retry pending。

覆盖十个区域：Home、Start、Planner shell、Planner Map、Recommendation / Right Rail、Timeline / Summary、Trip Detail、Route Preview、AI Visual Shell、Modal / Drawer / Popover。

| 交付项             | 数量与内容                                                                                                                                                          |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Surface/state 规格 | 62 条；每条有 trigger、范围、保留内容、可交互区、title/body、主次动作、retry scope、图标、几何、motion/reduced motion、focus、keyboard、ARIA、responsive 与禁止行为 |
| 文案意图           | 34 项中文模板与语义 key；仅 localization-ready 设计，不创建 i18n 系统                                                                                               |
| 验收矩阵           | 48 项，超过 Task 要求的28项；每项有 stimulus / expected / 对应规则                                                                                                  |
| 视口               | 1440+/1600、1024、390、320；包含矮屏、safe-area、软键盘和长翻译规则                                                                                                 |
| 冲突记录           | CF-01～CF-10；记录权威来源和保留/交接处理                                                                                                                           |
| 机器证据           | [design-matrix.json](../qa/TASK-066/design-matrix.json)、[audit-evidence.json](../qa/TASK-066/audit-evidence.json)                                                  |

## 2. 关键冻结决定

- 局部依赖失败只在所属区域降级；保留有效 Trip、输入、日期、当前选择和安全导航。
- 权限保护优先于内容保留：明确失去权限后遮除对应私有内容，不泄露其他用户目标。
- Empty 只用于成功确认的零数据；Skeleton 不表示进度，不造百分比/阶段/ETA。
- 重试最小失败操作；无已授权恢复能力就不生成按钮。已确认零结果用修改条件，而非无意义重试。
- Unknown write outcome 先核对原操作，不能换 key 绕过、自动重交或把关闭动画当回滚。
- 只使用当前 accepted token/alias；warning/info 采用现有中性表面+文字/图标，不另建 palette。
- 按1.13 v1.2处理白字珊瑚对比限制；当前 Planner scoped overrides 和旧40px按钮记为后续组件实测/实现差异。
- 44×44 target、局部 aria-busy、一次 polite/必要 alert、装饰 Skeleton 隐藏、retry/关闭焦点恢复、reduce 静态等规则已定义。
- 沿用当前 Planner Grid、Drawer/Sheet 和 Detail 共享壳；不采纳旧布局图来重排页面。

## 3. 当前能力与条件性设计

审计确认：Home 是公共入口且账号读取失败可回退；静态背景是正常生产基线。Start 当前是本地计时示例方案。Detail 当前仍共享 Planner view，并有浏览器保存/恢复保护。Route 查询只在既有开发 gate 下开放；AI 当前发送 disabled。

因此规范明确标记条件性状态：远端 Trip 缺失/权限、真实生成、AI loading/error、未来未知写入等只能在对应拥有方能力已授权存在后使用。当前“不支持/尚未接入”不能假装成暂时故障或永久 loading。本次没有接入这些能力。

## 4. 审计与 QA

执行了用户要求的起始 Git 检查，读取完整远端 Task、Codex、Owner 修订；从最新 develop 建立独立干净 worktree，保留原工作区未跟踪 outputs/。

审计包括1.13 final closeout、tokens v1.1、accessibility v1.2、当前 Home/Start/Planner/Detail/Route/AI/浮层源码与相关 CSS、响应式和导航规范。已知冲突由当前 accepted 基线与权威修订解决，没有重写历史设计记录。

静态检查和执行输出见 [QA README](../qa/TASK-066/README.md)与机器 evidence：Task-owned formatting、Markdown/link/reference sanity、矩阵完整性、token存在性、来源指纹、仅文档变更、非1.20 WBS不变、git diff检查、交付前最新develop复核。已执行的静态检查全部通过：62条规则、48项验收、34项文案引用一致；50个本地链接有效；20个token存在；41个审计来源与基线一致；仅9个文档/证据文件变化。CI最终状态另见精确head回执，不把未跑项目列为PASS。

**未执行 browser / screenshot / screen reader / 真实合成对比 QA；48项矩阵是设计验收规范，不是48项网页测试 PASS。** 未启动 Local Supabase、未调用 live/paid Provider、未操作 Production/Staging DB 或部署。CI若运行其现有构建/测试，是CI证据，不代表页面状态/DB验收。

## 5. WBS 与边界

实际开始已记录：1.20 = B / 进行中（#389 / TASK-066-B；用户授权单项代做）。

最终交付状态：1.20 = B / 待审查（#389 / TASK-066-B；Draft PR #390）。

3.7 保持 A / 未开始。其他 Owner/status 保持；未启动或修改 Planner Store4.15、Day Plan4.16、4.18/4.19、7.3/7.8、AI runtime、Engine runtime、Booking/Payment、API/schema/migration、数据库、deployment或主系统业务逻辑。

没有创建 React 状态组件，没有修改 Home/Start/Planner/Detail runtime，没有重设计 Planner Grid，也没有建立第二套 Design Token/Palette。

## 6. 交付与验收

- [Task](TASK-066-b-wbs-1-20-main-system-state-design-freeze.md)
- [Codex instructions](CODEX-TASK-066-b-wbs-1-20-main-system-state-design-freeze.md)
- [Owner correction](../project/WBS-1.20-owner-correction.md)
- [Design freeze candidate](../ui/main-system-loading-empty-error-skeleton.md)
- [QA README](../qa/TASK-066/README.md)
- [Machine-readable matrix](../qa/TASK-066/design-matrix.json)

唯一 Draft PR → develop，等待用户审查。未 auto-merge，Issue #389保持Open，未标1.20已完成，未启动3.7。用户验收并合并后才能将候选正式冻结；后续runtime仍需另行授权。
