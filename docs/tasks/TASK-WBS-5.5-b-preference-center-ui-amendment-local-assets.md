# WBS-5.5-B Amendment — 本地素材自动检测并立即开始

## Metadata

- Parent Task: `docs/tasks/TASK-WBS-5.5-b-preference-center-ui.md`
- Task ID: `WBS-5.5-B`
- Owner: `B`
- Effective immediately: `Yes`
- User override date: `2026-09-06`

> 本 Amendment 只覆盖 Parent Task 中与“5.4 顺序 Gate”和“必须写实摄影 / 缺图阻塞”有关的规则；其余 Scope、Owner、WBS、测试、状态与安全规则继续有效。

---

# 1. 用户最新授权

用户明确要求：

```text
写实无所谓了，素材我也放进本地了，自动检测一下开始制作吧
```

因此：

1. **取消原 Task 的 5.4 Coordination Gate。** 即使 PR #98 仍 Draft / Open，5.5 也允许从最新 `origin/develop` 独立开始。
2. **禁止从 PR #98 / 5.4 feature branch 派生 5.5。** 5.5 仍必须从最新 `develop` 创建独立分支。
3. **取消“Preference 图片必须为写实摄影”的硬限制。** 本地已有素材可以是照片、插画、AI 生成图、PNG/JPG/WebP/SVG 等，只要与对应类别语义合理、视觉协调、可正常解码。
4. **缺少某类素材不得阻塞 5.5 UI 开发。** 无匹配素材时使用稳定的代码占位 / icon / neutral media slot，继续完成页面。

---

# 2. Local Asset Auto-Discovery

在修改代码前，先扫描 `F:\TravelAssist` 内的图片素材。

优先扫描：

```text
assets/**
public/**
项目根目录下用户新放入的图片 / 素材目录
```

自动忽略：

```text
.git/**
node_modules/**
.next/**
coverage/**
docs/evidence/**
docs/qa/**
```

PowerShell 可使用：

```powershell
Get-ChildItem -Path . -Recurse -File -Include *.png,*.jpg,*.jpeg,*.webp,*.svg |
  Where-Object {
    $_.FullName -notmatch '\\(node_modules|\.git|\.next|coverage|docs\\evidence|docs\\qa)\\'
  } |
  Select-Object FullName, Length, LastWriteTime
```

不要只按文件名盲选；必要时实际打开候选图片检查内容。

---

# 3. Asset Mapping

尝试为以下 UI 位找到最合适的本地素材：

```text
景点偏好画像辅助素材
旅行风格画像辅助素材
移动
景点与活动
餐饮
住宿
预算
旅行体验
```

选择优先级：

```text
语义匹配
>
视觉与 Personal Center 协调
>
分辨率 / 裁切适配
>
文件体积
>
文件名提示
```

不要为了“把所有图片都用上”而强行错配。

如果只有 3–4 张合适素材，可以只在对应卡使用图片，其余使用一致的代码占位，不需要复制同一张图到所有类别。

---

# 4. Local Asset Safety

用户本地素材不是 Git 工作树 blocker。

执行 `git status --short --untracked-files=all` 后：

- 不得 `git clean -fd`；
- 不得 `git reset --hard`；
- 不得删除用户本地未跟踪素材；
- tracked 未提交业务代码仍需先判断是否属于其他正在进行的工作，不能覆盖。

如果用户素材位于仓库根目录，可在确认使用后复制到正式路径，而不是移动/删除原文件。

建议正式路径：

```text
public/media/personal-center/preferences/
assets/design/personal-center/preferences/
```

只提交实际使用的素材；不要把整个临时素材目录无差别提交。

---

# 5. Asset Validation

对实际采用的素材至少验证：

- 文件存在；
- 可正常打开 / 解码；
- 宽高合理；
- 浏览器可加载；
- 不出现损坏文件；
- 不出现明显拉伸。

如果环境已有 Pillow / ImageMagick 等，可额外记录尺寸与模式；没有这些工具时不因此安装新的项目依赖。

如果素材来源信息不在仓库中：

```text
Provenance: user-provided local asset
Production license review: pending if source metadata is unavailable
```

这不阻塞本地开发和 Draft PR，但不得编造许可。

---

# 6. Visual Rule Override

Parent Task / `docs/ui/preference-center.md` 中“写实摄影”不再作为本轮验收硬门槛。

当前验收重点改为：

- 页面专业、清晰、统一；
- Radar 是视觉核心；
- 图片只是辅助，不抢主层级；
- 六张分类卡在有图 / 无图混合情况下仍保持一致高度与信息层级；
- 不把页面做成后台 Dashboard；
- 不使用明显与类别冲突的素材。

可接受：

```text
摄影
插画
低饱和 AI 图
局部纹理
无图 icon 卡
```

不接受：

```text
损坏图
明显拉伸图
错误类别图
为了填充而重复所有图片
带大量不可控文字的截图式素材
```

---

# 7. Start Authorization

读取本 Amendment 后，**不要再因为 PR #98 未合并而返回 Blocked**。

如果不存在重复 WBS 5.5 实现，则立即按 Parent Task 开始：

```text
latest origin/develop
↓
create/reuse canonical WBS 5.5 Issue
↓
feature/b-account-wbs-5-5-preference-center-ui
↓
WBS 5.5 = 进行中
↓
auto-detect local assets
↓
implement Preference Center
↓
validate
↓
Draft PR
```

---

# 8. Shared Shell Boundary

因为 5.4 仍可能有未合入视觉分支，5.5 必须尽量避免修改共享 Shell。

默认禁止修改：

```text
src/features/personal-center/components/personal-center-shell.tsx
src/features/personal-center/components/personal-sidebar.tsx
src/features/personal-center/components/avatar-popover.tsx
src/features/personal-center/personal-center.module.css
```

5.5 视觉尽量全部收敛到：

```text
src/features/preferences/**
src/app/(account)/personal-center/preferences/**
```

这样后续 5.4 合入时更容易同步。

---

# 9. Result Additions

最终 Result 在 Parent Task 原格式基础上追加：

```md
## Local Asset Discovery
- scan roots:
- candidates found:
- assets selected:
- assets skipped and why:
- copied runtime paths:
- decode / browser load:
- provenance note:

## Override Applied
- 5.4 coordination gate bypassed by user: Yes
- photoreal requirement removed by user: Yes
- missing asset blocks implementation: No
```

---

# 10. Ownership Rule

强制保持：

> 禁止覆盖、删除、重写其他 Owner 的 Task 文件；只允许更新当前 Task ID 对应文件。涉及其他 Task 时只能读取、引用和报告差异。

不得修改其他 Task 文件来“同步”本 Amendment。

---

# 11. Stop Rule

实现完成后仍然：

- Draft PR / Open；
- 未经用户验收不得自动 merge；
- 不自动开始 5.6 / 5.7 / 5.8 / 5.9 / 5.11 / 5.16。
