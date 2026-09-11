# Preference Read v1 — A/B 跨模块交接

- Contract：`LongTermPreferenceReadV1` / `contractVersion: "1.0"`。
- Producer：B / TASK-046-B / WBS 5.14 / Issue #321。
- Consumer：A；后续 4.18 和经独立授权的消费者。本 Task 不接 Planner runtime。
- Compatibility：新增只读公共入口；core/resource 机械提升并保留旧 B 路径；无 HTTP/DB breaking change。
- Producer / Consumer automated QA：PASS；真实 Local Auth/API/browser：PASS。完整门禁和提交见 [Result](../tasks/RESULT-TASK-046-b-planner-preference-contract.md)。
- **A / designated integration reviewer：Pending。用户验收：Pending。** 自动测试不是 A 人工接受记录。

## 公共 imports

```ts
import {
  PREFERENCE_READ_CONTRACT_VERSION,
  parseLongTermPreferenceReadV1,
  toLongTermPreferenceReadV1,
  preferenceStrengths,
  interestCodes,
  interestDetails,
  type LongTermPreferenceReadV1,
  type PreferenceReadResultV1,
  type ReadonlyPreferenceV1,
} from "@/shared/contracts/preferences";
import { readCurrentLongTermPreference } from "@/lib/preferences/client";
```

index 显式导出只读模型/parser、必要类型、稳定 codes、由唯一 registry 派生的 strength 与 synthetic fixtures；不导出 patch/save/reset、DB、UI tier/表单 parser metadata。内部 core 和 persistence-resource 仅供 B 兼容使用，A 导入公共 index。

完整传递依赖不包含 React、Next server、Supabase/Drizzle、features 或环境配置。Server facade 单独 server-only。输出与调用者输入分离且深度冻结，嵌套 map/array 也只读。

## Browser GET-only 示例

```ts
import { readCurrentLongTermPreference } from "@/lib/preferences/client";

const controller = new AbortController();
const result = await readCurrentLongTermPreference({
  signal: controller.signal,
});
if (result.ok) {
  // 后续消费者使用 result.data 的长期事实；不能强转评分向量。
  const sourceRevision = result.data.sourceRevision;
} else if (result.code !== "REQUEST_CANCELLED") {
  // 展示登录/重试/不支持版本状态；不得替换成空偏好。
  const failureCode = result.code;
}
```

固定同源 GET `/api/preferences`，credentials same-origin、cache no-store。不接收 owner/endpoint/token，不维护跨账户缓存，不写 localStorage，不隐式 PATCH/reset。取消是独立失败结果。

## Server 请求级组合示例（必须 finish）

```ts
import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { readCurrentLongTermPreferenceForRequest } from "@/server/preferences/public-read";

export async function GET(request: NextRequest) {
  const { result, finish } =
    await readCurrentLongTermPreferenceForRequest(request);
  const status = result.ok ? 200 : result.code === "AUTH_REQUIRED" ? 401 : 503;
  return finish(NextResponse.json(result, { status }));
}
```

这是未来组合示例，本次没有新建重复 endpoint。成功/失败分支都必须调用 finish，将真实 Auth 刷新/删除 Cookie（分片及属性）和 private/no-store headers 回传。outer response 自有 Cookie 与 Vary 保留。不要将 request、Response、SupabaseClient 或 finalizer 放进公共 JSON。

内部直接复用 `handlePreference(request, "get")`。Cookie/Bearer 均经 getUser 验证；无效显式 Bearer 不回退 Cookie，用户上下文 RLS 保持；没有 service-role shortcut、自报 owner、任意主机 self-fetch 或公共 Server Action。

## 版本、稀疏值与时间

| 字段                     | 语义                                                         |
| ------------------------ | ------------------------------------------------------------ |
| contractVersion          | 公共读取 envelope 版本，精确接受 1.0                         |
| preference.schemaVersion | 唯一 23-key 字段版本，精确接受 1.0                           |
| sourceRevision           | 当前账户长期记录版本，非 Trip revision/global ID/snapshot ID |

恰好五个顶层字段：contractVersion、scope、sourceRevision、sourceUpdatedAt、preference。scope 必须 long_term。revision 为非负安全整数，本 v1 的 DB 来源范围为 `0..2147483647`。revision 0 只允许 empty values + null time；正 revision 可为空但必须有 DB 时间。严格验证 ISO instant 的真实日历日期、时分秒、Z/offset，支持 DB 微秒，保留原字符串，不生成当前时间或重新编号。

missing、false、neutral、空 map、空 detail array、style 3 都保持。仅三个交通排除 true 为 hard_when_true；false child 不解除 true parent。walking/queue 是 soft_constraint_input，兴趣 dislike 是负向 soft，detail 可以没有 parent。metadata 不执行 gate/打分/修值；style.planning 不授权 AI 自动改行程。

## Synthetic JSON fixtures

对应公共 syntheticMissingPreferenceReadV1 / syntheticResetPreferenceReadV1 / syntheticExplicitPreferenceReadV1。仅用于理解与测试，不得用作账户默认事实或错误回退。

```json
{
  "contractVersion": "1.0",
  "scope": "long_term",
  "sourceRevision": 0,
  "sourceUpdatedAt": null,
  "preference": { "schemaVersion": "1.0", "values": {} }
}
```

```json
{
  "contractVersion": "1.0",
  "scope": "long_term",
  "sourceRevision": 2,
  "sourceUpdatedAt": "2026-09-11T13:00:00.123456+00:00",
  "preference": { "schemaVersion": "1.0", "values": {} }
}
```

```json
{
  "contractVersion": "1.0",
  "scope": "long_term",
  "sourceRevision": 7,
  "sourceUpdatedAt": "2026-09-11T13:00:00Z",
  "preference": {
    "schemaVersion": "1.0",
    "values": {
      "mobility.noPublicTransit": true,
      "mobility.noBus": false,
      "mobility.walkingTolerance": "low",
      "dining.localCuisine": "neutral",
      "style.planning": 3,
      "interests.preferences": {},
      "interests.details": { "photography": ["landscape"] }
    }
  }
}
```

## 错误分类

| code                           | 消费方式                                        |
| ------------------------------ | ----------------------------------------------- |
| AUTH_REQUIRED                  | 未认证/会话无效，走既有登录流程                 |
| AUTH_UNAVAILABLE               | Auth 服务不可用，不代表无记录                   |
| PREFERENCE_UNAVAILABLE         | 网络/DB/未知上游失败，可显式重试                |
| INVALID_PREFERENCE_RESPONSE    | 损坏 JSON/envelope/revision/time/字段，拒绝消费 |
| UNSUPPORTED_PREFERENCE_VERSION | 不支持 contract/schema 版本，需兼容升级         |
| REQUEST_CANCELLED              | 用户取消，不能当空成功或写默认值                |

Parser 两种验证异常由 PreferenceReadValidationError.code 区分；facade 返回 `{ok:false,code}`。401/503/损坏 JSON/未知版本/取消都不能返回成功空偏好。不返回 owner/token/SQL/堆栈或原始错误。

## 路径迁移及兼容窗口

| 旧路径                                                  | 唯一实现与兼容                                                                                         |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| features/preferences/domain/preference-v1.ts            | shared/contracts/preferences/core.ts；旧文件仅 re-export，引用与行为一致                               |
| features/preferences/persistence/preference-resource.ts | shared/contracts/preferences/persistence-resource.ts；旧文件仅 re-export，5.16 wire/CAS 不改           |
| A 新消费者                                              | shared/contracts/preferences/index.ts + lib/preferences/client.ts 或 server/preferences/public-read.ts |

本次不删除兼容路径，不设置未经接受的移除日期。B consumers 全部迁移并经独立 review 后才可另行弃用。core 的原字段、异常、64 KiB 与 patch 行为不变；投影复用唯一 resource/core parser，只新增公共 envelope、来源范围、严格时间和冻结输出校验。

## 23-key / 43-dimension 边界矩阵

| 模型/工作                      | 含义与本次边界                                                                           |
| ------------------------------ | ---------------------------------------------------------------------------------------- |
| LongTermPreferenceReadV1       | 23-key sparse 长期事实，request-time 读取；已交付，不是 Trip snapshot                    |
| Planning EffectivePreferenceV1 | 43 PoiFeatureCode 的 1–9 值 + snapshotRef/overrideRevision；原 A 合同不变，不可赋值/强转 |
| Planning SparsePreferenceV1    | AI-only 43-code projection，neutral 5 省略；未生成、无默认 43 个 5                       |
| 4.18                           | A 后续实际 Planner 消费接线；未启动                                                      |
| 5.18 / 相关工作                | Trip snapshot/override 生命周期；未交付，不伪造 snapshotRef                              |
| 7.9 / 明确后续设计             | 映射权重和校准；未交付，不把 walking 五档转成固定 1–9、不降级 hard 排除                  |
| 5.13                           | 默认值来源与 preset；未启动，missing 保持 missing                                        |

未来新 Trip 可按独立设计复制事实及 sourceRevision；长期更新不重写旧 Trip。既有 Trip 使用自己的保存 snapshot，不能取最新长期值冒充原快照。本次不存在生产 converter。

## 升级与人工 Review checklist

只接受精确 1.0，不能假定所有 1.x 兼容。新增 key/enum 仍可能被 strict parser 拒绝，需要版本迁移、fixtures 和 Consumer review；改名/删除/改语义需 major、migrator 和兼容窗口。本次不升级 schemaVersion、不改变 5.16 wire。

- [x] Producer 自动合同测试：单源机械比对、独立向量、深度冻结、错误分类。
- [x] A-like 自动消费：仅公共 imports，传递依赖、browser bundle、23/43 类型边界。
- [x] 真实 Local：两 Auth 用户、Cookie/Bearer、真实 Cookie 刷新 finalizer、无写入、更新/Reset/隔离、取消/失败。
- [x] 本次重跑 5.16 真实 Save/reload/409/Cancel/Reset UI/API 回归。
- [ ] A/designated reviewer 确认 ownership、公共 imports 和兼容窗口：Pending。
- [ ] A reviewer 确认 missing/default、hard/soft、snapshot、23/43 边界：Pending。
- [ ] A reviewer 确认 server finish 和错误 UX：Pending。
- [ ] 用户最终验收：Pending。
- [ ] 用户授权后的合并与中央 WBS 完成同步：未执行。

当前为 Producer 实现与 QA 后待审查，未声称 A 人工通过。合同不代表 Planner 已接线，下游任务不自动启动。
