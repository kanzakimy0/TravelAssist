# Codex Launcher — TASK-033-B / WBS 3.5

请完整执行 TravelAssist 的 `TASK-033-B`。

## Repository

`https://github.com/kanzakimy0/TravelAssist`

## Issue

`#263`

## Formal Task

`docs/tasks/TASK-033-b-ai-floating-entry-closeout.md`

## Owner Correction

`docs/project/WBS-3.5-owner-correction.md`

## 开始前

```bash
git status --short
git branch --show-current
git fetch --all --prune
git rev-parse origin/develop
git log --oneline -20 origin/develop

git show origin/develop:docs/tasks/TASK-033-b-ai-floating-entry-closeout.md
git show origin/develop:docs/project/WBS-3.5-owner-correction.md
git show origin/develop:docs/project/WBS-TravelAssist.md
```

## Integration Gate

确认最新 develop 中：

```text
3.1 = 已完成
3.3 = B / 已完成
3.4 = B / 已完成
```

Gate 通过后：

```bash
git switch develop
git pull --ff-only origin develop
git switch -c feature/b-wbs-3-5-ai-floating-entry
```

然后安全更新最新 Master WBS：

```text
3.5 Owner = B
3.5 Status = 进行中
```

## 核心原则

- 当前 Home 已有 AI 悬浮入口和前端面板，先审计，正确就保留。
- 允许运行时代码零改动；不要为了制造 diff 重写组件。
- 只完成 AI Floating Entry + Frontend Shell + Responsive + Accessibility。
- 不接 OpenAI / ChatGPT / LLM API。
- 不新增 API Key / Secret / `/api/ai`。
- 不做真实 AI 回复、streaming、Prompt、Agent、Tool calling。
- 不做 AI 修改 Planner、生成行程、读取偏好、保存聊天历史。
- Home 必须正式验收 AI 入口；Start / Planner / Detail 主要做遮挡和几何回归，不强行复制 Home AI 组件，除非最新设计明确要求。
- 保持 3.2 首页视觉、3.4 账户入口和 Planner / Detail 几何不变。

## 必测行为

```text
AI入口
→ click / Enter / Space
→ panel 打开
→ aria-expanded=true
→ textarea/close 可聚焦
→ × / Escape / backdrop 关闭
→ aria-expanded=false
→ focus 返回 AI入口
```

并确认：

- 单一 panel，不重复挂载；
- URL / history 不变化；
- 不清空 Start 草稿 / Planner 状态；
- 无非必要 mutation request；
- Send 保持 disabled，并明确“AI服务尚未接入”；
- reduced-motion 正常；
- 44×44 touch target；
- safe-area / mobile 无溢出。

## 视口

至少：

```text
1440×900
1024×768
390×844
320×568
```

## 验证

```bash
npm ci
npm run lint
npm run typecheck
npm run build
npm test --if-present
git diff --check
```

如无 `npm test` script：

```bash
node --import ./tests/register-route-ts.mjs --test tests/*.test.mjs
```

另运行 TASK-033-B 专项测试。

## Result

生成：

`docs/tasks/RESULT-TASK-033-b-ai-floating-entry-closeout.md`

同步：

- Task
- Result
- Master WBS
- Issue #263
- Branch
- Commit
- Draft PR → develop

状态：

- 开始 → `3.5 = B / 进行中`
- 实现完成未合并 → `3.5 = B / 待审查`
- 用户验收 + merge develop → `3.5 = B / 已完成`

完成后停止，不自动执行 3.7 或 6.x。

## Safety

禁止：

```bash
git clean -fd
git reset --hard
git push --force
git push --force-with-lease
```

WBS 冲突逐段解决，禁止整份 ours / theirs。
