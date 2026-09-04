# TASK-004.1-A — Homepage Visual Style Refinement

## Metadata

- Task ID: `TASK-004.1-A`
- Owner: `A`
- Status: `Planned`
- WBS: `1.4 / 1.13 / 1.16`
- GitHub Issue: `#24`
- Depends On: `TASK-004-A / Issue #20`
- Feature Branch: `feature/a-homepage-style-refinement`
- Canonical Design: `docs/ui/home-page.md` v0.4+
- Scope: Homepage visual refinement only

---

# 1. Objective

在 TASK-004-A 已建立的动态首页基础上，将首页视觉精修为最新冻结的 P01 主设计：

```text
日本海边小镇
+ 地方电车缓慢驶过
+ 同一真实场景中的住宅 / 植被 / 少量樱花
+ 海面 / 小岛 / 远山
+ 中央极简 Hero
+ 左上品牌
+ 右上语言入口
+ 右下小型圆形 AI 入口
```

本 Task **只修改视觉风格与响应式表现**。

不得借此重写动态背景技术、Start Flow、AI 逻辑、Auth、路由、状态模型或后端。

---

# 2. Prerequisite

开始前执行：

```bash
git status
git remote -v
git fetch origin
git log origin/develop --oneline -15
```

必须确认：

1. TASK-004-A / Issue #20 已完成并合入 `origin/develop`。
2. 首页已经具有 TASK-004-A 的 WebM / MP4 / poster 动态背景能力。
3. 首页主 CTA 已正确导航到 `/start`。
4. `/start` 与 Start Flow 仍存在。
5. AI Entry / AIConversationPanel 已存在并可以打开关闭。

如果 TASK-004-A 尚未合并：

```text
Status: Blocked
Reason: TASK-004-A has not been merged into develop.
```

立即停止。

不要从 TASK-004-A 的未合并 feature branch 继续堆代码。

---

# 3. Required Reading

实现前必须阅读：

```text
docs/ui/home-page.md
docs/ui/design-system.md
docs/ui/page-overview.md
docs/project/WBS-TravelAssist.md
docs/tasks/TASK-004-a-homepage-final-visual.md   # 如果已合入/存在
```

同时阅读 GitHub：

```text
Issue #20
Issue #24
```

视觉冲突优先级：

```text
docs/ui/home-page.md v0.4+
>
Issue #24
>
TASK-004-A 旧视觉描述
>
assets/design/home-concept.svg
```

`assets/design/home-concept.svg` 当前只作为旧结构参考，不作为本 Task 的像素基准。

---

# 4. Git Workflow

从最新 `develop` 创建：

```bash
git switch develop
git pull --ff-only origin develop
git switch -c feature/a-homepage-style-refinement
```

禁止直接在：

```text
main
develop
```

修改。

禁止 force push。

---

# 5. Scope Boundary

## 本 Task 可以修改

- 首页布局
- Hero 对齐方式
- Header 的视觉位置与间距
- 背景裁切 / `object-position`
- 背景 overlay
- 首页字体层级
- CTA 尺寸 / 圆角 / 边框 / 阴影
- Login 次级视觉
- AI Entry Button 的尺寸与视觉权重
- Homepage-specific responsive CSS
- Homepage-specific semantic token 使用
- 首页动效节奏参数（不改变视频架构）

## 本 Task 不可以修改

- `/start` 的业务流程
- `StartFlowDraft`
- Start Flow validation
- AI provider / API
- AI conversation business logic
- Auth / Session
- Map
- Database
- Trip State
- Preference State
- 全仓品牌重命名
- 大型全局架构
- TASK-004-A WebM / MP4 / poster 技术边界

---

# 6. Final Homepage Composition

Desktop 目标：

```text
┌──────────────────────────────────────────────┐
│ Brand                                  语言   │
│                                              │
│                                              │
│              下一站，去哪里？                │
│              规划行程 · 对话调整             │
│                                              │
│          [ 让我们开始吧  → ]                 │
│          [       登录       ]                 │
│                                              │
│                                      ( AI )  │
└──────────────────────────────────────────────┘
```

关键变化：

- Hero 从旧版偏左 / 大玻璃卡片结构改为 **视觉中心居中**。
- **取消大型 Hero Card / Glass Card**。
- 背景是页面主体。
- Header 和 AI 只作为轻量工具层存在。

---

# 7. Background Visual Direction

场景必须是一幅空间连续、可信的日本海边铁路旅行画面。

推荐构图：

```text
左侧近景：木造 / 日式住宅 + 植物 / 少量樱花
中央：天空、海面、远山形成低干扰留白
右侧：地方电车 + 铁路设施
中远景：小岛 / 海岸 / 山体
```

允许多个日本元素同时出现的条件：

> 它们属于同一真实场景，而不是独立装饰素材拼贴。

禁止：

- 鸟居 icon + 富士山贴图 + 日本地图 + 灯笼同时叠加
- 满屏樱花 icon
- 旅游局宣传海报式排版
- 过饱和霓虹日本风
- Anime UI 模板化视觉

背景可以有电影感，但整体优先接近真实旅行摄影。

---

# 8. Background Motion Refinement

TASK-004-A 的动态背景技术保持：

```text
WebM
MP4 fallback
poster fallback
```

本 Task 只修改运动语言：

```text
单一连续镜头
>
电车缓慢驶过
>
少量花瓣 / 树叶微动
>
海面轻微波动
>
极弱光线变化
```

摄像机：

- 基本固定
- 允许极慢推进
- 不快速摇镜
- 不快速 zoom
- 不强 parallax

禁止多个景点快速轮播。

建议 loop：

```text
20–30 秒
```

不得自动播放声音。

---

# 9. Background Readability

整体视觉：

```text
明亮
暖
通透
有空气感
```

不要把背景洗成纯白。

根据真实媒体内容设置轻量 overlay，建议范围：

```text
8%–18% 暖白 / 中性浅色
```

如果中央 Hero 仍有可读性问题，可用局部渐变 / 局部 scrim，但必须：

- 看不出明显矩形 Card
- 不使用大面积黑色遮罩
- 不重 blur 整个背景

---

# 10. Header Refinement

## Brand

位置：左上。

要求：

- 紧凑
- 低干扰
- 不使用大型导航容器
- 可使用极弱暖白底帮助识别

### Brand Naming Rule

最新参考图中的 `Journi` 只表达 Logo 位置和视觉气质。

本 Task：

```text
DO NOT rename TravelAssist to Journi globally.
```

使用仓库当前 canonical brand naming。

品牌更名必须单独建 Task。

## Language

位置：右上。

视觉类似：

```text
🌐 简体中文 ⌄
```

如果工程尚未有 i18n：

- 可以保持当前已有入口 / shell
- 不为了视觉 Task 新增完整 i18n 框架

---

# 11. Hero Headline

固定文案：

```text
下一站，去哪里？
```

辅助文案：

```text
规划行程 · 对话调整
```

禁止添加额外 Marketing Copy。

主标题应：

- 深墨蓝 / 深靛蓝
- 中等或偏轻字重
- 有少量人文旅行气质
- 不使用极粗 SaaS 标题
- 不使用渐变文字

推荐范围：

```css
font-size: clamp(2.5rem, 4.2vw, 4.5rem);
line-height: 1.12;
letter-spacing: 0.02em;
```

不要为了这一处标题新增大型字体 dependency。

---

# 12. Primary CTA

文案：

```text
让我们开始吧  →
```

行为必须继续：

```text
/ → /start
```

视觉：

- 深日本靛蓝 / 墨蓝
- 白字
- Pill
- 轻阴影
- 不使用绿色
- 不使用紫色霓虹渐变

Desktop 推荐范围：

```text
width: 320–390px
height: 64–74px
```

Hover / Focus：

- 轻微亮度 / 边框 / 阴影变化
- 不明显跳动
- 不大幅 scale

---

# 13. Login Action

文案：

```text
登录
```

视觉必须弱于主 CTA：

- 透明 / 暖白半透明
- 细浅边框
- Pill
- 墨蓝文字
- 与 Primary CTA 大致等宽或略窄

本 Task 只改视觉。

不得接真实 Auth。

---

# 14. AI Entry Button

右下固定。

旧版如果是大型蓝色 AI 球，改为更接近最新参考：

- 暖白 / 白色圆底
- 靛蓝图标
- 极短 `AI` label 可保留
- 轻阴影
- 降低视觉权重

Desktop 推荐：

```text
72–88px circle
right: 36–56px
bottom: 32–48px
```

Mobile 推荐：

```text
56–64px circle
```

必须避开 safe-area 和 CTA。

---

# 15. AI Panel Preservation

不得重写 AIConversationPanel。

必须继续满足：

- AI Entry 可打开
- Close 可关闭
- Escape 可关闭
- focus restore
- keyboard accessible
- `aria-expanded` / `aria-controls` 或当前等价语义

允许只做与新首页匹配的轻量视觉调整：

- radius
- border
- background
- shadow
- spacing

不增加真实 AI 请求。

---

# 16. Remove Old Visual Noise

如果 TASK-004-A 实装中存在以下内容，本 Task 应删除或弱化：

- 大型半透明 Hero Glass Card
- 三个功能卖点
- 多余宣传副标题
- 大型顶部导航
- 大尺寸发光 AI 球
- 装饰性路线图标
- 与真实场景无关的日本 icon
- 重度 blur
- 厚重 shadow

不要删除对业务仍必要的无障碍文本或语义。

---

# 17. Responsive

必须验证：

```text
1600×900
1440×900
1024×768
390×844
```

## Desktop

- Hero 居中
- Background 保持海边铁路主构图
- 左上 / 右上 / 右下位置稳定
- CTA 一眼可见

## Tablet

- 调整视频 `object-position`
- 避免高对比铁路设施穿过文字
- 保证 AI Panel 不出 viewport

## Mobile

不要机械缩小 Desktop。

应：

- 重新裁切背景 focal point
- 优先让天空 / 海面出现在文字后方
- 缩小标题
- CTA 接近内容宽度但保留安全边距
- AI Entry 变小
- 处理 safe-area
- 允许使用 poster 代替视频

禁止横向滚动。

---

# 18. Reduced Motion

必须继续支持：

```css
@media (prefers-reduced-motion: reduce)
```

Reduced Motion：

- 禁止非必要动态背景运动
- 使用 poster 是正式行为
- 禁止为了补偿静态背景添加额外 JS 动画

---

# 19. Accessibility

至少验证：

- Tab 顺序
- Shift+Tab
- Primary CTA focus-visible
- Login focus-visible
- Language action focus-visible
- AI Entry accessible label
- AI Panel Escape close
- AI focus restore
- 背景视频不进入 Tab
- 视频没有音频
- 文字在背景各关键帧可读
- reduced motion

颜色不能是唯一状态表达方式。

---

# 20. Performance

要求：

- poster 可以立即显示
- 视频不阻塞 Hero
- 背景容器尺寸稳定
- 不新增 JS frame animation
- 不为了视觉调整引入大型 dependency
- Mobile 可以使用静态 fallback

如果 TASK-004-A 已有正确媒体加载逻辑，优先复用，不重写。

---

# 21. Dependencies

原则上：

```text
Dependencies Added: None
```

禁止为了 TASK-004.1 安装：

- Framer Motion
- Lottie
- Three.js
- GSAP
- 视频播放器库
- UI Framework
- Icon Pack
- 新状态管理库

如确实发现必须新增 dependency：

先停止并在 Result 中说明，不要擅自安装。

---

# 22. Manual Validation

至少人工检查：

```text
首页打开后首屏无跳动
背景 poster 正常
背景视频正常
主标题位置正确
辅助文案只有一行
CTA 层级正确
CTA → /start
Login 弱化正确
AI Entry 尺寸已降低
AI open / close 正常
Escape 正常
focus restore 正常
reduced motion 正常
Mobile 无横向滚动
```

还要在视频不同帧检查：

```text
标题是否一直清楚
按钮是否一直清楚
铁路 / 电线是否穿过核心文字
背景是否过曝
背景是否过暗
```

---

# 23. Screenshot Validation

如果环境支持截图，至少生成：

```text
1600×900 default
1600×900 AI open
1024×768 default
390×844 default
390×844 AI open
```

截图用于 Review，不要默认提交仓库。

---

# 24. Automated Validation

完成后执行：

```bash
npm run lint
npm run typecheck
npm run format:check
npm run build
```

全部必须通过。

然后：

```bash
npm run dev
```

实际检查：

```text
/
/start
```

不得产生 console error / hydration error。

---

# 25. Git Diff Check

最后执行：

```bash
git status
git diff --check
git diff origin/develop...HEAD
```

确认：

- 没有修改 StartFlowDraft
- 没有重写 `/start`
- 没有新增 Auth
- 没有新增 AI API
- 没有新增 Map / DB
- 没有无关 dependency upgrade
- 没有 `.env.local`
- 没有 Secret
- 没有 node_modules
- 没有版权不明媒体被随意提交
- 没有全仓 Journi rename

---

# 26. WBS / Issue / Task Synchronization

本 Task 必须遵守仓库最新 tracking 规则。

对应：

```text
Task: TASK-004.1-A
Issue: #24
WBS: 1.4 / 1.13 / 1.16
Branch: feature/a-homepage-style-refinement
```

Codex 返回最终 Result 前：

1. 更新 `docs/project/WBS-TravelAssist.md` 中对应 Task tracking 记录。
2. 状态如果代码已完成但未合并，写 `待审查`。
3. 记录 feature branch 和 commit。
4. 如创建 PR，记录 PR number / URL。
5. Task 文件、Issue、WBS 的 Task ID 必须完全一致。

不要因为 WBS 更新顺手修改无关 WBS 工作项。

---

# 27. Commit

全部验证通过后：

```bash
git add .
git commit -m "style(home): refine immersive homepage visual"
git push -u origin feature/a-homepage-style-refinement
```

禁止 force push。

---

# 28. Pull Request

PR 标题：

```text
[TASK-004.1-A] Refine homepage visual style
```

PR Body 至少包含：

```text
Task: TASK-004.1-A
WBS: 1.4 / 1.13 / 1.16
Closes #24
```

并使用仓库最新 PR Template 的完整追踪字段。

不要自动 merge；按仓库当前 Review / auto-merge 规则执行。

---

# 29. Definition of Done

- [ ] TASK-004-A 已合入 develop
- [ ] 从最新 develop 创建 feature branch
- [ ] 首页符合 `docs/ui/home-page.md` v0.4+
- [ ] Hero 已居中
- [ ] 大型 Hero Glass Card 已取消
- [ ] 主标题为 `下一站，去哪里？`
- [ ] 辅助文案为 `规划行程 · 对话调整`
- [ ] Primary CTA 为深靛蓝 pill
- [ ] CTA 继续进入 `/start`
- [ ] Login 为弱化 pill
- [ ] Header 保持紧凑
- [ ] 背景使用统一日本海边铁路场景语言
- [ ] 动态语言为单一慢场景
- [ ] AI Entry 视觉权重降低
- [ ] AI Panel 行为未破坏
- [ ] Reduced Motion 正常
- [ ] 1600×900 正常
- [ ] 1440×900 正常
- [ ] 1024×768 正常
- [ ] 390×844 正常
- [ ] 无横向滚动
- [ ] Accessibility 基线通过
- [ ] 无新增大型 dependency
- [ ] 无 Auth / AI API / Map / DB
- [ ] 无全仓品牌 rename
- [ ] lint Passed
- [ ] typecheck Passed
- [ ] format check Passed
- [ ] build Passed
- [ ] WBS 已更新为待审查 / 对应状态
- [ ] feature branch 已 push

---

# 30. Final Result Format

完成后严格按以下格式返回：

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

## Visual Refinement
- hero alignment:
- glass hero removed:
- headline:
- supporting copy:
- primary CTA:
- login action:
- header:
- language action:
- AI entry:

## Background
- visual composition:
- motion language:
- overlay:
- focal point:
- poster fallback:
- reduced motion:

## Preserved
- `/start`:
- StartFlowDraft:
- AIConversationPanel behavior:
- WebM / MP4 / poster architecture:

## Responsive Validation
- 1600x900:
- 1440x900:
- 1024x768:
- 390x844:
- horizontal overflow:

## Accessibility
- keyboard:
- focus-visible:
- AI Escape close:
- AI focus restore:
- reduced motion:
- background semantics:

## Validation
- lint:
- typecheck:
- format check:
- build:
- dev server:
- console errors:

## Dependencies Added
- None / ...

## Files Changed
- ...

## Problems Found
- ...

## Ready For Review
Yes / No
```

完成 TASK-004.1-A 后停止，不继续 TASK-005。
