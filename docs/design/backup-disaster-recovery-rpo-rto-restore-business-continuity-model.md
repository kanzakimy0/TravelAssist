# TravelAssist — Backup / Disaster Recovery / RPO-RTO / Restore & Business Continuity Model

> 状态：冻结为数据恢复与业务连续性 v1  
> 适用范围：Trip、User Preference、Booking/Order Mirror、AI Conversation、Audit、Event/Outbox、Data Governance、Serving Index、Config/Flags。

## 1. 核心目标

- 明确哪些数据必须备份、多久备份、允许丢多少、多久恢复。
- 区分 Source of Truth 与可重建副本。
- 让数据库事故、错误发布、数据污染、Provider 故障都有恢复路径。
- 恢复过程本身可演练、可验证、可审计。

## 2. RPO / RTO

RPO = 允许最多丢失多少时间范围的数据。  
RTO = 从事故发生到恢复可用的目标时间。

具体数值由生产规模与成本后续冻结，但必须按数据等级分别定义。

## 3. 数据等级

### Tier A — 不可轻易丢失

```text
Trip Current State / Version History
User Account / Permission
Booking / Order State
Action / Confirmation / Execution Audit
Payment Provider References
```

### Tier B — 重要但可重新计算一部分

```text
User Preference
AI Conversation
Planner Proposal
Realtime Summary
```

### Tier C — 可重建

```text
Cache
Materialized View
Search Index
Derived Feature Serving Copy
Analytics Aggregate
```

## 4. Backup Principle

Tier C 不依赖备份作为主要恢复手段：

```text
Canonical Data
→ rebuild cache/view/index
```

## 5. Database Backup

至少支持：

```text
automated snapshot
point-in-time recovery where available
backup verification
retention policy
encrypted backup
```

## 6. PITR

错误批量写入时，Point-in-Time Recovery 可用于重建恢复数据库。

不应直接覆盖生产而不先验证。

## 7. Restore Environment

```text
backup
↓
restore sandbox
↓
integrity validation
↓
compare production
↓
recovery decision
```

## 8. Logical Recovery

少量实体损坏优先：

```text
Audit / Event / Version History
→ targeted reconstruction
```

而不是全库回滚。

## 9. Trip Recovery

Trip 可通过：

```text
snapshot + version diffs + action audit
```

重建。

恢复旧 Trip 也创建新当前版本，不篡改历史。

## 10. Booking / Payment

数据库恢复后：

```text
local mirror
↔ provider status
```

重新核对。

## 11. Event / Outbox Recovery

恢复后检查：

- 未发布 Outbox
- 重复 Event
- Consumer Inbox
- Pending Jobs

利用幂等语义继续执行。

## 12. Action Unknown

恢复期间不盲目重试高风险副作用。

先：

```text
provider reconciliation
```

确认最终状态。

## 13. Config Backup

必须版本化保存：

```text
Feature Flags
Approved Planner Baseline
Weight Profiles
Data Bundle Pointer
Serving Bundle Pointer
Trigger Policies
```

## 14. Secret Recovery

Secret 不进入普通备份，使用独立 Secret Manager 与 Rotation Procedure。

## 15. Data Corruption

```text
Detect
↓
Freeze writes if needed
↓
Identify scope
↓
Preserve evidence
↓
Rollback dataset / targeted repair
↓
Validate
↓
Resume
```

## 16. Bad Deployment

优先：

```text
Kill Switch
Feature Rollback
Planner Baseline Routing
```

无需数据库恢复。

## 17. Bad Data Release

```text
Data Bundle rollback
Serving Bundle rollback
Cache namespace switch
Search alias switch
```

## 18. Provider Outage

Provider Outage 主要通过：

```text
degrade
queue
reconciliation
provider fallback
```

处理，而不是恢复数据库。

## 19. Backup Verification

备份“存在”不等于可恢复。

必须周期性：

```text
restore test
schema integrity
row count
checksum
critical query
```

## 20. Restore Drill

建议定期演练：

```text
Trip restore
DB PITR
Data Bundle rollback
Search rebuild
Event replay
Booking reconciliation
```

## 21. Restore Validation

至少验证：

- Auth / Permission
- Trip current version
- Booking mirror
- Audit chain
- Outbox
- Planner read
- Search rebuild
- Notification queue

## 22. Business Continuity

核心降级优先级：

```text
View existing Trip
Booking / Order state
Manual itinerary
Map / cached offline
Basic support
```

AI / 高级 Planner 暂时不可用时，也应保证用户能继续查看关键旅行信息。

## 23. Mobile Offline

离线能力可继续提供：

- 当前 Trip
- POI 摘要
- Booking 摘要
- Cached Route

但不替代服务器备份。

## 24. Recovery Communication

用户只需知道：

- 什么功能受影响
- Trip / Booking 是否安全
- 是否需要用户动作

不暴露内部基础设施细节。

## 25. Backup Security

备份必须：

- encrypted
- restricted access
- audit access
- retention / deletion policy
- no plaintext secrets

## 26. Restore Authorization

生产 Restore 属于高风险运维操作，必须：

- restricted role
- approval
- audit
- incident/reference id

## 27. Metrics

```text
backup_success
backup_age
restore_test_success
restore_duration
reconciliation_backlog
search_rebuild_duration
```

## 28. Alerts

- backup overdue
- restore test failed
- PITR unavailable
- critical replication lag
- reconciliation backlog excessive

## 29. First-stage v1

实现：

```text
DB automated backup
backup retention
restore runbook
Trip reconstruction test
Data/Serving Bundle rollback
Search full rebuild
Booking reconciliation procedure
Feature/Planner baseline recovery
backup monitoring
```

## 30. v2

增加：

```text
scheduled restore drill
automated integrity verification
cross-region backup
recovery dashboard
```

## 31. v3

增加：

```text
multi-region failover
automated disaster simulation
advanced continuity orchestration
```

## 32. 验收 Gate

- Tier A/B/C 数据分类明确
- Source of Truth 与可重建副本分离
- Backup 可实际 Restore
- Trip 可重建
- Booking 可 Reconcile
- Data Bundle 可 Rollback
- Search/View 可重建
- Restore 操作有审计
- 关键恢复 Runbook 已存在

## 33. 最终冻结原则

> 没有被验证过的备份，不算真正的备份。

> 可重建副本优先重建，不把 Redis/Search 当核心备份对象。

> 高风险外部交易恢复时先 Reconcile，不盲目 Retry。

> 灾备目标不是让所有高级功能永不停机，而是优先保护 Trip、订单、权限和用户可继续旅行的能力。
