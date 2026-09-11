# RESULT — TASK-042-B / WBS 5.11 Preference Schema v1

## Status

**实现与真实 Local Supabase 验收通过；WBS 5.11 = 待审查。**

Owner B。未标记“已完成”，等待用户验收。仅执行 TASK-042-B。

## Baseline

- 启动时原工作区干净，原分支 `fix/quality-gate-baseline-repair`，未切换或修改该工作区。
- 执行 `git fetch --all --prune` 后基线：`fede48bb2a4916bcc6070be325ec5b450fa6fbd1`。
- 从该基线创建独立工作树：`C:/Users/Administrator/Documents/ChatGPT/TravelAssist-TASK-042-B`。
- 实现分支：`codex/b-account-wbs-5-11-preference-schema`。
- 实现提交：`d9090599378ba1512d0f2085af71f024ef9dca5d`；随后仅修正文档空白、SQL 文件末尾空行与交付追踪。
- 正式 Task、v0.2 设计、Codex launcher 来自 `origin/task/b-wbs-5-11-preference-schema`，纳入本 PR 便于审查；只规范 Markdown 格式，不改变冻结语义。
- 已读取最新 WBS、DB/ORM/Migration 规范、跨模块交接规范、Preference system/center 设计及本地 Next 16.3.4 TypeScript 指南。

## Dependency / PR #221 Gate

- 1.25、8.1 已完成；TASK-016-B User/Profile 与 TASK-018-B Auth Core 均在 develop。
- 启动检查：Issue #307 OPEN；PR #221 OPEN / Draft。
- #221 head：`929529be302b60c84ace3a580461de95e04de461`，base `develop`。
- 没有整体 merge/cherry-pick #221；其旧 30-key 模型没有进入本任务基线。
- #221 与 #207 保持原状态。

## Canonical Schema

唯一 B 内部领域文件：`src/features/preferences/domain/preference-v1.ts`。没有建立 `shared/contracts/preferences` 或向 A 发布 5.14 Contract。

- `schemaVersion: "1.0"` + flat dotted `values`，恰好 23 keys。
- Mobility 5、Dining 3、Accommodation 3、Budget 3、Interests 2、Style 7。
- `walkingTolerance` 为 veryLow / low / standard / high / veryHigh。
- `style.planning` 与另六个 style 值均仅接受 integer 1–5。
- 恰好三个 `hard_when_true`：noPublicTransit / noBus / noFerry。
- walkingTolerance 与 queueTolerance 为 `soft_constraint_input`；其余为 soft。
- UI tier 仅静态元数据；walkingTolerance 标记完整五档编辑层级 3，二级快速映射仍属后续 UI。
- 16 个稳定 InterestCode 与全部设计指定 DetailCode；类型层按 parent 约束 child。
- missing / false / neutral 区分；兴趣 signal 仅 like / dislike。
- 父交通排除与 noBus=false 可同时保存；软偏好张力可保存。

## Old Candidate Supersession

拒绝 mobility.preset、mobility.lessWalking、六个 attractions.*、experience.photoExperience、interests.likes/dislikes、中文兴趣 ID，以及 priority/value/notSpecial 等旧 UI storage 枚举。

现有 UI 模型保留本地展示职责；没有 API/DB 接线，因此不需要为了通过构建新增 adapter 或写入 Mock/default。

## Database

迁移：`supabase/migrations/20260911090000_create_travel_preferences.sql`。

- 只新增 `public.travel_preferences`：owner_user_id PK/FK → auth.users ON DELETE CASCADE、payload、revision、created_at、updated_at。
- 默认空 envelope；一用户一行。
- SQL JSONB validator 拒绝错误 envelope/version、未知 key、错误类型/枚举、旧字段、非法 style/walking、非法兴趣父子/重复细分/dislike + 非空正向细分。
- SQL 使用精确 JSON scalar membership，防止 JSON containment 放行数组包装的枚举值。
- 64 KiB 上限；SQL NULL 和 JSON null 均不能作为有效 payload。
- revision 从 1 开始，每次更新必须 old + 1；旧 revision、跳号、null、owner 变更被拒绝。5.16 的 HTTP CAS 接口未实现。
- 数据库生成审计时间，created_at 更新时保持不变，客户端时间伪造被覆盖。
- Drizzle mirror：`src/db/schema/travel-preferences.ts`，复用已接受的 owner policy helper。
- SQL 唯一迁移历史；未修改已合并 Migration，未创建 Drizzle 迁移历史。
- `src/types/database.generated.ts` 由真实 Local Supabase CLI 生成，重复生成 SHA-256 相同；没有手工编辑。

## RLS

- RLS enabled，authenticated 仅 SELECT/INSERT/UPDATE 自己的行，USING/WITH CHECK 都按 auth.uid()。
- 跨用户 select/update 无可见行；伪造 owner insert/upsert 拒绝。
- anon CRUD 全拒绝；authenticated 没有 DELETE 权限，reset 写回空 envelope。
- 真实 Auth 删除级联自身 Preference，另一用户保留。
- validator/trigger 为 invoker function，固定 search_path=pg_catalog；anon 无 validator execute。
- service_role 仅沿用可信后端授权惯例；没有浏览器 service-role key、连接 URL 或新鉴权 API。

## Runtime / Patch Validation

- 单一冻结 TypeScript field registry 同时驱动类型、解析器与强度/UI 元数据。
- strict plain JSON：拒绝 unknown、错误 version、非 plain object、accessor、symbol/隐藏属性、undefined、NaN/Infinity、BigInt、稀疏/附加属性数组和循环结构；不调用 getter/toJSON。
- 解析返回独立副本，不修改调用方对象，不注入默认值。
- patch 必须包含 schemaVersion/set/unset；重复 unset 与 set/unset 同 key 拒绝。
- map set 整体替换，unset 删除字段；current、patch、最终结果都重新校验。
- 缺失兴趣 parent 可带 details；dislike parent 仅允许空 details。

## PR #221 Audit (REUSE/REWORK/DEFER/SUPERSEDED)

逐文件读取了 #221 的 preferences/index.ts、travel-preferences.ts、20260908130000_create_trip_preference_drafts.sql、step-preference-persistence.md。

| #221 元素                                            | 处理           | 本次结果                                       |
| ---------------------------------------------------- | -------------- | ---------------------------------------------- |
| 一用户一 travel_preferences root                     | REUSE          | PK + Auth cascade FK                           |
| versioned JSONB envelope                             | REUSE          | 1.0 sparse envelope                            |
| 64 KiB                                               | REUSE          | runtime + SQL 上限                             |
| owner-only RLS                                       | REUSE          | 三种 owner policy，无客户端 DELETE             |
| revision / audit guard                               | REUSE / REWORK | 独立长期根 guard，初始化严格为 1、owner 不可变 |
| sparse set/unset                                     | REWORK         | 严格 patch、完整 map 替换、所有输入/输出重解析 |
| UI-derived / shared-contract registry                | REWORK         | B 内部唯一纯 TS 注册表，不依赖 UI              |
| mobility.preset                                      | SUPERSEDED     | 禁止存储；5.13 才负责展开                      |
| mobility.lessWalking                                 | SUPERSEDED     | 五档 walkingTolerance                          |
| 六个 attractions.*                                   | SUPERSEDED     | 兴趣唯一事实源；Radar 不存储                   |
| experience.photoExperience                           | SUPERSEDED     | photography 兴趣/细分                          |
| 中文兴趣 ID                                          | SUPERSEDED     | 16 stable codes                                |
| interests.likes/dislikes                             | SUPERSEDED     | 一个 sparse signal map                         |
| UI priority/value/notSpecial                         | SUPERSEDED     | canonical priority 枚举                        |
| 缺失 style.planning                                  | REWORK         | 第七条 integer 1–5 风格字段                    |
| details 缺少稳定类型与关联校验                       | REWORK         | 完整 parent/child registry 与冲突校验          |
| trip draft/snapshot/override 表与 effective resolver | DEFER          | 5.18/相关任务；本次无这些表/实现               |
| persistence HTTP endpoint / CAS service              | DEFER          | 5.16                                           |
| autosave/UI wiring                                   | DEFER          | 5.16/UI integration                            |

## Real Local Supabase

**PASS，真实 Local Supabase / Auth / PostgreSQL，不是 Mock。**

| 命令 / 验收                             | 结果                                 |
| --------------------------------------- | ------------------------------------ |
| npm run db:start                        | PASS                                 |
| npm run db:status                       | PASS；仅 localhost 54321/54323/54324 |
| npm run db:reset                        | PASS；从零重放完整迁移与 seed        |
| npm run db:types                        | PASS；真实生成并再次生成一致         |
| npm run test:preferences:db             | 505/505 PASS，0 skip                 |
| TASK-016 real Profile DB/RLS regression | 25/25 PASS                           |
| npm run db:stop                         | PASS；验收后已停止                   |

DB 专项使用两名临时真实 Auth 用户，覆盖 owner CRUD 边界、anon、cascade、空/reset、revision、timestamps、真实 Drizzle query/check 与所有 159 个有效/338 个无效共享独立向量；finally 清理用户，最终 Auth/Preference fixture 数量为零。

初始 Windows 命令 sandbox 无法创建进程，使用获准的提升执行通道。Docker Desktop 初始被旧 Unix socket 的 Windows reparse 状态阻塞；保留 socket-only runtime 目录备份后恢复。旧 Supabase gateway 容器也需 stop/start 重建。未 factory reset，未删除镜像/数据卷，未访问 Staging/Production。

首轮 DB 测试有三项测试 harness 假设错误（role 数组、upsert 的初始 revision、JSON string 参数绑定）；修正后完整重跑 505/505。未改变字段/安全规则来迁就测试。

## Repository Validation

| Gate                           | 结果                                                          |
| ------------------------------ | ------------------------------------------------------------- |
| npm ci                         | PASS，锁文件不变                                              |
| npm run test:preferences       | 503/503 PASS                                                  |
| 全仓 CI 等价 Node tests        | 1332/1332 PASS，0 skip；最终 generated types 后复跑一致       |
| npm run lint                   | PASS                                                          |
| npm run typecheck              | PASS；真实 generated types 后再次 PASS                        |
| npm run build                  | PASS，Next 16.3.4                                             |
| npm run deploy:validate:local  | PASS                                                          |
| npm run deploy:build:local     | PASS；standalone artifact audit 1730 files                    |
| npm run deploy:verify-artifact | PASS；没有部署/发布站点                                       |
| npm run format:check:deploy    | PASS                                                          |
| 全部修改文件 Prettier check    | PASS                                                          |
| git diff --check               | PASS（最终分支 diff）                                         |
| npm run format:check           | FAIL：63 个文件，全部与 origin/develop 对应 Git blob 完全相同 |

仓库没有 `npm test` script，使用 Quality gate 原命令：`node --import ./tests/register-route-ts.mjs --test "tests/*.test.mjs"`。

原 TASK-016 pure/runtime 测试仅将 schema 枚举限定为其原三张 Profile 表，保留所有原断言；新增 Preference 表有独立真实验证。未削弱原 Profile 校验，也未修改资产、Planner、Engine 或全仓历史格式问题。

本地日志位于工作树 `.artifacts/task042/`（Git ignored）；不提交 credential-bearing 原始 CLI 输出。

## Scope Protection

只执行 5.11。5.13、5.14、5.16、5.18、8.6 及其他 WBS 行保持原状态。

没有新增 Preset/default 展开、Planner public Contract、HTTP API、UI persistence、Trip Draft/Snapshot/Override 表、Companion Schema、Planner/AI/Engine/POI 43 字段或 Provider 工作。

没有 force push、hard reset、clean、自动合并或后续 Task 启动。原 PR #221 不关闭、不合并。

## Tracking

- Issue：[#307](https://github.com/kanzakimy0/TravelAssist/issues/307)，保持 OPEN。
- WBS 5.11：实际开发时记录为“进行中”；真实验收通过后更新为“待审查”。
- Draft PR：待创建后补入实际 URL；base develop，必须保持 Draft。
- 实现提交：`d9090599378ba1512d0f2085af71f024ef9dca5d`。
- 交付追踪提交见 PR commit list；不会在本文件中伪造自身 commit SHA。

## Remaining Work

本任务代码与 Local DB 验收无剩余阻塞。等待用户审查和验收；63 项历史格式问题不属于本任务。

后续 WBS 均未启动，不能将本次 schema/DB 测试解释为 API、跨设备 UI、Planner 或 Trip persistence 验收。

## Ready for User Acceptance

**Yes — WBS 5.11 待审查。** 仅在用户验收并授权合入 develop 后才可另行标记完成；本次保持 Draft，不自动合并。TASK-042-B 交付后停止。
