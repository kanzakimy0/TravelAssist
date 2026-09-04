# TASK-004.1-A — Homepage Palette & Typography Refinement

## Metadata

- Task ID: `TASK-004.1-A`
- Owner: `A`
- Status: `Planned`
- WBS: `1.4 / 1.13 / 1.16`
- GitHub Issue: `#24`
- Depends On: `TASK-004-A / Issue #20`
- Feature Branch: `feature/a-homepage-style-refinement`
- Scope: **Palette + typography only**

---

# 1. Objective

在 TASK-004-A 已完成的主页基础上，**保持主页现有框架、布局、尺寸、位置、动态背景技术和交互完全不变**，只按照最新确认的个人中心视觉参考修改：

1. 首页整体色调；
2. 字体与文字气质；
3. 与色调直接相关的边框、阴影、overlay、按钮填充色。

最新风格关键词：

```text
暖米白 / 象牙白
淡樱粉
珊瑚朱红
茶褐 / 墨褐
低饱和
柔和日式纸张感
宋体 / 明朝体式标题气质
简洁现代 UI 字体
```

**不要修改主页框架。**

---

# 2. Prerequisite

开始前执行：

```bash
git status
git remote -v
git fetch origin
git log origin/develop --oneline -15
```

必须确认 TASK-004-A / Issue #20 已经合入 `origin/develop`。

如果尚未合并：

```text
Status: Blocked
Reason: TASK-004-A has not been merged into develop.
```

停止执行。

---

# 3. Required Reading

实现前读取：

```text
docs/tasks/TASK-004.1-a-homepage-style-refinement.md
docs/ui/home-page.md
docs/ui/design-system.md
docs/project/WBS-TravelAssist.md
GitHub Issue #20
GitHub Issue #24
```

本 Task 的最新限制优先级：

```text
TASK-004.1-A 本文件最新版本
>
Issue #24 最新版本
>
旧 homepage style refinement 描述
```

---

# 4. Git Workflow

```bash
git switch develop
git pull --ff-only origin develop
git switch -c feature/a-homepage-style-refinement
```

禁止直接在 `main` / `develop` 修改。

---

# 5. Critical Scope Rule — Do Not Change Homepage Framework

本次 **只改色调和字体**。

以下全部必须保持现状：

- Hero 的位置与对齐方式；
- Logo / Brand 的位置；
- 语言入口的位置；
- 主标题的位置；
- 辅助文案的位置；
- 主 CTA 的位置、宽高和圆角几何；
- Login 的位置、宽高和圆角几何；
- AI 按钮的位置、尺寸和圆形几何；
- Background 的场景、构图、裁切和动态行为；
- WebM / MP4 / poster 架构；
- `/start` 导航；
- AIConversationPanel 行为；
- Responsive 布局结构；
- Start Flow；
- 所有业务逻辑。

除非为了修复明显的颜色可读性问题，否则不要调整 spacing、尺寸或布局。

---

# 6. Approved Palette Direction

将旧版深靛蓝主视觉调整为最新参考的暖日式配色。

建议语义方向：

```text
Page / light overlay: 暖米白、象牙白、纸白
Primary text: 墨褐、深茶褐
Secondary text: 暖灰褐
Primary accent: 珊瑚朱红 / 柔和朱红
Secondary accent: 淡樱粉
Border: 淡粉褐 / 暖米灰
Surface: 暖白半透明
Shadow: 暖灰褐低透明度
```

参考近似值仅用于视觉方向，不要求逐值照搬：

```text
Warm Ivory      #F7EFE5
Paper White     #FFF9F2
Ink Brown       #3B291F
Warm Gray Brown #75665D
Coral Vermilion #E86F5A
Soft Sakura     #F3C9C2
Pale Blush      #F8E2DC
Warm Border     #DEC8BA
```

必须优先映射到现有 semantic tokens。

不要在业务组件中创建大量 `coral-500`、`pink-200` 之类业务无关硬编码变量。

---

# 7. Background Color Treatment

**不修改背景构图和内容。**

只允许做颜色层面的处理：

- 整体稍微偏暖；
- 提升米白 / 淡粉的空气感；
- 降低冷蓝色 UI 与背景之间的冲突；
- 可使用极轻暖白 / 淡樱粉 overlay；
- 保持照片 / 视频本身仍清晰可见。

禁止：

- 替换背景场景；
- 改 object-position；
- 改动画速度；
- 改电车 / 海 / 樱花构图；
- 新增日本 icon；
- 加重滤镜到失真。

---

# 8. Primary CTA Color

主 CTA 文案保持：

```text
让我们开始吧 →
```

行为保持：

```text
/ → /start
```

只修改视觉色调：

- 深靛蓝 → **柔和珊瑚朱红 / 朱红系**；
- 白色文字；
- 现有 pill 形状、尺寸、位置不变；
- 阴影改为更暖、更轻；
- Hover / focus 使用同色系轻微明暗变化。

不要增加渐变动画或尺寸变化。

---

# 9. Login Color

Login 框架保持不变。

只修改：

- 暖白 / 米白半透明背景；
- 淡珊瑚 / 暖粉褐边框；
- 墨褐文字；
- 轻暖色阴影（如现有样式有阴影）。

仍然必须明显弱于主 CTA。

---

# 10. AI Entry Color

AI 按钮的尺寸、位置和圆形结构不变。

只修改颜色：

- 暖白 / 纸白底；
- 珊瑚朱红 / 墨褐图标；
- 淡粉褐边框；
- 暖灰低透明阴影。

不得修改 AI Panel 逻辑或交互。

---

# 11. Typography Direction

最新参考的核心变化是：

> 标题更有人文、日式编辑感；UI 文字保持现代简洁。

## Main Headline

```text
下一站，去哪里？
```

主标题建议使用中文宋体 / 日文明朝体气质的 Serif Stack。

优先使用项目已有字体；如果没有，使用安全系统 fallback，例如：

```css
font-family:
  "Noto Serif SC", "Noto Serif CJK SC", "Songti SC", "STSong", "Yu Mincho",
  "Hiragino Mincho ProN", serif;
```

不要仅为了这个 Task 引入大型字体包。

如项目已有 Next Font / 合法 Web Font，可复用现有方式。

标题颜色调整为：

```text
深茶褐 / 墨褐
```

而不是冷蓝黑。

## Supporting Copy / Buttons / Header

以下保持现代 Sans：

- `规划行程 · 对话调整`
- CTA
- Login
- Brand 文本
- Language
- AI label

优先现有 sans font stack。

可使用偏温和、轻量的字重，但不要变成装饰字体。

---

# 12. Font Weight & Tracking

只调整字体气质，不改变现有元素尺寸布局。

建议：

```text
Headline: 400–500
Supporting copy: 400
CTA: 500
Login: 500
Header / Language: 400–500
```

标题允许轻微增加字距。

按钮和 UI 不要使用过大的 letter-spacing。

---

# 13. Decorative Texture Rule

最新参考具有很淡的日式纸张 / 和风插画气质，但主页不能因此增加新的结构性装饰。

允许：

- 极淡纸张纹理；
- 极淡樱粉噪点 / grain；
- CTA 中非常低透明度的花纹（仅当现有实现成本很低）；
- 很淡的暖色边线。

禁止：

- 新增卡片；
- 新增侧栏；
- 新增鸟居、波纹、樱花等独立 UI 装饰组件；
- 改变主页布局。

原则：

```text
色调 / 材质感可以学习参考图
结构绝对不学习参考图
```

---

# 14. Brand Naming

最新效果图中的品牌文字仅作为视觉参考。

本 Task：

```text
DO NOT rename TravelAssist to Journi globally.
```

继续使用仓库当前 canonical naming。

---

# 15. Accessibility

配色变化后必须重新验证：

- 主标题对背景的对比度；
- CTA 白字在珊瑚朱红背景上的对比度；
- Login 边框和文字可识别；
- Language 可读；
- AI icon 可读；
- focus-visible 不能因为暖色调整而消失；
- reduced motion 保持原行为。

颜色不能成为唯一状态表达。

---

# 16. Responsive

保持 TASK-004-A 当前 responsive framework。

只检查新字体 / 新色调在以下尺寸没有造成文字溢出或可读性问题：

```text
1600×900
1440×900
1024×768
390×844
```

如果 Serif 字体造成换行，只允许做最小的 typography fallback / font-size clamp 修复，不重构页面布局。

---

# 17. Explicitly Forbidden Changes

本 Task 禁止：

```text
修改 Hero 布局
修改 Background 构图
修改视频动画
修改 Header 布局
修改 CTA 几何尺寸
修改 Login 几何尺寸
修改 AI Button 尺寸或位置
新增卡片 / 导航 / 宣传区
重做 Mobile 布局
真实 Auth
真实 AI
Map
Database
Start Flow 修改
TravelAssist → Journi Rename
新 UI Framework
大型 Font Package
大型 Icon Package
```

---

# 18. Validation

执行：

```bash
npm run lint
npm run typecheck
npm run format:check
npm run build
npm run dev
```

手动验证：

```text
首页框架与 TASK-004-A 前完全一致
只有 palette / typography / related surface styling 发生变化
CTA → /start 正常
AI open / close 正常
Escape 正常
focus restore 正常
Desktop / Tablet / Mobile 无布局回归
无 horizontal overflow
无 console error
```

---

# 19. Visual Review Checklist

最终截图与最新参考风格比对时，只检查：

- 是否从冷蓝色调转为暖米白 + 樱粉 + 珊瑚朱红；
- 标题是否具有宋 / 明朝体式人文气质；
- UI 字体是否仍然简洁现代；
- CTA 是否成为柔和朱红主强调；
- Login / AI / Header 是否统一到暖色体系；
- 背景是否仍保持原本构图和框架；
- 页面是否比旧版更柔和、日式、精致，但没有变成另一个页面。

---

# 20. Git Tracking

```text
Task: TASK-004.1-A
Issue: #24
WBS: 1.4 / 1.13 / 1.16
Branch: feature/a-homepage-style-refinement
```

完成后按仓库最新追踪规则更新 WBS。

实现完成但未合并：`待审查`。

---

# 21. Commit / PR

```bash
git add .
git commit -m "style(home): apply warm Japanese palette and typography"
git push -u origin feature/a-homepage-style-refinement
```

PR 标题：

```text
[TASK-004.1-A] Refine homepage palette and typography
```

PR Body 至少包含：

```text
Task: TASK-004.1-A
WBS: 1.4 / 1.13 / 1.16
Closes #24
```

禁止自动继续 TASK-005。

---

# 22. Definition of Done

- [ ] TASK-004-A 已合入 develop
- [ ] Homepage framework 未修改
- [ ] Homepage layout / positions 未修改
- [ ] Background composition / motion 未修改
- [ ] 只进行了 palette + typography + related surface styling 修改
- [ ] 暖米白 / 樱粉 / 珊瑚朱红 / 墨褐视觉成立
- [ ] 主标题采用 Serif / 宋体 / 明朝体方向
- [ ] UI 文本继续使用简洁 Sans
- [ ] CTA 仍进入 `/start`
- [ ] AI 行为未改变
- [ ] reduced motion 未改变
- [ ] Desktop / Tablet / Mobile 无布局回归
- [ ] accessibility 通过
- [ ] lint 通过
- [ ] typecheck 通过
- [ ] format check 通过
- [ ] build 通过
- [ ] WBS / Issue / Task / Branch / Commit / PR 关联完整

---

# 23. Result Format

```markdown
# TASK-004.1-A Result

## Status

Completed / Partially Completed / Blocked

## Prerequisite

- TASK-004-A merged into develop:
- base commit:

## Tracking

- Task: TASK-004.1-A
- WBS: 1.4 / 1.13 / 1.16
- Issue: #24
- Branch:
- Commit:
- Pull Request:
- WBS updated:

## Framework Preservation

- homepage layout changed: No
- background composition changed: No
- motion changed: No
- CTA geometry changed: No
- AI position/size changed: No

## Palette

- page / overlay:
- primary text:
- secondary text:
- primary accent:
- secondary accent:
- borders / shadows:

## Typography

- headline font stack:
- UI font stack:
- headline weight:
- readability:

## Preserved Behaviour

- /start:
- AI shell:
- reduced motion:
- WebM / MP4 / poster:

## Responsive Validation

- 1600x900:
- 1440x900:
- 1024x768:
- 390x844:

## Validation

- lint:
- typecheck:
- format:
- build:
- dev server:
- console errors:

## Dependencies Added

- None / ...

## Problems Found

- ...

## Ready For Review

Yes / No
```

完成 TASK-004.1-A 后停止。
