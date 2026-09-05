# TASK-008.2-A — Planner 视觉验收证据

## 对照来源与限制

- 修改前：`origin/develop` 的 `147a7a0e38c5652922c7cb9b81f23a58c127acd7`，包含 TASK-008 PR #59 与 TASK-008.1 PR #69。
- 修改后：`feature/a-planner-visual-fidelity-polish`，实现提交见 [Result](../../tasks/RESULT-TASK-008.2-a-planner-visual-fidelity-polish.md)。
- Task 引用的“定稿预想图”本轮未收到；已请求补充。这里是实际页面修改前后对照，按 Task 文字规范验收，不声称完成参考图逐像素对齐。
- 提交前再次 fetch 发现 `5d2f7e0` 将设计书扩展至 v0.3，已完整读取。其时间比例条、三日共轴比较、数字快捷输入、Pin Morph、三级偏好等新增交互，不在本次用户授权的纯视觉且保留现有业务范围内；本次不自行扩展，Result 保持 Partially Completed，等待范围与参考图确认。
- 截图来自 Windows Chrome 的真实页面，device scale 1、reduced motion；没有拼贴、修改截图、替换地图画面。所有行程 / 价格 / 预约仍是原有 Mock。
- 修改前使用同一依赖版本的独立 detached worktree，以 `next dev --webpack` 运行；由于该临时目录的 node_modules junction，Turbopack 不支持其跨根路径。修改后使用项目默认 `next dev`。未修改工程配置。
- before / after 均成功加载真实 Mapbox；fallback 是浏览器主动阻断 Mapbox 请求后的实际页面。Token 只使用本机已有未跟踪配置，不在证据、代码、日志中存储。

## 五尺寸修改前后截图

| 视口     | 修改前                        | 修改后                      | 断网 fallback                     |
| -------- | ----------------------------- | --------------------------- | --------------------------------- |
| 1600×900 | [Before](before-1600x900.png) | [After](after-1600x900.png) | [Fallback](fallback-1600x900.png) |
| 1440×900 | [Before](before-1440x900.png) | [After](after-1440x900.png) | [Fallback](fallback-1440x900.png) |
| 1280×800 | [Before](before-1280x800.png) | [After](after-1280x800.png) | [Fallback](fallback-1280x800.png) |
| 1180×800 | [Before](before-1180x800.png) | [After](after-1180x800.png) | [Fallback](fallback-1180x800.png) |
| 390×844  | [Before](before-390x844.png)  | [After](after-390x844.png)  | [Fallback](fallback-390x844.png)  |

## 弹层与范围

- [1180px 设置 Drawer](after-1180x800-drawer.png)
- [390px 设置 Drawer](after-390x844-drawer.png)
- [390px 行程 Sheet](after-390x844-sheet.png)
- [更多行程设置](after-more-settings.png)
- [连续三日](after-three-days.png)
- 同目录保留对应 before / fallback 截图，便于核对原有折叠与交互。

## 实测比例

| 视口     | Header | 右栏宽              | 上 / 下半高    | 底栏高        |
| -------- | ------ | ------------------- | -------------- | ------------- |
| 1600×900 | 68px   | 400px（25%）        | 416 / 416px    | 225px（25vh） |
| 1440×900 | 68px   | 360px（25%）        | 416 / 416px    | 225px（25vh） |
| 1280×800 | 68px   | 320px（25%）        | 366 / 366px    | 200px（25vh） |
| 1180×800 | 68px   | 原规则折叠为 Drawer | 打开后保持两区 | 200px（25vh） |
| 390×844  | 60px   | 折叠为 Drawer       | 打开后保持两区 | 折叠为 Sheet  |

原基线的 75:25 / 1:1 / 25vh 已正确，此次保留比例，重点提高视觉层级、卡片密度、圆角和浮层边距；不把原有正确比例描述为本次新功能。桌面底栏左右 18px、底部 14px 外距。1280px 时间轴可横向滚动，不撑大页面；移动端继续使用原有纵向行程与可横向滑动的六个 Tab。

## 浏览器回归

[修改前记录](before-checks.json)、[修改后记录](after-checks.json)、[断网记录](fallback-checks.json) 包含尺寸、引擎、错误与时间戳。

三轮均执行：

- 1日 / 第2天 / 第1天、连续第1–3天、全日切换；不更改窗口计算。
- 方案 02 切换与选中状态。
- More Settings 打开前后下半推荐区 bounding box 完全一致；Escape、外部点击、再次点击均关闭。
- 时间轴选中反馈到地图等价列表；从地图等价列表选择浅草寺，详情关闭后时间轴对应项选中。真实画布图层点击保持原 queryRenderedFeatures 入口，不增加另一套选中状态。
- 预约清单选择本地演示渠道、手动完成预约、记录固定时间，重新生成 Mock 路线后预约全文保持一致。
- 六个 Tab 切换、地图工具栏收起 / 展开、1180px 和 390px Drawer、390px Sheet 的 Escape 关闭。
- 五视口无 document 横向溢出；无 pageerror / hydration error。

开发态 before / after 均有原有 Mapbox “container should be empty” warning，以及截图引起的 GPU ReadPixels 性能 warning；没有将这些 warning 抹去或声称全无日志。fallback 中 `net::ERR_FAILED` 是主动断网产生的预期资源错误，不是应用异常。

本地生产构建另跑相同五视口和全部交互，[记录](production-checks.json)中无 Mapbox 容器 warning、console error、pageerror 或 hydration error；仅保留 GPU / preload warning。同步上游 v0.3 文档后应用代码与该生产验收版本相同。

## 视觉实现边界

- 主要 POI 没有图片字段，按 Task 允许的路径使用本地单色地标圆形占位图标（64px / 白圈4px），不伪造远程照片。近邻图标由 Mapbox 避让，缩放或选中可提高优先级；全部地点仍可通过等价列表操作。
- 交通白胶囊只取已有 `TripItem.next` Mock 文案，最多三个，不估算城际时间。全日结构没有现成城际时长，故不捏造胶囊。
- 保留 Mapbox light-v11，仅调整 base paint 与标签层级；方法依据 [Mapbox 标签避让说明](https://docs.mapbox.com/help/dive-deeper/optimize-map-label-placement/)。Trip GeoJSON / reducer / Provider 生命周期与 fallback 切换不另建实现。
- 现有 Header 无搜索 / 通知业务，按 Task 第4节的架构例外保留真实导航，不添加无功能搜索框。
- 为保留右栏 1:1 和预约操作，方案横条按可用高度约 82–96px；不机械撑到建议的 108–128px 而挤掉第三方案。
- 手机 fallback 在工具栏展开时部分地图元素位于浮层后，可收起工具或使用等价列表；不扩展本任务为新的移动地图交互系统。

## 重跑浏览器验收

`tools/qa/planner-visual-check.mjs` 使用外部 Playwright 和 Chrome（未加入项目生产依赖）。设置 `PLAYWRIGHT_MODULE` 为已安装的 Playwright 模块、`CHROME_EXE` 为 Chrome 路径、`PLANNER_QA_URL` 为本地服务地址，然后执行：

```sh
node tools/qa/planner-visual-check.mjs before
node tools/qa/planner-visual-check.mjs after
node tools/qa/planner-visual-check.mjs fallback
```

before 必须指向基线服务，after / fallback 指向 feature 服务；脚本仅接受 localhost / 127.0.0.1，不访问生产站点。默认真实地图验收需要本地已配置有效 Token；断网测试按预期进入 fallback。浏览器仅为 Chromium 与模拟 viewport，未声称实机触屏或其他浏览器测试。
