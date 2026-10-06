# TravelAssist — Security / Privacy / Secrets / Abuse / Prompt-Injection Defense Model

> 状态：冻结为全系统安全与隐私控制面 v1  
> 适用范围：Web/Mobile、AI、Planner、Tool/Action、Trip、Booking、Payment Handoff、Realtime Location、Plugins/Providers。

## 1. 安全边界

```text
Client
↓
Authentication
↓
Authorization
↓
Input Validation
↓
AI / Business Layer
↓
Tool / Action Policy
↓
Execution Adapter
↓
External Provider
```

任何层都不能因为上一层“已经检查过”而完全放弃自己的边界校验。

## 2. Authentication

支持标准用户 Session / Token 体系。

要求：

- Secure / HttpOnly Cookie（Web 场景适用时）
- Session Rotation
- Logout Revocation
- MFA 可后续扩展
- 不在 URL 中放长期 Secret

## 3. Authorization

统一 Permission Model：

```text
actor + resource + action + context
```

所有服务端写操作再次检查权限。

## 4. Least Privilege

服务、Worker、Provider Credential 使用最小权限。

例如：

- Search Worker 不拥有 Payment Secret
- AI Orchestrator 不拥有直接 DB 任意写权限
- Notification Worker 不拥有 Trip Mutation 权限

## 5. Secret Management

Secret 只能存在：

```text
server env / secret manager
```

禁止进入：

- Git
- Client Bundle
- Prompt
- AI Message
- Logs
- Analytics

## 6. Secret Rotation

Provider Key 必须支持：

```text
versioned secret
dual-key transition
rotation
revocation
```

## 7. Data Classification

建议：

```text
public
internal
personal
sensitive
restricted
```

位置、Booking Reference、Payment Metadata 属于更严格类别。

## 8. Privacy by Purpose

数据只能用于原先声明目的。

例如精确位置：

```text
用于实时旅行辅助
```

不能自动用于无关画像或广告。

## 9. Location

要求：

- 独立授权
- 可关闭
- 最小化采样
- 短期 Raw Retention
- 不进入普通 LLM Prompt
- 不进入长期 Memory
- 同行人共享独立授权

## 10. Payment

TravelAssist 不保存完整卡号 / CVV。

只使用 Payment Provider Handoff / Tokenized Reference。

## 11. Booking

Booking Reference、姓名、联系信息按必要范围传递给对应 Provider。

不向无关 Tool 暴露。

## 12. AI Prompt Injection

外部内容：

```text
web text
POI description
hotel text
user upload
provider response text
```

统一视为 Untrusted Data。

不能覆盖：

- System Instruction
- Tool Permission
- Action Policy
- Security Rules

## 13. Tool Injection Defense

LLM 只能调用注册 Tool：

```text
name
schema
allowlist
permission
```

禁止自由：

- shell
- SQL
- arbitrary URL fetch
- arbitrary file access

## 14. Action Defense

LLM 无论文本如何，都不能直接：

```text
payment
booking cancel
trip mutation
external send
permission change
```

必须进入 Action Router。

## 15. Structured Validation

所有 Tool / Action 参数：

```text
Schema
Range
Resource ID
Permission
Business Preconditions
```

全部服务端校验。

## 16. SSRF / URL

外部 Provider URL 使用后端固定 allowlist / adapter，不接收 AI 任意 URL。

## 17. SQL Injection

业务层使用参数化 ORM / Query Builder。

AI 不产生可直接执行 SQL。

## 18. XSS

AI / User Markdown 进入 UI 前必须安全渲染；禁止未经净化直接插入 HTML。

## 19. CSRF

状态修改接口需要适合当前 Auth 模式的 CSRF 防护。

## 20. Replay

Confirmation、Webhook、Action 使用：

```text
nonce / idempotency / timestamp / expiry
```

防重放。

## 21. Webhook Security

必须：

- Signature Verification
- Replay Window
- Source Allowlist
- Schema Validation
- Idempotency

## 22. Rate Limit

至少按：

```text
user
IP
session
endpoint
provider budget
```

控制。

## 23. Abuse

防：

- AI API 滥用
- Search scraping
- Notification spam
- Invite spam
- Repeated booking action attempts
- brute-force identifier access

## 24. Object-level Authorization

任何：

```text
/trips/:id
/orders/:id
/bookings/:id
```

都必须验证该用户与资源关系，防 IDOR。

## 25. Multi-tenant Isolation

所有用户级查询显式约束 tenant/user/resource scope。

缓存同样不能跨用户泄露。

## 26. Logging Privacy

日志禁止：

- Access Token
- Secret
- Password
- Full Payment Data
- Full precise location trail
- Full AI conversation by default

## 27. Encryption

传输：

```text
TLS
```

存储敏感数据使用平台提供的加密能力，并对更敏感字段考虑额外加密。

## 28. Dependency Security

CI：

```text
dependency audit
lockfile
secret scan
SAST
```

高风险依赖升级需 Review。

## 29. File Upload

限制：

```text
mime
size
extension
virus/malware scan where available
storage isolation
signed access
```

不信任文件名。

## 30. AI Data Minimization

Context Builder 只提供当前任务必要数据。

不要把完整用户账户、订单、位置历史全部送入模型。

## 31. Model Provider Boundary

向模型 Provider 发送前：

- 最小化
- 避免 Secret
- 避免不必要 PII
- 记录用途与 Provider

## 32. Security Event

建议：

```text
auth.failed
permission.denied
action.policy_blocked
webhook.signature_failed
rate_limit.triggered
secret.rotation
suspicious_access
```

## 33. Security Alert

P1/P2：

- 越权写入
- Payment/Booking 状态篡改
- Secret 泄漏
- 大规模数据暴露
- Prompt Injection 导致 Action Policy bypass 尝试成功

## 34. Kill Switch

高风险能力需要：

```text
AI action execution
realtime auto-optimize
external messaging
booking mutation
```

独立 Kill Switch。

## 35. Security Audit

高风险操作保存：

```text
actor
resource
permission decision
confirmation
action
execution
provider
result
trace_id
```

## 36. Data Deletion

用户删除账户/数据时：

- 用户可删除数据按政策处理
- 法律/交易/安全审计按独立保留要求处理
- 不用“删聊天”误删必要订单记录

## 37. Security Testing

必须包含：

```text
permission tests
IDOR tests
CSRF
XSS
prompt injection
tool injection
webhook replay
idempotency
rate limit
secret leakage scan
```

## 38. v1 Gate

- 客户端无 Provider Secret
- Tool/Action 严格 allowlist
- Resource-level permission
- Location 独立授权
- Raw Location 不进 LLM
- Webhook 有签名校验
- 高风险 Action 有 Confirmation
- 日志 Redaction
- Rate Limit
- Kill Switch

## 39. 最终冻结原则

> AI 是不可信决策建议来源之一，而不是安全边界。

> Prompt 规则只能辅助，真正权限必须由服务端 Policy 强制执行。

> 最小权限、最小数据、显式授权和可审计执行是 TravelAssist 的安全基础。

> 任何外部文本都不能改变 Tool / Action / Permission Policy。
