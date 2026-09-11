# WBS 5.17 Companion 持久化 API — Start Amendment

> 日期：2026-09-12  
> Owner：B  
> WBS：5.17  
> Priority：P1  
> Issue：#325  
> Task：TASK-047-B  
> Publication branch：`task/b-wbs-5-17-companion-persistence-api`  
> Publication baseline：`develop@6750a50d9fc49e561e60d25e7ebfc90c76c60a60`

## Canonical Start Decision

WBS 5.17 的正式依赖为：

```text
5.12 Companion Schema
8.1 DB / ORM / Migration Foundation
```

截至本次发布，两项均已完成，因此：

```text
5.17 Companion 持久化 API = 可开始
```

本次已完成：

- 建立 Issue #325；
- 冻结 `companion-persistence-api-v1.md`；
- 发布 `TASK-047-B`；
- 发布 Codex Launcher；
- 明确计划实现分支 `codex/b-account-wbs-5-17-companion-persistence-api`。

本次**尚未执行运行时代码实现**，因此不得把 5.17 写成“待审查”或“已完成”。

## Master WBS Merge Rule

Codex 创建实现分支后，应从执行时最新 `origin/develop` 读取：

```text
docs/project/WBS-TravelAssist.md
```

仅对 5.17 当前行做最小 tracking 更新：

```text
未开始
↓
进行中（#325 / TASK-047-B）
```

不得覆盖同时由其他 Owner 更新的 WBS 行。

实现、真实 QA 与 Draft PR 完成后：

```text
5.17 = 待审查
```

只有用户明确验收并授权合并后：

```text
5.17 = 已完成
Issue #325 = Closed
```

## Dependency Boundary

5.17 不依赖：

```text
5.14 Planner-readable Preference Contract
5.15 Profile / Account API
5.18 Trip data model
5.19 Trip Save / Read / History Contract
```

因此这些任务的当前状态不阻塞 5.17。

## Scope Boundary

5.17 只负责长期 Companion Master / Group 的 authenticated persistence 与 Personal Center wiring。

不启动：

```text
Trip Companion Snapshot
trip-only override
Planner / Engine mapping
AI inference
Booking passenger domain
real-time sharing
```

完整范围以：

```text
docs/architecture/companion-persistence-api-v1.md
docs/tasks/TASK-047-b-companion-persistence-api.md
```

为准。
