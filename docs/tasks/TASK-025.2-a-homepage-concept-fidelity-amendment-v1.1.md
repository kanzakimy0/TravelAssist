# TASK-025.2-A Amendment v1.1 — Homepage Assistance & Compliance Entrypoints

> 本文件是 `docs/tasks/TASK-025.2-a-homepage-concept-fidelity.md` 的强制补充。Codex 执行 TASK-025.2-A 时必须同时读取并遵守两份文件。发生冲突时，本 Amendment 对首页辅助入口 / 合规入口的规则优先。

## 1. Decision Summary

首页继续保持“极简、沉浸、工具优先、少宣传语”。新增内容只能作为**辅助与合规入口**，不能变成首页内容区、卡片区或第二主流程。

首页唯一主操作继续是：

```text
让我们开始吧 →
```

不得因为新增帮助 / 合规内容削弱 Hero 或 CTA 的视觉优先级。

## 2. Final Homepage Structure

桌面目标结构更新为：

```text
TravelAssist                         使用指南    中文⌄

                    下一站，去哪里？

                  规划行程 · 对话调整

                  [ 让我们开始吧 → ]

                     登录 / 头像


© 2026 TravelAssist · 服务条款 · 隐私政策 · AI 与信息说明 · 关于与联系          AI
```

要求：

- 顶部右侧新增 `使用指南`，位于语言入口左侧。
- 底部新增轻量 Footer 链接区。
- 不新增大型 Footer 面板。
- 不新增 Hero 卡片。
- 不增加营销文案。
- 不增加第二主 CTA。
- AI 入口继续固定在右下，但不得压住 Footer 链接。

## 3. Top-right Help Entry

显示：

```text
使用指南    中文⌄
```

也允许更轻量的：

```text
? 使用指南    中文⌄
```

视觉：

- `使用指南` 比语言入口更轻，不必做与语言按钮同等重量的大胶囊。
- 保持 44px+ 可点击区域。
- 使用 shared typography / focus / hover 语言。
- 不破坏 Header 极简感。

### 3.1 Help Interaction

点击 `使用指南` 后优先显示轻量 Popover，而不是直接打开长页面。

Popover 内容：

```text
第一次使用 TravelAssist？

1. 告诉我们想去哪里
2. 设置时间、同行人和偏好
3. 获取推荐行程
4. 在地图上调整路线
5. 保存并在旅途中继续使用

[查看完整使用指南 →]
```

行为要求：

- Popover 具备 open / close / Escape / outside click / focus return。
- 键盘可达。
- 不新增外部依赖。
- 若仓库尚无完整 Help 页面，则 `查看完整使用指南 →` 可以先链接到仓库已有最合适的帮助/说明 route；若不存在，允许建立最小静态说明 route，但不得扩展成 Help Center 系统。
- 若建立新 route，必须保持 Main Shell 品牌视觉一致。

## 4. Footer Assistance / Compliance Links

首页底部显示：

```text
© 2026 TravelAssist
服务条款 · 隐私政策 · AI 与信息说明 · 关于与联系
```

要求：

- 纯文字低视觉层级。
- 不使用大卡片、大背景条或粗边框。
- 保持背景场景仍然可见。
- Footer 只能占用安全区，不得明显抬高 Hero。
- 手机端允许换行，但必须整洁且无横向滚动。
- 所有链接需可键盘访问并有可见 focus。

## 5. Content Boundaries

### 5.1 服务条款

内容范围：

- 服务范围
- 账户规则
- 禁止行为
- 用户义务
- 第三方服务
- 一般责任边界
- 终止服务

### 5.2 隐私政策

内容范围：

- 收集的数据
- 数据用途
- 保存期限
- 删除与导出
- Cookie
- 第三方服务
- 用户权利

### 5.3 AI 与信息说明

必须单独保留，不并入一般 Terms 文案。

至少明确：

```text
AI 建议 ≠ 官方信息
旅行规划 ≠ 已完成预订
价格显示 ≠ 最终成交价格
预计交通时间 ≠ 实际运行保证
第三方预约状态以对应服务商为准
```

语气应为清晰说明，不做恐吓式免责声明墙。

页面需要解释 TravelAssist 的角色：

- 帮助规划、整理、推荐和管理。
- 天气、交通、营业时间、价格和可用性可能变化。
- 预订、付款、出票、酒店/活动确认等以对应第三方服务商最终信息为准。

### 5.4 关于与联系

允许展示：

- TravelAssist 品牌说明
- 联系邮箱（仅当仓库已有真实正式地址时）
- 反馈 / 投诉渠道（仅当已有真实渠道时）
- 合作联系（仅当已有真实渠道时）

禁止：

- 虚构公司主体
- 虚构地址
- 虚构备案号
- 虚构联系电话
- 为“看起来正规”制造不存在的运营信息

## 6. Legal Reuse Rule

服务条款 / 隐私政策未来不得只存在于首页。

本 Task 若已有对应页面或 shared legal links，应优先复用并保证后续可用于：

```text
注册页面
登录 / 注册相关页面底部
账户 → 数据与隐私
账户删除流程
```

注册相关文案目标：

```text
注册即表示您同意《服务条款》和《隐私政策》
```

但 TASK-025.2-A 不得为了这一规则越界重做 Auth 页面；只允许复用现有 route / shared link contract，Auth 页面接入可留给后续对应 Task。

## 7. Route / Implementation Rule

优先顺序：

1. 复用仓库已有 legal/help routes。
2. 若 route 已有但内容不完整，只做本 Task 所需的最小静态说明补齐。
3. 若 route 完全不存在，可建立最小静态页面：
   - `/help`
   - `/terms`
   - `/privacy`
   - `/ai-information`
   - `/about`
4. 不建立 CMS。
5. 不建立后台编辑器。
6. 不接 DB。
7. 不接外部法律服务。
8. 不声称这些文本已经过律师审查。

若现有仓库 route 命名不同，优先保持既有路由，不为命名美观重复创建页面。

## 8. Responsive Update

新增检查：

### Desktop

- `使用指南` 与语言入口保持清晰间距。
- Footer 位于底部安全区。
- AI 按钮不得覆盖 `关于与联系` 等链接。
- Footer 不得把 Hero 中心整体明显上推。

### Tablet

- Help + Language 不碰撞 Brand。
- Footer 可收紧字距与间隔，但不可隐藏关键合规链接。

### Mobile

- Header 可将 `使用指南` 简化为 `?` / `帮助`，但功能必须保留。
- Footer 允许两行或多行。
- Footer 与 CTA / Login / AI 不重叠。
- 320×568 必须验证无横向滚动。

## 9. Accessibility

新增专项要求：

- Help trigger 有明确 accessible name。
- Popover 使用合适语义和焦点管理。
- Footer 使用 `<footer>` landmark。
- Legal / Help links focus 可见。
- 不能只靠颜色区分链接。

## 10. Acceptance Additions

TASK-025.2-A 原有验收之外，新增：

- [ ] 首页唯一主 CTA 仍是 `让我们开始吧`。
- [ ] 顶部存在 `使用指南`，且不抢主视觉。
- [ ] Help Popover 5 步说明正确。
- [ ] Footer 显示 © TravelAssist + 四个入口。
- [ ] 服务条款入口可达。
- [ ] 隐私政策入口可达。
- [ ] AI 与信息说明入口可达且独立存在。
- [ ] 关于与联系入口不包含虚构运营信息。
- [ ] Footer / AI / Login / CTA 在 5 个验收尺寸无重叠。
- [ ] 无新 console / hydration error。
- [ ] 无横向滚动。
- [ ] 现有 `/start` / Planner / Detail / Personal Center 几何不回退。

## 11. Required Tests

在原 TASK-025.2 tests 基础上新增：

- Help trigger rendering / target
- Help Popover open / Escape / focus return
- Footer landmark
- Terms link
- Privacy link
- AI information link
- About/contact link
- no fake operator data
- 320px footer overflow guard

## 12. Tracking

本 Amendment 不创建第二个实现 Task，不改变 Owner：

```text
Task: TASK-025.2-A
Owner: A
Issue: #251
Branch: feature/a-homepage-concept-fidelity
```

Codex 必须将本 Amendment 与主 Task 一起作为执行规格，并在 `RESULT-TASK-025.2-a-homepage-concept-fidelity.md` 中增加：

```md
## Assistance & Compliance
- help trigger:
- help popover:
- terms:
- privacy:
- AI information:
- about/contact:
- footer responsive:
- fake operator data: No
```

完成后仍按主 Task Stop Rule 停止，等待用户视觉验收，不自动开始 3.3 / 3.4 / 3.5 / 10.6 后续完整业务。
