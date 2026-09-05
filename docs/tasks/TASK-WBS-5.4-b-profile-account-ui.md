# WBS-5.4-B — Profile / 账户设置 UI

## Metadata

- Task ID: `WBS-5.4-B`
- WBS ID: `5.4`
- Owner: `B`
- Responsibility: `Personal Center`
- Priority: `P1`
- Status: `待审查`
- Implementation Commit: `ef31dafbe61e1c006c752ec07f160d47d4639b2f`
- Pull Request: [#76](https://github.com/kanzakimy0/TravelAssist/pull/76)（Draft / Open，不自动合并）
- Result: [WBS-5.4-B Result](RESULT-WBS-5.4-b-profile-account-ui.md)
- Validation: lint / typecheck / build / 56 Node tests / Edge 五个视口通过；npm test 缺脚本及全仓 13 份上游格式例外详见 Result，不改其他 Owner 文件。
- Persistence: Mock / in-memory only
- Issue: [#75](https://github.com/kanzakimy0/TravelAssist/issues/75)（Open）
- Base Commit: `bc0b8d7ee712c3bb9d123e137551ca87d5216599`
- Execution Branch: `feature/b-account-wbs-5-4-profile-account-ui`
- Preflight: 1.24 / 5.1 已完成；没有重复实现，PR #74 仅为已合并 Task 文档。
- Engineering note: develop 没有 npm test 脚本；不修改 A 全局工程配置，实际记录该命令结果并以现有 Node runner 执行测试。
- PR safety: 首次追踪提交附 [skip ci]，随后创建 Draft，防止现有 feature 自动合并工作流误合并；不更改工作流。
- Depends On: `1.24`, `5.1`
- Dependency Status: 两项均已完成
- Repository: `https://github.com/kanzakimy0/TravelAssist.git`
- Workspace: `F:\TravelAssist`
- Base Branch: `develop`
- Proposed Branch: `feature/b-account-wbs-5-4-profile-account-ui`
- Proposed Issue: `[WBS 5.4][B] Profile / 账户设置 UI`
- Task File: `docs/tasks/TASK-WBS-5.4-b-profile-account-ui.md`

---

# 1. Objective

把当前 `/personal-center/account` 占位页实现为正式的 Profile / 账户设置 UI。

本 Task 是 **UI / Interaction Task**，目标是完成 WBS 1.24 已冻结的账户总览体验，并在没有真实 Auth / DB / API 的阶段使用明确的本地 Mock / in-memory state 验证交互。

本 Task 不依赖 WBS 8.2 / 8.3 / 5.15，因此不得因为真实 Profile API 尚未完成而阻塞 UI 实现。

---

# 2. Current State

当前：

```text
/personal-center/account
```

仍使用：

```text
PersonalPlaceholder
```

只显示“个人资料与账户设置将在后续开放”。

WBS 5.1 已提供共享 PersonalCenterShell，WBS 5.2 已提供 Avatar Popover；本 Task 必须复用这些既有结构，不重新设计 Shell。

---

# 3. Design Authority

执行前必须读取最新 `develop` 上：

```text
docs/project/WBS-TravelAssist.md
docs/ui/profile-account.md
docs/ui/account-security-data-privacy.md
docs/ui/personal-center.md
docs/ui/personal-center-shell.md
docs/ui/personal-center-responsive-states.md
docs/ui/design-system.md
docs/development/task-tracking.md
```

优先级：

```text
用户已确认的最新视觉 / 产品决定
>
docs/ui/profile-account.md
>
docs/ui/account-security-data-privacy.md（仅账户子入口边界）
>
personal-center-responsive-states.md
>
personal-center-shell.md / personal-center.md
>
当前占位实现
>
Codex 自行推导
```

禁止把页面重新设计成传统 Admin Dashboard。

---

# 4. Git Preflight

执行：

```bash
git status
git remote -v
git fetch --all --prune
git checkout develop
git pull --ff-only origin develop
git log -1 --oneline
```

要求：

- working tree clean
- local develop 与 origin/develop 一致
- 记录执行时真实 Base Commit
- 搜索最新 A/B Task、Issue、PR
- 搜索是否已有等价 WBS 5.4 实现

如存在其他正在执行的 5.4 Task / branch / PR：停止并返回 Blocked，不覆盖。

---

# 5. GitHub Issue

执行前搜索：

```bash
gh issue list --state all --search "WBS 5.4" --limit 20
```

若存在明确等价 Issue，复用；禁止重复创建。

若不存在，创建：

```text
[WBS 5.4][B] Profile / 账户设置 UI
```

Issue Body 至少包含：

```md
## Metadata

- Task ID: WBS-5.4-B
- WBS ID: 5.4
- Owner: B
- Depends On: 1.24, 5.1
- Task File: docs/tasks/TASK-WBS-5.4-b-profile-account-ui.md
- Branch: feature/b-account-wbs-5-4-profile-account-ui
- Status: 进行中

## Objective

Implement the frozen Profile / Account overview UI inside the existing Personal Center Shell using local UI state only. No Auth / DB / API.
```

---

# 6. Start Tracking

从执行时最新 `develop` 创建：

```bash
git checkout -b feature/b-account-wbs-5-4-profile-account-ui
git push -u origin feature/b-account-wbs-5-4-profile-account-ui
```

然后只对 Master WBS 做定点修改：

```text
5.4 未开始 → 进行中
```

并新增 `WBS-5.4-B` 自己的 Tracking Record。

禁止改动其他 WBS 行。

---

# 7. Page Structure

最终 `/personal-center/account` 至少包含：

```text
账户
管理您的个人资料与基本设置

[个人资料]    [联系方式]
              [基本设置]

[紧急联系人]

[登录与安全] [数据与隐私] [预订与账户同步]
```

继续运行在既有 PersonalCenterShell 中：

- Sidebar 不变
- Top Actions 不变
- Avatar Popover 不变
- Sidebar 当前项 = 账户
- 主背景 / 已有装饰不重新设计

---

# 8. Profile Card

字段：

```text
昵称 *
姓名
出生日期
性别
居住国家 / 地区
常住城市
```

规则：

- 只有昵称显示必填 `*`
- 不显示“可选 / Optional”
- 默认进入查看态，不是一上来就整页表单
- 提供“编辑”入口

查看态示例：

```text
昵称
Yuki

姓名
山田由纪

出生日期
1995/08/12

居住地区
日本 · 东京
```

点击编辑后切换为 Input / Select / Date input。

底部：

```text
[取消] [保存修改]
```

昵称为空时保存必须被阻止，并显示字段级错误。

---

# 9. Data Source / Mock Boundary

本 Task 不接真实用户数据。

可以建立 B-owned 本地 fixture，例如：

```text
src/features/profile/model/mock-profile.ts
```

现有 `mockPersonalUser` 中的昵称 / initial 应优先复用，避免出现两套矛盾用户身份。

所有 Save / Edit 只更新当前页面或当前客户端生命周期内的 state。

禁止：

- localStorage 伪装永久保存
- cookie 伪装 Session
- 假 API
- 假 Supabase client
- 假数据库写入
- 把 UI-only state 描述成真实持久化

Result 必须明确：

```text
Persistence: Mock / in-memory only
```

---

# 10. Avatar Interaction

账户页头像支持 UI 层：

```text
更换头像
删除头像
恢复默认头像
```

不调用真实上传 API。

允许使用浏览器本地 File / Object URL 做临时预览，但必须：

- 限制为图片类型
- 错误只显示在头像区
- 正确清理 Object URL
- 不上传网络
- 不把本地路径写入代码

如果现有正式默认头像素材已在 `develop`，优先使用；否则继续现有 code-driven mock avatar，不从未合并 / 已取消的素材 PR 读取运行时依赖。

禁止把 Draft / canceled asset branch 当作本 Task 硬依赖。

---

# 11. Contact Summary

显示只读摘要：

```text
邮箱
yu***@gmail.com      已验证

手机
+81 •••• 1234        已验证
```

本 Task 不提供：

- 修改邮箱
- 修改手机号
- 修改密码
- 第三方登录管理
- 登录设备管理

联系方式卡中不得再出现“管理登录与安全”重复按钮。

Verified 使用独立 Status 语义色，不使用品牌朱红作为成功色。

---

# 12. General Settings

实现 UI-only 设置：

```text
界面语言
国家 / 地区
时区
默认货币
距离单位
温度单位
时间格式
```

建议 fixture：

```text
简体中文
日本
Asia/Tokyo
JPY ¥
km
°C
24 小时
```

修改国家 / 地区后可以显示推荐：

- 时区
- 默认货币
- 距离单位
- 温度单位

但不得自动覆盖用户已经手动修改的设置。

第一阶段允许使用轻量提示 / suggestion row，不需要复杂规则引擎。

---

# 13. Emergency Contact

实现 UI-only 紧急联系人管理。

空状态：

```text
紧急联系人
在您需要帮助时，可保存一位紧急联系人。

+ 添加紧急联系人
```

字段：

```text
姓名 *
与您的关系 *
手机号码 *
国家 / 区号 *
邮箱
备注
```

必须支持：

- 添加
- 编辑
- 删除确认
- 至少 1 位联系人
- 结构允许多联系人，不冻结数量上限

删除确认文案遵循设计：

```text
删除这位紧急联系人？
此操作不会影响您的账户或旅行数据。

[取消] [删除]
```

不得发送短信 / 邮件，不做真实紧急联系功能。

---

# 14. View / Edit / Save Feedback

保存成功：

```text
✓ 已保存
```

使用轻量页面内反馈，约 1–2 秒弱化 / 消失。

保存失败 / 校验失败：

- 不清空用户输入
- 字段级错误贴近字段
- 页面级错误只用于模拟 UI state，不伪造网络错误

---

# 15. Unsaved Changes Guard

存在未保存修改时，用户尝试离开账户页不得静默丢失。

至少处理：

- Personal Center 内部链接点击
- Avatar Popover 跳转
- 浏览器刷新 / 关闭页签（标准 beforeunload 能力）

展示：

```text
您有尚未保存的修改

[放弃修改] [继续编辑]
```

要求：

- 不修改 Sidebar / AvatarPopover 的产品结构
- 可以在 Account feature 内使用捕获阶段 link guard 或其他最小方案
- 不引入路由库
- 不使用破坏浏览器历史的 hack
- 如果浏览器原生 beforeunload 文案不可自定义，按平台标准行为即可

---

# 16. Account Management Entries

页面底部三张入口卡：

```text
登录与安全
密码、手机、邮箱、登录方式与账户安全

数据与隐私
个人数据、导出与账户相关管理

预订与账户同步
Booking、确认邮件与外部预订同步
```

建议稳定路由：

```text
/personal-center/account/security
/personal-center/account/privacy
/personal-center/account/booking-sync
```

如果执行时仓库已经有正式路由定义，以最新设计 / 代码为准，不重复创建。

本 Task 可以创建上述 **最小占位子路由** 以保证入口可点击、Shell 保持、面包屑/返回账户路径明确。

但不得在本 Task 实现：

- 修改密码
- 修改邮箱 / 手机
- 登录设备
- OAuth 绑定
- 数据导出
- 删除账户
- Booking / Agoda / Klook 授权
- 外部订单同步

这些属于 1.28 对应的后续实现 / 5.21 / Auth / API 范围。

---

# 17. Component Boundary

推荐：

```text
src/features/profile/
├─ components/
│  ├─ profile-account-page.tsx
│  ├─ profile-card.tsx
│  ├─ contact-summary-card.tsx
│  ├─ general-settings-card.tsx
│  ├─ emergency-contact-section.tsx
│  └─ account-entry-card.tsx
├─ model/
│  └─ mock-profile.ts
└─ profile-account.module.css
```

可以按实际情况减少文件，不要求机械拆分。

关键要求：

- 不把整个 PersonalCenter layout 转成 Client Component
- 只有需要交互状态的 Profile feature 使用 client boundary
- Shell 继续复用现有实现
- 不把 Profile 业务逻辑塞回 `personal-center.module.css` 形成更大耦合，优先 Profile 自己的 CSS Module

---

# 18. Visual Rules

沿用 Personal Center 方案 D：

- 暖米白 / 象牙白
- 极淡和纸感
- 珊瑚朱红作为品牌强调
- 墨色 / 深灰蓝文字
- 极淡暖粉褐边框
- 大圆角
- 极轻阴影
- 成功状态使用独立 Status 色

禁止：

- Admin Dashboard 统计卡
- 大面积旅行照片
- 富士山 / 五重塔 / 大鸟居作为 Account 主背景
- 高饱和红色大块
- 技术性 `Mock` Badge 出现在正式产品 UI

技术实现仍可使用 Mock fixture，但产品 UI 不展示工程标签。

---

# 19. Responsive

本 Task 需要做到“可用且不破坏”，但不宣称替代 WBS 5.20 全局响应式任务。

至少检查：

```text
1920×1080
1440×900
1280×720
390×844
320×740
```

桌面：

- Profile / Contact / General Settings 布局接近冻结设计
- 三张 Account Entry 卡横排

窄屏：

- 内容单列
- Entry 卡纵向
- Dialog 不超出 viewport
- 无横向 overflow

遵循 `personal-center-responsive-states.md` 的最新规则。

---

# 20. Accessibility

必须包括：

- 所有 form control 有 label
- 必填星号不能是唯一 required 语义
- Error 与字段通过 aria-describedby / 等价方式关联
- Dialog 有标题、关闭能力、Escape 行为
- 删除确认有明确危险操作文本
- Focus visible
- 键盘可完成编辑 / 保存 / 添加 / 删除
- Avatar action 有 accessible name
- 不滥用 `role=menu`

---

# 21. Explicit Out of Scope

本 Task 禁止：

```text
8.2 User / Profile Schema
8.3 Authentication Core
5.3 Login / Register / Session
5.15 Profile / Account API
5.21 User Data / Account Delete backend
真实 Supabase
DB / ORM / Migration
真实 Avatar 上传
真实 Profile 持久化
邮箱 / 手机修改
密码修改
登录设备管理
OAuth
真实紧急联系人通知
外部订单授权 / 同步
A Main Header
Planner
Map
AI
5.5 Preferences UI
5.6 Companions UI
5.10 Saved Trips UI
```

不要等待这些依赖，也不要顺手实现。

---

# 22. Asset Boundary

本 Task 不需要新旅行照片。

如默认 Avatar / logo 正式素材尚未合入 `develop`：

- 继续使用现有稳定 code-driven / Mock identity
- 不读取 Draft PR #68 作为 runtime dependency
- 不恢复已取消的 WBS-5.1-B-COVERS 产物

素材 Task 与 Profile UI Task 必须保持独立。

---

# 23. Validation

实现完成后执行：

```bash
npm ci
npm run lint
npm run typecheck
npm run format:check
npm test
npm run build
git diff --check
```

若全仓 format:check 存在执行前即存在的上游失败：

- 记录精确路径
- 本 Task 自己所有新增 / 修改文件必须通过 Prettier
- 禁止为通过检查修改其他 Owner 的 Task / 设计书

---

# 24. Browser Acceptance

启动开发环境并验证 `/personal-center/account`。

至少验证：

## Profile

- 默认查看态
- 编辑态
- 昵称必填校验
- Cancel 恢复原值
- Save 更新当前 UI state
- `✓ 已保存` 反馈

## Avatar

- 更换本地预览
- 删除 / 恢复默认
- 无网络上传
- 错误局部显示

## Contact

- 邮箱 / 手机只读
- 已验证状态正常
- 无重复安全入口

## Settings

- 各 Select / Field 可操作
- 国家变化只产生建议，不强制覆盖

## Emergency Contact

- 空状态
- Add
- Edit
- Delete confirmation
- required validation

## Unsaved Guard

- Sidebar navigation 时提示
- Avatar Popover navigation 时提示
- 放弃修改后可离开
- 继续编辑后留在当前页

## Entry Cards

- 三张卡可操作
- 路由正确
- 子路由仍在 Personal Center Shell 中
- 返回账户路径正确

## Viewports

五个指定尺寸无横向 overflow。

## Console

- 无 blocking console error
- 无 hydration error
- 无 React key warning
- 无 object URL leak warning

---

# 25. Ownership Safety

强制：

> 禁止覆盖、删除、重写其他 Owner 的 Task 文件；只允许更新当前 Task ID 对应文件。涉及其他 Task 时只能读取、引用和报告差异。

不得修改：

- A Task
- 其他 B Task
- WBS 5.1 / 5.2 历史 Task
- Planner / Home 代码
- DB / Auth Task

共享 WBS 只允许：

- 5.4 状态
- WBS-5.4-B Tracking Record

---

# 26. Completion / PR Policy

实现完成但尚未获得用户验收：

```text
Task.md = 待审查
WBS 5.4 = 待审查
Issue = Open
PR = Draft / Open
```

不得因为自动化工作流存在就主动把未验收实现标记为已完成。

建议 PR 保持 Draft，直到用户明确验收。

PR Title：

```text
feat(WBS-5.4-B): implement profile account UI
```

Commit：

```text
feat(WBS-5.4-B): implement profile account UI
```

只有满足：

```text
PR merged into develop
+
user acceptance passed
```

才能同步：

```text
Task.md = 已完成
WBS 5.4 = 已完成
Issue = Closed
```

---

# 27. Result Format

最终返回：

```md
# WBS-5.4-B Result

## Status

Completed / Awaiting Review / Blocked

## GitHub Preflight

- latest develop:
- dependency 1.24:
- dependency 5.1:
- duplicate task found: Yes / No

## Issue

- Number:
- State:
- URL:

## Base Commit

-

## Feature Branch

`feature/b-account-wbs-5-4-profile-account-ui`

## Created

-

## Modified

-

## Profile UI

| Behavior              | Result |
| --------------------- | ------ |
| View mode             |        |
| Edit mode             |        |
| Nickname required     |        |
| Cancel                |        |
| Save feedback         |        |
| Avatar local preview  |        |
| Avatar restore/delete |        |

## Contact / Settings

| Behavior                               | Result |
| -------------------------------------- | ------ |
| Contact read-only                      |        |
| Verified status                        |        |
| General settings                       |        |
| Region suggestions no forced overwrite |        |

## Emergency Contact

| Behavior       | Result |
| -------------- | ------ |
| Empty          |        |
| Add            |        |
| Edit           |        |
| Delete confirm |        |
| Validation     |        |

## Navigation

| Behavior                  | Result |
| ------------------------- | ------ |
| Unsaved guard Sidebar     |        |
| Unsaved guard Avatar menu |        |
| Security entry            |        |
| Privacy entry             |        |
| Booking sync entry        |        |

## Persistence Boundary

- Profile persistence: Mock / in-memory only
- Auth / API / DB added: No

## Validation

- npm ci:
- lint:
- typecheck:
- format:check:
- tests:
- build:
- git diff --check:
- browser acceptance:

## Ownership Safety

- A Task modified: No
- Other B Task modified: No
- A Main System modified: No
- DB/Auth implemented: No

## Git

- Commit:
- Push:
- PR:
- PR State:
- Merge Commit:

## Three-way Sync

- Task.md:
- Issue:
- WBS 5.4:

## Problems

None / details

## Next

Stop. Do not automatically start WBS 5.5 / 5.3 / 8.2 / 8.3.
```

---

# 28. Stop Rule

完成后停止。

不要自动启动：

```text
5.5
5.3
8.2
8.3
5.15
```

下一 Task 必须重新读取最新 `develop / WBS / Tasks / Issues / PRs` 后决定。
