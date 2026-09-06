# WBS-5.20-B-FOLLOWUP — Personal Center concept alignment and responsive polish

## Metadata

- Task ID: `WBS-5.20-B-FOLLOWUP`
- Owner: B
- Status: 待验收
- WBS: `5.20（completed-task UI follow-up；关联 5.4 / 5.5 / 5.6 / 5.10）`
- GitHub Issue: `#149`
- Branch: `fix/b-wbs-5-20-personal-center-concept-alignment`
- Depends On: `WBS-5.4-B-V2 / WBS-5.5-B / WBS-5.6-B / WBS-5.10-B / WBS-5.20-B`
- Commit: `ea10d79ffd6b54f527dc2ff547d6b2fb0b80b7e4`
- Pull Request: `#150`
- Result: `docs/tasks/RESULT-WBS-5.20-b-personal-center-concept-alignment-followup.md`

## Background

用户在已完成的 Personal Center 工作上逐页提供概念图与视觉验收反馈。原页面在桌面首屏密度、标题位置、卡片比例以及窄屏顶部操作区方面仍有偏差。本 follow-up 只校正已存在的 Personal Center presentation layer，不重新打开或改写原 WBS 任务。

## Goal

将个人中心首页、旅行偏好、同行人、我的旅行、账户及账户子页面统一到用户确认的概念布局；在主要桌面尺寸尽量首屏完整展示，在窄屏保证顶部工具栏与页面操作不重叠，并保留所有既有交互和状态边界。

## Scope

- 统一主要页面标题的字体、垂直位置与单朵大樱花标记。
- 调整 Personal Center 共享外壳的桌面浮动侧栏、内容高度和顶部全局工具栏安全区。
- 优化首页、偏好、同行人、旅行库与账户页面的卡片比例、间距和首屏密度。
- 为账户登录与安全、数据与隐私、预订同步及删除账户提供一致的 presentation-only 子页面布局。
- 修复旅行偏好页“更多详细设置 / 重置偏好”与通知、账户头像的重叠。
- 增补静态测试和 Playwright 浏览器回归。

## Out of Scope

- Planner、Map、Route、Recommendation、Booking 或 Trip POI 业务实现。
- API、DB、ORM、Supabase、Auth、正式 Preference Schema 或任何持久化。
- package、dependency、workflow 或安全规则修改。
- 修改现有 WBS 5.4 / 5.5 / 5.6 / 5.10 / 5.20 的完成状态。

## State and Compatibility

- 现有 Mock / in-memory 行为保持不变。
- 现有 saved / draft、未保存导航保护、同行人操作和旅行库筛选行为保持不变。
- 删除账户页面仅为 presentation boundary，不执行真实账户删除。
- 不新增网络写请求、localStorage、Cookie 或 Session。

## Acceptance

- [x] 用户逐页确认概念布局调整可接受。
- [x] 首页卡片与右上角账户工具栏保持视觉间距。
- [x] 旅行偏好、同行人、我的旅行与账户主标题统一。
- [x] 页面标题左侧为一朵大樱花。
- [x] 旅行偏好顶部页面操作与全局通知/账户工具栏不重叠。
- [x] 主要桌面和移动尺寸无横向溢出。
- [x] 既有页面交互与导航保护保持有效。
- [ ] PR 已合入 `develop`。
- [ ] Issue / Task / Result / WBS 完成态已同步。

## Validation

- `npm run lint`: PASS
- `npm run typecheck`: PASS
- `npm run test --if-present`: PASS / no-op（仓库未定义 test script）
- `node --test tests/*.test.mjs`: PASS，223 / 223
- `npm run build`: PASS
- `git diff --check`: PASS
- `npm run format:check`: 24 个既有文档 baseline；当前修改文件 targeted format 通过
- WBS-5.4-B-V2 browser QA: PASS
- WBS-5.5-B browser QA: PASS
- WBS-5.6-B browser QA: PASS
- WBS-5.10-B browser QA: PASS

## Evidence

- `C:/Users/Administrator/.codex/visualizations/2026/09/05/01a07167-d0d7-75a0-85de-5e63712fc6e9/single-blossom-title-verified`
- `C:/Users/Administrator/.codex/visualizations/2026/09/05/01a07167-d0d7-75a0-85de-5e63712fc6e9/preference-header-actions-clear`
- `C:/Users/Administrator/.codex/visualizations/2026/09/05/01a07167-d0d7-75a0-85de-5e63712fc6e9/personal-center-concept-closeout`

## Completion Rule

用户已完成视觉验收，但在 PR 合入 `develop` 前 Task 保持“待验收”、WBS follow-up 保持“待审查”、Issue #149 保持 Open。合并后补齐真实 Commit、PR 与 merge commit，再将本记录、Result 和 WBS follow-up 同步为已完成并关闭 Issue。
