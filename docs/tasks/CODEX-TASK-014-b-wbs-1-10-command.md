# CODEX — TASK-014-B / WBS 1.10 执行指令

请在 `TravelAssist` 仓库中完整执行 `TASK-014-B`，完成 WBS `1.10 景点与活动标签 / 主系统展示规则`。

Repository:
`https://github.com/kanzakimy0/TravelAssist`

Issue:
`#158`

Branch:
`feature/b-wbs-1-10-attraction-activity-display-rules`

Task:
`docs/tasks/TASK-014-b-wbs-1-10-attraction-activity-display-rules.md`

开始前执行：

```bash
git status --short --untracked-files=all
git branch --show-current
git fetch --all --prune
git rev-parse origin/develop
git log --oneline -15 origin/develop
```

禁止执行：

```text
git clean -fd
git reset --hard
git push --force
git push --force-with-lease
```

获取远端正式 Task：

```bash
git show origin/feature/b-wbs-1-10-attraction-activity-display-rules:docs/tasks/TASK-014-b-wbs-1-10-attraction-activity-display-rules.md
```

然后切换任务分支：

```bash
git switch --track origin/feature/b-wbs-1-10-attraction-activity-display-rules
```

如果本地分支已经存在：

```bash
git switch feature/b-wbs-1-10-attraction-activity-display-rules
git pull --ff-only origin feature/b-wbs-1-10-attraction-activity-display-rules
```

执行时必须优先完整读取：

```text
docs/project/WBS-TravelAssist.md
docs/ui/trip-planner.md
docs/ui/planner-right-panel-secondary-tabs.md
docs/ui/planner-map-interaction-booking-mapbox.md
docs/ui/trip-detail.md
docs/ui/preference-center.md
docs/preferences/preference-system.md
docs/tasks/TASK-WBS-5.8-b-attraction-activity-preference-ui.md
docs/tasks/RESULT-WBS-5.8-b-attraction-activity-preference-ui.md
```

本 Task 的第一项实际修改必须是 WBS 启动同步：

- `1.10` Owner：`A` → `B`
- `1.10` Status：`未开始` → `进行中`
- Priority / Dependency 保持 `P1 / 1.5`
- 添加 `TASK-014-B / Issue #158 / Branch` 追踪行
- 记录“用户明确指定 WBS 1.10 由 B 执行”的单项例外；不得整体修改 v0.4 A/B 责任边界

核心交付：

```text
docs/ui/attraction-activity-tag-display-rules.md
docs/tasks/RESULT-TASK-014-b-wbs-1-10-attraction-activity-display-rules.md
docs/project/WBS-TravelAssist.md
```

这是设计 / 规格冻结任务，不是 Provider/API 实装任务。禁止擅自开始或实现：

```text
WBS 7.2 / 7.4 / 7.6 / 7.7 / 7.9
WBS 5.14
真实 Places/POI Provider
推荐打分
路线/交通算法
AI 行程生成
Booking
Auth / DB / persistence
Planner 整体视觉重做
```

规格必须至少冻结：

- primary category / secondary category / experience tags / operational tags / provider categories / preference dimensions 的边界；
- 全球可扩展的景点/活动顶层分类；
- 常见 secondary category；
- 地图 Pin、POI Popup/Detail、底部时间轴、推荐方案、Trip Detail 等 surface-by-surface 展示规则；
- 标签显示优先级、去重、冲突、溢出、fallback、localization、accessibility；
- WBS 5.8 Preference 与 POI taxonomy 的映射边界；
- WBS 7.2 / 7.4 的 handoff 约束；
- 至少 12 个跨地区/跨类型规范化例子。

完成规格后：

1. 做文档一致性 / 术语 / 动态事实边界检查；
2. 更新 Result；
3. 再次更新 WBS；
4. commit + push；
5. 创建 Draft PR → `develop`，正文使用 `Relates to #158`；
6. 不自动 merge；
7. 不自动开始下一 Task。

状态规则：

```text
正式执行 = 进行中
规格完成但未合并 = 待审查
真实阻塞 = 阻塞
只有合入 develop + 用户验收通过 = 已完成
```

最终返回完整 `TASK-014-B Result`，列出 Base、Commit、PR、验证、WBS 同步结果和未决问题。
