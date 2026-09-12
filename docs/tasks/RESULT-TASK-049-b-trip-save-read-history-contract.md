# TASK-049-B Result

## 当前状态

WBS 5.19 Trip Save / Read / History Contract v1 的实现、真实 Local Supabase/Auth/HTTP/
CAS/浏览器验收及本地 Quality Gates 已完成。GitHub 最终 head 门禁与 Draft PR 追踪待写入。
Issue #333 保持 Open；不合并，不标记 5.19 已完成，不启动后续 Task。

- Repository: https://github.com/kanzakimy0/TravelAssist
- Issue: #333
- 实现分支：codex/b-account-wbs-5-19-trip-save-read-history-contract
- 执行时最新 origin/develop：5ceffd8349ead5b5280029d2b344c23e9346e317
- Spec head：330bf2e331a0f778e1df31bf3c1e8cd3fd49a58d
- PR / 实现 commit / GitHub Gate：首次提交后补充，交付前必须复核最终 head。

已执行规定的 status/branch/fetch/develop SHA/log 检查，完整读取远端 Launcher、Task、
设计、启动记录及指定边界源文件。从最新 develop 创建指定分支，没有从 Spec 或 PR #221
开发。5.18 已完成，PR #331/#332 已合并；#329 Closed/Completed。最新 develop 再次 fetch
仍为上述 SHA。Master WBS 仅修改 5.19，先进行中，全部验收后待审查。

## 实现交付

| Method         | Route                          | 行为                                     |
| -------------- | ------------------------------ | ---------------------------------------- |
| GET/POST       | /api/trip-library              | 有界摘要分页 / 创建 Draft                |
| GET/PUT/DELETE | /api/trip-library/{id}         | 单条读取 / Draft 全量替换 / 仅删除 Draft |
| POST           | /api/trip-library/{id}/save    | Draft→Saved、Saved→Saved                 |
| POST           | /api/trip-library/{id}/history | Saved→History，DB 冻结                   |
| POST           | /api/trip-library/{id}/copy    | History→新 Draft，owner creationKey 幂等 |

直接复用 TripDraftFactsV1、WizardProgressV1、TripPlanSnapshotV1 及现有 A parser；
复用 5.18 有界 JSONB 校验与生命周期 helper、已验收 Preference/Companion parser。
无第二套 Trip/Day/Item 模型。B record UUID、A canonical Trip string ID、storage revision
与 canonical Trip/Plan revisions 分离；已 Saved 的 canonical ID 不允许更换。

所有用户请求使用 verifiedPrivateRequest 的真实 Cookie/Bearer 验证，显式无效 Bearer
不回退 Cookie；Cookie 写操作要求可信 Origin。正常请求不使用 service-role。
getDb 没有隐式 RLS；每个 SELECT/UPDATE/DELETE 显式 owner_user_id，INSERT owner
仅来自 Auth。事务写入同时约束 owner/id/expected storage revision/允许状态。
除创建外所有写操作要求精确 If-Match；竞争一个成功、一个409；无 last-write-wins。
成功的单资源响应返回 ETag。响应 private/no-store，Vary Authorization/Cookie，错误不泄漏
SQL、owner UUID 或私人输入。跨 owner 与不存在记录统一404。直接 authenticated DML
包括 upsert 仍被拒绝，没有向客户端开放绕过 TypeScript 的 mutation RPC。

## 快照、幂等与历史

创建自动读取当前长期 Preference（不存在为空/revision0）及有序 owner Companion IDs。
party 只保存本人标记、参考日期、trace UUID、姓名、规划年龄组与现有功能 profile。
exact departure 优先，否则严格要求显式参考日期；DOB 仅用于推算，不进入快照。
不保存 gender/avatar/relationship/privateNote/diningNote/疾病/药物/宗教原因。

PUT 只接受 draftFacts/wizardProgress/preferenceOverridePatch/partySelection 四个字段，
保留创建 Preference，重新捕获明确选择的 Companion；Trip 临时 patch 不回写长期根。
有效 Preference 从 snapshot + patch 计算。后续源 Preference/Companion 修改或删除不会
改写已存历史或使相同原创建请求重试失效。

幂等依据原始规范化请求意图。为保证草稿已编辑后仍能正确重试，新增唯一、狭窄的
additive migration：原表增加 nullable creation_intent_hash、不可变 SECURITY INVOKER
guard、匹配 owner/updated_at DESC/id DESC 的索引。未改写 5.18 migration、16 字段
内容模型、RLS 或写权限。旧行保留 NULL，不猜测原意图；旧 key 重试返回冲突。
新创建使用 SHA-256 摘要，客户端不能提交，API 不返回该字段。相同请求返回当前
record/state/revision；不重新捕获根、不覆盖后续编辑；不同意图409。并发 create/copy
只产生一个记录。物理 Draft 删除会释放 key，删除后再次创建应生成新 key。

Saved→History 的 frozenAt/updatedAt 来自同一个 DB clock，history 拒绝所有修改和 API
删除，无按日期自动归档。copy 要求源 History 的 If-Match，创建新 B UUID/key，保留
Draft/progress/party 上下文，重新捕获当前长期 Preference，清空 patch/plan/canonical ID/
freeze，storageRevision=1，不自行生成 A ID，不修改源历史。

## 列表与交接

列表只允许 state=all|draft|saved|history、limit1..50（默认20）和严格 opaque cursor。
重复/未知参数拒绝。SQL 直接投影有界摘要，LIMIT+1，不加载完整多 MiB plan。
排序 updated_at DESC/id DESC；cursor 保留 PostgreSQL 微秒，避免 Date 精度造成遗漏。
静态数据分页无重复/遗漏；并发更新跨页不是冻结快照，刷新第一页获取前移记录。

公开 browser-safe TripPersistenceHandleV1 / TripSavePlanRequestV1 / TripSavePlanResultV1
及 saveTripPlan；A 只依赖 public shared contracts，无 B private/server/db 导入。
B client 提供 create/read/update/save/history/copy/delete/list 与校验后的资源/摘要模型。
完整请求、错误、ETag、边界和示例见
[handoff](../contracts/trip-save-read-history-v1-handoff.md)。

当前 Trip Library fixture UI 依赖未持久化的预订/收藏/封面等字段，因此可见 UI 接线明确
Deferred。后续需先确定真实 Trip-only 展示及缺失数据语义，再接入 client；不得用虚构0值
替代未知数据。Planner/Start/Personal Center 页面、CSS 与 canonical A contracts 不变。
没有 Reservation/Booking/Payment/Favorites 模型，没有 4.19 接线、Start autosave 或账户删除。

## 实际验收

| Gate                                         | 实际结果                                                           |
| -------------------------------------------- | ------------------------------------------------------------------ |
| npm ci                                       | PASS；395 packages，0 vulnerabilities                              |
| 基线全仓                                     | 1667/1667 PASS                                                     |
| 候选全仓                                     | 1743/1743 PASS，0 fail / 0 skip                                    |
| TASK-049 pure / contract                     | 76/76 PASS                                                         |
| TASK-049 real Local Auth/DB/HTTP/CAS/browser | 35/35 PASS                                                         |
| TASK-048 pure / real DB                      | 77/77、29/29 PASS                                                  |
| Profile DB                                   | 25/25 PASS                                                         |
| Preference DB / API+browser                  | 505/505、17/17 PASS                                                |
| Companion DB / API+browser                   | 147/147、22/22 PASS，原有五尺寸回归                                |
| db:reset / db:types ×2                       | PASS；生成类型完全一致                                             |
| typecheck / build                            | PASS，基线也 PASS                                                  |
| npm run lint                                 | 基线与候选相同7个历史缓存错误；日志 SHA 一致；本次改动 ESLint PASS |
| format:check:deploy                          | PASS；修正新 runtime 测试格式后复核                                |
| deploy local validate/build/verify           | PASS；1831文件验证                                                 |
| client bundle audit                          | PASS；34 browser chunks                                            |
| diff whitespace / scope                      | PASS；Master 仅5.19；无 Planner/Start/UI/CSS/canonical/现有域变动  |
| GitHub Quality Gate                          | Draft PR 提交后复核，不以本机例外替代远端完整门禁                  |

真实验收覆盖 User A/B/Anon、Cookie/Bearer、无效 Bearer 不回退、Origin、防 owner 注入、
跨用户所有操作404、快照/隐私、creation/copy并发与重试、全部 CAS/状态转换、ETag、
分页及微秒/UUID tie、History DB freeze、直接 DML 拒绝和真实浏览器 Cookie fetch/reload。
测试用户、Trip 数据最终均为0；task-owned Next 与浏览器已停止。

HTTP技术上限：create/update512KiB、save4.5MiB、copy16KiB，history/delete空 body。
原 Preference/Companion reader 的80KiB默认值不变，只对 Trip 显式放宽。
5.18 JSONB caps不变：draft256KiB、progress4KiB、plan4MiB、party128KiB、Preference64KiB。
真实合法 plan 恰好4,194,304 JSONB bytes，以3,782,809 HTTP bytes成功保存并完整读回；
增加1个存储字节或超过HTTP上限时413，无部分写入。这些是技术安全限制，不是会员权益。

本机既有 .cache/qa/task024-worktree/.cache/qa 下7个 CommonJS no-require-imports 错误
没有删除、忽略或改规则隐藏；新改动 lint 独立通过。Local artifact metadata 是提交前
checkout 基线 SHA；GitHub 对提交 head 独立构建。原始日志保存在忽略目录 .artifacts/task049，
提交的 [QA evidence](../qa/TASK-049/README.md) 只含测试结果、hash 和脱敏证据。

## 历史分支与改动文件

[PR #221 逐文件 disposition](../qa/TASK-049/legacy-pr221-audit.md) 覆盖23文件，head
929529be302b60c84ace3a580461de95e04de461；旧 /api/travel-persistence 为 SUPERSEDE，
旧 autosave 为 DEFER。没有整支 merge/cherry-pick；#207 Open / #221 Draft 均未修改。

交付文件分组：

- src/app/api/trip-library/**：五个 Node Route Handlers。
- src/server/trip-library/**：验证后 gateway、显式 owner/CAS repository、strict cursor。
- src/shared/contracts/trip-library/**：A public types/errors/Cookie save client。
- src/features/trip-library/persistence/**：严格请求、B资源/摘要/parser/client。
- src/server/private-http.ts：仅可选 query 和 body cap 扩展，原默认行为保留。
- src/features/trip-library/domain/trip-persistence-v1.ts：导出现有字段校验包装，无新模型。
- src/db/schema/trip-library.ts、生成类型及 additive migration：幂等元数据/guard/index。
- tests/task-049-*、package scripts：新单元与真实验收。
- 现有两个 fixture/helper 的最小兼容：在内存传递已验证 Local DSN；将 gateway metadata
  排除于严格5.18内容 parser 输入。全部旧语义断言及真实 mirror/RLS检查保留。
- 本任务 Launcher/Task/设计/启动记录、handoff、Result、QA；Master WBS仅5.19。

最终应保持 WBS5.19待审查、Issue#333Open、PRDraft/Open。未合并，未启动4.19/5.21/8.5/9.8。
