# Step 1–5 手机优化 Result

## Status

本地实现并验收，预览已更新至 `http://127.0.0.1:3113/start`。
尚未 commit / push / merge；当前分支 `codex/planner-responsive-density` 的既有 Planner 追加修改完整保留。
本次不创建或修改正式 GitHub Task / PR 状态。

## Implemented

- 手机竖屏及短横屏使用动态视口高度与安全区；横向四步进度、底部前进/返回/保存按钮固定可见，仅内容区滚动。
- 统一手机内边距、标题层级、Step 1 的 2×2 熟悉度卡片排版；保留桌面设计。
- Step 2 保留 16 个兴趣、6 条五档滑轨；兴趣细分点击区域加大，两组滑轨纵向排列，左右标签结构不变。
- Step 3 保留目的地 2×4、交通/预算四张方卡；同行人和其他分区纵向排布。人数加减、详情入口、安排按钮扩大触控区域。
- 日期在手机内展开出发/返回双列；暖色日历与计划日期浮层限制在可视区域，并响应 visualViewport 变化。
- 弹窗标题/关闭入口与内容滚动分离；输入字号至少 16px，避免 iOS 常见聚焦放大；小高度下仍可滚动到确认/保存。
- Step 4 保留居中六阶段生成；Step 5 单列方案可滑动浏览，返回调整与重新生成保持可见，选中方案的进入地图按钮使用可读的珊瑚色填充。
- 切换步骤重置手机内容滚动位置；没有改变草稿数据格式、持久化逻辑或生成业务逻辑。

## Verification

- lint、typecheck、build、git diff --check：通过。
- 显式执行现有 Node tests：184/184 通过（项目没有 npm test script）。
- 本次修改的代码、QA 脚本及本 Result 的 Prettier 检查通过；未声称全仓 format:check 通过，既有文档格式异常不在此任务修改范围。
- `tools/qa/start-mobile-check.mjs`：1440×900、390×844、320×740、430×932、667×375、844×390，六尺寸 × Step 1–5 共 30 张生产截图与几何验证，无页面横向溢出；手机内容可滚动、底部按钮处于视口内。
- 1440×900 Step 1、2、3、5 修改前后 PNG 字节一致；Step 4 为动态阶段画面，检查布局截图而非依赖逐帧像素相等。
- `tools/qa/start-mobile-interactions.mjs`：390×844、320×740、667×375、844×390 均通过兴趣细分、六滑轨、具体日期、计划日期、地区搜索、三类详情弹窗、机票保存、短视口表单、前进/返回/刷新草稿恢复、生成三方案和返回调整检查。
- 两份生产 QA 报告均无 pageerror。测试使用桌面 Chromium 的触屏尺寸模拟；没有将模拟结果冒充真实 iOS Safari 或 Android 软键盘实机验收。

## Evidence

- 修改前：`docs/qa/start-mobile/before/`
- 最终生产布局：`docs/qa/start-mobile/production-layout/`
- 最终生产交互：`docs/qa/start-mobile/production-interactions/`
- `after/` 与 `interactions/` 为开发预览检查；最终结论以 production 两份 report.json 为准。

## Non-goals

不重新设计桌面、不修改背景、不增删正式向导字段、不接数据库/AI/API、不改变 Planner 或 Detail 的保存语义、不自动提交或合并。
