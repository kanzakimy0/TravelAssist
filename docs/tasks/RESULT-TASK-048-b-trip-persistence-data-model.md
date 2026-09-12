# TASK-048-B Result

## 状态

本地实现、真实数据库与回归验收通过；等待创建 Draft PR 和 GitHub Quality Gate。
WBS 5.18 当前为进行中，交付收尾后改为待审查。Issue #329 保持 Open。

- Repository: https://github.com/kanzakimy0/TravelAssist
- Branch: `codex/b-account-wbs-5-18-trip-data-model`
- 执行基线与最终整合 develop：`b7eb931698da69cec73f7a0399897dbb5caab8c2`
- Spec：`task/b-wbs-5-18-trip-data-model`，`50dafd9b4f5aeb5fa8e46575fc620f9833e6d841`
- 实现 commit / PR：发布后补记。

已先执行工作树、分支、fetch、最新 develop SHA 与最近 15 个提交检查，完整读取远端
Launcher、Task、设计书、启动记录及指定源文件。4.17、8.1、5.11/5.16、5.12/5.17
均已满足；从最新 develop 创建指定实现分支，没有从 Spec 或旧 PR #221 开发。

## 交付模型

新增唯一聚合 `public.trip_library_records`，共 16 列：

| 分类             | 列                                                                               |
| ---------------- | -------------------------------------------------------------------------------- |
| 持久化身份       | `id` UUID PK、`owner_user_id` UUID、`creation_key` UUID                          |
| 生命周期         | `library_state`、`canonical_trip_id` nullable text                               |
| A canonical 内容 | `draft_facts`、`wizard_progress`、`plan_snapshot` nullable JSONB                 |
| Preference       | `preference_snapshot`、`preference_source_revision`、`preference_override_patch` |
| Companion        | `party_snapshot`                                                                 |
| 存储审计         | `storage_revision`、`frozen_at`、`created_at`、`updated_at`                      |

`owner_user_id` 是唯一外键，引用 `auth.users` 并级联删除。
`(owner_user_id, creation_key)` 唯一；非空 canonical Trip ID 按 owner 唯一。
B UUID 与 A Trip string ID、storage revision 与 A Trip/Plan revision 均保持分离。

直接复用 `TripDraftFactsV1`、`WizardProgressV1`、`TripPlanSnapshotV1` 及三个现有
canonical parser。A contracts、既有 Preference/Companion domain 文件与 develop
逐字节一致，hash 见 QA evidence；没有第二套 Trip/Day/Item schema。

## 生命周期与 revision

允许 `draft→draft`、`draft→saved`、`saved→saved`、`saved→history`。
新记录可从 draft/saved 开始；history 只能从已有 saved 转入。

- draft：canonical ID、plan、frozenAt 均为空。
- saved：必须有相互匹配的 canonical ID/plan；frozenAt 为空。
- history：必须有 ID/plan/frozenAt；拒绝所有 UPDATE，包括 no-op；允许特权硬删除。
- INSERT storage revision=1，mutable UPDATE 必须严格 old+1；真实并发竞争只有一个成功。
- id、owner、creationKey、Preference 创建快照及 source revision 不可变。
- 数据库维护创建/更新时间；进入 history 时以同一个 DB `clock_timestamp()` 写入
  frozenAt/updatedAt，忽略调用方冻结时间。不会按旅行结束日期自动归档。
- 复制历史要求新 id 与 creationKey，生成新 draft；保留 draft/progress/party 上下文，
  清空 canonical ID/plan/freeze。显式提供新创建的当前 Preference source，使用空 override；
  原历史不变，不擅自生成 A Trip ID。

## Preference 与 Companion 快照

缺失长期 Preference 时使用 `emptyPreference()` 与 source revision 0。
创建快照脱离源对象，后续长期修改不会重写它。
Trip 临时变更保存为现有 `PreferencePatchV1`；有效值由 `applyPreferencePatch` 计算。
显式 set/unset、false、neutral 与 missing 均保持原语义，不回写长期根；旧 #221 键被拒绝。
没有自动复制长期根的 DB trigger，未来 5.19 才负责认证后的创建编排。

party 只保存 `schemaVersion`、`includesOwner`、`ageReferenceDate` 和有序成员：
`sourceCompanionId`、`displayName`、`planningAgeGroup`、现有 `CompanionTravelProfileV1`。
优先使用 exact departure 的当地日期推算年龄，否则使用显式参考日期；DOB 不进入快照。
不保存 gender、avatar、relationship、privateNote、diningNote、疾病、药物或宗教原因。
includesOwner 独立表示本人，无 self Companion 行；成员 UUID trace 无 FK，原 Companion
修改/删除不改变历史。成员上限复用 100，不要求等于 canonical participants 人数。

## SQL 与权限边界

Trip TypeScript parser 是语义真源。SQL 校验 object/version/size、生命周期、ID 匹配、
revision、创建快照与 history 不可变；没有复制完整 itinerary validator。
现有 B Preference/Companion SQL validator 复用，party 额外严格限制隐私字段。

- PUBLIC / anon：无表权限。
- authenticated：仅 owner-scoped SELECT；直接 INSERT/UPDATE/DELETE/upsert 均拒绝。
- service_role：只用于管理和测试夹具；本次没有新增用户请求路径。
- 新增辅助函数均 SECURITY INVOKER、固定 `search_path=pg_catalog`；无 5.19 写 RPC。

技术 UTF-8 JSONB 大小上限：draft 256 KiB、progress 4 KiB、plan 4 MiB、party 128 KiB；
Preference snapshot/patch 均复用已有 64 KiB。常量集中在 B domain，SQL 镜像有 parity tests。
当前 full draft/plan 为 1,597/1,616 bytes；100 人、100 中文字姓名及完整功能 codes 的 party
为 76,094 bytes。合法 canonical plan 恰好 4,194,304 bytes 可真实入库，多一个字节拒绝。
这些是技术安全限制，不是会员权益。详细边界说明见 QA README。

## 历史 PR #221 逐文件审计

审计 head `929529be302b60c84ace3a580461de95e04de461`，23 个文件全部记录；未整支
merge/cherry-pick，Issue #207 与 Draft PR #221 未修改。完整理由见
[legacy-pr221-audit.md](../qa/TASK-048/legacy-pr221-audit.md)。

| Legacy file                                                              | Disposition |
| ------------------------------------------------------------------------ | ----------- |
| `docs/architecture/step-preference-persistence.md`                       | SUPERSEDE   |
| `docs/project/WBS-TravelAssist.md`                                       | SUPERSEDE   |
| `docs/tasks/RESULT-TASK-017-b-step-preference-trip-draft-persistence.md` | DEFER       |
| `docs/tasks/TASK-017-b-step-preference-trip-draft-persistence.md`        | SUPERSEDE   |
| `package.json`                                                           | SUPERSEDE   |
| `src/app/api/travel-persistence/route.ts`                                | DEFER       |
| `src/db/schema/index.ts`                                                 | REWORK      |
| `src/db/schema/travel-preferences.ts`                                    | SUPERSEDE   |
| `src/features/start-flow/model/server-draft-autosave.ts`                 | DEFER       |
| `src/server/preferences/http.ts`                                         | DEFER       |
| `src/server/preferences/repository.ts`                                   | REWORK      |
| `src/server/preferences/service.ts`                                      | DEFER       |
| `src/shared/contracts/preferences/drafts.ts`                             | REWORK      |
| `src/shared/contracts/preferences/index.ts`                              | SUPERSEDE   |
| `src/types/database.generated.ts`                                        | SUPERSEDE   |
| `supabase/migrations/20260908130000_create_trip_preference_drafts.sql`   | REWORK      |
| `tests/register-preference-ts.mjs`                                       | SUPERSEDE   |
| `tests/task-016-user-profile.runtime.mjs`                                | REUSE       |
| `tests/task-016-user-profile.test.mjs`                                   | REUSE       |
| `tests/task-017-api.runtime.mjs`                                         | DEFER       |
| `tests/task-017-local-db.mjs`                                            | SUPERSEDE   |
| `tests/task-017-persistence.runtime.mjs`                                 | REWORK      |
| `tests/task-017-persistence.test.mjs`                                    | REWORK      |

旧 travel_preferences SQL/model/parser 由已验收 5.11/5.16 取代。旧 trip aggregate、
creation-key 与快照思路按单聚合重做；API/autosave 延后，旧生成类型不复制。

## 实际验证

| Gate                                                | 结果                                                    |
| --------------------------------------------------- | ------------------------------------------------------- |
| `npm ci`                                            | PASS；395 packages，0 vulnerabilities                   |
| 未修改源码基线全仓测试                              | 1590/1590 PASS                                          |
| 最终全仓测试                                        | 1667/1667 PASS，0 fail / 0 skip                         |
| TASK-048 pure/domain                                | 77/77 PASS                                              |
| TASK-048 real Local Auth/DB/RLS                     | 29/29 PASS                                              |
| Profile DB                                          | 25/25 PASS                                              |
| Preference DB                                       | 505/505 PASS                                            |
| Companion DB                                        | 147/147 PASS                                            |
| Preference API/浏览器                               | 17/17 PASS                                              |
| Companion API/RLS/CAS/浏览器                        | 22/22 PASS，五尺寸回归                                  |
| `npm run lint`                                      | 基线与候选均为相同 7 个本机缓存错误；新改动 ESLint PASS |
| `npm run typecheck`、`npm run build`                | PASS；基线也 PASS                                       |
| `npm run format:check:deploy`                       | PASS                                                    |
| deploy local validation/build/artifact verification | PASS；1783 个产物文件验证                               |
| 客户端 DB/凭据泄漏检查                              | PASS；34 个浏览器 JS chunks                             |
| `git diff origin/develop --check`                   | PASS                                                    |
| GitHub Quality gate                                 | 待 Draft PR 创建后执行                                  |

全仓回归包含原有 WBS 4.17 Trip Contract、TASK-036 Planning Contract、TASK-037 soak，
以及 Profile/Preference/Companion/Personal Center/Trip Library 测试，没有削弱既有断言。
本次 UI diff 为零，不要求新的 UI 截图矩阵；仍完整运行了现有 API 浏览器回归。

Local Supabase：基线 start/status/reset 通过；候选迁移三次 reset 通过；三次真实 CLI
类型生成一致，最终 TASK-048 DB 测试再次通过，临时 Auth 用户与聚合记录均清理。
类型 SHA-256：`cabcbe30e9764280125546276522842572516bcbee1e0ed4073bc4a3cd486c5f`。
生成文件没有手写。原始日志位于忽略目录 `.artifacts/task048/`，脱敏计数、hash 和源文件
一致性证据已提交至 [acceptance.json](../qa/TASK-048/acceptance.json)。

## Changed files

- `src/features/trip-library/domain/trip-persistence-v1.ts`
- `src/db/schema/trip-library.ts`
- `src/db/schema/index.ts`
- `supabase/migrations/20260912100000_create_trip_library_records.sql`
- `src/types/database.generated.ts`
- `package.json`（仅新增两条专项 test scripts）
- `tests/task-048-trip-fixtures.mjs`
- `tests/task-048-trip-persistence-model.test.mjs`
- `tests/task-048-trip-persistence-model.runtime.mjs`
- `docs/architecture/trip-persistence-data-model-v1.md`
- `docs/project/WBS-5.18-trip-data-model-start.md`
- `docs/project/WBS-TravelAssist.md`（仅 5.18 状态）
- `docs/tasks/CODEX-TASK-048-b-trip-persistence-data-model.md`
- `docs/tasks/TASK-048-b-trip-persistence-data-model.md`
- `docs/tasks/RESULT-TASK-048-b-trip-persistence-data-model.md`
- `docs/qa/TASK-048/README.md`
- `docs/qa/TASK-048/legacy-pr221-audit.md`
- `docs/qa/TASK-048/acceptance.json`

Spec 文档带入实现分支；技术内容保持冻结，仅排版及当前交付状态更新。
所有旧 migration、既有 Auth/API、A contracts、Planner/Start/Trip Library UI、assets、
依赖和 lockfile 均未修改；Master WBS 其他 A/B 记录保持原样。

## 例外与范围

唯一 lint 例外是既存 `.cache/qa/task024-worktree/.cache/qa/` 下七个脚本：
`close-task024.cjs`、`implement-static-mvp.cjs`、`link-task024-pr.cjs`、
`record-task025-asset-gate.cjs`、`record-visual-acceptance.cjs`、
`start-static-mvp.cjs`、`write-task024-tracking.cjs`。
基线/候选日志逐字节一致，均为 `@typescript-eslint/no-require-imports`，7 errors / 0 warnings。
未删除缓存或改变规则掩盖问题。npm 既有 allow-scripts/module-type 提示不影响实际 gates。

没有 Reservation/Booking/Payment/Favorites 数据模型，历史外部预约信息仍是后续扩展；
canonical plan 内原有 booking 字段原样保留。不表示云保存、自动保存或跨设备 UI 已上线。
未启动 5.19、8.5、Planner/Engine 持久化或其他后续 Task；不自动合并，不关闭 #329，
不把 WBS 5.18 标记为已完成。
