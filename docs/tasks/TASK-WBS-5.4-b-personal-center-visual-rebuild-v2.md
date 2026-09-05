# TASK-WBS-5.4-B-V2 — Personal Center photoreal-v3 视觉重做

## Metadata

- Task ID: `WBS-5.4-B-V2`
- Owner: `B`
- Responsibility: `Personal Center`
- WBS: `5.4`（主执行）+ `5.1 / 5.2` completed-task visual refresh
- Canonical GitHub Issue: `#75`
- Status: `In Progress / Rebuild`
- Local Workspace: `F:\TravelAssist`
- Base: latest `origin/develop`
- Proposed Branch: `feature/b-account-wbs-5-4-photoreal-rebuild-v2`
- Visual Input: user-approved local `photoreal-v3` package + Manifest + SHA-256
- Superseded:
  - PR `#76` — user rejected visual result
  - Issue `#67` — superseded execution route

---

## 1. Objective

从最新 `develop` 重新实现 WBS 5.4 Profile / Account UI，并同时把用户确认的 `photoreal-v3` 素材统一实装到 5.1 / 5.2 / 5.4 共用的 Personal Center 视觉层。

5.1 / 5.2 的功能状态保持 **已完成**，不重做业务逻辑；只允许为视觉统一修改共享 Shell / Avatar Popover 的样式与素材引用。

---

## 2. PR #76 Rule

PR #76 已被用户明确否决。

因此：

- 不 merge PR #76
- 不 cherry-pick PR #76
- 不 checkout PR #76 branch 继续开发
- 不复用其 `generated-20260905` 视觉资产
- PR #76 即使仍显示 Open，也 **不得作为本 Task 的 blocker**
- 只允许把 PR #76 当作“不要复现”的负面参考

---

## 3. Source of Truth Priority

1. 用户当前确认的概念图 / 视觉要求
2. `photoreal-v3` Asset Manifest / SHA-256
3. `docs/ui/personal-center.md`
4. `docs/ui/personal-center-shell.md`
5. `docs/ui/profile-account.md`
6. `docs/ui/design-system.md`
7. 当前 `develop` 代码

不得从 PR #76 的视觉实现反推设计。

---

## 4. Required Local Assets

执行前必须确认并校验：

```text
public/media/personal-center/photoreal-v3/sidebar-torii-photo.webp
public/media/personal-center/photoreal-v3/personal-center-paper-surface.webp
public/media/personal-center/photoreal-v3/sidebar-sakura-photo-overlay.png
public/media/personal-center/photoreal-v3/personal-center-photo-corners.png
public/media/personal-center/photoreal-v3/feature-card-inspiration-photo.png
public/media/personal-center/photoreal-v3/feature-card-favorites-photo.png
public/media/personal-center/photoreal-v3/feature-card-discovery-photo.png

assets/design/personal-center/photoreal-v3/asset-manifest.json
assets/design/personal-center/photoreal-v3/SHA256SUMS.txt
docs/project/WBS-5.1-VISUAL-ASSET-MANIFEST-PHOTOREAL-V3.md
```

要求：

- 文件存在
- 图片可解码
- SHA-256 与 Manifest 一致
- 不得联网补图
- 不得重新生成
- 不得用假素材替代
- 本地未跟踪素材必须保留

禁止：

```text
git clean -fd
git reset --hard
force push
```

---

## 5. WBS 5.1 Visual Refresh

只刷新视觉，不改变已完成的 5.1 功能。

### Sidebar

接入：

```text
sidebar-torii-photo.webp
sidebar-sakura-photo-overlay.png
```

要求：

- 鸟居位于 Sidebar 底部
- 写实、完整可识别
- 底对齐
- 可以裁切，但不能因为完整显示图片压缩导航
- 樱花装饰不能挡 Logo / User Summary / Navigation
- 旧 `sidebar-torii-watercolor.svg` 保留文件，不删除，只停止作为主运行时素材

### Main Surface

接入：

```text
personal-center-paper-surface.webp
personal-center-photo-corners.png
```

要求：

- 纸张底纹覆盖 Shell Main / Content Area
- 背景必须克制，不影响正文对比度
- 角落装饰在内容层下面
- 不新增富士山 / 大鸟居 / 大寺庙背景
- 不重新设计色彩体系

### More Features

分别接入：

```text
feature-card-inspiration-photo.png
feature-card-favorites-photo.png
feature-card-discovery-photo.png
```

要求：

- 每张卡有独立右侧写实装饰
- 文字区保持清晰
- 不用图片代替图标 / 箭头 / Hover / Focus

### Home Content

保留 `develop` 当前 Hero / Trip 文案和内容。

只有当 `photoreal-v3` Manifest 明确存在用户确认的 Hero / Trip 替换素材时才能替换。

严禁使用 PR #76 中的：

```text
hero-kyoto-sakura
trip-kyoto-gion
trip-osaka-castle
trip-hokkaido-winter
```

---

## 6. WBS 5.2 Visual Refresh

5.2 功能保持已完成。

Avatar Popover 必须保留：

- trigger
- open / close
- second-click close
- outside click
- Escape
- focus return
- keyboard navigation
- existing menu routes
- disabled Logout / existing Auth boundary

本 Task 只允许：

- 表面材质与 5.1 Shell 统一
- 边框 / 阴影 / 暖白层级微调
- 共享头像视觉保持一致

不得：

- 改菜单 IA
- 新增返回首页菜单
- 大图片背景
- 改 Auth / Session / Logout

---

## 7. WBS 5.4 Reimplementation

PR #76 不进入 develop，所以 5.4 必须从 `develop` 按 `docs/ui/profile-account.md` 重新实现。

### 7.1 Profile

- 默认查看态
- 编辑态
- 昵称 `*` 必填
- 姓名
- 出生日期
- 性别
- 居住国家 / 地区
- 常住城市
- Cancel / Save

### 7.2 Avatar

支持 Mock / local UI：

- Current
- local preview
- remove
- restore default
- error state boundary

不得：

- 网络上传
- API
- DB
- localStorage 持久化冒充正式存储

### 7.3 Contact Summary

只读：

- Email / Verified
- Phone / Verified

不得在联系方式卡重复增加“登录与安全”入口。

### 7.4 General Settings

- Language
- Region
- Timezone
- Currency
- Distance unit
- Temperature unit
- Time format

地区改变只给建议，不能强制覆盖用户手动值。

### 7.5 Emergency Contacts

- Empty state
- Add
- Edit
- Delete confirmation
- 至少支持一位
- 预留多联系人结构

### 7.6 Unsaved Guard

存在未保存修改时：

- Personal Center 内部导航
- Sidebar Account/Profile 跳转
- Avatar Popover 导航
- browser route changes

不得静默丢失修改。

### 7.7 Feedback

- Save success 轻反馈
- Validation error 保留用户输入
- 不使用大成功 Dialog

### 7.8 Account Entries

底部三个单一入口：

- 登录与安全
- 数据与隐私
- 预订与账户同步

第一阶段可为最小子页面 / placeholder contract，但不得执行真实危险操作。

---

## 8. Visual Rules for 5.4

Profile / Account 内容区：

- 使用同一 `personal-center-paper-surface.webp`
- 使用克制的 `personal-center-photo-corners.png`
- 不使用大面积旅游摄影
- 不使用 PR #76 的 Yuki / Kyoto / Osaka / Hokkaido / torii-logo 资产
- 不做 Admin Dashboard
- 卡片使用暖白、大圆角、轻边框、浅阴影
- 珊瑚朱红仅作强调
- Verified 使用独立 status 色

---

## 9. Conflict Guard

执行前检查所有 **除 PR #76 之外** 的 Open B implementation PR。

如果有其他 B PR 正在修改下列区域，则 Blocked：

```text
src/features/personal-center/components/personal-home-preview.tsx
src/features/personal-center/components/personal-sidebar.tsx
src/features/personal-center/components/avatar-popover.tsx
src/features/personal-center/personal-center.module.css
src/features/profile/**
src/app/(account)/personal-center/account/**
```

特殊规则：

- PR #76：永远排除，不作为 blocker
- TASK-010-B / #79：若只有 Planned / no implementation PR，不阻塞
- 若 #79 已产生重叠实现 PR，则 Blocked

---

## 10. Git Workflow

开始前：

```bash
git status --short
git fetch origin
git switch develop
git pull --ff-only origin develop
git log --oneline -10
```

确认：

- 当前 branch 为 develop
- 未跟踪 photoreal-v3 素材仍存在
- 不删除本地素材
- 不使用 PR #76 branch

然后：

```bash
git switch -c feature/b-account-wbs-5-4-photoreal-rebuild-v2
```

禁止：

- 直接在 develop 开发
- cherry-pick #76
- merge #76
- force push

---

## 11. Validation

至少执行：

```bash
npm ci
npm run lint
npm run typecheck
npm run test --if-present
npm run format:check
npm run build
git diff --check
```

若全仓 format 有上游基线失败：

- 必须列出
- 证明本 Task 文件格式通过
- 不顺手修无关 A/B 文件

---

## 12. Browser / Visual QA

必须生成实际截图并存档。

### Viewports

- 1920×1080
- 1440×900
- 1280×720
- 390×844
- 320×740

### 必看画面

#### Personal Center Home
- Shell
- Sidebar
- Torii
- Sakura overlay
- Main paper surface
- More Features 3 cards

#### Avatar Popover
- Open
- Edge position
- Mobile
- focus / Esc

#### Account
- View state
- Edit state
- Avatar flow
- Emergency Contact
- Unsaved Guard
- 3 Account Entry cards

### Functional Regression

- five Personal Center routes
- active nav
- Avatar Popover
- outside click
- Esc
- focus return
- content scroll
- back / forward
- edit / save / cancel
- unsaved guard
- emergency contact add/edit/delete

---

## 13. Scope Guard

不得修改：

```text
src/features/start-flow/**
src/features/planner/**
src/features/map/**
src/features/routing/**
```

不得：

- 接 Auth
- 接 DB
- 接 API
- 增加新依赖
- 改 package / workflow
- 执行 TASK-010-B
- 修改 A 主系统

5.1 / 5.2 WBS 状态必须保持 **已完成**。

5.4 只有在：

```text
new PR merged into develop
+
user visual acceptance
```

后才能标记为 **已完成**。

---

## 14. Delivery

实现 Commit 建议：

```text
feat(WBS-5.4-B-V2): rebuild personal center with photoreal assets [skip ci]
```

Push：

```text
feature/b-account-wbs-5-4-photoreal-rebuild-v2
```

创建：

- Draft PR → develop
- Link Issue #75
- 不自动 merge
- 不关闭 #75

最终用户看截图确认后再合并。

---

## 15. Mandatory WBS / Result Update

返回最终结果前：

1. 读取最新 `docs/project/WBS-TravelAssist.md`
2. 追加 / 更新 `WBS-5.4-B-V2` tracking
3. 5.1 / 5.2 保持已完成
4. 5.4 实现完成未合并 → 待审查
5. 更新 Result
6. commit + push
7. Draft PR
8. 最后返回 Result

---

## 16. Final Result Format

```markdown
# WBS-5.4-B-V2 Result

## Status
Completed / Partially Completed / Blocked

## Prerequisite
- origin/develop base:
- PR #76 ignored as superseded: Yes / No
- overlapping B PR checked:
- local assets preserved:

## Asset Verification
- required files:
- SHA-256:
- decode:
- manifest:

## Tracking
- Issue: #75
- Task File:
- Branch:
- Implementation Commit:
- Final Head:
- Draft PR:
- WBS updated:

## WBS 5.1 Visual Refresh
- sidebar torii:
- sakura overlay:
- paper surface:
- corner decoration:
- feature cards:

## WBS 5.2 Visual Refresh
- avatar popover:
- interactions preserved:

## WBS 5.4 Reimplementation
- profile view/edit:
- avatar flow:
- contact summary:
- general settings:
- emergency contacts:
- unsaved guard:
- account entries:

## Visual Validation
- 1920×1080:
- 1440×900:
- 1280×720:
- 390×844:
- 320×740:
- evidence paths:

## Functional Regression
- five nav routes:
- avatar popover:
- edit/save/cancel:
- unsaved guard:
- emergency contact:
- back/forward:

## Validation
- npm ci:
- lint:
- typecheck:
- tests:
- format check:
- build:
- diff check:

## Scope Preserved
- PR #76 not merged/cherry-picked:
- rejected generated assets not used:
- A main system untouched:
- Start/Planner untouched:
- package/dependencies untouched:
- WBS 5.1 / 5.2 unchanged as completed:

## Problems / Blockers
- ...

## Ready For Visual Review
Yes / No
```

完成后停止，不继续其他 Task。
