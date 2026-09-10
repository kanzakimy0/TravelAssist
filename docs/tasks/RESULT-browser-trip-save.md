# Detail browser save — Result

## Scope / tracking

- Source: 用户确认“先实现保存浏览器吧”（2026-09-06）。
- Status: 本地实现待验收；不代表已进入 develop。
- Baseline: `1bcd820957cc6a6f0b58f4914e0a0110163304dc`。
- Workspace: 现有 `codex/planner-responsive-density` 工作树；未切换或覆盖用户主工作目录。
- 本次追加尚未 commit / push；未创建、合并或改变任何 PR 状态。
- 原 PR #139 / Issue #135 的前序视觉补修状态不被本记录改写。

## Implemented

### 操作按钮布局追加

- 按用户后续要求，Detail 返回/保存移到“新增行程”的左侧，同排顺序为返回、保存、新增、收起；不再悬浮于地图顶部。
- 支持手动收起和小屏/低高度自动收起；收起后仅保留贴底紧凑操作栏，返回/保存仍可用，左侧有展开入口。
- 桌面恢复原行程栏，小屏恢复已有底部弹层；从展开弹层返回 Planner 时同步关闭弹层，不残留遮挡。
- 最新布局截图与几何验证：`docs/qa/browser-trip-save/action-layout-production/`（1440×900、1280×800、1024×768、1440×650、390×844、320×740）；保存回归：`docs/qa/browser-trip-save/action-layout-save-regression/`。

### 保存能力

- Detail 显式“保存行程”；Planner 不写入保存记录，“保存设置”改称“应用设置”。
- 一份 versioned localStorage workspace snapshot：所有方案的行程项、当前方案、日期/同行人/偏好、待规划设置基线、新增项目和完成状态。没有第二个运行中的 Trip store；读取/放弃时恢复同一个 reducer，Map 不重建。
- Dirty 基线为进入详情时的内容；保存成功后更新基线。地图操作、选中节点、日期视图、Tab、状态提示不计为内容修改。
- 明确返回 Planner 入口，桌面/手机可用；dirty 时继续编辑、放弃修改并返回、保存并返回。保存失败保留弹窗与修改，不跳转。
- 原生后退（Navigation API，并保留 popstate fallback）、页面 Logo/内部链接及 beforeunload 保护。旧浏览器的后退行为未作跨浏览器保证；Chromium 已实际验收。
- Planner 提供“打开已保存行程”；直接刷新详情恢复上次主动保存版本，不自动写入 Planner 调整或尚未保存的详情编辑。
- 存储边界校验、未知版本/损坏数据安全拒绝、配额/权限失败提示；保存前比较已读取版本，拒绝已检测到的其他标签页覆盖。此检查不是数据库事务或跨标签页原子锁。
- 旧 `travelassist.detail-draft.v1` 只读兼容；没有删除或自动覆盖旧数据。

## Validation

- 184/184 Node tests；新增 6 项序列化、dirty、rollback、损坏数据、失败与并发覆盖保护测试。
- lint / typecheck / build / 修改文件 Prettier / git diff --check 通过。
- 不修改依赖或 lockfile，未重复 npm ci。全仓历史格式异常不在本次范围，未声称全仓 format:check 通过。
- 浏览器尺寸：1440×900、1024×768、390×844、320×740。
- 证据：`docs/qa/browser-trip-save/fallback/` 与 `docs/qa/browser-trip-save/production/`；脚本 `tools/qa/browser-trip-save-check.mjs`。
- 验收覆盖保存后刷新、打开已保存版本、不自动保存、放弃/取消/Escape、配额失败不跳转、浏览器后退、Logo guard、保存并返回、已检测到的并发更新拒绝与共享 Map DOM 生命周期。

## Limitations / non-goals

- 仅当前浏览器、当前站点 origin（协议/域名/端口）；清除网站数据会丢失本地副本。
- 当前仅保留一份 workspace 副本，主动保存会替换上一份；不是多个独立行程的管理列表，没有云端备份或跨设备同步。
- 不接 DB / Auth / AI / Booking API，不创建真实订单，不把本地保存标为数据库业务完成。
- 不重设计 Detail 业务面板，不改变 Planner 主比例、底栏尺寸或冻结的推荐卡。
- 发布预览：`http://127.0.0.1:3113/planner`；仅此预览已更新，其他端口不会自动更新。

## Reference

浏览器原生导航预提交保护采用可取消的 [Navigation navigate event](https://developer.mozilla.org/en-US/docs/Web/API/Navigation/navigate_event)，运行时检测支持并保留旧事件 fallback。
