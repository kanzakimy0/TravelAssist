# TASK-025-A — Homepage Animated Background Production Integration

## Metadata

- Task ID: `TASK-025-A`
- WBS: `3.2`
- Owner: `A`
- Responsibility: `Main Travel System / Website Entry`
- Priority: `P1`
- Status at Task creation: `可开始（但有 Integration / Asset Gate）`
- GitHub Issue: `#246`
- Task File: `docs/tasks/TASK-025-a-homepage-animated-background.md`
- Suggested implementation branch: `feature/a-homepage-animated-background`
- WBS Depends On: `1.16`
- Task creation reference develop: `e74904830cbf8e6745b2013b2888e38984ccf96d`
- Execution base: **must re-read latest `origin/develop`; do not assume the Task creation SHA is current**

---

# 1. Objective

完成 WBS 3.2「首页动画背景区域」的生产级收口。

本 Task **不是重新设计首页**，也不是重新制作 Home Hero / Header / CTA。首页主视觉、构图、品牌语言和主入口均已由既有设计与 TASK-024-A 冻结，本 Task 只负责：

```text
已有静态 Poster
+
已有 ImmersiveBackground 运行时
+
已授权 WebM / MP4 动态素材
+
播放 / 降级 / reduced-motion / 性能 / 浏览器验收
```

最终目标：

> Desktop 在允许动态播放时展示“单一连续、非常慢的日本旅行场景动态”；任何不适合播放视频的环境仍稳定展示当前正式 Poster，且首页视觉、CTA、Header 与 AI 入口不回退。

---

# 2. Current Repository Facts — Must Re-check

Task 创建时 `develop` 已确认：

```text
src/features/home/components/immersive-background.tsx
src/features/home/components/immersive-background.module.css
public/media/home/home-hero-poster.webp
```

现有代码已经具备：

- `PosterFallback`
- 条件 `VideoBackground`
- `<video autoPlay muted loop playsInline>`
- WebM / MP4 source 边界
- poster fallback
- readability overlay
- `prefers-reduced-motion` CSS 降级
- Mobile poster-only 的现有视觉规则

但 Task 创建时 `public/media/home/` **只有**：

```text
home-hero-poster.webp
```

没有：

```text
home-hero.webm
home-hero.mp4
```

Codex 执行时必须重新检查最新 `origin/develop`，不得假设此状态未变化。

---

# 3. Source of Truth Priority

执行时按以下优先级：

1. 用户已验收并最终合入的 `TASK-024-A / WBS 3.1` Main Shell / 全站品牌视觉
2. `docs/ui/home-page.md`
3. `docs/tasks/TASK-004-a-homepage-final-visual.md`
4. 当前 `origin/develop` 的真实 Home 实现
5. 本 Task

如果最新 develop 已有后续用户明确确认的 Home 设计记录，则以更新的用户确认记录优先。

不得根据旧概念图推翻当前已验收首页。

---

# 4. Mandatory Integration Gate — TASK-024-A

虽然 WBS 3.2 的正式依赖是 `1.16`，但 TASK-025 与 TASK-024 会接触 Home / Header / Hero / shared visual files。

因此执行前必须检查：

- PR `#244` 是否已经合入 `develop`
- WBS `3.1` 是否已按用户验收结果完成收尾

如果 PR #244 **仍然 Open / Draft / 未合并**：

```text
Status: Blocked
Reason: TASK-024-A overlaps Home visual / Main Shell files and has not been integrated.
```

此时：

- 不从 PR #244 feature branch 继续开发
- 不 cherry-pick PR #244
- 不并行修改同一 Home 文件
- 不擅自合并 PR #244
- 在 Result / Issue 中记录 blocker 后停止

TASK-024-A 合并后，必须从新的最新 `origin/develop` 重新启动本 Task。

---

# 5. Mandatory Asset Gate

这是本 Task 最重要的生产门槛。

执行前检查：

```text
public/media/home/home-hero.webm
public/media/home/home-hero.mp4
public/media/home/home-hero-poster.webp
```

以及仓库现有 Asset Registry / rights / manifest 规则（如这些媒体需要登记）。

## 5.1 Authorized Asset Definition

只有满足至少一种明确可信来源时，视频才可作为正式素材接入：

- 用户直接提供并明确允许项目使用；
- 已存在于项目仓库并有项目 rights / manifest / provenance 记录；
- 由项目已有、明确授权的素材生产流程产出，并有可审计记录。

不得仅因为文件名正确就假定版权 / 使用权成立。

## 5.2 If Authorized Video Exists

继续执行本 Task 的完整生产接入、测试与视觉验收。

## 5.3 If Authorized Video Does NOT Exist

禁止：

- 联网下载随机旅游视频；
- 抓取 YouTube / Instagram / TikTok / 旅游网站视频；
- 提交版权不明视频；
- 创建假 `.webm` / `.mp4`；
- 用 GIF / Lottie / Three.js / Canvas / WebGL 代替；
- 用 CSS Ken Burns / 强 parallax 冒充已冻结的动态视频方案；
- 因“需要完成 WBS”而改变已经冻结的技术方向。

允许：

- 审计现有运行时；
- 补充与素材无关、能够证明必要的安全测试或文档；
- 明确列出所需视频资产规格。

但最终必须：

```text
WBS 3.2 = 阻塞
Reason = 缺少已授权 WebM / MP4 动态素材
```

不得标记为 `待审查` 或 `已完成`。

---

# 6. Frozen Visual Direction

动态素材必须与当前正式 Poster / 首页构图属于同一视觉方向：

```text
日本海边小镇
+
地方铁路 / 电车
+
海面 / 小岛 / 远山
+
少量住宅、植被、树影或樱花
```

日本元素必须属于**同一个可信场景**，不能做旅游符号拼贴。

禁止同时刻意堆叠：

```text
富士山
鸟居
樱花雨
灯笼
和服
日本地图
```

主视觉关键词保持：

- 极简
- 沉浸式
- 明亮
- 安静
- 大留白
- 现代日本旅行气质
- 高级但不奢华
- TravelAssist 当前暖白 / 深墨 / 朱红品牌体系

---

# 7. Motion Language

动态背景不是宣传片。

推荐运动：

- 地方电车缓慢驶过；
- 水面轻微变化；
- 树叶 / 枝条 / 少量花瓣轻微运动；
- 光线非常弱的自然变化。

建议循环长度：

```text
20–30 秒
```

允许极慢、几乎不可察觉的相机运动，但不得抢夺 UI 注意力。

禁止：

- 高频镜头切换；
- 快速 zoom；
- 快速 pan；
- 强烈 parallax；
- 大面积闪烁；
- 粒子特效主导；
- 自动播放声音；
- 把首页变成视频广告页。

---

# 8. Existing Home Composition Must Be Preserved

本 Task 必须保留用户已经视觉验收通过的首页结构与相对层级。

不得因视频接入重新排版：

- TravelAssist Logo / Header
- 语言入口
- `下一站，去哪里？`
- `规划行程 · 对话调整`
- `让我们开始吧 →`
- 登录 / 用户入口
- Personal Center 入口
- AI 浮动入口

除非不同视频帧造成真实可读性问题，否则不调整上述组件的位置、尺寸和层级。

若确需调整，只允许对 `ReadabilityOverlay` / 背景裁切做最小修正。

不得顺手实施 WBS 3.3 / 3.4 / 3.5。

---

# 9. Video Runtime Requirements

优先保留现有原生 `<video>` 实现；无充分理由不得引入新的 Client State 或视频库。

必须保持：

```text
autoplay
muted
loop
playsinline
poster
WebM
MP4 fallback
```

要求：

1. Poster 始终作为底层稳定画面存在。
2. 视频不存在时不得产生 404 请求风暴。
3. WebM 不可用时 MP4 可作为 fallback。
4. 视频播放失败时首页仍可使用 Poster。
5. 不得出现先黑屏再视频的闪烁。
6. 不得出现视频加载后 Hero 位置跳动。
7. 背景视频必须 `aria-hidden` / 不进入可访问内容流。
8. 视频不得有音轨自动播放声音；即使文件含音轨，页面也必须 muted。
9. 不安装 video player library。

如果当前实现已经满足，不为“增加代码量”而重写。

---

# 10. Resource Loading / Performance Requirements

当前设计允许 Mobile 使用 Poster-only，因此本 Task 必须检查**资源请求**而不只是 CSS 可见性。

至少确认：

### Desktop / no-preference

- 动态视频实际请求并播放；
- Poster 优先可见；
- 视频加载不阻塞主 CTA 可交互。

### Mobile poster-only

- 页面保持 Poster 视觉；
- 不应无意义下载完整背景视频。

### `prefers-reduced-motion: reduce`

- 页面保持正式 Poster；
- 不自动播放背景动态；
- 尽可能避免无意义的视频主体下载。

如果现有“渲染 video + CSS `display:none`”仍会导致不必要视频请求，应以最小方式修正资源加载边界。

不得为了这个目标引入大型 JS 媒体管理依赖。

Result 必须记录：

- WebM 文件大小
- MP4 文件大小
- Poster 文件大小
- Desktop 首次背景媒体请求行为
- Mobile 请求行为
- reduced-motion 请求行为

不预设虚假性能数字；使用实际测量结果。

---

# 11. Poster / First-frame Continuity

正式视频与 Poster 必须视觉连续。

要求检查：

- 主构图位置一致或高度接近；
- 视频开始时不能突然切到完全不同机位；
- 色温、饱和度、亮度不能发生明显跳变；
- 当前 Hero 文字所在区域持续保持可读性；
- Desktop crop 与当前已验收截图的空间关系不被破坏。

如果视频素材无法与 Poster 达到合理连续性，不得强行标记视觉验收通过。

可以：

- 在权利允许且不改变主设计的情况下，从最终视频生成/更新匹配的 Poster；
- 或调整最小的 object-position / overlay。

如替换 Poster，必须说明原因、来源和前后视觉差异，并重新进行全尺寸视觉验收。

---

# 12. Readability Overlay

背景 Overlay 只用于可读性，不用于隐藏不合适的视频。

方向：

- 暖白 / 中性浅色；
- 当前正式首页整体保持明亮；
- 避免纯黑大遮罩；
- 避免明显矩形 Hero 卡片；
- 不把场景模糊到不可辨认。

必须检查视频至少：

- 初始帧；
- 中段；
- 循环结束附近；

保证标题 / CTA / Header 仍清楚。

---

# 13. Mobile Policy

延续当前正式策略：Mobile 可以只展示 Poster。

本 Task 不要求手机强制播放背景视频。

至少验证：

```text
390 × 844
320 × 568（或仓库最新对应窄屏基线）
```

要求：

- Poster crop 合理；
- Logo / CTA / Login / Personal Center / AI 不被遮挡；
- 无横向溢出；
- 不因桌面视频接入造成 Mobile 首屏性能明显退化。

---

# 14. Reduced Motion

必须真实验证：

```css
prefers-reduced-motion: reduce
```

结果必须为：

- Poster 静态展示；
- 无背景动态播放；
- CTA / Header / AI 等功能不受影响；
- 页面没有因为 video 隐藏留下黑层 / 空白层。

不得只检查 CSS 源码而声称 PASS；需要浏览器实际验证。

---

# 15. Error / Fallback QA

至少验证以下场景：

1. WebM + MP4 都存在；
2. 只允许/可播放一种编码时可正常 fallback；
3. 视频资源不可用 / 播放失败时 Poster 仍完整；
4. reduced motion；
5. Mobile poster-only；
6. 首次加载 / 刷新；
7. 首页 → `/start` 导航不受影响；
8. 浏览器 back 返回首页后背景状态正常。

测试过程中不得永久删除项目真实素材。

如需要模拟缺失资源，使用隔离 worktree / fixture / 临时测试手段，并在结束后保持工作区干净。

---

# 16. Accessibility

背景媒体属于纯装饰。

要求：

- 不进入屏幕阅读器主要内容；
- 不产生可聚焦视频控件；
- 不显示原生 controls；
- 不自动播放声音；
- reduced-motion 可可靠降级；
- 不因背景接入破坏 MainHeader / CTA / AI 的现有 focus 顺序。

---

# 17. Testing

必须先复用仓库现有测试框架。

至少新增 / 更新 TASK-025 专项测试，覆盖：

- Poster 永远存在；
- 有授权 WebM / MP4 时 source 正确；
- 无媒体时不渲染无效 source；
- 视频属性包含 autoplay / muted / loop / playsinline；
- 路由 / CTA 不回退；
- 不引入禁止的视频库；
- WBS / feature boundary 不越界。

如果 reduced-motion / resource request 需要浏览器才能真实验证，应由浏览器 QA 覆盖，不用脆弱的源码字符串断言替代。

---

# 18. Browser / Visual Acceptance

动态视频存在并通过 Asset Gate 后，至少验证：

```text
1440 × 900
1024 × 768
390 × 844
320 × 568
```

Desktop 重点：

- Poster → video 过渡；
- 动态是否足够慢；
- 循环是否明显跳帧；
- 初 / 中 / 尾帧 Hero 可读性；
- CTA / Header / AI 几何与 TASK-024 合并后的基线一致。

Mobile 重点：

- Poster-only；
- crop；
- 首屏；
- resource request；
- 无 UI 回归。

另外至少运行一次：

```text
prefers-reduced-motion: reduce
```

用户视觉验收前必须提供可直接查看的证据：

- Desktop 动态短录屏或等价帧序列（只作为 QA，不提交为业务素材）；
- 四尺寸静态截图；
- Browser report / request report。

如果环境不能生成录屏，可以提交关键帧截图 + 明确复现步骤，不得假装完成用户视觉验收。

---

# 19. Validation Commands

至少执行：

```bash
npm ci
npm run lint
npm run typecheck
npm run build
npm test --if-present
git diff --check
```

如果仓库没有 `test` script，必须运行仓库真实 Node tests / TASK-025 专项测试，不得把 `npm test --if-present` exit 0 当成测试通过。

如仓库已有浏览器 QA / Playwright 工具，优先复用，不随意添加新依赖。

全仓格式若存在与最新 develop 完全相同的历史失败：

- 如实列出；
- 证明本 Task 修改文件通过；
- 不越界清理无关文件。

---

# 20. Git Preflight — Mandatory

开始任何修改前：

```bash
git status --short
git branch --show-current
git fetch --all --prune
git rev-parse origin/develop
git log --oneline -20 origin/develop
```

读取：

```bash
git show origin/develop:docs/project/WBS-TravelAssist.md
git show origin/develop:docs/tasks/TASK-025-a-homepage-animated-background.md
git show origin/develop:docs/ui/home-page.md
git show origin/develop:docs/tasks/TASK-004-a-homepage-final-visual.md
```

并核对 TASK-024-A 最新合并状态。

### Git Safety

禁止：

```bash
git clean -fd
git reset --hard
git push --force
git push --force-with-lease
```

不得删除、覆盖或打包用户未提交工作。

---

# 21. Branch / Tracking

Integration Gate 与 Asset Gate 均通过后，从最新 `origin/develop` 创建：

```text
feature/a-homepage-animated-background
```

然后更新 WBS：

```text
3.2: 未开始 / 可开始 → 进行中
```

Owner 保持 A。

同步 Issue #246：

- execution base
- asset provenance / gate result
- branch
- actual scope

不要修改其他 Owner 的真实状态。

---

# 22. Conflict Guard

1. 必须从最新 develop 启动。
2. 不从 TASK-024 或 TASK-004 的旧 feature branch 开发。
3. 不 cherry-pick 已合并任务来“补齐”。
4. WBS 冲突逐段合并，禁止整份 ours / theirs。
5. 不覆盖其他工作站最新 Task / Result / WBS 顶部记录。
6. 不回退 TASK-024 已统一的 MainHeader / Brand tokens。
7. 不把首页动态背景 Task 扩张成全站媒体重构。

---

# 23. Out of Scope

不得顺手实施：

- WBS 3.3「让我们开始吧」新业务；
- WBS 3.4 Auth / Session / Avatar 完整接线；
- WBS 3.5 AI 悬浮入口新业务；
- WBS 3.7 Loading / Empty / Error 系统；
- Planner / Map / Route / POI；
- AI API；
- Booking；
- DB Schema / Migration；
- Personal Center 重构；
- 全局 Design System 重做；
- SEO / Analytics。

现有 CTA、Auth 入口、AI 入口仅做回归，不扩展功能。

---

# 24. Expected Deliverables

Asset Gate 通过后的完整交付应包括：

- 生产级首页动态背景运行时增量（如真实存在缺口）；
- 已授权 WebM / MP4 素材接入；
- 必要 Asset Registry / provenance / rights 记录（按仓库规范）；
- Poster continuity / fallback 验收；
- TASK-025 专项测试；
- 浏览器 / request / reduced-motion QA 证据；
- `docs/tasks/RESULT-TASK-025-a-homepage-animated-background.md`；
- 更新 `docs/project/WBS-TravelAssist.md`；
- 更新 Issue `#246`；
- Draft PR → `develop`。

若 Asset Gate 未通过：

- Result 必须记录缺失素材；
- WBS 3.2 = 阻塞；
- Issue 保持 Open；
- 不制造无意义实现 PR。

---

# 25. Acceptance Criteria

完整通过必须同时满足：

- [ ] 从最新 `origin/develop` 启动。
- [ ] TASK-024-A 已合入 develop；无重叠 Draft 实现冲突。
- [ ] 1.16 真实状态满足 WBS 依赖。
- [ ] WebM / MP4 有明确、可审计的项目使用授权来源。
- [ ] 当前正式 Poster 继续作为稳定 fallback。
- [ ] Desktop 实际播放慢动态背景。
- [ ] WebM / MP4 fallback 实测。
- [ ] 视频播放失败时 Poster 完整。
- [ ] Mobile poster-only 行为通过。
- [ ] reduced-motion 实际浏览器验证通过。
- [ ] 无无意义移动端完整视频下载，或已记录并修复真实资源加载问题。
- [ ] 视频无声音、无 controls、无可访问性干扰。
- [ ] Home Hero / Header / CTA / Login / Personal Center / AI 几何不回退。
- [ ] TASK-024 TravelAssist 品牌视觉不回退。
- [ ] lint / typecheck / build / real tests / diff-check 通过，或历史基线例外有证据。
- [ ] 四尺寸浏览器验收通过。
- [ ] 用户可查看动态视觉证据。
- [ ] Result / WBS / Issue / branch / commit / Draft PR 同步。
- [ ] 实现完成但 PR 未合并：3.2 = `待审查`。
- [ ] 只有用户视觉验收通过且 PR 合入 develop：3.2 = `已完成`。

---

# 26. Mandatory WBS / Result Update

Codex 返回最终结果前必须：

1. 再次 fetch 最新远端；
2. 读取最新 `docs/project/WBS-TravelAssist.md`；
3. 保留其他工作站新增记录；
4. 更新 WBS 3.2 的真实状态；
5. 创建 / 更新 `docs/tasks/RESULT-TASK-025-a-homepage-animated-background.md`；
6. 同步 Issue #246；
7. Asset Gate 通过且有实现时，commit + push + Draft PR；
8. 最后才返回 Result。

状态规则：

```text
Integration / Asset Gate 失败 → 阻塞
正式启动 → 进行中
实现完成但未合并 → 待审查
用户视觉验收 + 合入 develop → 已完成
```

不得把静态 Poster + 条件 video 代码存在误报成“动态背景已经完成”。

---

# 27. Result Format

```md
# TASK-025-A Result

## Status

## Preflight
- execution base:
- TASK-024 merged:
- WBS 1.16:
- working tree safety:

## Asset Gate
- poster:
- webm:
- mp4:
- provenance / rights:
- gate result:

## Tracking
- WBS 3.2:
- Issue: #246
- Branch:
- Commit:
- Pull Request:
- Result file:

## Existing Runtime Audit
- PosterFallback:
- VideoBackground:
- WebM / MP4:
- error fallback:
- mobile:
- reduced motion:

## Production Integration
- video playback:
- poster continuity:
- overlay / readability:
- resource loading:
- file sizes:

## Visual / Browser QA
- 1440×900:
- 1024×768:
- 390×844:
- 320×568:
- reduced-motion:
- request evidence:
- visual evidence:

## Validation
- npm ci:
- lint:
- typecheck:
- build:
- real tests:
- TASK-025 tests:
- diff-check:

## Problems / Deferred

## WBS Updated
Yes / No

## Next Task
Do not start automatically.
```

---

# 28. Stop Rule

完成 TASK-025-A 后停止。

**不要自动开始 WBS 3.3 / 下一 Task。**
