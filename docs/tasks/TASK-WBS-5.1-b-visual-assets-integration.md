# WBS-5.1-B-VISUAL-POLISH：Personal Center photoreal-v3 素材实装与视觉还原

## Status

Planned / Blocked until prerequisite check passes

## Objective

把用户已经解压到 `F:\TravelAssist\` 的 **Personal Center photoreal-v3 正式素材包**接入现有 Personal Center，共享 Shell 与首页卡片只做视觉还原，不重新设计页面、不生成新素材、不执行 WBS 5.2 / 5.4 / TASK-010-B 的业务范围。

本 Task 完成后：

- 新写实鸟居、樱花装饰、纸张底纹、主内容角落装饰、更多功能模块三张淡照片背景在页面中真实生效；
- 保留当前 Hero / 我的旅行照片、文案、导航、账户与头像逻辑；
- 通过浏览器截图证明效果明显接近用户确认的 Personal Center 概念图；
- 将实现、素材、Manifest、QA 证据提交到独立 B feature branch 并 push 到 GitHub；
- 创建 Draft PR，**不自动 merge**。

父 WBS `5.1` 已完成，保持已完成；本 Task 是独立视觉资产 follow-up，不能把父项状态回退为进行中。

---

## Metadata

- Task ID: `WBS-5.1-B-VISUAL-POLISH`
- Owner: `B`
- Responsibility: `Personal Center / Visual Asset Integration`
- Parent WBS: `5.1 — Personal Center Shell / Navigation`（保持已完成）
- Existing Issue: `#67`
- Task File: `docs/tasks/TASK-WBS-5.1-b-visual-assets-integration.md`
- Proposed Implementation Branch: `feature/b-wbs-5-1-photoreal-v3-integration`
- Source Asset Version: `photoreal-v3`
- Local Workspace: `F:\TravelAssist`
- Current task-doc base when generated: `develop@51084e508e7e6c8e7e9fe722edb4ac02026259d6`
- Final implementation base: **execution-time latest safe `origin/develop`**

## Technical Stack Baseline

继承 TASK-002-B 工程基线。执行时必须重新读取实际版本，不允许为了本 Task 降级或改依赖：

- Node.js 24.x（B 基线 24.18.0）
- npm 11.x（B 基线 11.16.0）
- Next.js App Router
- React 19
- TypeScript strict
- Tailwind CSS 4
- ESLint 9
- Prettier 3

本 Task **禁止新增 npm 依赖**。

---

# 1. Hard Prerequisites / 冲突保护

## 1.1 WBS 5.4 / PR #76 必须先处理

当前已确认 PR #76 修改以下高冲突文件：

```text
src/features/personal-center/components/personal-home-preview.tsx
src/features/personal-center/components/personal-sidebar.tsx
src/features/personal-center/personal-center.module.css
```

这些文件也是本 Task 的主要修改目标。

因此 Codex 启动后必须先检查：

```text
PR #76 / WBS 5.4
```

规则：

- 若 PR #76 已合入 `origin/develop`：从最新 develop 开始本 Task。
- 若 PR #76 仍 Open / Draft / 未合并：
  - `Status = Blocked`
  - 记录实际 PR 状态与 head SHA
  - **停止代码实现**
  - 不从 PR #76 feature branch 叠加，不 cherry-pick，不复制其 CSS。

## 1.2 其他 B 高冲突工作

执行前检查最新 B Issue / PR / branch，尤其：

- `TASK-010-B / Issue #79`
- 任何修改 `src/features/personal-center/**` 的未合并 B PR

若其改动与以下文件重叠，且已正式开始：

```text
personal-sidebar.tsx
personal-home-preview.tsx
personal-center.module.css
```

则本 Task 标记 Blocked，先合并/结束先行任务；禁止两个 B Task 同时修改同一高冲突文件。

---

# 2. B 工作站启动顺序（强制）

在 `F:\TravelAssist` 执行：

```powershell
git status --short
git fetch origin
git branch --show-current
git log --oneline -10 origin/develop
```

## 2.1 保护用户刚解压的素材

用户会把 `TravelAssist-PersonalCenter-Photoreal-v3.zip` 直接解压到项目根目录，因此执行时可能存在**合法的 untracked 素材文件**。

禁止：

```text
git clean -fd
git reset --hard
```

也禁止删除或覆盖这些 untracked 文件来“获得干净工作树”。

若切换分支会覆盖它们：

```powershell
git stash push -u -m "WBS-5.1 photoreal-v3 local asset handoff"
```

在创建实现分支后恢复：

```powershell
git stash pop
```

必须确认 stash 恢复无冲突。

## 2.2 同步 develop

只有 Hard Prerequisites 通过后：

```powershell
git switch develop
git pull --ff-only origin develop
git log --oneline -10
```

确认安全后创建：

```powershell
git switch -c feature/b-wbs-5-1-photoreal-v3-integration
```

禁止直接在 `main` / `develop` 开发；禁止 force push。

---

# 3. 必须存在并校验的本地素材

执行代码前，以下文件必须全部存在：

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
assets/design/personal-center/photoreal-v3/previews/asset-contact-sheet.jpg
assets/design/personal-center/photoreal-v3/previews/alpha-check.jpg

docs/project/WBS-5.1-VISUAL-ASSET-MANIFEST-PHOTOREAL-V3.md
docs/project/README-PERSONAL-CENTER-PHOTOREAL-V3.md
```

## 3.1 SHA-256

按：

```text
assets/design/personal-center/photoreal-v3/SHA256SUMS.txt
```

核验所有 runtime 素材。

至少重点验证：

| Runtime file | SHA-256 |
|---|---|
| `sidebar-torii-photo.webp` | `ab1a6f7c7e10b40a0bf50f1b219cc8d47c5c2fcb1ba1f295ac397900a4e84739` |
| `personal-center-paper-surface.webp` | `39052b4e8d705ee278119c83720e67a84f16604ecea3f4d9da6f098dfd192f2c` |
| `sidebar-sakura-photo-overlay.png` | `b5d66613d15013944baee412ae09fd3a819c86d7b48d3b9f1ec36152363dbaa3` |
| `personal-center-photo-corners.png` | `1b83f69b40c888576275ee461b1687f20f584dde873f6d10d4bedac8edb271d2` |
| `feature-card-inspiration-photo.png` | `aed915cc75cce36f51fde8830a6259756f2f14a1fe6c4c12defea1bbfaffee2c` |
| `feature-card-favorites-photo.png` | `eb1fb65a0d13fdf2a8ff8bc9ecf33afdf6fcdea51c171206a53ad438c5e21d9b` |
| `feature-card-discovery-photo.png` | `6c3b79f48041442632773297796305739b7c6cfbcdfd0b3543d5d44bc3ae48a8` |

任一必需文件缺失、不可解码或 SHA 不一致：

```text
Status = Blocked
Reason = local photoreal-v3 asset package incomplete or modified
```

停止，不自行重新生成图片、不从网络补图、不回退到假素材。

---

# 4. Source of Truth / 优先级

固定优先级：

```text
用户确认的 Personal Center 概念图视觉方向
→ docs/project/WBS-5.1-VISUAL-ASSET-MANIFEST-PHOTOREAL-V3.md
→ assets/design/personal-center/photoreal-v3/asset-manifest.json
→ docs/ui/personal-center.md（1.21）
→ docs/ui/personal-center-shell.md（1.22）
→ 当前代码
```

素材是 AI 生成的**写实摄影风格**衍生素材，不得声称为真实地点实拍或真实地理关系证明。

Codex 的职责是**接入与还原**，不是重新设计。

---

# 5. 实装范围

## 5.1 Sidebar 底部鸟居

当前旧引用可能为：

```text
/media/personal-center/sidebar-torii-watercolor.svg
```

新版本使用：

```text
/media/personal-center/photoreal-v3/sidebar-torii-photo.webp
```

要求：

- `object-fit: contain`
- `object-position: 50% 100%`
- 完整保留鸟居顶梁、两根主立柱
- 底部对齐，不拉伸
- 图片只做 SidebarArtwork，不侵占导航点击区
- 旧 `sidebar-torii-watercolor.svg` 文件**保留在仓库，不删除**，仅运行时引用切换
- decorative：空 alt / `aria-hidden`

如果现有 `sidebarArtworkArea` 的 3:2 比例让 1:1 鸟居过小，可只调整该容器的高度/比例以贴近用户概念图，但：

- 不压缩五项导航；
- 短屏优先裁/缩 artwork，不裁导航；
- 不重做 Sidebar IA。

## 5.2 Sidebar 顶部樱花摄影装饰

接入：

```text
/media/personal-center/photoreal-v3/sidebar-sakura-photo-overlay.png
```

要求：

- 仅装饰层，pointer-events: none
- 初始整体 `opacity: 0.28`
- 左上定位
- 宽约 Sidebar 65%，最高不超过约 120 CSS px
- 不覆盖 Logo、头像、用户名或导航文字
- 视觉层级低于实际 UI
- 禁止同时再叠一套旧水彩樱花顶部装饰

优先用 CSS background / pseudo-element，避免新增无意义交互 DOM；若用 `<Image>`，必须 `aria-hidden`。

## 5.3 Personal Center 主背景

接入：

```text
/media/personal-center/photoreal-v3/personal-center-paper-surface.webp
```

用于共享 `PersonalCenterShell` 右侧 Main 的连续底层：Top Actions 与 Content Area 看起来属于同一张纸面，而不是两个断开的背景。

要求：

- `cover`
- `50% 50%`
- 不平铺小纹理
- CSS 保留暖米白 `var(--pc-bg-canvas)` fallback
- 不再同时叠旧水彩大底图
- 背景必须低干扰，正文与卡片可读性不能下降

## 5.4 主内容角落装饰

接入：

```text
/media/personal-center/photoreal-v3/personal-center-photo-corners.png
```

要求：

- 只作为 Main / Content 的底层角落装饰
- 中部透明区保留
- pointer-events: none
- 在卡片、文字、Popover 下方
- 不在每个卡片重复
- 不跟随内容滚动造成明显“贴图重复”
- 不与旧水彩 corner 装饰同时叠加

推荐作为 `.main` 的第二层 background，或单一 absolute decorative layer；优先最少 DOM。

## 5.5 更多功能模块三张背景

分别映射：

```text
旅行灵感
→ /media/personal-center/photoreal-v3/feature-card-inspiration-photo.png

我的收藏
→ /media/personal-center/photoreal-v3/feature-card-favorites-photo.png

目的地探索
→ /media/personal-center/photoreal-v3/feature-card-discovery-photo.png
```

要求：

- 放在 feature card 右侧/底层
- 左侧透明区继续用于 icon / title / body
- `background-size: contain`
- no-repeat
- 不拦截点击
- 不改变现有卡片语义与链接
- 不把图片做成新的可点击元素
- 功能卡图片已经内置低 alpha，默认不要再大幅降低 opacity

`feature-card-discovery-photo.png` 当前为摄影质感樱花枝，不是旧版枫叶。按本 Manifest 使用，不自行改成其他主题；用户若之后要求更换，再另行处理。

---

# 6. 必须保留的现有内容

本 Task **不更换**：

- 当前 Personal Home Hero 旅行照片；
- 当前“我的旅行”三张旅行照片；
- 当前 Hero / Trip 文案、日期、目的地；
- TravelAssist Logo / 品牌资产；
- 用户头像；
- 五项一级导航；
- Avatar Popover；
- Profile / Account 页面业务；
- TASK-010-B 导航语义；
- 现有 Auth / API / DB 边界。

如果执行时 develop 已经通过 PR #76 获得京都 / 大阪 / 北海道照片和真实头像视觉，**原样保留**，不能为了本 Task 回退成旧 Izu/Home poster Mock。

---

# 7. 允许修改的代码范围

优先限制在：

```text
src/features/personal-center/components/personal-sidebar.tsx
src/features/personal-center/components/personal-home-preview.tsx
src/features/personal-center/personal-center.module.css
```

以及本 Task 自己的：

```text
docs/tasks/RESULT-WBS-5.1-b-visual-assets-integration.md
docs/tasks/evidence/WBS-5.1-B-photoreal-v3/**
docs/project/WBS-TravelAssist.md  # 只追加/更新本 follow-up 追踪记录
```

素材包自身文件纳入 git：

```text
public/media/personal-center/photoreal-v3/**
assets/design/personal-center/photoreal-v3/**
docs/project/WBS-5.1-VISUAL-ASSET-MANIFEST-PHOTOREAL-V3.md
docs/project/README-PERSONAL-CENTER-PHOTOREAL-V3.md
```

如确实需要修改其他 Personal Center 文件，Result 必须逐项解释原因。

禁止修改：

```text
src/features/planner/**
src/features/start-flow/**
A 主系统页面
package.json
package-lock.json
.github/workflows/**
Supabase / DB / Auth 基础
其他 Task / Result 的正文
```

---

# 8. 视觉验收

必须真实启动页面并截图，不能只看代码。

## 8.1 Desktop

至少：

```text
1920×1080
1440×900
1280×720
```

检查：

- Sidebar 底部是新写实鸟居，不再是简化旧插画；
- 鸟居完整、底对齐；
- Sidebar 顶部有克制樱花照片装饰但不挡 UI；
- Main 能明显看到自然纸面质感，但不抢内容；
- 主内容底部边角有轻花枝装饰；
- 更多功能模块 3 张卡有各自右侧写实装饰；
- 页面整体仍是暖白 / 低饱和 / 旅行产品，不变成照片拼贴墙；
- Hero / Trips 保留 develop 当前内容；
- 右上 Avatar Popover 无遮挡。

## 8.2 Mobile / narrow

至少：

```text
390×844
320×740
```

检查：

- 无横向溢出；
- Sidebar / mobile brand 现有结构不回归；
- 装饰素材不遮挡导航或正文；
- 鸟居不把导航顶出可视区；
- 功能卡文字区域仍可读；
- Avatar Popover 仍能打开、Esc/外部点击/焦点返回正常。

## 8.3 对比证据

保存到：

```text
docs/tasks/evidence/WBS-5.1-B-photoreal-v3/
```

至少包括：

- 5 个 viewport 的页面截图；
- 一张 Sidebar 鸟居局部截图；
- 一张“更多功能模块”局部截图；
- 浏览器结果 JSON / Markdown 记录；
- 素材请求/解码确认。

若浏览器自动截图工具不可用，必须标记视觉验收未完成，不能宣称 Ready For Review。

---

# 9. 功能回归

必须确认本 Task 没有破坏已有 B 行为：

- 五个 Personal Center route 可访问；
- primary nav Active / `aria-current`；
- Avatar Popover 打开 / 再点关闭；
- outside click；
- `Esc`；
- focus restore；
- 菜单内部路由；
- 内容区滚动；
- back / forward；
- 当前 Profile / Account 路由若已合入，至少 smoke test。

图片加载失败时，Shell 仍必须有暖米白 fallback，不得白屏或布局坍塌。

---

# 10. 工程验证

至少执行：

```powershell
npm ci
npm run lint
npm run typecheck
npm run test --if-present
npm run format:check
npm run build
git diff --check
```

另执行：

- 所有 photoreal-v3 runtime 文件存在；
- SHA-256 与 Manifest 一致；
- 图片实际可解码；
- PNG alpha 存在；
- 浏览器 Network / 实际请求确认新 runtime URL 返回成功；
- source 中不再运行时引用旧 `sidebar-torii-watercolor.svg` 作为当前 Sidebar 图。

如果全仓 `format:check` 只因为 execution-time `origin/develop` 已存在的无关文档失败：

1. 明确列出全部失败文件；
2. 证明这些文件不是本 Task 修改；
3. 对本 Task 修改文件单独运行 Prettier check 并通过；
4. 不顺手修改其他 Owner 的文档。

---

# 11. Git / Push / PR

实现与验收完成后：

```powershell
git status
git diff --check
git add <本 Task 文件与素材>
git commit -m "feat(WBS-5.1-B): integrate photoreal personal center assets [skip ci]"
git push -u origin feature/b-wbs-5-1-photoreal-v3-integration
```

由于仓库存在自动 PR / merge 工作流，本 Task **不允许自动合并**。

要求：

- push 后创建 / 保持 **Draft PR**；
- PR Base = `develop`；
- PR 关联 `Issue #67`；
- 不 force push；
- 不 merge；
- 不关闭 Issue #67；
- 用户视觉确认 + PR 合并后才能把本 follow-up 标记 Completed。

如果 `[skip ci]` 导致远端 workflow 跳过，不能把它写成“CI Passed”；本地实际验证结果与远端 CI 状态必须分开记录。

---

# 12. WBS / Tracking 规则

开工后在 Master WBS 当前 Task 追踪表**追加/更新本 follow-up 记录**：

```text
WBS-5.1-B-VISUAL-POLISH
WBS: 5.1（独立视觉 follow-up）
Owner: B
Issue: #67
```

但必须保持：

```text
WBS 5.1 Parent = 已完成
WBS 5.2 = 原状态不变
WBS 5.4 = 原状态不变
TASK-010-B = 原状态不变
其他 A/B Task = 原状态不变
```

状态：

- 正式开始：本 follow-up `进行中`
- 前置冲突：`阻塞`
- 实现完成、Draft PR 未合并：`待审查`
- PR 合入 develop + 用户视觉验收通过：本 follow-up `已完成`

父 WBS 5.1 不随 follow-up 状态变化。

---

# 13. Final Result Format

最终返回必须使用：

```markdown
# WBS-5.1-B-VISUAL-POLISH Result

## Status
Completed / Awaiting Review / Blocked

## Prerequisite
- origin/develop base:
- PR #76 merged:
- overlapping B PR checked:
- local assets preserved:

## Asset Verification
- required files: 7/7
- SHA-256: Passed / Failed
- decode: Passed / Failed
- manifest:

## Tracking
- Issue: #67
- Task File: docs/tasks/TASK-WBS-5.1-b-visual-assets-integration.md
- Branch: feature/b-wbs-5-1-photoreal-v3-integration
- Implementation Commit:
- Final Head:
- Draft PR:
- WBS updated: Yes / No

## Implemented
- sidebar torii:
- sidebar sakura overlay:
- paper surface:
- corner decoration:
- inspiration card:
- favorites card:
- discovery card:

## Existing Content Preserved
- hero/trip photography:
- destinations/copy:
- avatar/profile/account:
- nav/avatar popover:

## Visual Validation
- 1920×1080:
- 1440×900:
- 1280×720:
- 390×844:
- 320×740:
- sidebar crop:
- feature cards:

## Functional Regression
- routes:
- active nav:
- avatar popover:
- Escape/focus restore:
- scroll/back-forward:

## Validation
- npm ci:
- lint:
- typecheck:
- tests:
- format:check:
- build:
- diff check:
- browser console/hydration:
- asset network requests:

## Scope Preserved
- A main system untouched:
- Start/Planner untouched:
- package/dependencies untouched:
- parent WBS 5.1 unchanged:
- other B tasks unchanged:

## Push
- remote branch:
- push result:

## Problems / Blockers
- ...

## Ready For Visual Review
Yes / No
```

完成后停止，不执行 5.2 / 5.4 / TASK-010-B / Saved Trips / Auth / DB。

---

## Next Task

None automatically. 等待用户查看截图并决定是否允许合并。
