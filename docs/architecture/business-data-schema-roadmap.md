# TravelAssist — 业务数据库开发路线图

> 日期：2026-09-08  
> 状态：执行路线冻结 v1  
> 基础：Supabase PostgreSQL + Supabase SQL Migration + Drizzle ORM  
> DB 基础：TASK-015-A / WBS 8.1 + 8.4  

---

## 1. 目的

TravelAssist 从 DB Foundation 阶段正式进入业务数据层开发。

执行主线：

```text
DB Foundation
  ↓
User / Profile Schema
  ↓
Authentication Core
  ↓
Preference Schema
  ↓
Companion Schema
  ↓
Trip Data
  ↓
POI / Place Data
```

虽然部分 WBS 在技术依赖上可以并行，但第一轮采用上述顺序，优先降低 SQL Migration、RLS、Auth 生命周期和跨模块 Contract 的冲突。

---

## 2. 全局数据库规则

所有业务 Schema 必须继续遵守：

```text
supabase/migrations/*.sql
```

作为唯一正式 Schema 历史。

Drizzle 只作为 Server Query Layer，不建立第二套正式 Migration 历史。

禁止：

- Production / Staging 使用 `drizzle-kit push`；
- Dashboard 手工修改正式 Schema 后不补 Migration；
- 提交真实数据库密码或 Supabase Secret；
- Browser / Mobile 获取 `DATABASE_URL` 或 secret key；
- 为方便开发复制 Auth / Profile / Preference 等多份 Source of Truth。

---

## 3. Phase 0 — DB Foundation 完成门槛

对应：

- WBS 8.1 DB / ORM / Migration 总体方案
- WBS 8.4 DB Migration 全局规范
- TASK-015-A
- PR #186

本地 Runtime Acceptance 已完成：

- WSL2 / Docker：PASS
- Supabase Local start：PASS
- status：PASS
- reset：PASS
- generated types：PASS
- lint：PASS
- typecheck：PASS
- build：PASS
- stop：PASS

但后续业务 Task 的正式实现分支仍必须从 **已包含 TASK-015-A 的最新 `origin/develop`** 创建。

在 PR #186 未合并之前，只允许准备 Task / Design / Issue；不得在未合并的 A feature branch 上叠业务实现。

---

## 4. Phase 1 — User / Profile Schema

### WBS

- 8.2 User / Profile Schema — B / P0

### 第一执行 Task

- TASK-016-B
- Issue #200
- Execution branch：`feature/b-user-profile-schema`

### 数据边界

Supabase：

```text
auth.users
```

是身份认证唯一真源。

业务 Profile 只保存产品资料：

- 昵称 / 显示名称
- 姓名
- 出生日期
- 性别表示（可选）
- 居住国家 / 地区
- 常住城市
- Avatar reference
- 国际化显示设置
- 紧急联系人

禁止复制：

- password / password hash
- access token / refresh token
- Session
- OAuth identity
- 已验证邮箱 / 手机作为独立认证真源

### 推荐表边界

```text
public.profiles
public.profile_settings
public.emergency_contacts
```

Profile 与 Auth 解耦但通过用户 UUID 关联。

---

## 5. Phase 2 — Authentication Core

### WBS

- 8.3 Authentication 核心 — B / P0
- 5.3 登录 / 注册 / Session 用户流程 — B / P0

### 目标

接入 Supabase Auth：

- 邮箱 + 密码
- 邮箱 OTP
- 手机 OTP
- 手机未注册时自动建立最小账户
- Google / Apple Provider 插槽
- Session / Cookie
- Server / Browser Auth Client
- redirect / returnTo intent
- Re-auth 基础

### 关键原则

认证身份仍由 `auth.users` 管理。

Auth Task 负责账号创建与 Profile 生命周期衔接，但不得重新定义 Profile Schema。

账户绑定 / 合并不得静默执行。

---

## 6. Phase 3 — Preference Schema

### WBS

- 5.11 Preference Schema — B / P0
- 5.13 Preference Preset / 默认值 — B / P1
- 5.16 Preference 持久化 API — B / P0
- 5.14 Planner 可读取的 Preference Contract — B / P0

### 数据范围

长期旅行偏好，包括：

- 旅行风格
- 移动 / 交通
- 景点与活动
- 餐饮
- 住宿
- 预算
- 高级设置

Profile Settings 与 Travel Preference 必须分离：

```text
Profile Settings
= locale / timezone / currency / unit

Travel Preferences
= 用户长期旅行倾向
```

Planner 的单次旅行条件不能直接覆盖长期 Preference。

---

## 7. Phase 4 — Companion Schema

### WBS

- 5.12 Companion Schema — B / P1
- 5.17 Companion 持久化 API — B / P1

### 数据范围

同行人长期资料：

- 本人 / 家人 / 儿童 / 婴儿 / 朋友
- 年龄或年龄段
- 性别等必要基础属性
- 移动能力
- 饮食限制
- 兴趣
- 住宿需求
- 无障碍 / 特殊需求

### 边界

`emergency_contacts` 与 `companions` 是不同领域：

```text
Emergency Contact
= 紧急联络资料

Companion
= 可参与 Trip 规划的人物资料
```

不得共用同一业务表。

---

## 8. Phase 5 — Trip Data

Trip 必须区分两个数据责任域。

### B：个人旅行资产

WBS：

- 5.18 保存行程 / 历史 / 草稿数据模型 — B / P0
- 5.19 Trip Save / Read / History Contract — B / P0

负责：

- 用户拥有的 Trip Library
- Draft / Planning / Upcoming / Completed / Archived
- 收藏 / 历史关联
- 用户与 Trip 的关系
- Personal Center 读取契约

### A：主系统 Trip Plan

WBS：

- 8.5 主系统 Trip Plan Schema — A / P0

负责：

- Planner Trip Plan
- Day Plan
- Itinerary Items
- 路线 / 固定时段 / 预约绑定
- AI 重排行程需要的结构

### 合并原则

不得由 B 自己重新实现一套 Planner 行程结构，也不得由 A 自己重新建立个人中心 Trip Library。

二者通过明确 Contract 交接。

---

## 9. Phase 6 — POI / Place Data

### WBS

- 7.2 Places / POI Provider 选型 — A / P0
- 7.4 POI 标准 Schema — A / P0
- 7.6 地点搜索 API — A / P0
- 7.7 POI 详情 API — A / P1

### 顺序

```text
7.2 Provider 选型
  ↓
7.4 Provider-neutral POI 标准 Schema
  ↓
7.6 / 7.7 API
```

POI Schema 不应直接成为某一家 Provider response 的数据库镜像。

需要支持：

- TravelAssist canonical place ID
- Provider IDs / aliases
- multilingual name
- coordinates / PostGIS geography
- address / region
- category / tags
- opening / source metadata 的扩展边界
- image / asset reference

并与当前 Japan destination / attraction 素材实体逐步对齐。

---

## 10. RLS 默认策略

私人数据默认：

```text
RLS ON
Default Deny
```

典型私人域：

- Profile
- Profile Settings
- Emergency Contact
- Preference
- Companion
- User Trip Library

POI / Place 属于公共 / 平台数据，权限模型另行定义，不能机械套用用户私有 RLS。

---

## 11. Migration 开发标准

每个 Schema Task 至少执行：

```text
npm ci
npm run db:start
npm run db:status
npm run db:reset
npm run db:types
数据库专项测试
npm run lint
npm run typecheck
npm run build
npm run db:stop
```

Windows PowerShell 若 Execution Policy 阻止 `npm.ps1`，使用：

```text
npm.cmd
```

Migration 合入后不得修改历史；错误通过新的 corrective migration 修正。

---

## 12. 当前启动点

当前只启动第一张业务 Schema Task：

```text
TASK-016-B — User / Profile Schema
Issue #200
```

后续 Auth / Preference / Companion / Trip / POI 各自建立独立 Task，不把所有业务表一次性塞进一个 PR。
