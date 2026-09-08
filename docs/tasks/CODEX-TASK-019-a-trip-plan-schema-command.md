# CODEX — TASK-019-A 执行命令

请在 TravelAssist 仓库中完整执行 `TASK-019-A — WBS 8.5 主系统 Trip Plan Schema`。

Repository:
`https://github.com/kanzakimy0/TravelAssist`

Task spec branch:
`task/a-trip-plan-schema`

Implementation branch:
`codex/a-trip-plan-schema`

开始前必须读取远端最新 Task：

```bash
git fetch --all --prune
git show origin/task/a-trip-plan-schema:docs/tasks/TASK-019-a-trip-plan-schema.md
```

然后从最新 `origin/develop` 创建独立干净 Worktree / 分支执行，不得从 Task spec branch、TASK-017-B、Planner 历史分支或旧 DB feature branch 直接开发。

执行前必须运行并记录：

```bash
git status --short
git branch --show-current
git fetch --all --prune
git rev-parse origin/develop
git log --oneline -15 origin/develop
```

必须确认：

- PR #216 / WBS 4.17 已在 `origin/develop`。
- PR #186 / WBS 8.1 已在 `origin/develop`。
- 检查 TASK-017-B / Issue #207 / Draft PR #221 的最新状态，但不得从 #221 分支叠加或 cherry-pick。
- 若 #221 在本 Task 执行期间合入 develop，最终交付前安全整合最新 develop，并重新执行 Local DB / generated types / RLS / full regression。

禁止：

```text
git clean -fd
git reset --hard
git push --force
git push --force-with-lease
```

完整执行 Task 中所有范围，包括但不限于：

- SQL Migration：正式 `trips / trip_plans / trip_days / itinerary_items` 主模型。
- owner-only RLS / default deny。
- FK / unique / ordering / active plan ownership 约束。
- Trip + Plan revision / stale-write / CAS 语义。
- Drizzle mirror。
- 真实 Local Supabase generated types。
- server-only `TripPlanSnapshotV1 ↔ DB` transaction projection / repository。
- minimum/full/multi-plan/multi-day/alternative/booking/timezone round-trip tests。
- 两真实 Auth 用户的 RLS / cross-user denial / anon denial。
- transaction rollback / revision conflict 测试。
- `db:start / status / reset / types / stop`。
- 全仓 tests、lint、typecheck、build、format/diff checks。
- `docs/architecture/trip-plan-persistence.md`。
- `RESULT-TASK-019-a-trip-plan-schema.md`。
- 更新 Master WBS 8.5 与 Task tracking。

严格边界：

- 不创建或修改 B 的 `travel_preferences / trip_drafts / trip_preference_snapshots / trip_preference_overrides`。
- 不实现 5.18 / 5.19。
- 不修改 Planner / Start / Personal Center UI。
- 不创建临时 POI / Route 主表。
- 不实现 Booking / Payment / Membership。
- 不实现 Engine 4.20–4.24 或 AI 6.x。
- 不提交真实 Secret。
- 不自动合并。

发布规则：

- 实现分支必须为 `codex/a-trip-plan-schema`。
- push 后创建 **Draft PR → develop**。
- 实现和真实本机 DB/Auth 验收通过时仅把 WBS 8.5 更新为 `待审查`。
- 只有用户验收 + 合并 develop 后才允许写 `已完成`。
- 最终返回前必须把 Result / WBS / Issue 追踪同步到 GitHub。

完成后按 Task 文件中的 `Required Final Result Format` 返回，并停止，不自动启动后续 Task。
