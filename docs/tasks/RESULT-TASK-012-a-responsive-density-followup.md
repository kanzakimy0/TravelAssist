# TASK-012-A Responsive Density Follow-up Result

## Metadata / Status

- Task ID: TASK-012-A follow-up；Owner: A；Status: 待验收。
- WBS: 1.5 / 1.6 / 1.7 / 4.1 / 4.8 / 4.14（Planner UI 补修）。
- GitHub Issue: [#135](https://github.com/kanzakimy0/TravelAssist/issues/135)。
- Branch: `codex/planner-responsive-density` → `develop`。
- Initial Base: `c88d3381685615fcd0e1dd9e3217bd871e50c2ac`。
- Implementation Commit: `660af61`；Integrated Validation Commit: `bcc898f2edda6f1b0822e7ed3162ecd55927637f`（无冲突集成验证时 develop `4161a8a`，保留新的 Personal Center 成果）。Draft PR: [#139](https://github.com/kanzakimy0/TravelAssist/pull/139)。
- 来源：用户本轮逐项布局反馈及 Issue #135；这是已合并 TASK-012-A 的独立补修，不重写 #111 / PR #124 的历史验收结论。

## Implemented / Updated Visual Contract

1. 桌面执行栏高度为真正 `25dvh`，去掉原 200–252px 上下限；左侧贴窗口、底部贴窗口、右侧贴右栏。大屏 2560×1440 时高 360px，1920×1080 时 270px；1440×900 时 225px。
2. 删除页签上方的 Day / 天气汇总行与多余 padding。保留时间轴内部必要日期和时长语义，不删除行程数据；六 Tab 名称与行为不变。
3. 时间轴使用可伸缩网格和节点高度，保留真实时长比例；移动链卡片均分剩余宽度，字号、内距随窗口伸缩。小屏底部抽屉保留既有交互，时间轴也填充可用高度，不强塞为触控不可用的 25dvh。
4. 左工具栏“更多”加与其他控件一致的圆角细框，底色取父层暖白；展开时底部折叠箭头朝上，收起/展开功能不变。
5. 一日/三日/全日控件固定宽度；一日和三日弹层宽度跟随触发按钮（桌面 78px、小屏 70px），取消大标题头。三日选中值为 `D2-D4` 等范围，不撑宽外框；数字输入、合法区间校验、Escape/外侧关闭及焦点恢复保留。全日继续直接切换。
6. 快速设置使用自适应网格、容器字号和可伸缩卡片；“进入行程详情”铺满可用宽度、珊瑚色填充并加大高度。上方更多设置和重新生成保持同排同高。
7. 桌面搜索/通知/头像组限制在右侧 25% 栏位内；窄屏保留已有折叠入口。
8. 地图与右栏之间增加 42px CSS 渐变，底部渐变缩短；所有渐变 `pointer-events: none`，不截获地图点击。

## Preserved / Non-goals

- 推荐方案组件源码未改，区域与三卡的几何、内容、顺序、选择语义均与修改前对比一致；证据见 QA。
- 保留 Mapbox / fallback、Trip State、六 Tab、偏好草稿/取消/保存/影响预览、预约/住宿保护、Map ↔ Bottom 和 Planner → Detail 同一地图生命周期。
- 未改 `/start`、首页构图、Personal Center、业务状态模型、依赖、Secret、Provider / AI / Auth / DB。
- 主工作区已有未提交改动保持原样；实现位于独立工作树。
- <1200px 的原右栏 Drawer 断点不变；本补修不重新打开已记录的 1180px 侧栏规格差异。

## Validation

- npm ci：通过，362 packages，0 vulnerabilities；npm 有既有 ESLint 生命周期及 install-script 审批提示，未改配置。
- lint / typecheck / build / git diff --check：通过。
- npm run test --if-present：无 test script；另显式运行全部 Node tests，初轮 168/168，集成最新 develop 后 170/170 通过，包含 3 项本补修新增布局契约测试。
- format：修改的代码、测试及新文档单独通过；全仓 format:check 有 25 项未修改的基线异常，不表示全仓格式通过，不批量格式化历史文档。
- 2560×1440 / 1920×1080 / 1600×900 / 1440×900 / 1280×800 / 1180×800 / 1024×768 / 390×844 / 320×740：真实 Mapbox + forced fallback 的控件、六 Tab、宽高和推荐卡对比通过。
- 生产预览另跑九视口真实地图尺寸/截图检查，并复用 TASK-012 六视口测试验证设置与 Planner → Detail 实际 Mapbox canvas 未重建；双引擎交互回归通过。
- `D2-D4`：浏览器扩展旅行至五日，实际选择第二至第四天，验证主框及弹层宽度不变。
- 应用 console / hydration error：0；开发环境曾有 127.0.0.1 HMR 跨域告警，改用 localhost 复验；生产预览无该告警。
- 截图与机读报告：[QA index](../qa/planner-density/README.md)。

## Delivery

- Preview: [3113 Planner](http://127.0.0.1:3113/planner)，已切换为本补修的生产构建，不是旧开发分支。
- Draft PR: [#139](https://github.com/kanzakimy0/TravelAssist/pull/139)；Issue #135 Open / Review；不自动合并。
- 后续：用户视觉审查后再决定合并；不继续其他任务。
