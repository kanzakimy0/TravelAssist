# WBS-5.10-B-FOLLOWUP-1 QA evidence

`edge-matrix.json` / `chromium-matrix.json` 是最终生产版结果：每种浏览器 36 个 route/viewport 组合、35 组复合交互/日期场景，diagnostics 为空。favicon 404 基线单列，不作为业务成功请求。

`screenshots.zip` 包含优化前基线、两浏览器生产截图、第二页以及大屏账户编辑截图。运行时原图在 `.next/qa/WBS-5.10-B-FOLLOWUP-1/screenshots/`，不新增产品资产 catalog 条目。`before-edge-matrix.json` 保留早期采集时模拟日期导致的既有同行人年龄 hydration 记录；仅用其布局 metrics 对比，最终浏览器使用真实时钟测试 Companion/Account。

`node-tests.log` 保留完整全仓失败输出；不能将 exit=1 描述为 PASS。`format-check.log` 记录全仓历史格式基线；仅当前 Follow-up owned files 格式化。其他日志分别记录生产 build、lint、专项测试及浏览器退出结果。

完整解释与重现命令见 `docs/tasks/RESULT-WBS-5.10-b-personal-center-trip-status-large-screen-followup.md`。
