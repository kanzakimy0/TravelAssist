# TASK-069-A — WBS 4.19 Planner Save/Read 接线

Issue: #403
Owner: A
Priority: P0
Publication baseline: `develop@a16ea611b8fb24cfe751615d54a3828f7ef564ca`
Execution branch: `codex/a-planner-save-read-wiring`

## Objective
将已合入的 WBS 4.15 Planner Store 接到现有 Canonical Trip Plan / WBS 8.5 持久化层，实现登录用户的服务端 Read → Store hydrate → 本地编辑 → Explicit Save → CAS/revision acknowledgement → 再读取恢复闭环。

## Frozen boundaries
- Canonical Trip Plan / WBS 8.5 是服务端持久化真相。
- Planner Store 是当前页面的 editable working copy，不是第二套服务端 schema。
- browser-trip/localStorage 只作恢复/缓存，不是服务端真相。
- 保存必须显式触发；v1 不做 autosave。
- 复用现有 Trip persistence/RLS/CAS/transaction 能力，不建立第二套 persistence。
- 不改 Engine 4.20–4.24 语义，不伪造 Engine audit/outbox。
- 不做 4.18 Preference live wiring、AI、POI、Route provider、Booking/Payment 或视觉重做。

## Required implementation
1. 审计并复用当前 Trip Plan repository/server action/API/runtime。
2. 建立 typed Planner read boundary：读取 owner 的 Trip/active plan + canonical revision。
3. 建立 typed Planner save boundary：将 Planner persistence projection 转换为既有 canonical contract 后保存。
4. 所有 server read payload 必须经过既有 canonical parser/validation。
5. Planner 初次进入目标 Trip 时，通过 `hydrate(source="canonical", canonicalRevision)` 进入 Store。
6. existing Save action 改为 remote explicit save；成功后只对被确认的 exact snapshot 标记 persisted/clean。
7. stale revision/CAS conflict：保留本地 working copy，显示可恢复冲突，不静默覆盖。
8. late read/save acknowledgement 不得覆盖更新的 localRevision。
9. browser snapshot 与 server canonical 的优先级必须明确；server 较新 canonical 为真相，但不得用 late hydrate 销毁 dirty local edits。
10. Planner ↔ Detail 导航不得隐式 remote save。
11. read/save/auth/network/localStorage failure 均不得丢失当前安全 working state。
12. owner-only RLS/authorization；foreign user / anon fail closed。
13. 不把 UI/Mapbox/DOM/overlay/transient state 写入 canonical persistence。

## Acceptance scenarios
- authenticated read/hydrate;
- empty/new trip;
- explicit save success;
- refresh/re-entry round-trip;
- dirty semantics;
- UI-only changes do not save;
- late acknowledgement safety;
- stale revision conflict;
- two-writer CAS;
- corrupt payload fail closed;
- localStorage unavailable;
- network failure;
- anon/foreign access denied;
- Planner↔Detail no implicit save;
- browser recovery vs canonical revision precedence;
- canonical supported-subset semantic round-trip.

## Required QA
Run current canonical equivalents of:
- `npm ci`
- `npm run db:start`
- `npm run db:status`
- clean `npm run db:reset`
- `npm run db:types` (+ deterministic replay where applicable)
- Planner Store focused regression
- Trip Plan persistence/runtime/RLS/CAS regression
- new TASK-069 Save/Read integration + Local DB tests
- relevant full Node regression
- `npm run lint`
- `npm run typecheck`
- `npm run build`
- current local deployment validation/build/artifact gates
- `git diff --check`
- exact final-head GitHub Quality Gate
- `npm run db:stop`

No unexecuted gate may be reported PASS.

## Deliverables
- implementation/tests;
- `docs/architecture/planner-save-read-v1.md`;
- `docs/qa/TASK-069/README.md` + machine-readable evidence;
- `docs/tasks/RESULT-TASK-069-a-planner-save-read-wiring.md`;
- Master WBS 4.19 synchronization;
- one Draft PR → `develop`.

## WBS rule
Execution start: `A / 进行中（#403 / TASK-069-A）`.
After implementation + QA + Draft PR: `A / 待审查（#403 / TASK-069-A；Draft PR #...）`.
Only explicit user acceptance + merge may set 已完成.

## Stop condition
Do not auto-merge. Do not start another WBS automatically. Return the complete Result for owner review.
