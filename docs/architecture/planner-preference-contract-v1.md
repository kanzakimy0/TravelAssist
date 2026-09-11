# TravelAssist — WBS 5.14 Planner-readable Preference Contract v1

> 日期：2026-09-11
> 版本：v1.0 / Implementation Baseline；实现及跨模块交接仍待验收
> Owner：B / Preference Producer；Consumer / Integration Reviewer：A 或指定共享架构审查人
> Task：TASK-046-B；Issue：#321
> 依赖：5.11、5.16 均已完成
> 设计基线：`develop@de83a1d6cf33eadc9107a529cb1e9590c95d43a4`
> 当前阶段：规格与交接准备已开始；尚未执行 Codex 实装。中央 WBS 应为“进行中”。

## 1. 目标和本轮决策

5.11 定义长期事实，5.16 负责可信读写，5.14 把这些事实以稳定、可验证、只读的公共接口交给 A。A 不再导入 B 的页面、私有 Store、数据库表或内部持久化实现。

```text
5.11 canonical Preference semantics
                 ↓ 单一实现向 shared 提升，旧路径兼容导出
src/shared/contracts/preferences
                 ↑ 纯校验 / 类型 / 静态语义
5.16 verified GET /api/preferences
                 ↓ 只读适配
LongTermPreferenceReadV1
                 ↓ 后续独立 Task
4.18 Planner / 6.x AI / 7.9 scoring consumers
```

本轮冻结的是读取交接规格，不是推荐算法参数，不意味着 Planner 已实际使用用户偏好。公共接口发布前必须完成实现、回归及跨模块审查。

## 2. 对本对话已确认决策的承接

| 已确认事项 | 5.14 处理 |
| --- | --- |
| 5.11 是 23 个长期偏好字段，不是景点 43 字段 | 原样交接 23-key sparse payload，不另造用户向量 |
| missing、false、neutral、空 map/数组不同 | 保留，不注入默认值、不删除显式 false/neutral |
| 16 个稳定 InterestCode 与父子 DetailCode | 复用唯一 registry，中文只用于 UI |
| walkingTolerance 为五档，style 为七条 1–5 轴 | 原值保留，不擅自映射为 1–9 |
| 仅三个交通排除为 hard_when_true | 公开静态强度语义；不降为 soft penalty |
| 本人 / Companion / Trip / POI / Engine 分层 | 公共长期偏好不携带这些其他领域记录 |
| 5.16 GET/PATCH/reset 已验收、已合并 | HTTP wire、鉴权、CAS、RLS、UI 行为不破坏 |
| Trip Snapshot / Override 由后续任务实现 | 5.14 不建立表、不伪造 snapshotId、不写 Trip |
| PR #221 仍为历史 Partial | 只读审计，不能整体合并或恢复其旧 30-key 合同 |
| WBS 必须修改中央主表 | 阶段变化直接更新 WBS-TravelAssist.md 对应行并读回；旁路说明不代替主表 |

## 3. 新公共读模型

```ts
// 嵌套 preference 的 key/value 仍来自唯一的 5.11 canonical core。
export type LongTermPreferenceReadV1 = {
  readonly contractVersion: "1.0";
  readonly scope: "long_term";
  readonly sourceRevision: number;
  readonly sourceUpdatedAt: string | null;
  readonly preference: DeepReadonly<PreferenceV1>;
};
```

`DeepReadonly` 仅是递归只读类型示意，不得复制一份 Preference 字段表。实际输出还须是独立、深度冻结的对象，防止消费者误改 Producer 的缓存或输入。

示例：

```json
{
  "contractVersion": "1.0",
  "scope": "long_term",
  "sourceRevision": 7,
  "sourceUpdatedAt": "2026-09-11T13:00:00Z",
  "preference": {
    "schemaVersion": "1.0",
    "values": {
      "mobility.walkingTolerance": "low",
      "mobility.noPublicTransit": true,
      "mobility.noBus": false,
      "interests.preferences": { "photography": "like" },
      "style.planning": 5
    }
  }
}
```

`contractVersion` 是公共读模型版本，`schemaVersion` 是偏好字段版本，`sourceRevision` 是某一账户长期记录的写入版本。三者不能互换，revision 也不是 Trip revision 或全局用户 ID。

严格规则：

- 恰好上述五个顶层字段；未知字段、未知 scope/version 拒绝。
- `sourceRevision` 为非负安全整数；来自当前 DB 的版本还须符合其有效整数范围。
- revision 0 仅允许 empty Preference 与 `sourceUpdatedAt:null`，表示已验证账户当前没有长期记录。
- revision > 0 允许 empty Preference，表示已创建或重置过的记录；时间来自 DB，非空有效 ISO 8601 instant，支持 Z/offset 与现有数据库小数秒精度。
- 不返回 owner ID、邮箱、Cookie、token、DB URL、UI 文案、Radar、同行人、Trip 或 SQL 原始行。
- 序列化和反序列化后事实相同；不生成当前时间，不重新编号 revision。

## 4. 与现有 5.16 HTTP wire 的兼容

现有 GET 继续返回：

```json
{
  "ok": true,
  "data": {
    "preference": { "schemaVersion": "1.0", "values": {} },
    "revision": 0,
    "updatedAt": null
  }
}
```

5.14 提供纯投影 `toLongTermPreferenceReadV1(resource: unknown)`，从已严格验证的 5.16 `data` 得到公共读模型。**不修改 GET 响应结构，不新增重复 GET endpoint，也不重写 PATCH/reset。**

另提供 `parseLongTermPreferenceReadV1(input: unknown)` 以校验跨模块/JSON 边界。不用类型断言代替 runtime parser。新投影与现有 resource parser 应复用底层语义；不得两套并行维护。

## 5. 唯一事实源与路径提升

建议结构：

```text
src/shared/contracts/preferences/
  core.ts                    # 从 5.11 原文件提升的唯一语义实现
  persistence-resource.ts    # 从 5.16 提升的纯 resource/envelope 校验（兼容用途）
  read.ts                    # 公共只读模型与投影/校验
  semantics.ts               # 从 core registry 派生的静态强度元数据
  fixtures.ts                # 明确 synthetic 的公共例子
  index.ts                   # 显式列出公共只读 exports

src/features/preferences/domain/preference-v1.ts
  # 仅兼容 re-export，不再有第二份 registry/parser
src/features/preferences/persistence/preference-resource.ts
  # 对提升后纯实现的兼容 re-export

src/lib/preferences/client.ts
  # browser-safe GET-only facade
src/server/preferences/public-read.ts
  # server-only request-scoped facade
```

文件名可按仓库既有规范细化，但语义边界不可改。机械搬迁允许更改路径/顶部归属说明，不允许改变 5.11 的 23 keys、取值、强度、patch、64 KiB、异常行为等。旧导入路径保留兼容，5.16 UI/服务无需被迫重写。

公共 `index.ts` 只导出读模型、读 parser、必要只读类型、稳定 codes 和静态强度。不要 `export *` 暴露整个写入表面；patch 类型/函数可留在内部兼容 core 供 B 使用，但 A 的公共读取入口不提供保存、重置、DB access 或 UI tier/表单 parser 元数据。

依赖方向必须是 `features/server/lib → shared`，不能 `shared → features`。公共纯包的传递依赖不得包含 React、Next server、Supabase/Drizzle 客户端、环境变量或私有组件。服务器读取入口单独使用 `server-only`。

## 6. 静态语义，不是计算结果

公开强度信息从唯一 registry 派生，不新增第二份手写字段/强度表：

- `mobility.noPublicTransit`、`mobility.noBus`、`mobility.noFerry`：仅在 true 时 `hard_when_true`。
- `mobility.walkingTolerance`、`dining.queueTolerance`：`soft_constraint_input`。
- 其他字段：保留原 soft 语义，兴趣 dislike 是负向软信号，不是禁止访问。

`noPublicTransit=true` 与 `noBus=false` 可同时存在；后者不能解除父级排除。5.14 不替用户修值、不执行交通路线门禁。用户可能需要显式 Trip override 的决策属于后续消费者。

未知字段/版本不是“无偏好”；低 walkingTolerance 不是讨厌景点，style.planning 也不是授权 AI 改行程。

## 7. 浏览器读取入口

建议 `readCurrentLongTermPreference({ signal? })`：只请求现有同源 `GET /api/preferences`，使用现有 Cookie 会话、`cache:no-store`，不接受 owner 参数、不自行存 token。

输出统一 discriminated result：

```ts
type PreferenceReadResultV1 =
  | { ok: true; data: LongTermPreferenceReadV1 }
  | { ok: false; code: PreferenceReadErrorCode };
```

建议公开错误码：`AUTH_REQUIRED`、`AUTH_UNAVAILABLE`、`PREFERENCE_UNAVAILABLE`、`INVALID_PREFERENCE_RESPONSE`、`UNSUPPORTED_PREFERENCE_VERSION`、`REQUEST_CANCELLED`。未知 HTTP/server 错误转安全不可用码，不回显服务器原始内容。

用户取消需返回可区分的取消结果；401/503/损坏 JSON/不支持版本不能返回 `ok:true` 的空偏好。禁止模块级跨账户缓存、localStorage 默认回退或隐式自动写入。

## 8. 服务器读取入口

提供明确命名的 `server-only` facade，接收当前请求上下文，不接收浏览器自报 owner。优先复用 5.16 `handlePreference(request, "get")` 的可信读取路径，或进行不改行为的小型共享上下文提取，避免再次实现认证。

返回公共 read result，并提供明确的 response finalizer/等价机制，用于把刷新后的 Cookie 和 private/no-store headers 带回外层 HTTP 响应。不能只读数据而丢掉 5.16 的 session refresh cookie。交接例子必须调用 finalizer。

Cookie/Bearer 均沿用 5.16：显式 Bearer 验证失败不回退 Cookie；请求级隔离、真实 getUser、用户上下文 RLS、不新增 service-role 绕过。允许从当前请求携带 Bearer，不允许在合同/Result 中携带凭据。

不把此 facade 当可任意调用的 Server Action，不把 request、SupabaseClient 或 Response 对象塞入公共 JSON 合同。

## 9. 明确区分现有 Planning 43 维接口

当前 `src/shared/contracts/planning/features.ts` 已定义：

```text
EffectivePreferenceV1:
  values = Record<PoiFeatureCode, 1..9>
  snapshotRef
  overrideRevision

SparsePreferenceV1:
  AI-only 43-code projection; neutral 5 omitted
```

它们不是长期 PreferenceV1。5.14 的读取输出 **不得** 被直接强转成上述类型。

```text
LongTermPreferenceReadV1（23 keys）
     ↓ 后续明确的 Trip + mapping + calibration
EffectivePreferenceV1（43 scoring dimensions）
```

本轮禁止凭空设置 23→43 权重、将 five-level walking 换成固定 1–9、给所有缺项填 5、伪造 snapshotRef/overrideRevision，或修改 A planning 包让编译器失去边界。

交接文档应逐项记录：A 4.18 负责实际读取/消费者接线，5.18 负责实际 Trip snapshot/override 生命周期，7.9/相关后续设计负责明确的评分映射和参数。当前 5.14 只保证长期事实能稳定读取；不存在的映射能力必须标为未交付。

## 10. Snapshot / Defaults 边界

这是 request-time 长期记录，不是已经固定到 Trip 的快照。后续创建 Trip 时可复制读取结果的事实及 sourceRevision；长期更新不应自动重写历史 Trip。既有 Trip 应使用自己的已保存 snapshot，不每次读最新长期偏好冒充原快照。

5.13 尚未实施时，无记录仍保持空，不创建默认兴趣/滑轨。网络错误与“已验证账户没有记录”必须分开。规划层要使用默认值时，需后续明确来源和规则，不反写长期偏好。

## 11. 回归和交接验收

必须有真实运行和可重现证据，不能仅靠静态 grep 或 type assertion：

| 层次 | 必须验证 |
| --- | --- |
| 单一语义 | 旧路径与新 core 导出引用一致或等价单源证明；全部 5.11 正负向量保持 |
| 读模型 | 精确 envelope/version/scope、revision 0/重置后空、ISO instant、深度独立/只读、JSON round-trip |
| 稀疏值 | missing/false/neutral/空 map/正向 detail-without-parent 均不改变；旧 30-key 拒绝 |
| read facade | 只有 GET；取消/认证失败/网络失败/损坏响应不冒充空；不返回 owner/token |
| 消费边界 | 独立 A-like fixture 只导入公共包和读取入口；传递依赖检查；browser-safe bundle 检查 |
| 真实 Local | 至少两名临时真实 Auth 用户；Cookie/Bearer/public facade、跨账户隔离、读取无写入、写后重新读取 revision |
| 回归 | 5.11 pure+真实 DB、5.16 pure+真实 API/browser；Profile/Companion 相关回归；全仓 tests/lint/typecheck/build/部署本地 gates |
| 不越界 | SQL/Drizzle/generated types 无语义变化；A Planner/Engine/AI/POI/Trip、现有 UI 布局不改 |

若纯 core 提升需要调整历史测试，只能更改路径断言或 import 位置，不删除/弱化字段和行为断言。实际 Local DB/browser 无法运行应报 Partial/Blocked，不伪造 PASS。

## 12. A/B 交接文件

实装生成 `docs/contracts/preference-read-v1-handoff.md`，包括公共 imports、JSON fixtures、浏览器 GET 示例、带 Cookie finalizer 的 server 示例、旧路径兼容方案、错误分类、43 维接口区别、版本升级规则及 Consumer reviewer checklist。

A-like 自动消费测试不是 A 人工审查。Review 状态分别写清：Producer QA、Consumer automated check、A/designated reviewer、人类验收；未发生的审查写 Pending。

## 13. 版本和状态管理

`contractVersion:1.0` 只接受 1.0；不能假设所有 1.x 都兼容。新增 key 对旧 strict parser 仍需版本迁移；改名/删除/改语义需 major 升级、migrator、fixtures 与 Consumer review。5.14 不升级现有 schemaVersion，不改 5.16 wire。

项目启动：5.14 = 进行中。实装与必需 QA 完成：5.14 = 待审查，Issue #321 Open，Draft PR。跨模块 review 和用户验收通过并合入 develop 后，才把中央 Master WBS 的 5.14 行改为已完成并关闭 Issue。

历史文件里的“未开始/待审查”不反向覆盖已合并 Master WBS。更新阶段文字在 Task 自身一次完成，不为了历史页眉反复创建返工任务。

## 14. 基线来源

以下均为本仓库 `de83a1d6cf33eadc9107a529cb1e9590c95d43a4` 或对应已合并记录；执行时需重读 latest develop：

- `docs/project/WBS-TravelAssist.md`：5.11/5.16 completed，5.14 的 Owner、依赖和状态。
- `docs/architecture/cross-module-contract-handoff.md`：Producer/Consumer、单一 shared source、跨模块 review。
- `docs/architecture/preference-schema-v1.md`：23-key、sparse、Hard/Soft、Snapshot/Override 边界。
- `src/features/preferences/domain/preference-v1.ts`：已验收唯一语义实现。
- `docs/architecture/preference-persistence-api-v1.md` 与 `src/server/preferences/http.ts`、`repository.ts`：5.16 Auth/read/CAS 行为。
- `src/features/preferences/persistence/preference-resource.ts`：既有 wire/resource parser。
- `src/shared/contracts/planning/features.ts`：43 维 EffectivePreference/SparsePreference 的独立含义。
- PR #309/#319、Issue #307/#316：前置验收及合并证据。PR #221/#207 仅为历史候选，不能替代 canonical。
