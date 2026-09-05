# WBS-5.4-B-ASSET-INTEGRATION — Personal Center 生成素材本地实装

## Metadata

- **Task ID:** `WBS-5.4-B-ASSET-INTEGRATION`
- **Owner:** `B`
- **Primary WBS:** `5.4 — Profile / 账户设置 UI`
- **Related completed WBS:** `5.1`, `5.2`
- **Parent Issue:** `#75 — [WBS 5.4][B] Profile / 账户设置 UI`
- **Parent PR:** `#76 — feat(WBS-5.4-B): implement profile account UI`（Draft）
- **Workspace:** `F:\TravelAssist`
- **Target implementation branch:** `feature/b-account-wbs-5-4-profile-account-ui`
- **Reference:** `docs/assets/personal-center-generated-images-20260905.md`
- **Manifest:** `docs/assets/personal-center-generated-images-20260905.manifest.json`
- **Status:** `Blocked / 素材交付包缺失`
- **Execution develop:** `d42fa5b0f7b0ba95698efaf64dea7a6890dc9dc3`
- **Develop merge into feature:** `f69f5f6572f8f4a9d870f9cd94920434026db6d3`
- **Asset Gate:** 6 个 source + 6 个 runtime 全部缺失；F:\TravelAssist 内未找到同名交付文件。未修改页面、未重新生成、未用替代图片。
- **Result:** [Generated Asset Integration Result](RESULT-WBS-5.4-b-personal-center-generated-assets-integration.md)

> 本 Task 是现有 WBS-5.4-B 的视觉素材实装补充，不创建新的 WBS 状态，不重新打开已完成的 5.1 / 5.2，也不创建新的 implementation PR。最终改动继续进入现有 Draft PR #76，等待用户视觉验收后再决定是否合并。

---

# 1. 目标

按以下固定顺序执行：

```text
先把最新 develop 拉到本地
↓
同步现有 WBS-5.4 feature branch
↓
把最新 develop 合入该 feature branch（禁止 rebase / force push）
↓
校验本地六项生成素材与 manifest 完全一致
↓
把 source + runtime 素材放入正式仓库路径
↓
用这些素材渲染现有 5.1 / 5.2 / 5.4 Personal Center
↓
本地浏览器多视口验收
↓
commit + push 到现有 WBS-5.4 branch
↓
更新现有 Draft PR #76
↓
停止，等待用户验收；不得自动 merge
```

这里用户所说的“pull 到 GitHub”实际执行为 `push + 更新 PR`。

---

# 2. 设计与素材最高依据

必须先读取最新 `develop`：

```text
docs/assets/personal-center-generated-images-20260905.md
docs/assets/personal-center-generated-images-20260905.manifest.json
docs/ui/personal-center.md
docs/ui/personal-center-shell.md
docs/ui/profile-account.md
docs/ui/personal-center-responsive-states.md
docs/tasks/TASK-WBS-5.4-b-profile-account-ui.md
docs/project/WBS-TravelAssist.md
```

视觉优先级：

```text
用户最后确认的 Personal Center 目标视觉
>
personal-center-generated-images-20260905.md
>
manifest 中的文件路径 / hash / object-position
>
冻结的 Personal Center / Profile 设计书
>
当前 runtime UI
>
Codex 自行推导
```

禁止自行换图、重新生图或重新决定风格。

---

# 3. 强制 Git 安全流程

## 3.1 先检查本地，不得丢失现有 5.4 工作

在 `F:\TravelAssist`：

```bash
git status --short --untracked-files=all
git branch --show-current
git remote -v
```

规则：

- 如果存在 **tracked 未提交代码修改**，停止并返回 `Blocked: local tracked WIP must be committed/reviewed before branch sync`。
- 不自动 stash、reset、checkout --、clean。
- 如果只有 manifest 定义的生成图片文件处于 untracked，允许继续，但必须先记录文件路径和 hash，禁止删除。
- 禁止 `git clean -fd`。

## 3.2 先把 develop 拉到本地

```bash
git fetch --all --prune
git switch develop
git pull --ff-only origin develop
git log -1 --oneline
```

记录实际最新 `develop` SHA。

确认以下文件已经存在：

```text
docs/assets/personal-center-generated-images-20260905.md
docs/assets/personal-center-generated-images-20260905.manifest.json
```

## 3.3 再同步现有 5.4 branch

不得新建重复 WBS-5.4 implementation branch。

```bash
git switch feature/b-account-wbs-5-4-profile-account-ui
git pull --ff-only origin feature/b-account-wbs-5-4-profile-account-ui
git merge --no-edit origin/develop
```

要求：

- 使用现有 Issue #75。
- 使用现有 Draft PR #76。
- 禁止 rebase 已发布 branch。
- 禁止 force push。
- 如 merge 有冲突，只解决本 Task / 5.4 自己的文件与共享 Personal Center 文件；不得覆盖 A Task 或其他 Owner 的新内容。

---

# 4. 六项素材固定清单

素材必须严格来自 manifest，不接受相似图替代。

## Runtime

```text
public/media/personal-center/hero-kyoto-sakura.webp
public/media/personal-center/trip-kyoto-gion.webp
public/media/personal-center/trip-osaka-castle.webp
public/media/personal-center/trip-hokkaido-winter.webp
public/media/personal-center/avatar-yuki.webp
public/media/personal-center/travelassist-logo-torii.png
```

## Design Source

```text
assets/design/personal-center/generated-20260905/hero-kyoto-sakura.png
assets/design/personal-center/generated-20260905/trip-kyoto-gion.png
assets/design/personal-center/generated-20260905/trip-osaka-castle.png
assets/design/personal-center/generated-20260905/trip-hokkaido-winter.png
assets/design/personal-center/generated-20260905/avatar-yuki.png
assets/design/personal-center/generated-20260905/travelassist-logo-torii.png
```

---

# 5. 素材存在性与 Hash Gate

`personal-center-generated-images-20260905.md` 明确说明：当前 develop 中的 Markdown / manifest **不是图片已上传证明**。

所以在写代码前必须校验二进制文件。

优先检查上面的正式目标路径。

若目标路径暂时不存在，可在 `F:\TravelAssist` 内查找同名的本地交付文件；找到后复制到 manifest 的精确 `source_path` / `runtime_path`。

不得：

- 从互联网重新下载相似图片；
- 使用 PR #68 已取消的 cover 产物；
- 自行重新生成 AI 图；
- 重新压缩导致 manifest hash 变化；
- 把 Base64 文本、路径字符串或 LFS pointer 当成图片。

对每个文件验证：

```powershell
Get-FileHash <path> -Algorithm SHA256
```

并验证 Git blob：

```bash
git hash-object <path>
```

必须与 `personal-center-generated-images-20260905.manifest.json` 完全一致。

若任意一项缺失或 hash 不一致：

```text
Status: Blocked
Reason: generated asset package is missing or differs from approved manifest
Missing/Mismatched:
- ...
```

立即停止。不要重新生成。

---

# 6. 色彩与图片处理硬约束

素材已经是用户认可的低饱和暖色方向。

禁止再次统一叠加：

```text
filter: saturate(...)
filter: contrast(...)
opacity 白膜覆盖整图
全局 -10% 饱和度
全局 -10% 对比度
```

可以只为文字可读性使用局部渐变遮罩。

不得改图片本身的 byte 内容。

---

# 7. WBS 5.1 — Personal Center 首页渲染

目标路由：

```text
/personal-center
```

## 7.1 Hero

使用：

```text
/media/personal-center/hero-kyoto-sakura.webp
```

起始：

```text
object-fit: cover
object-position: 65% 50%
```

要求：

- 作为“下一次旅行”Hero 背景。
- 左侧仅增加暖米白 → 透明的局部渐变，确保深色文字可读。
- 右侧京都街景 / 塔仍明显可见。
- 标题、日期、同行人数、标签、CTA 全部由 HTML / React 渲染，不烘焙到图片。
- 不再复用 `/media/home/home-hero-poster.webp` 作为 Personal Center Hero。

如果当前 Mock 文案与京都画面直接冲突，可以只调整 **演示 fixture** 到京都语境，但必须保留“演示 / Mock”真实性边界，不得伪造真实用户已确认旅行或预订成功状态。

## 7.2 三张等宽旅行卡

固定使用：

```text
京都：/media/personal-center/trip-kyoto-gion.webp
大阪：/media/personal-center/trip-osaka-castle.webp
北海道：/media/personal-center/trip-hokkaido-winter.webp
```

起始 object-position：

```text
京都    60% 50%
大阪    65% 45%
北海道  50% 55%
```

要求：

- Desktop 为三张 **等宽** 卡。
- 不采用“一大两小”。
- 不使用“上半照片 + 下半白色信息板”。
- 卡片采用完整背景图 + 底部局部暗渐变 + 白色标题 / 元信息。
- 箭头、状态、标签由代码实现。
- 三张卡不可重复同一图片。
- Mock destination 文案若与图片冲突，仅调整演示 fixture，使京都 / 大阪 / 北海道对应正确，不伪装真实保存状态。

## 7.3 More Features

继续保留：

```text
旅行灵感
我的收藏
目的地探索
```

保持轻量浅底卡；不要给这三张入口再增加大摄影图。

---

# 8. Sidebar / Brand 渲染（关联 5.1）

现有：

```text
sidebar-torii-watercolor.svg
personal-center-surface-texture.svg
```

必须保留，不覆盖、不重命名。

## Personal Center Logo

仅在 **Personal Center Sidebar 品牌位**使用：

```text
/media/personal-center/travelassist-logo-torii.png
```

要求：

- `object-fit: contain`。
- 保持 RGBA 透明背景。
- 不改首页 / Planner / 全站 Main Header 品牌。
- 不把 PNG 改名为 SVG。
- 如果在当前 Sidebar 尺寸下横向字标不可读，允许在 Personal Center 内调整品牌容器尺寸；禁止自行重绘 Logo。

## Sidebar 演示头像

当前 Mock / Demo Yuki 使用：

```text
/media/personal-center/avatar-yuki.webp
```

圆形裁切起点：

```text
object-position: 50% 40%
```

该头像是 AI 生成虚构演示人物，只用于当前 Mock 用户，不得成为真实用户默认头像。

---

# 9. WBS 5.2 — Avatar Menu 渲染

不得改变已经验收的菜单交互逻辑。

只做视觉 identity 接入：

- 右上 Avatar Trigger 使用 `avatar-yuki.webp`。
- Avatar Popover 的 Yuki 身份区使用同一张 `avatar-yuki.webp`。
- Sidebar 用户摘要同样使用该头像。
- 保留现有：toggle、outside click、Esc、focus return、路由跳转、disabled Logout。

禁止：

- 实现真实 Auth / Session；
- 让 Logout 变成可用；
- 改菜单 IA；
- 修改 A Main Header。

WBS 5.2 状态保持 `已完成`。

---

# 10. WBS 5.4 — Profile / Account 渲染

目标路由：

```text
/personal-center/account
```

本 Task 不重新定义 5.4 功能；必须继续遵循：

```text
docs/tasks/TASK-WBS-5.4-b-profile-account-ui.md
docs/ui/profile-account.md
```

## 10.1 如果本地 5.4 UI 已实现

只把当前 Mock User 的 **Current Avatar** 接入：

```text
/media/personal-center/avatar-yuki.webp
```

规则：

- Current = Yuki 演示头像。
- 用户在本地选择上传预览后，预览优先于 Yuki。
- “删除头像 / 恢复默认头像”必须回到现有 default placeholder / default avatar 语义，**不能把 Yuki 当成所有用户的系统默认头像**。
- 不做真实网络上传。

## 10.2 如果 5.4 仍是 Placeholder

不得把“贴一张头像”冒充 5.4 完成。

先按现有 `TASK-WBS-5.4-b-profile-account-ui.md` 在同一 Issue #75 / Draft PR #76 范围完成 5.4 UI，再执行本节的素材绑定。

不得创建第二个 5.4 Issue / PR。

## 10.3 Account 页面禁止内容

Account 主内容不使用京都 Hero / 三张旅行封面，也不使用大面积 Logo。

5.4 只消费演示头像；其余摄影素材属于 Personal Center Home。

---

# 11. Next/Image 与性能

对 runtime 图片优先使用 Next.js `Image`，根据实际容器配置合理 `fill` / `sizes`。

必须避免：

- 页面加载时拉伸图片；
- CLS；
- 三张 1200×720 图片按原尺寸挤破 layout；
- 头像加载造成按钮跳动。

Hero 可根据首屏实际策略设置 `priority` / preload，但不要让所有图片都 priority。

---

# 12. Responsive

至少实际验证：

```text
1920×1080
1440×900
1280×720
390×844
320×740
```

要求：

- Desktop：Hero + 三等宽旅行卡符合目标。
- Tablet / Mobile：卡片可改为单列或设计书规定布局，不把桌面截图等比缩小。
- 无横向 overflow。
- Hero 主要构图不被完全裁掉。
- Avatar 始终圆形且不变形。
- Sidebar / TopActions / Popover / Account Dialog 不回归。

---

# 13. 浏览器视觉验收

必须启动本地网站并逐页看真实渲染：

```text
/personal-center
/personal-center/account
```

并打开 Avatar Popover。

检查：

## 5.1

- 京都 Hero 请求 200。
- Hero 文字可读，右侧主景可见。
- 三张卡是京都 / 大阪 / 北海道独立图。
- 三等宽成立。
- More Features 仍可见且视觉层级低于旅行卡。
- 不再复用 Home poster。

## 5.2

- Sidebar / Top-right / Popover 三处 Yuki 头像一致。
- 菜单交互全部通过。

## 5.4

- Profile Current Avatar 为 Yuki 演示头像。
- 本地预览、删除、恢复默认仍符合 5.4 规则。
- Account 主内容没有错误塞入旅行摄影。

## Console / Network

- 六个 runtime asset 请求均为 200（Logo 如页面使用则必须 200）。
- 无 image decode error。
- 无 Next Image warning。
- 无 hydration error。
- 无 blocking console error。

---

# 14. 代码边界

预计可修改 / 新增：

```text
public/media/personal-center/*              # 六个 runtime assets
assets/design/personal-center/generated-20260905/*  # 六个 source assets
src/features/personal-center/**
src/features/profile/**
src/app/(account)/personal-center/account/**
docs/tasks/RESULT-WBS-5.4-b-personal-center-generated-assets-integration.md
```

共享 CSS 只做本次视觉接入必要改动。

禁止修改：

```text
src/features/home/**
src/features/planner/**
src/features/map/**
A Task files
其他 B Task files
Auth / DB / API
package.json / package-lock.json（除非 5.4 原 Task 已有独立必要变更，素材接入本身不得引入依赖）
```

强制：

> 禁止覆盖、删除、重写其他 Owner 的 Task 文件；只允许更新当前 WBS-5.4-B 实现范围自己的文件。涉及其他 Task 时只能读取、引用和报告差异。

---

# 15. WBS / Issue / PR 状态

本 Task 不创建新 WBS 行。

状态规则：

```text
5.1 = 已完成（保持）
5.2 = 已完成（保持）
5.4 = 按现有 WBS-5.4-B 状态继续
Issue #75 = Open
PR #76 = Draft / Open
```

素材实装完成后也 **不得自动把 5.4 标记为已完成**。

只有用户视觉验收并明确允许 merge 后，才按 WBS-5.4-B 原 Task 流程处理完成状态。

---

# 16. Validation

至少运行：

```bash
npm ci
npm run lint
npm run typecheck
npm run format:check
npm test --if-present
npm run build
git diff --check
```

如果全仓格式有上游既有例外：

- 如实记录路径；
- 不为让检查通过而改其他 Owner 文件；
- 本次修改文件必须单独通过 Prettier。

图片另外必须重新验证 SHA-256 与 Git blob SHA-1。

---

# 17. Git Commit / Push

提交前：

```bash
git status
git diff --name-only
git diff --check
```

必须确认没有 A Task / Planner / Home / Auth / DB 无关文件。

精确 stage 本 Task 文件，不使用盲目 `git add .`。

建议提交：

```bash
git commit -m "feat(WBS-5.4-B): integrate approved personal center visuals"
git push origin feature/b-account-wbs-5-4-profile-account-ui
```

若 5.4 原实现需要多个清晰 commit，可以保留原实现 commit，再单独使用上述 visual integration commit。

禁止 force push。

---

# 18. GitHub

继续使用：

```text
Issue #75
Draft PR #76
```

不得创建重复 PR。

向 PR #76 补充：

```md
## Generated Personal Center Asset Integration

Reference:
`docs/assets/personal-center-generated-images-20260905.md`

Manifest:
`docs/assets/personal-center-generated-images-20260905.manifest.json`

Integrated:

- Kyoto Hero
- Kyoto / Osaka / Hokkaido equal trip cards
- Yuki demo avatar in Sidebar / TopActions / Popover / Profile current state
- Personal Center-only torii TravelAssist logo

Safety:

- 5.1 remains completed
- 5.2 remains completed
- no Auth / DB / API
- no A Main Header / Home / Planner modifications
- PR remains Draft pending user visual acceptance
```

---

# 19. Result 文件

创建：

```text
docs/tasks/RESULT-WBS-5.4-b-personal-center-generated-assets-integration.md
```

至少返回：

```md
# WBS-5.4-B Generated Asset Integration Result

## Status

Completed / Awaiting Visual Review / Blocked

## Git Sync

- develop pulled:
- develop SHA:
- feature branch:
- merge develop into feature:

## Asset Verification

| Asset | Source SHA256 | Runtime SHA256 | Git blob | Result |
| ----- | ------------- | -------------- | -------- | ------ |

## 5.1 Rendering

- Hero:
- Equal trip cards:
- More Features:
- Old Home poster still referenced by Personal Center: Yes/No

## 5.2 Rendering

- Sidebar avatar:
- Top-right avatar:
- Popover avatar:
- Existing interaction regression:

## 5.4 Rendering

- Account UI present:
- Current avatar:
- Local preview:
- Delete / restore default:

## Responsive

- 1920x1080:
- 1440x900:
- 1280x720:
- 390x844:
- 320x740:

## Validation

- npm ci:
- lint:
- typecheck:
- format:
- tests:
- build:
- diff check:
- asset HTTP:
- console:

## Ownership Safety

- A files modified: No
- Other Task files modified: No
- 5.1 reopened: No
- 5.2 reopened: No
- Auth/DB/API modified: No

## GitHub

- Commit(s):
- Push:
- Issue #75:
- Draft PR #76:

## Next

Await user visual acceptance. Do not merge automatically.
```

---

# 20. Stop Rule

完成本地渲染、验证、commit、push、PR #76 更新后停止。

不得自动：

- merge PR #76；
- close Issue #75；
- 把 5.4 标记已完成；
- 开始 5.5 / 5.3 / 8.2 / 8.3；
- 修改 A Main Header / Planner / Home。

等待用户在本地页面实际验收后再继续。
