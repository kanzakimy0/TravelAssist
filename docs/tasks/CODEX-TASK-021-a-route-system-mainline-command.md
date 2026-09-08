# CODEX — TASK-021-A 执行命令

请在 TravelAssist 仓库中按阶段 Gate 完整执行 `TASK-021-A — WBS 7.3 → 7.5 → 7.8 路线系统主线`。

Repository:
`https://github.com/kanzakimy0/TravelAssist`

Issue:
`#229`

Task spec branch:
`task/a-route-system-mainline`

Implementation branch:
`codex/a-route-system-mainline`

开始前：

```bash
git status --short
git branch --show-current
git fetch --all --prune
git rev-parse origin/develop
git log --oneline -15 origin/develop
```

读取远端完整 Task：

```bash
git show origin/task/a-route-system-mainline:docs/tasks/TASK-021-a-route-system-mainline.md
```

从最新 `origin/develop` 创建独立干净 Worktree / `codex/a-route-system-mainline`。

## Stage 1 — WBS 7.3

必须先通过联网核验当前官方资料完成 Route / Transit Provider 选型矩阵。不得使用模型记忆代替当前官方文档。

重点核验 Japan：walking / driving / rail / subway / bus / multimodal / departure-arrival time / alternatives / geometry / fare / waypoint / traffic / licensing / attribution / cache-retention / pricing / quota / key restriction / server API。

只有满足 Task 全部 Hard Selection Gates 且没有重大商业/技术未决项，才允许自动冻结 primary/fallback capability split 并进入 Stage 2。

如果日本公共交通、授权、定价、缓存限制或其他关键门槛无法明确确认，必须：

- 7.3 标 `待确认 / Blocked`
- 保存完整官方来源矩阵与推荐
- 7.5 / 7.8 保持未开始
- 停止，不凭假设实现后续

## Stage 2 — WBS 7.5

仅 Stage 1 PASS 后：

- 建立 provider-independent `src/shared/contracts/routes/**`
- Route request / response / alternatives / legs / segments / steps / transit metadata
- instant + timezone / meters / seconds / minor currency units
- geometry canonical representation
- nullable / unknown semantics
- stable canonical error model + retryable semantics
- runtime validator
- minimum/full/transit/timezone/error fixtures
- negative contract tests

不得把 Provider SDK types 或 payload 当公共 Route Schema。

## Stage 3 — WBS 7.8

仅 Stage 2 PASS 后：

- 建立 `src/server/routing/**` 或等价 server-only routing service
- provider interface + adapter(s)
- input/output validation
- timeout / abort
- bounded retry
- waypoint / alternatives / payload limits
- canonical error normalization
- minimal ToS-safe cache-key/TTL boundary
- secret-safe env handling
- deterministic adapter fixtures
- optional real-provider smoke：仅本机已有合法未提交 key 时运行；否则明确 `Deferred`

不得把 key 发到聊天、提交 Git 或写进测试报告。

## Final Integration / Validation

- 最终 fetch 最新 `origin/develop`
- 如 TASK-019-A / TASK-020-A / TASK-017-B 等已合入，共享文件必须安全整合
- 重跑 route tests / all tests / lint / typecheck / build / format audit / diff check
- 更新 Result / Master WBS / Issue #229
- push `codex/a-route-system-mainline`
- 创建 Draft PR → develop
- 不自动 merge

禁止：

```text
git clean -fd
git reset --hard
git push --force
git push --force-with-lease
```

不得实现：

- POI 7.2 / 7.4 / 7.6 / 7.7 / 7.9
- 完整缓存 7.10
- 全局 provider failover 7.11
- AI 6.x
- Engine 4.20–4.24
- Booking / Payment
- Planner 视觉重构
- Production purchase / contract / secret creation

完成或命中 Stage Gate 后，按 Task 的 `Required Final Result` 格式返回并停止。
