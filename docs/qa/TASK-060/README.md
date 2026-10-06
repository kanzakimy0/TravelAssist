# TASK-060-B — Profile UI Persistence Integration

用户在 TASK-059-B J3 失败后明确授权本 follow-up（关联 WBS 5.4 + 5.15），验证通过后合入 develop，再继续 TASK-061-B 和 TASK-059-B。执行时远端未发现独立 TASK-060 规格分支或 Issue；本记录以该用户指令、现有 TASK-050 Profile API 和 TASK-059 J3 断言作为范围依据。

- 基线：`origin/develop@3559afad2edfcfdda766942652a9b5090b75369c`。
- 分支：`codex/b-task-060-profile-ui-persistence-integration`，从干净的 develop 创建。
- 使用现有 `/api/profile` 和 `/api/emergency-contacts`，不变更数据库/API 合约。
- 初始资料来自当前已登录用户；不存在的行显示未设置，不初始化示例资料。
- 保留既有 UI 昵称必填校验；只读的空账户仍按 API nullable 投影显示，不自动写默认昵称。
- Profile + Settings 使用现有原子 PATCH，仅提交修改字段；未知代码、未设置值、未修改头像引用不被默认值覆盖。
- 联系人使用各自明确的保存/删除操作。取消资料编辑不撤销已保存联系人，页面明确说明该边界。国家为 ISO 两位代码，电话号码为完整 E.164。
- Auth 邮箱/手机及验证状态只读取真实 Auth 投影。
- 头像上传和引用解析无现成实现，本轮明确显示不可用；删除头像引用使用既有 nullable `avatarPath`。不再把本地 blob 预览伪称为持久化头像。
- 显示设置仅持久化；不声称已实现整站语言切换或单位转换。

## 验证入口

```powershell
npm ci
npm run test:profile-ui
npm run build
npm run db:start
# CODEX_PLAYWRIGHT_PATH 指向已有 Playwright 安装；使用已安装 Edge。
try {
  npm run test:profile-ui:local
  npm run test:profile-api:local
} finally {
  npm run db:stop
}
node --import ./tests/register-route-ts.mjs --test --test-reporter=tap "tests/*.test.mjs"
npm run lint
npm run typecheck
npm run deploy:validate:local
npm run deploy:build:local
npm run deploy:verify-artifact
npm run format:check:deploy
npx prettier --check docs/qa/TASK-060 docs/tasks/RESULT-TASK-060-b-profile-ui-persistence-integration.md
git diff --check
```

复用仓库 Local runtime、Next production server 和 Playwright，不引入第二套浏览器框架。两位临时 Local 用户，桌面 1440×900 和手机 390×844。浏览器验证真实读取、保存、跨页面/刷新/重新登录、联系人增删改及所有者隔离；单独注入一次 PATCH 503 验证失败反馈，其他持久化断言均使用真实 Local API/Auth/DB。

`browser-evidence.json` 只记录 gate 名、聚合计数和清理结果，不保存密码、token、cookie、邮箱或用户 ID。原始命令日志保存在忽略目录 `.artifacts/task060/`。

## 边界

不改 WBS Owner，不将 WBS 9.6 标记为完成；本 PR 的成功仅解决 Profile 接线，最终 J1–J8 必须在 TASK-061 合入并正常 merge 最新 develop 后重新执行。PR #366 继续 Draft；不关闭 Issue #364。不触碰 Production/Staging，不执行外部预订写操作，不执行 9.7/9.8。
