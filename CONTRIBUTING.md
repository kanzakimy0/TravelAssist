# TravelAssist 开发协作规范

## 1. 基本原则

- `main`：只保存稳定、可发布版本。
- `develop`：日常集成分支。
- 禁止直接在 `main` 上开发功能。
- 每一个功能、Bug、设计落地任务都尽量对应一个 GitHub Issue。
- 每个 Issue 原则上对应一个独立分支和一个 Pull Request。

## 2. 两人分工

### A：核心负责人，约 70%

主要负责：

- 总体技术架构
- 核心数据结构
- AI 行程生成流程
- 地图与行程主页面
- 关键接口与状态管理
- 代码集成
- Release / 部署
- 对 B 的交付结果进行合并检查

### B：协作开发，约 30%

优先负责：

- 独立 UI 页面和组件
- 设置项、表单、弹窗
- 非核心业务页面
- 测试
- 数据整理
- 文档补充
- A 来不及完成时接手已经拆分清楚的 Issue

## 3. 分支命名

```text
feature/a-home-page
feature/a-trip-planner
feature/b-login-page
feature/b-preference-panel
fix/map-marker-overlap
fix/mobile-layout
```

推荐格式：

```text
feature/<负责人>-<功能名>
fix/<问题名>
docs/<文档名>
```

## 4. 标准开发流程

1. 在 GitHub 建立 Issue。
2. Issue 中写清楚目标、范围、验收条件。
3. 从 `develop` 创建功能分支。
4. 使用 ChatGPT / Codex 阅读 Issue 和相关 `docs/` 文档。
5. 开发并本地测试。
6. Push 到 GitHub。
7. 建立 Pull Request，目标分支设为 `develop`。
8. 检查功能、测试、冲突和设计一致性。
9. 合并 PR。
10. 达到发布节点后再将 `develop` 合并到 `main`。

## 5. A 无法按时完成时如何交给 B

不要直接把整个功能口头交接。应先把工作拆成可接手单元。

推荐步骤：

1. A 更新当前 Issue 的完成状态。
2. 写明：已经完成什么、还缺什么、相关文件、已知问题。
3. 如果当前分支已有可用代码，先 Push。
4. 将未完成部分拆成新的子 Issue，或明确剩余 Checklist。
5. B 从当前功能分支继续，或从 `develop` 新建自己的接手分支。
6. B 完成后提交 PR。

这样即使临时换人，也不会依赖口头说明。

## 6. Issue 推荐格式

```md
## 目标
一句话说明完成后用户能做什么。

## 范围
- 功能 1
- 功能 2

## 不包含
- 暂时不做的内容

## 参考设计
- docs/xxx.md

## 验收条件
- [ ] 条件 1
- [ ] 条件 2
- [ ] PC 布局正常
- [ ] 移动端无明显布局错误

## 负责人
A / B

## Codex 提示
请先阅读本 Issue 和引用的 docs 文件，再开始修改代码。
```

## 7. Pull Request 推荐格式

```md
## 完成内容

## 对应 Issue
Closes #XX

## 主要修改

## 测试方法

## 截图

## 已知问题
```

## 8. AI 辅助开发规则

使用 Codex / ChatGPT 时：

- 先让 AI 阅读 Issue。
- 再让 AI 阅读相关 `docs/`。
- 不要只给一句“帮我做页面”。
- 明确要求不得擅自修改已冻结的产品规则。
- 大功能先让 AI 输出实施计划，再开始改代码。
- 每次修改尽量限定在一个 Issue 的范围内。
- AI 生成后仍需运行测试或人工检查。

## 9. 文档优先

任何已经确定的重要产品规则，应尽量写进 `docs/`，避免只存在聊天记录中。

后续若聊天中的设计发生变化，应同步更新对应 Markdown 设计文档。
