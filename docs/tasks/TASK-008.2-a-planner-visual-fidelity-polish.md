# TASK-008.2-A — Planner 视觉精修：对齐定稿概念图

> Task ID: `TASK-008.2`  
> Owner: `A`  
> GitHub Issue: `#73`  
> Target Branch: `develop`  
> Feature Branch: `feature/a-planner-visual-fidelity-polish`

> 执行状态（2026-09-05）：待审查 / Partially Completed。已提交纯视觉实现与五尺寸对比证据；待补充定稿参考图并确认执行期间新增 v0.3 设计的范围差异。未合并。完整追踪见 [Result](RESULT-TASK-008.2-a-planner-visual-fidelity-polish.md)。以下正式规格保留，不将后续业务要求自动纳入本 Task。

## 1. 任务目标

在 **不改动 TASK-008 / TASK-008.1 已完成业务逻辑与状态模型** 的前提下，对 `/planner` 做一轮纯视觉/布局精修，使当前实际页面从“灰白后台工具感”明显靠近用户定稿的预想图：

- 暖白 / 象牙白主表面
- 极淡樱花粉装饰
- 深蓝灰正文
- 珊瑚红强调
- 大圆角卡片
- 轻阴影 / 轻半透明镶嵌感
- 地图为绝对视觉主体
- 除行程路线外减少多色 UI

本 Task 不是重新设计，不重新发明业务，只做 **visual fidelity polish**。

---

## 2. 必须先做的前置检查

执行：

```bash
git status
git fetch origin
git switch develop
git pull --ff-only origin develop
git log --oneline -15
```

确认：

- TASK-008 已合入 develop
- TASK-008.1 已合入 develop
- `/planner` 当前可运行
- Mapbox 有 token 时可显示真实底图，无 token 时 fallback 正常
- 当前 1日 / 3日 / 全日、方案切换、More Settings、底部 6 Tab、预约联动均正常

若任一前置功能已坏，先报告，不要用视觉修改掩盖逻辑问题。

然后创建：

```bash
git switch -c feature/a-planner-visual-fidelity-polish
```

---

## 3. 设计对照原则

用户提供两张图：

- 预想：粉樱暖白、地图主视觉、右栏 1/4、底栏 1/4、高密度但圆润的旅行产品 UI
- 实际：当前真实 Mapbox 页面，灰度偏高、字号过小、信息密度和视觉层级不足

本 Task 目标：**保留实际页面真实功能，将视觉排版调整到预想图的方向。**

优先级：

```text
用户预想图视觉关系
> docs/ui/trip-planner.md
> 当前实际功能结构
> 旧概念 SVG / 旧 Phase Issue
```

不得为了“接近预想”把真实功能退化成静态图。

---

# 4. 页面整体尺寸

## 4.1 Header

当前实际 Header 过薄、文字过小。

桌面目标：

- 高度：`60–68px`
- 左侧 Brand 区明显放大
- `TravelAssist` 品牌文字约 `20–24px / 700`
- 主导航约 `14–16px / 600`
- Header 背景暖白，轻透明但保证文字清晰
- 顶部左右 padding：`24–32px`

参考结构：

```text
TravelAssist | 探索目的地 | AI 行程规划 | 旅行灵感 | 实用工具       搜索框   通知   头像
```

如果当前 Header 架构不支持全部入口，可保持现有导航项，但视觉尺寸和空间关系必须向预想图靠近。

搜索框：

- 宽约 `260–320px`
- 高约 `38–42px`
- pill / 大圆角
- 暖白半透明
- 不使用纯灰后台输入框风格

---

# 5. Planner 主 Grid

## 5.1 宽度比例

桌面：

```text
左侧地图工作区 ≈ 75%
右侧栏 ≈ 25%
```

必须实测：

- 1600px 宽：右栏目标约 `380–420px`
- 1440px 宽：右栏目标约 `340–380px`

不要视觉上接近 1/3。

## 5.2 右侧栏到底

右侧栏从 Header 下方一直到底部，不能只到地图高度。

右栏使用一个连续容器：

- 上半设置区 50%
- 下半推荐方案区 50%
- 中间可以有细分隔线 / 12–16px 内距
- 不要上下形成两个互不相关的大空白区域

---

# 6. 地图视觉调整

当前真实地图过灰、过白、路线浮在“工程地图”上。

## 6.1 Mapbox Style

优先从现有 style 做轻量调整，不换 Provider。

目标：

- 陆地区域保持暖灰绿 / 极低饱和米绿
- 水域使用浅蓝灰
- 道路减少高对比
- POI 文本减少杂讯
- 行程线清晰，但不要荧光
- 仍保留真实地图可读性

如果使用 Mapbox Standard / Streets 等：

- 优先通过 style config / layer paint 调整可用参数
- 不为了颜色安装新库
- 保持 token / fallback 架构不变

## 6.2 地图不加大面积樱花贴图

预想图里的樱花感用于整体视觉气质。

真实地图区域不要铺满装饰，避免遮挡路线。

可只在页面边缘 / panel background 使用很淡的樱花纹理或 CSS 装饰。

---

# 7. 地图 Pin / POI 层级

当前 Pin 太工程化，预想图更像旅行产品。

## 7.1 主要地点

东京 / 富士山 / 河口湖 / 箱根 / 富士急等主要节点：

- 使用圆形图片缩略图 Marker（若现有数据有图片）
- 圆图直径约 `52–72px`
- 白色外圈 `3–4px`
- 轻阴影
- 下方独立小标签显示地名
- 当前选中节点可加珊瑚红小 Pin / ring

如果数据无图：

- 使用统一低饱和圆形占位图标
- 不虚构远程图片

## 7.2 普通停靠点

普通 stop：

- 小圆点 / 小 pin
- 珊瑚红或路线色
- 不要每个点都使用不同颜色

## 7.3 交通时间气泡

路线关键段增加紧凑白色胶囊：

```text
🚆 电车
约1小时50分钟
```

或：

```text
🚗 驾车 约1小时
```

要求：

- `12–13px`
- 白/暖白底
- 轻阴影
- 不遮挡主要地名

---

# 8. 左侧图层工具栏

当前实际工具栏偏窄、偏后台。

桌面展开目标：

- 宽 `72–88px`
- 距左 `16–20px`
- 距顶部地图区域 `16–20px`
- 圆角 `16–20px`
- 暖白 90% 左右透明度
- 轻阴影

每项：

- 高 `44–50px`
- 图标 `18–22px`
- 文案 `12–13px`
- 同一深蓝灰主色
- 当前项可用极淡樱花粉底 + 珊瑚红图标

保留现有收起逻辑。

收起按钮：

- 单独圆角胶囊 / 小圆按钮
- 不与 toolbar 边框挤在一起

---

# 9. 日程范围选择器

位置仍在地图右侧、右栏左边。

视觉：

- 宽约 `72–92px`
- 白 / 暖白浮层
- 圆角 `14–18px`
- 每项高 `38–44px`
- 当前选中使用极淡粉底 + 珊瑚红文字/边框

状态：

```text
第1天 ▼
3日
全日
```

或 3 日：

```text
1日
Day 1–3 ▼
全日
```

不要恢复成顶部大 Select。

---

# 10. 右侧栏上半区

当前实际问题：

- 字体过小
- 卡片过薄
- 视觉像后台配置项
- 上半区空旷但信息层级弱

目标：接近预想图的暖白旅程控制面板。

## 10.1 容器内边距

- 水平 `16–20px`
- 垂直 `14–18px`
- 卡片 gap `10–12px`

## 10.2 同行人 / 日期

两个并排卡：

- 高 `74–88px`
- 圆角 `14–18px`
- 轻边框 + 轻阴影
- 左图标约 `22–28px`
- 标题 `14–15px / 700`
- 摘要 `12–13px`
- 右侧 Chevron 明确

## 10.3 景点 / 餐饮 / 住宿偏好

3 卡并排：

- 高 `88–104px`
- 图标统一线性风格
- 标题 `13–14px / 700`
- 摘要最多 2 行
- 不要让文字挤成超小字体

如果 25% 宽度下三列过窄：

- 优先缩短摘要文案
- 不要改成纵向三行
- 保持预想图三卡并排结构

---

# 11. 更多行程设置 / 重新生成路线

两按钮同一行、同高度。

目标：

- 高 `44–50px`
- `更多行程设置` 可占 `52–56%`
- `重新生成路线` 占剩余宽度
- 两者圆角 `12–16px`
- More Settings：暖白 / 淡粉边框
- Replan：珊瑚红主按钮，白字

More Settings Popover 行为 **完全保持现有实现**：

- 不推动下方方案
- 不造成 layout shift
- Escape / 外部点击 / 再次点击关闭

只改视觉，不改交互语义。

---

# 12. 推荐方案下半区

当前实际卡片太高、信息少，导致大量空白。

目标：3 个紧凑横条，完整占据下半约 50%。

## 12.1 标题区

```text
推荐方案                         查看全部方案 >
```

- 标题 `16–18px / 700`
- 右侧 `12px`

## 12.2 三个方案横条

每条建议：

- 高 `108–128px`（根据实际下半高度微调）
- 圆角 `14–18px`
- 缩略图 `76–92px` 宽
- 右侧信息区自适应
- 不要卡片内大面积空白

内容：

```text
方案1
东京·富士山经典之旅
3天2晚   自然风光   经典地标
```

## 12.3 当前方案

当前选中：

- 完整珊瑚红细外框 `1.5–2px`
- `当前方案` 小标签
- 标签字号 `10–11px`
- 不用大面积纯红填充

方案2/3：普通暖灰粉细边框。

---

# 13. 底部执行面板

当前实际底栏过矮、文字太小、像数据表。

目标：接近预想图的旅行时间轴卡片。

## 13.1 高度

桌面：

- 目标接近 viewport 高度 `24–26%`
- 1600×900 / 1440×900 时约 `210–235px`

只覆盖左侧工作区。

## 13.2 容器

- 外边距左右 `16–20px`
- 底部 `12–18px`
- 圆角 `18–22px`
- 暖白 / 轻透明
- 轻阴影
- 不使用纯灰表格线

---

# 14. 底部 6 Tab

顺序不变：

```text
行程 | 移动 | 预约·票务 | 天气·备选 | 住宿·餐饮 | 详细
```

视觉：

- Tab 行高 `42–48px`
- 图标 `18–20px`
- 文字 `13–14px / 600`
- 当前 Tab：珊瑚红文字 + 下划线 / 极淡粉底
- 非当前：深蓝灰
- 分隔线极淡

不要将每个 Tab 做成不同颜色。

---

# 15. 时间轴

当前实际时间轴像三列文本框。

目标：一条连续时间轴。

## 15.1 Day 分组

上层显示：

```text
Day 1
4月10日（周四） 东京市内
```

Day 2 / Day 3 同理。

字号：

- Day `14–15px / 700`
- 日期摘要 `11–12px`

## 15.2 连续线

- 使用一条细珊瑚粉横线
- stop node 使用小圆点
- 当前 node 可填充珊瑚红

## 15.3 行程节点卡

每个节点：

- 宽约 `120–160px`
- 高约 `80–100px`
- 可有小图 `40–56px`
- 时间 `12px`
- 地点 `13–14px / 700`
- 次要说明 `11–12px`

不要使用纯文本长条 input 风格。

Map ↔ Timeline 双向联动保持现状。

---

# 16. 字体层级

当前实际页面整体字号偏小，统一提升。

建议基准：

```text
页面重要标题：18–22px
模块标题：16–18px
卡片标题：13–15px
正文：12–14px
辅助：11–12px
状态小标签：10–11px
```

桌面不得出现大量 9–10px 正文。

---

# 17. 边框 / 阴影 / 圆角统一

建议统一：

```text
--planner-radius-card: 16px
--planner-radius-panel: 20px
--planner-border: rgba(warm-pink-gray, ~0.35)
--planner-shadow: 0 8px 24px rgba(..., 0.06~0.10)
```

不要每个模块自己发明不同阴影。

---

# 18. 响应式行为保持

现有 TASK-008 响应式逻辑不得回归：

- `<1200px`：右栏折叠为 Drawer / overlay
- 低高度 / mobile：底栏折叠为 sheet / overlay

如果视觉精修导致断点需要微调，可以调整，但必须说明。

移动端不要求复制桌面预想图，只保证：

- 视觉语言统一
- 无横向溢出
- 大按钮 / 字号不变得过小

---

# 19. 不允许改动的功能

本 Task 不修改：

- Trip State schema
- `tripItemId` 联动规则
- Mapbox adapter / fallback 架构
- 1日 / 3日 / 全日逻辑
- 3日窗口算法
- Booking / fixed-time Mock 状态机
- 方案切换语义
- More Settings 行为
- 底部 6 Tab 语义
- `/start`
- B Personal Center
- API / Auth / DB / AI

除非视觉实现必须做极小 DOM 结构调整，否则优先 CSS / presentational component 修改。

---

# 20. 实施顺序

按以下顺序执行，避免无序改 CSS：

1. Header 尺寸 / 字体 /导航视觉
2. Planner 75/25 Grid 实测
3. Map style / map padding
4. 左工具栏
5. 日程范围选择器
6. POI Marker / label / transport bubble
7. 右栏上半卡片
8. More Settings / Replan 按钮
9. 右栏下半 3 横条方案
10. 底部 panel 高度 / tabs
11. 时间轴节点卡
12. 全局色彩 / border / shadow cleanup
13. Responsive 回归

不要先做零散小图标微调再返工整体 Grid。

---

# 21. 视觉验收方法

必须以同一 viewport 对比：

```text
预想图
vs
实际实现截图
```

至少输出 / 验收：

- 1600×900
- 1440×900
- 1280×800
- 1180×800
- 390×844

## 21.1 1600 / 1440 验收重点

- Header 不再过薄
- 地图不再像灰白工程图
- 主要 POI 视觉明显
- 左工具栏更圆润
- 右栏真实约 1/4
- 上下 1:1
- 方案为紧凑 3 横条
- 底栏约 1/4 高
- 时间轴是连续路线而不是表格
- 全页色彩数量减少

---

# 22. 自动化与代码验证

执行：

```bash
npm ci
npm run lint
npm run typecheck
npm run test --if-present
npm run format:check
npm run build
git diff --check
```

保留 TASK-008.1 已有测试。

如果全仓 format baseline 仍有既有失败：

- 不修无关文件
- 记录原有失败
- 本 Task 修改文件单独 Prettier 通过

浏览器验证：

- More Settings 无 layout shift
- 1日/3日/全日正常
- 方案切换正常
- Map ↔ Timeline 正常
- 预约状态正常
- 右栏折叠正常
- 底栏折叠正常
- 无 console / hydration error

---

# 23. WBS / Tracking

完成前更新：

```text
docs/project/WBS-TravelAssist.md
```

新增 / 更新 TASK-008.2 tracking。

不要因为视觉精修把未完成的真实 Route / AI / DB 项目标记已完成。

Issue：`#73`

---

# 24. Commit / PR

建议：

```bash
git add .
git commit -m "style(planner): align planner with approved visual direction"
git push -u origin feature/a-planner-visual-fidelity-polish
```

创建 PR：

```text
[TASK-008.2-A] Polish Planner visual fidelity
```

关联：

```text
Closes #73
```

不要自行 merge，等待用户确认截图。

---

# 25. 最终报告格式

```markdown
# TASK-008.2-A Result

## Status

Completed / Partially Completed / Blocked

## Tracking

- Issue: #73
- Task File: docs/tasks/TASK-008.2-a-planner-visual-fidelity-polish.md
- Branch:
- Commit:
- PR:
- WBS updated:

## Visual Changes

- Header:
- Map style:
- POI markers:
- transport bubbles:
- left toolbar:
- range selector:
- right upper panel:
- More Settings / Replan:
- recommendation rows:
- bottom panel:
- timeline:
- palette cleanup:

## Ratio Measurements

- 1600×900 right panel:
- 1440×900 right panel:
- upper/lower:
- bottom height:

## Screenshot Validation

- 1600×900:
- 1440×900:
- 1280×800:
- 1180×800:
- 390×844:

## Regression Validation

- day range:
- plan switching:
- More Settings:
- booking/fixed-time:
- map/timeline:
- responsive:

## Automated Validation

- npm ci:
- lint:
- typecheck:
- tests:
- format:
- build:
- diff check:
- console/hydration:

## Scope Preserved

- state/schema unchanged:
- Mapbox boundary unchanged:
- no new API/AI/Auth/DB:
- /start untouched:
- B files untouched:

## Remaining Visual Gaps

- ...

## Ready For Visual Review

Yes / No
```

完成后停止，不继续下一 Task。
