# Planner / Detail 旅景背景与透明度 Result

## Status

本地实现并验收，`http://127.0.0.1:3113/planner` 已更新。
仍在 `codex/planner-responsive-density`，未 commit / push / merge；保留前序未提交修改，不改变既有 Issue / PR 状态。

## Changes

- 用户指定樱花、海岸、富士山与夕照列车画面。核对后复用项目内同画面的高清图 `public/media/start/sakura-coast-fuji-train-sunset.png`，不重复添加低分辨率 JPEG，不生成或修改图片。
- 仅在共享 Planner / Detail 工作区设为背景，不改 `/start` 或 Personal Center。
- 外层右栏、底栏与收起后的保存栏使用暖白半透明底。桌面主面板 72% 暖白 + 4px 轻模糊；非选中快捷卡 94%、推荐卡 92% 暖白，选中推荐卡保持原实底与珊瑚外框；文字自身不降低 opacity。
- 手机右栏与底栏弹出面板使用同一画面的独立暖白背景层，保留较高遮盖度，避免照片纹理干扰输入。
- 延续原暖白、象牙白、樱粉与珊瑚强调，次级文字略加深。地图仍为原 Mapbox / fallback，可操作地图不替换成静态照片，不修改地图数据或生命周期。
- 外层装饰渐变继续 `pointer-events: none`；高对比/减少透明度偏好下主面板采用实底。不调整 75%/25%、25dvh、任何推荐卡/按钮结构或交互逻辑。

## Validation

- lint / typecheck / build / 本轮文件格式 / git diff --check：通过。
- Node tests：187/187 通过。
- `tools/qa/planner-scenery-check.mjs`：1440×900、1024×768、390×844、320×740；Planner、设置面板与 Detail 共 12 张前后截图。工作区和面板边界前后差 <1px，推荐卡几何完全一致；pageerror 为 0。实际生产截图确认 Mapbox 正常显示。
- `tools/qa/planner-panel-boundaries-check.mjs`：强制 fallback 下四尺寸六 Tab、紧凑摘要、独立移动三等分卡、加号菜单、Esc、设置取消恢复、老人以及进入 Detail 后的预约与区域候选回归通过，pageerror 为 0。
- 前后证据：`docs/qa/planner-scenery/before/` 与 `docs/qa/planner-scenery/after/`。

## Non-goals

不接 API / AI / Auth / DB，不改浏览器保存协议，不改变地图 Provider，不输出或提交任何 Token，不自动提交或合并。
