# TravelAssist — API Contract / Schema Registry / Compatibility / Idempotency Model

> 状态：冻结为服务间契约与兼容治理 v1  
> 适用范围：Web/Mobile API、Planner、AI、Tool、Action、Data Serving、Realtime、Webhook、Provider Adapter。

## 1. 总体原则

> API 是系统边界合同，不是内部实现泄漏。

> 所有长期使用的 DTO / Event / Tool / Action Schema 必须版本化。

> 兼容性优先采用 Additive Change，破坏性修改需要新版本与迁移窗口。

## 2. API 类型

建议区分：

```text
Public Client API
Internal Service API
Tool Contract
Action Contract
Event Contract
Webhook Contract
Provider Adapter Contract
```

## 3. Public API

客户端 API 只暴露产品需要字段。

禁止暴露：

- internal prompt
- raw provider payload
- internal DB schema
- provider secret
- admin-only metadata

## 4. Internal API

Planner / Data Serving / AI 内部服务仍必须有明确 DTO，不允许“大家都直接查数据库”。

## 5. Schema Registry

建议建立：

```text
schema_registry
```

记录：

```text
schema_key
schema_type
version
status
definition
checksum
created_at
retired_at
```

## 6. Schema 类型

```text
api_request
api_response
tool_input
tool_output
action_input
action_output
event
webhook
serving_dto
```

## 7. Version

建议：

```text
v1
v2
```

版本号表达 Contract Compatibility，不表达部署次数。

## 8. Additive Change

优先：

- 新增 optional field
- 新增 enum value（Consumer 必须容忍 unknown）
- 新 endpoint

## 9. Breaking Change

例如：

- 删除字段
- 改字段含义
- required ↔ optional 破坏兼容
- 更改单位
- 更改 ID 语义

必须新 Contract Version。

## 10. Units

所有数值明确单位：

```text
duration_seconds
distance_meters
cost_amount + currency
temperature_celsius
```

禁止模糊字段 `duration`。

## 11. Time

统一 ISO 8601。

必须明确：

```text
instant timestamp
local datetime
timezone
date-only
```

Trip 本地时间不得无 timezone 语义。

## 12. IDs

不同实体使用不同语义 ID：

```text
trip_id
poi_id
booking_id
provider_reference_id
```

不要用一个 generic id 到处复用。

## 13. Enum Forward Compatibility

Consumer 遇到未知 enum：

- 不 crash
- 使用 unknown / unsupported
- 记录 telemetry

## 14. Error Contract

统一：

```ts
interface APIError {
  code: string;
  message: string;
  retryable: boolean;
  traceId: string;
  details?: unknown;
}
```

用户文案与内部 Error Code 分离。

## 15. HTTP Status

HTTP 表示协议层结果，Business Status 放结构化 Body。

例如 Booking 202 不代表已取消。

## 16. Pagination

统一 Cursor Pagination。

避免大 POI / Event 列表使用不稳定 offset。

## 17. Batch

高频内部读取提供 batch endpoint，限制最大 batch size。

## 18. Idempotency

写操作支持：

```text
Idempotency-Key
```

并绑定：

```text
actor
action
payload_hash
scope
expiry
```

## 19. Retry Semantics

Contract 明确：

```text
safe_to_retry
unsafe_to_retry
idempotent_with_key
```

## 20. Optimistic Concurrency

版本化资源写操作使用：

```text
base_version
```

或等价 ETag/If-Match 语义。

## 21. Tool Contract

Tool 必须：

- input schema
- output schema
- tool version
- timeout
- retry policy
- freshness semantics

## 22. Action Contract

Action 额外：

- risk
- permission
- confirmation
- idempotency
- optimistic lock
- compensation

## 23. Event Contract

事件 Envelope 固定，Payload 独立版本。

Consumer 必须声明支持的版本。

## 24. Webhook Contract

外部 Webhook 先适配成内部 Event。

业务逻辑不直接消费第三方原始 Schema。

## 25. Contract Test

每个 Provider / Internal Service 至少：

```text
schema validation
required field
unknown field tolerance
error mapping
version compatibility
idempotency
```

## 26. Consumer-driven Contract

关键内部服务可维护 Consumer Expectation，防止 Producer 发布破坏性变更。

## 27. Deprecation

流程：

```text
introduce new
dual support
measure old usage
announce retirement
migrate
disable
remove
```

## 28. Compatibility Window

Planner Rollout 期间旧 Baseline 与新 Bundle 必须同时可调用兼容 API。

## 29. Schema Checksum

Planner Run / Audit 可记录关键 Contract checksum，支持事故重现。

## 30. API Gateway / Edge

统一处理：

- authentication
- request id
- rate limit
- request size
- basic schema
- tracing

业务权限仍由后端资源层检查。

## 31. Client Version

移动端请求带 client version。

服务端可判断是否支持某 Contract / Feature。

## 32. Minimum Supported Client

废弃旧 Contract 前必须考虑仍在使用的 App 版本。

## 33. API Observability

```text
request rate
success rate
latency
error code
client version
schema rejection
deprecated version usage
```

## 34. Documentation

Schema Registry 作为 OpenAPI / internal docs 的来源之一，避免文档与实现分叉。

## 35. v1 Gate

- 公共/内部 API 分离
- DTO 有版本
- 时间/单位明确
- 统一 Error Contract
- 写操作幂等
- Trip 写入有 base_version
- Event/Webhook 有版本
- Contract Test
- Breaking Change 有迁移窗口

## 36. 最终冻结原则

> API Contract 必须比实现更稳定。

> Schema Version 是跨服务协作与安全回滚的基础。

> Planner、Data、Tool、Action、Event 都不能依赖未版本化的“临时 JSON”。

> 服务可独立升级的前提，是输入输出合同明确、兼容、可测试。
