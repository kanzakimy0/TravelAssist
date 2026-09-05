# WBS 5.1 视觉素材复核与 Codex 开工判断

> 复核日期：2026-09-05（Asia/Tokyo）  
> 仓库：kanzakimy0/TravelAssist  
> 复核基线：develop / `78edd9525d36488ab1065d841e94edabd4858cee`  
> 归属：B；WBS 5.1 — Personal Center Shell / Navigation  
> 文档性质：只读复核与交接补充，不是新的实现完成记录。

## 1. 结论

**5.1 已冻结范围内的两项正式图片素材均已上传并进入 develop；本轮未发现需要重新生成的必需图片。当前缺口主要是主背景纹理尚未接入运行时代码，以及接入后的页面视觉验收。**

因此，本轮新增图片为 **0**，没有重复生成、覆盖或改名已有图片。此前素材 PR #47 已于 2026-09-05 合并，合并提交为 `fb4b421c495beb56127ad0d8c2db83ba4b1e3c48`。随后 #48 同步素材完成记录，形成上述复核基线。

**Codex 可以开始一个范围受限的「5.1 视觉接入与完善」补充任务；这不表示本次已经执行代码修改、构建或浏览器验收，也不表示完整个人中心业务已经完成。**

## 2. 已核对的依据

本次不只读取旧审计结论，同时读取了 WBS、设计书、实际 SVG 与页面源码。

| 依据 | 仓库路径 / 记录 |
| --- | --- |
| Master WBS | `docs/project/WBS-TravelAssist.md` |
| 个人中心 IA / 视觉规则 | `docs/ui/personal-center.md` |
| Shell 冻结设计 | `docs/ui/personal-center-shell.md` |
| 原 5.1 交付与历史验收 | `docs/tasks/TASK-WBS-5.1-b-personal-center-shell-navigation.md` |
| 已有素材审计 | `docs/project/WBS-5.1-PERSONAL-CENTER-ASSET-AUDIT.md` |
| 已有素材完成记录 | `docs/project/WBS-5.1-ASSET-SYNC.md` |
| 已有接入要求 | `docs/tasks/CODEX-WBS-5.1-VISUAL-INTEGRATION.md` |
| Shell / Sidebar / Home 源码 | `src/features/personal-center/components/` |
| 运行时局部样式 | `src/features/personal-center/personal-center.module.css` |
| Agent / 追踪规则 | `AGENTS.md`、`docs/development/task-tracking.md` |
| 实际可用检查命令 | `package.json` |

## 3. 素材盘点：缺文件与缺接入分开处理

| 项目 | 实际状态 | 本次处理 / 后续动作 |
| --- | --- | --- |
| Sidebar 鸟居、水面、远山、少量樱花插画 | 正式 SVG 已存在，1200 × 800；Sidebar 已通过 next/image 引用 | 复用；验收不同高度下的裁切和导航空间 |
| 主内容暖米白 / 和纸 / 淡粉纹理 | 正式 SVG 已存在，1920 × 1080；主区域仍使用原 CSS 渐变 | **不再生成图片；由 Codex 接入现有 SVG** |
| 设计源文件 | 两项源文件均在 `assets/design/personal-center/` 中登记 | 保留，不新建第二套来源 |
| 五项导航、铃铛、Chevron、更多功能图标 | 已有组件 / inline SVG 实现 | 继续用代码，不制作按钮截图或位图 |
| Avatar | 当前是 Mock 用户首字母占位 | 不是 Shell 图片阻塞；真实头像由账户 / Profile 任务处理 |
| 品牌 Logo | 当前为品牌文字和代码图标；原审计记录正式 Logo 未冻结 | 不在 5.1 中擅自设计正式品牌资产 |
| Hero 与三张旅行卡片 | 同用 `/media/home/home-hero-poster.webp`，明确为 Mock | 不是 5.1 的素材缺失；独立目的地封面仍属于后续内容完善 |
| Loading / Empty / Error 状态插画 | 不在本次 Shell 素材冻结范围内 | 按 1.29 / 5.20 后续设计与实现，不在这里临时扩项 |

### 运行时路径

```text
/media/personal-center/sidebar-torii-watercolor.svg
/media/personal-center/personal-center-surface-texture.svg
```

对应仓库文件位于 `public/media/personal-center/`。应用 URL 不包含 `public` 前缀。

### 本次读到的运行时文件指纹

| 文件 | Git blob SHA |
| --- | --- |
| `sidebar-torii-watercolor.svg` | `848044d7ebb7d71a4175aab93dd8cdd3dd7efba7` |
| `personal-center-surface-texture.svg` | `53d5234c9b39fc42a7873db2b352ef25eea66753` |
| `personal-center.module.css` | `939d6a536e124eca9248454dcbcca76091f6429d` |

指纹只用于锁定本次审查版本，不要求 Codex 回退后续合法提交。

## 4. 已确认的实现差距

### 4.1 主背景：文件已上传，但没有完成接入

`personal-center-shell.tsx` 的右侧外层使用 `styles.main`。目前该 CSS 规则的背景是两层 `radial-gradient` 与 `--pc-bg-canvas`，没有引用正式主背景 SVG。

后续应把正式纹理放在右侧共享 `.main` 背景层，使顶部操作区和可滚动内容区保持连续背景。保留暖米白 fallback；避免旧渐变与新素材重复叠加导致偏粉、偏暗。不得通过降低整个 `.main` 的 opacity 来减弱纹理，否则文字和控件也会被一起影响。

背景不应覆盖 Sidebar，不应随着内容滚动重复平铺出明显接缝；导航切换时 Shell 和背景应继续保持挂载。

### 4.2 Sidebar：不是缺图，而是待截图复核

`personal-sidebar.tsx` 已引用正式侧栏 SVG，使用 `fill`、`object-fit: cover`、`object-position: center 60%`，并使用空 alt 和装饰性容器。

当前样式还保留了侧栏图片区域的渐变与 `::after` 波纹。是否需要减弱这些叠层，应以浏览器实际截图为依据，不可只因旧规则存在就盲目删除。低高度下优先保障五项导航与键盘焦点，必要时裁切或减少插画占用。

### 4.3 整页最终效果不等于 5.1 Shell 完成

首页 Hero 与三张旅行卡片现在共用同一张 Mock 图。最终正式 Logo、真实用户头像、不同目的地的独立封面和业务状态尚不能从这次 Shell 素材交付中推出。

这些会影响最终成品的丰富度，但当前冻结审计明确将其排除在 5.1 正式素材之外。本轮不把 Mock 照片包装为真实行程内容，也不声称「整页所有素材都已正式定稿」。

### 4.4 小范围文案检查

`personal-home-preview.tsx` 中仍有“为你推荐目的地与玩法”。结合项目已确认的“您”称谓规则，补充任务可在 B 模块内改为“为您推荐目的地与玩法”；不得借此扩大为全仓文案重构。

## 5. Codex 就绪判断

| 条件 | 结论 |
| --- | --- |
| 设计依据 | 1.21 / 1.22 已有冻结文档 |
| 正式图片 | 两项已在 develop，可直接引用 |
| 代码落点 | 已确定为 B 的个人中心组件和局部 CSS |
| 原 5.1 状态 | WBS 为已完成；本次不回退原历史记录 |
| 同类进行中工作 | 本次查询未发现指向 develop 的开放 PR；未发现匹配 5.1 的开放 Issue。执行前仍须重新查询 |
| 业务依赖 | 此次静态视觉完善不应引入认证、API、数据库或 Planner 接线 |
| 自动检查 | 仓库已有 lint、typecheck、format:check、build 脚本 |
| 浏览器验证 | 必须在 Codex 可用环境重新执行；本轮没有执行 |
| 环境权限 | Codex 所在工作区需能读取最新仓库、安装锁定依赖、启动浏览器；本次没有核实您的 Codex 环境配置 |

**结论：素材与任务边界层面可开始；执行环境可用性和最终视觉合格与否仍需实际运行验证。**

OpenAI 的 Codex 官方环境说明支持通过仓库上下文、终端命令和项目指导执行编辑与检查；这不构成对本项目一次运行必然成功的保证。参考：<https://developers.openai.com/codex/environments/cloud-environment>。

## 6. 验收底线

桌面分别检查 1920×1080、1440×900、1280×720；窄屏至少回归 390×844、320×740，不在本补充任务重新设计最终移动导航。

必须验证：两张素材请求成功；背景只作用于右侧共享区域；五项导航完整；短屏不为展示完整插画而压缩导航；没有横向溢出；正文、卡片、Focus 不被纹理干扰；五个路由切换后 Shell 保持稳定；没有新增控制台错误。

视觉结果须有真实浏览器截图与差异说明，不能把“图片路径存在”“代码编译成功”写成“与设计效果完全一致”。

原 Task 曾记录三份既有设计文档的 format:check 问题、favicon 404 及安装脚本许可提示。这些只是历史记录，不能当成本次复测结果；Codex 应以新基线重新核实，分别记录新增问题与原有问题，不做无关修复。

## 7. 本轮交付与状态边界

- 新增图片：0；保留已上传且已冻结的两项素材。
- 新增文档：本复核报告与 `docs/tasks/CODEX-WBS-5.1-VISUAL-POLISH-2026-09-05.md`。
- 未修改：运行时代码、素材内容、Master WBS、任何既有 A/B Task、已有 Issue 状态。
- 未执行：依赖安装、lint、typecheck、build、浏览器页面截图验收、Codex 实现任务。

执行环境的 GitHub 域名解析失败，无法在本会话容器中直接克隆并运行项目；本次仓库读取与上传通过已连接的 GitHub 工具完成。因此本报告属于源码 / 素材就绪复核，不冒充运行时验收。
