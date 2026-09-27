# CODEX COMMAND — TASK-082-B / WBS 6.14 Personal Center AI History

请在 TravelAssist 仓库中完整执行 **TASK-082-B — WBS 6.14 Personal Center AI History Surface / Read-only Projection**。

Repository:

```text
https://github.com/kanzakimy0/TravelAssist
```

Issue:

```text
#434
```

Task publication branch:

```text
task/b-wbs-6-14-personal-ai-history
```

Implementation branch:

```text
codex/b-wbs-6-14-personal-ai-history
```

---

## 1. Preflight

先执行：

```bash
git status --short --untracked-files=all
git branch --show-current
git fetch --all --prune
git rev-parse origin/develop
git log --oneline -15 origin/develop
```

禁止：

```text
git clean -fd
git reset --hard
git rebase
git push --force
git push --force-with-lease
直接 push develop/main
auto-merge
```

保留用户未追踪文件。

---

## 2. Read the authoritative Task

从远端 Task publication branch 读取完整 Task：

```bash
git show origin/task/b-wbs-6-14-personal-ai-history:docs/tasks/TASK-082-b-wbs-6-14-personal-ai-history.md
```

同时读取：

```bash
git show origin/develop:docs/project/WBS-TravelAssist.md
git show origin/develop:docs/project/AI-WBS-6.4-6.13-runtime-completion-plan.md
git show origin/develop:docs/tasks/TASK-076-a-ai-runtime-foundation.md
git show origin/develop:docs/tasks/TASK-077-a-ai-conversation-orchestrator.md
git show origin/develop:docs/tasks/TASK-WBS-5.1-b-personal-center-shell-navigation.md
git show origin/develop:docs/tasks/TASK-WBS-5.20-b-personal-center-responsive-states.md
```

然后定位当前最新的：

- WBS 6.2 Conversation / Turn / Message / Block / Tool / Citation model；
- Personal Center Shell；
- Personal Center state components；
- 当前 AI message renderer / types；
- TASK-077-A 是否已经进入 `develop`。

**不要依赖 TASK-077-A 未合并 feature branch。**

---

## 3. Dependency Gate

必须确认：

```text
6.2 = 已完成
5.1 = 已完成
```

若满足，继续。

实际开始时，只将 Master WBS：

```text
6.14 未开始
→
6.14 进行中（#434 / TASK-082-B）
```

不要修改 8.7 / 8.8 / 6.13 等其他 WBS 状态。

---

## 4. Branch

从执行时最新 `origin/develop` 建立独立 implementation branch。

推荐使用独立 worktree。

目标分支必须是：

```text
codex/b-wbs-6-14-personal-ai-history
```

不要从 task publication branch 直接实现。

---

## 5. Core Scope

实现：

```text
Personal Center
  ↓ secondary entry
AI History List
  ↓
Conversation Detail
  ↓
read-only display projection
  ↓
future WBS 8.8 reader adapter seam
```

建议路由：

```text
/personal-center/ai-history
```

如果最新仓库已有更强约定，可按约定调整并在 Result 说明。

### 必须完成

- Personal Center 二级入口；
- 不新增第六个主导航；
- History list；
- History detail；
- Loading / Empty / Unavailable / Error；
- B-owned read-only projection DTO；
- 只读 reader interface；
- deterministic fixture/in-memory test adapter；
- responsive；
- accessibility；
- safe message rendering；
- tests；
- browser QA；
- Result；
- Draft PR。

---

## 6. Hard Boundary

**绝对不要提前做 WBS 8.7 / 8.8。**

禁止新增：

```text
AI history DB table
SQL migration
Drizzle AI-history schema
Supabase AI-history schema
AI-history persistence API
localStorage production history
IndexedDB production history
Cookie history
Service Worker/PWA history storage
cross-device sync
history delete API
retention backend
second Conversation model
second AI runtime
OpenAI/provider changes
Planner mutation
Engine mutation
booking/payment
```

TASK-082-B 是：

```text
Personal Center product surface
+
read-only projection
+
future adapter seam
```

不是 durable storage Task。

---

## 7. AI Security Boundary

不要显示或存入历史 UI：

```text
system prompt
developer prompt
hidden instructions
hidden reasoning / chain-of-thought
provider raw request/response
provider secret/config
raw tool arguments
raw tool outputs
auth tokens
stack traces
internal telemetry
```

AI 文本按不可信输入处理。

不得直接渲染任意 HTML。

复用当前已接受的 safe markdown/link/citation boundary；没有的话默认纯文本安全渲染。

加入 XSS-style fixture/test。

---

## 8. Personal Center Navigation Rule

现有 Primary Nav 必须继续严格五项。

不要给：

```text
Desktop Sidebar
Compact Rail
Tablet primary Drawer
Mobile Bottom Nav
```

增加 AI 第六项。

AI History 只能是 secondary feature entry。

---

## 9. Production Data Behavior

如果 WBS 8.8 尚未接入：

生产环境必须诚实返回：

```text
unavailable
```

或明确的未连接状态。

不能把测试 fixture 当真实历史。

Fixture 只能用于：

```text
tests
browser QA harness
development-only guarded preview
```

必须证明 production 不可访问 fixture。

---

## 10. TASK-077 Integration Rule

若执行期间 TASK-077-A 已经合入 `develop`：

- merge 最新 origin/develop；
- 优先复用 accepted AI runtime types/renderers；
- 删除重复临时代码；
- 重跑所有 QA。

若 TASK-077-A 仍未合并：

- 不 stack；
- 不 cherry-pick；
- 保持 read adapter seam；
- 不实现 A runtime。

---

## 11. Tests / QA

至少执行当前仓库等价命令：

```bash
npm ci
npm run lint
npm run typecheck
npm run format:check
npm run test --if-present
node --test tests/*.test.mjs
npm run build
git diff --check
```

并执行：

- TASK-082 focused tests；
- Personal Center regression；
- AI contract/message regression；
- 当前 deploy validation/build/artifact；
- browser QA。

视口：

```text
1920×1080
1440×900
1280×720
1279×800
1024×768
1023×768
768×1024
767×900
390×844
320×740
```

重点验证：

- 五项主导航不变；
- secondary AI History entry；
- list/detail；
- unavailable/empty/error/loading；
- long message wrap；
- safe citations；
- unsafe block omitted；
- no raw tool/provider；
- keyboard/focus；
- reduced motion；
- no horizontal overflow；
- no persistent storage writes；
- no new mutation request。

---

## 12. Result

创建：

```text
docs/tasks/RESULT-TASK-082-b-wbs-6-14-personal-ai-history.md
```

必须完整回答 Task 正文要求的 Result 字段。

实现完成 + QA 后：

```text
WBS 6.14 = 待审查（#434 / TASK-082-B；Draft PR #<number>）
```

不要标记已完成。

---

## 13. Git Delivery

只提交当前 Task-owned 文件。

Commit 后普通 push：

```bash
git push -u origin codex/b-wbs-6-14-personal-ai-history
```

创建一个 Draft PR：

```text
codex/b-wbs-6-14-personal-ai-history
→
develop
```

PR 标题建议：

```text
TASK-082-B: Personal Center AI history surface (WBS 6.14)
```

引用：

```text
Refs #434
```

不要 auto-merge。

最终必须取得 exact final-head GitHub Quality Gate PASS。

---

## 14. Stop

发布 Result + Draft PR + exact-head gate 后立即停止。

不要自动开始：

```text
8.7
8.8
其他 B Task
AI persistence
AI delete/export/share
Mobile AI history
```

最后返回：

- execution-time develop SHA；
- implementation branch；
- implementation commit；
- final head；
- Draft PR；
- focused/full test counts；
- browser QA；
- WBS final candidate state；
- 8.7/8.8 未触碰证明；
- DB/API/localStorage/IndexedDB/Cookie 全部未新增证明；
- exact-head Quality Gate 链接。
