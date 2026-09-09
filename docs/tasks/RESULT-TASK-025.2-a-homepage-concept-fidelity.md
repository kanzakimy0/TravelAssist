# TASK-025.2-A Result

## 最新账户样式补正：恢复截图胶囊（2026-09-09，待审查）

用户确认其他效果 OK，要求个人中心 / 登录恢复上传截图的样式。本节仅覆盖下方追加修正中“透明账户行、黑色粗体”的历史方案；透明黑色粗体 Footer 保持。

- 主 CTA 下方居中显示暖白圆角胶囊，左侧共享头像与“游客 · 个人中心”、细竖向分隔线、右侧“登录”。恢复正常字重的深墨账户文字和较小的灰色登录文字；桌面胶囊约 284×64px。
- 游客个人中心和登录继续使用真实链接及既有访问保护；已核验用户使用真实头像 / 名称，保持个人中心入口，不显示游客登录。未硬编码身份或改变认证流程。
- 手机胶囊紧凑适配，320×568 保留 44px 点击区域；仅减少 4px 不可见底部预留空间以容纳胶囊高度，不移动其他内容。
- 逐项对比上一轮 account-footer 报告：六组中 Brand / language / eyebrow / title / subtitle / CTA / Help / Footer / AI 的所有已测量几何与计算样式完全一致，背景来源和裁切完全一致。其他页面与共享 tokens 无改动。
- lint、typecheck、production build、现有 Node 全仓 703/703、Home 五尺寸 + reduced-motion 6/6、认证 15/15 和 diff-check 通过。CLS=0、无横纵溢出、无新增 console / hydration 错误、无视频请求。
- 最新报告：docs/qa/TASK-025.2/account-capsule-home-report.json、account-capsule-auth-report.json、account-capsule-evidence.json。五尺寸、登录态与 Hero 放大截图位于 F:/CodexWorktrees/TravelAssist-TASK0252/.cache/qa/account-capsule-home/；旧证据保留。
- 预览：http://localhost:3132/；分支 codex/home-footer-account-visibility；沿用 [Draft PR #254](https://github.com/kanzakimy0/TravelAssist/pull/254) → develop，等待本次视觉验收。原 TASK / WBS 3.2 已完成状态与关闭的 Issues 保持；不自动合并或启动下一任务。

---

## 验收后追加修正：透明底栏与账户入口（2026-09-09，待审查）

用户追加要求：首页底部栏透明、字体黑色粗体，并补回截图中的个人中心和登录入口。本次是已合并 #252/#253 后的新视觉修正；下方原 TASK / WBS 3.2 已完成记录保持，不借用上次视觉验收自动合并本次改动。

- 首页 Footer 去除暖白背景条和 backdrop blur，改为透明；版权、链接用黑色 700 字重，保留键盘 focus / hover 和文字柔和阴影。
- CTA 下方恢复共享 AccountAvatar / HomeAccountLink；游客同时看到“游客 · 个人中心”和真实登录链接。透明账户行同样黑色粗体，取消原先桌面隐藏该入口的规则。
- 个人中心仍走现有访问保护；Login 仍为 /login?returnTo=%2F。已核验账户在所有尺寸下展示真实头像与个人中心，不展示误导性的登录状态；原右上已登录入口保留。
- 原樱花海岸电车背景、Header、标题、CTA、Help / AI 交互、独立信息页面的页脚及其他业务页面均保持。
- lint、typecheck、production build、703/703 全仓和 diff-check 通过。Home 五尺寸 + reduced-motion 6/6，verified / neutral / invalid 会话 × 五尺寸 15/15；无溢出，CLS=0，无新增 console/hydration 错误，无视频请求。浏览器断言验证透明背景、无 blur、黑色和 700 字重，以及游客个人中心访问保护与登录跳转。
- 当前预览：http://localhost:3132/；分支 codex/home-footer-account-visibility；本次保持 Draft 待用户验收，不自动合并。
- 新证据：docs/qa/TASK-025.2/account-footer-home-report.json、account-footer-auth-report.json、account-footer-evidence.json。实际五尺寸 PNG 位于 F:/CodexWorktrees/TravelAssist-TASK0252/.cache/qa/account-footer-home/，旧报告完整保留。

---

## 最终状态：已完成（2026-09-09）

用户已对恢复原樱花海岸电车背景的最终版本视觉验收通过，并明确授权合入 develop。

- PR [#252](https://github.com/kanzakimy0/TravelAssist/pull/252)：**MERGED**，时间 2026-09-09T11:29:14Z。
- 已验收提交：85a05b787087f9a36c8c5cab40693ed06ac08764；merge commit：d2efbb69bdabc91b41994147b357c4dfad02eeee。
- 已 fetch 并确认该提交进入 origin/develop，合并文件树与已验收 head 完全一致。原功能分支保留，不执行分支删除或任何 force 操作。
- Task / Result / Master WBS 3.2 同步为已完成；Issue #251 与关联静态 MVP #246 收尾。本次收尾仅追加文档，无运行时变更。
- 原有 npm ci、lint、typecheck、build、703/703 全仓、14/14 专项及浏览器验证结果仍对应实际合并内容；本次验证合并祖先、文件树一致性和文档 diff-check，不重复未变代码的测试。
- 最新可见效果和五尺寸证据仍为 background-restored-home-report.json 及 .cache/qa/background-restored-home/；当前正式背景 home-hero-sakura-sunset.webp。
- 旧 video Blocked / 待审查 / 未合并措辞保留为当时历史，当前状态以本节为准。3.2.1 视频增强仍 Deferred，不启动后续 Task。

---

## 当前补正：保留用户指定的樱花海岸电车背景（2026-09-09）

用户最新明确要求背景继续使用上传的纯场景图 H:/Temp/codex-clipboard-4a5af8bb-563a-4898-9bbb-67bb17b6977d.png。本条是当前背景选择的最终依据；前轮 v1.1 UI、Help、Footer、真实账户及珊瑚风格继续保留。

- 正式背景恢复为 public/media/home-concept/home-hero-sakura-sunset.webp（1672×941 / 325542 bytes）。将本次用户 PNG 按原记录编码参数转换后，与该已有 WebP **逐字节完全一致**，因此直接复用已有资产，未生成或修改图片。
- 用户 PNG SHA-256：f5ea2c83057981c7387ce1a16f7667190702eb3dc913034846fb03cd766c33b8；WebP SHA-256：f3674f3dcec4e3402e41ac402410005a1f5bf08ec3059ee6d163297dac96e578。确认记录补入既有素材 provenance。
- 首页静态导入、preload、blur fallback 与 cover 尺寸提示同步恢复为 1672:941；Desktop 50%、Tablet 60%、Mobile 72% 裁切。只修改背景组件及对应验收接线。
- 五尺寸加 reduced-motion 6/6 通过，CLS=0、无新增错误和视频请求；Header / Hero / CTA / Login / Help / Footer / AI 的几何与计算样式在六组中均与 v1.1 报告完全一致。
- 标题、CTA、账户、使用指南、Footer、AI、其他页面与共享 tokens 不作本次修改。历史生成背景和所有旧证据保留归档。
- lint、typecheck、production build、全仓 703/703 和 diff-check 通过。最新浏览器记录、资源请求与截图位于 docs/qa/TASK-025.2/background-restored-home-report.json；实际 PNG 位于 F:/CodexWorktrees/TravelAssist-TASK0252/.cache/qa/background-restored-home/。
- 沿用 Issue #251 / Draft PR #252，WBS 3.2 仍待审查，未合并。下方 v1.1 场景描述作为该轮历史保留，本节覆盖其中的背景选择。

---

## 2026-09-09 前轮结果：最新概念 + Amendment v1.1

**状态：待审查。** 已完成新版首页实装和本轮验证；等待用户视觉验收。继续现有 Draft PR [#252](https://github.com/kanzakimy0/TravelAssist/pull/252) → develop，不自动合并。

### 执行与追踪

- Issue：[#251](https://github.com/kanzakimy0/TravelAssist/issues/251)；关联静态 MVP [#246](https://github.com/kanzakimy0/TravelAssist/issues/246)。
- Branch：feature/a-homepage-concept-fidelity。
- 本轮实现提交：c5918208dbb3b20e14594dd2595fec5f18bc2c17；最终认证分层修复：d6b105d099a06355fc8c24c9d4fc1b7236bb8863。
- 最新远端基线：origin/develop@da43afe616ae08516b96599335a54a8ef163d8fd；已正常 merge 到现有任务分支（a0a2f6e），没有 cherry-pick、覆盖其他工作站或使用 ours/theirs 整份替换。
- 已执行 status / branch / fetch --all --prune / rev-parse / log -20，并读取远端主 Task、Amendment v1.1 和 Master WBS。原工作站保持不动，实作位于 F:/CodexWorktrees/TravelAssist-TASK0252。
- 优先级采用：最新用户概念 > v1.1 > 主 Task > 冻结 Brand > 当前运行行为 > 旧首页。
- 开始前将 3.2 更新为进行中；本轮实现验证完成后改为待审查。3.1 已完成及 1.13 待审查状态不变。3.2.1 / #247 仍未开始 / Deferred。

### 最新概念与背景

- 参考为用户上传的 1536×1024 PNG，SHA-256：8b5086d888d745b9be1643c4b4b1ed94c54b1d682e9fa0bbd78d39d97c0d6c95。
- 通过内置 image_gen 去除概念内的文字、按钮、Logo、假头像、页脚与招牌文字，并局部补绘天空/场景。保留樱花前景、夕阳海面、岛屿、富士山、住宅、铁轨和绿色电车。没有把完整概念截图作为页面背景。
- 正式文件：public/media/home-concept/home-hero-fuji-coast-v11.webp，1536×1024，344676 bytes（约 337 KiB），SHA-256：11c559f503d0ba7e276393adf45934e2d28f9e526a83b768fb784933c7f05f3c。
- 来源、用户授权、生成源、提示词、尺寸与哈希：docs/assets/home-hero-fuji-coast-v11.provenance.json。登记到既有资产库；未建立平行素材体系。
- 静态 Image 导入、preload、自动 blur placeholder、按 cover 所需高度声明 sizes；Desktop 50%、Tablet 60%、Mobile 76% 水平裁切。无新增视频或动画方案。
- 旧 Home / Start / PC 素材全部保留。素材库最终 1143 sources / 3556 logical variants / 0 physical derivatives，完整性检查无错误。

### 页面实装

- 复用 MainHeader / BrandLogo / AccountAvatar 与共享珊瑚色 tokens；只给 Home 增加品牌副标、首页样式和辅助操作。没有第二套 Header、Logo 或 Avatar Menu。
- Hero 居中：日文 Eyebrow 与细弧线、“下一站，去哪里？”、“规划行程 · 对话调整”、概念中的细辅助行及唯一主 CTA。窄屏隐藏辅助细行并自然换行标题，保障首屏可读。
- “让我们开始吧 →”仍是真实 /start 链接。沿用全站已统一的珊瑚 CTA 渐变；hover 不移动几何，键盘焦点可见。
- 右上“使用指南”在语言左侧；手机保留可访问名称和 44px 图标触点。Popover 包含指定五步及“查看完整使用指南 →”，支持开关、Escape、关闭后焦点返回、点击外部关闭及键盘进入完整指南。
- 首页底部使用语义 footer：© 2026 TravelAssist 与四个辅助链接。桌面两端排列、手机可换行；没有新增首页说明卡片、营销内容区或第二个主 CTA。
- AI 入口保留现有图标与真实 UI 开关、面板、Escape 和焦点管理，显示“AI 助手”。位置预留页脚安全区；未接入 AI API。

### 真实账户状态

- 既有全仓分层检查要求 features 不直接导入 SDK；已将只读资料适配放在 src/lib/auth，保留原检查，最终 703 项全通过。
- 首页通过现有 Supabase server client 的 auth.getUser() 验证会话；不信任 Cookie 中的姓名和头像，不新增 Auth API、数据库或会话业务。
- 已验证账户消费实际 display_name / full_name / name 和 HTTPS avatar_url；资料不足显示“个人中心”及共享“旅”占位。头像加载失败同样回退占位。
- 桌面账户入口在右上，手机在 CTA 下，均进入真实 /personal-center；不重复显示两个账户入口。
- 游客或无效会话显示“已有账号？ 登录”，链接到现有 /login?returnTo=%2F。旧 disabled Login 边界按最新明确要求替换。
- 未硬编码 Yuki 或其他产品假身份。测试中的“验收账户”和图片均为隔离 fixture，生产代码不含该身份。

### 独立辅助页面

现有仓库没有可复用的公开对应 route，因此只新增五个静态页面，复用共享 Header、tokens 和链接清单：

| Route           | 内容                                                                                |
| --------------- | ----------------------------------------------------------------------------------- |
| /help           | 指定五步使用指南，说明保存到浏览器的实际边界                                        |
| /terms          | 服务范围、账号规则、禁止行为、用户责任、第三方服务、一般边界与终止                  |
| /privacy        | 涉及数据、用途、Cookie、本地保存、第三方、删除/导出范围和用户反馈                   |
| /ai-information | 独立表达 AI≠官方、规划≠预订、显示价格≠成交价、估时≠运行保证、第三方预约以服务商为准 |
| /about          | 项目说明及真实 GitHub 仓库 / Issues 反馈渠道                                        |

未虚构公司、地址、备案、电话或邮箱；未新增 CMS。以上是产品当前能力的基础说明，不宣称完成 WBS 10.6 或法律审查，未扩大 Auth 注册等页面范围。

### 验收结果

| 验证                                   | 本轮结果                                                                                  |
| -------------------------------------- | ----------------------------------------------------------------------------------------- |
| npm ci                                 | 通过，audit 0 vulnerabilities；曾因运行中的 Next SWC 文件锁失败，停止本任务预览后重试成功 |
| npm run lint                           | 通过，无新增错误/警告                                                                     |
| npm run typecheck                      | 通过                                                                                      |
| npm run build                          | 通过，Home 读取会话按请求渲染；五个信息页面静态生成                                       |
| npm test --if-present                  | 完成；仓库没有 test script                                                                |
| 真实 Node 全仓测试                     | 703/703 通过                                                                              |
| Home / Main Shell / 珊瑚色 / v1.1 专项 | 14/14 通过                                                                                |
| 素材校验                               | 1143 / 3556 / 0，errors=[]                                                                |
| git diff --check                       | 通过                                                                                      |

- 浏览器：1672×941、1440×900、1024×768、390×844、320×568，加 1440×900 reduced-motion，**6/6 通过**。
- 五尺寸均无横向或纵向溢出；Hero/CTA 中轴正确；Help 与语言不碰撞；Footer 不压 CTA/登录，AI 不压 Footer；所有链接键盘可达且 focus visible。
- Help open/close/Escape/focus return/outside click、完整指南及四个 footer route 导航通过。AI 开关、Escape、focus return、语言展开、进入 Start 后前进/后退状态通过。
- CLS 全部为 0；延迟图片请求时 blur 占位可见，解码前后标题几何一致，无黑屏或视频 404；视频节点与请求均为 0。
- Auth：五尺寸 × verified / neutral / invalid **15/15 通过**，含伪造 Cookie 姓名拒绝、真实资料、头像故障回退、账户入口及现有 Personal Center 保护。
- 回归 /start、/planner、当前真实 Detail（/planner?view=detail&day=1，点击“保存到浏览器并进入详情”后）、/personal-center：**20/20 几何与基线一致**。地图、右栏、底栏、PC Sidebar / Content 没有变化。
- 回归代码基线 d9ee82f 与当前 da43afe 的差异仅为规格文档，基线仍有效。本轮保留此前全站珊瑚色统一成果，没有重做其他业务页面。
- 新 console / hydration 错误为 **0**。原有 favicon.ico 404 在报告中如实保留。Auth 使用本机测试服务，地图使用既有 fallback；没有声称验证外部生产 Auth/Map。

### 用户可见证据

- 完整截图目录：F:/CodexWorktrees/TravelAssist-TASK0252/.cache/qa/v11-home/。
- 五尺寸截图：1672x941.png、1440x900.png、1024x768.png、390x844.png、320x568.png。
- 同尺寸对照：concept-production-comparison.png（左为用户概念，右为真实游客页面，均 1536×1024）；另有 reduced-motion、慢加载、Help、已核验账户截图。
- 索引与哈希：docs/qa/TASK-025.2/v11-evidence.json，47 张实际截图。
- 浏览器：v11-home-report.json；请求：v11-request-report.json；账户：v11-auth-report.json；回归：v11-report.json；操作复现：同目录 README.md。
- 请求报告包含进入 Start 时加载的该页旧场景，不能将其误读为 Home 请求两个背景。正式 WebP 文件 344676 bytes，浏览器优化后的请求大小详见报告。

### 差异、状态与停止

- 概念中的假身份被实际游客/认证状态替换；现有 BrandLogo 和 AI 图标继续复用；没有照抄假头像或重新绘制品牌标识。
- 细辅助行来自本次优先级最高的概念，320px 隐藏；页脚只保留用户明确指定的版权与四个入口，没有加入概念中的额外营销短句。
- 背景被 UI 遮挡的部分经过补绘，不能声称逐像素恢复原始照片；整体机位和构图按概念保留。实际视觉通过与否由用户验收。
- 历史 TASK-025-A 的“缺少已授权 WebM/MP4 → Blocked”原记录保留；该 blocker 已由静态优先修订解除。本轮没有要求、生成或下载视频。
- WBS 3.2 = **待审查**。只有本轮用户视觉验收通过且 PR 合入 develop 才可已完成。未自动合并，未启动 TASK-025.1-A / 3.2.1 / 3.3 / 3.4 / 3.5。
- 下面所有旧版本、旧截图、disabled Login 和旧视觉范围描述均为历史记录，以本节为当前结果。

---

## 2026-09-09 最新结果：全站珊瑚色

**待审查**。用户进一步要求所有位置的品牌红棕色改为首页“让我们开始吧”的珊瑚色，明确覆盖前轮保持 PC/global 颜色的范围。

- 现有 `--color-accent-primary` 改为 `#e95b4b`；原首页 CTA 的 155° 渐变提取为 `--background-accent-primary`，供 Home / 全站实心品牌按钮、步骤点、详情标签共同消费。Hover 与 focus 使用同系珊瑚色。没有新建 Header / Avatar / Design System。
- Start、Planner、Detail、Personal Center 与旅行/偏好/同行人/账户、Auth 的独立红棕品牌值收敛到共享变量；地图主路线及选中描边改为同系珊瑚。成功/警告/错误等语义仍保留，所有页面结构不变。
- 旧保存行程仍可能带旧路线色；新增仅用于显示的兼容映射，使 SVG / 原生地图数据源 / 推荐缩略图采用新颜色，不写回保存数据，不改变坐标、日程或路线几何。新增测试验证该边界；原缩略图冻结测试仅放行这一颜色包装，其他 SVG 结构仍严格比对。
- lint / typecheck / build / diff-check 通过；全仓 701/701。五尺寸几何 20/20 不变；Desktop/Mobile 14 页面共 28 组颜色检查通过，移动工作台展开后检查按钮。Home 五尺寸 + reduced-motion 6/6，CLS=0、无视频请求。npm ci 前轮同锁文件成功，本轮依赖未改。
- 本轮独立截图与报告：`docs/qa/TASK-025.2/coral-evidence.json`、`coral-report.json`、`coral-colors-report.json`、`coral-home-report.json`。已有 favicon.ico 404 保留；使用本地 visual fixture / fallback map，未声称验证 live Auth/Map。
- 本轮实现 `bb0cf18b14afe51f2fdc204782e28f455ab0263c`；继续 Draft PR #252 / Issue #251、#246，3.2 待审查。此前轮次的截图一致性和不改 PC 记录保留为历史，不代表本轮最终颜色范围。

## 2026-09-09 前轮结果：其余主系统页面品牌同步

**待审查**。用户明确 Home 与 Personal Center 已统一，本轮将它们保持为固定视觉基准，只调整 Start / Planner / Trip Detail。下方 Home-only 实装记录是此前阶段结果，本节记录最新追加范围。

- Start 复用首页已授权的樱花夕阳背景，移除深色覆盖；保持 Wizard 布局，统一标题字体、胶囊 Brand、暖白表面、选中态与键盘焦点。
- Planner / Detail 背景和半透明面板对齐同一场景；灰蓝普通文字、重复棕红/米白硬编码收敛到现有 tokens。地图着色、路线/类别/状态语义色保留。卡片、按钮、菜单、暖边框与阴影复用原体系。
- Home、Personal Center、共享 Header / Logo / Avatar、全局 CSS 和全部业务 TS/TSX 均无本轮改动。两者分别 6 / 5 组 PNG 与修改前 SHA-256 完全一致。
- 1440×900、1024×768、390×844、320×568，另加 1672×941；Start/Planner/真实 Detail/PC 共 20/20 几何与 develop 基线一致。向导继续、Logo hover、账户 Popover 边界、Escape 焦点归还与键盘焦点通过。
- lint（0 warnings）/ typecheck / build / npm test --if-present / diff-check 通过；真实 Node 全仓 699/699、Home/Shell/背景专项 12/12。npm ci 使用同一锁文件前轮成功结果，本轮未改依赖。Home 五尺寸 + reduced-motion 6/6，CLS=0、无视频请求。素材完整性检查无错误。
- 已知基线 favicon.ico 404 保留，无新增错误；Auth 使用本地合成 visual fixture，地图为既有 fallback，不声称验证真实外部服务。
- 本次实现 `b3e12361286b414c699dad0e467d8074ee2bc8db`；分支仍为 `feature/a-homepage-concept-fidelity`，Draft PR #252；证据与实际 PNG 路径见 `docs/qa/TASK-025.2/brand-evidence.json`，浏览器报告 `brand-report.json`，复现见 QA README。未合并、未启动 3.2.1 / 3.3。

## Status（首页实装阶段历史）

**待审查** — 用户要求的概念图完整视觉修正已完成，等待本轮用户视觉验收与 Draft PR 审查。没有合并 PR，没有标记 WBS 3.2 已完成。

## Preflight

- Execution base: `origin/develop@d9ee82f7515bfc09d61d07db0232a5af203c2d16`。
- 已执行 `git status --short`、`git branch --show-current`、`git fetch --all --prune`、`git rev-parse origin/develop`、`git log --oneline -20 origin/develop`。
- 已读取远端正式 TASK-025.2、Master WBS、static-first Amendment；本地 Next 16.3.4 CSS Modules / Image 指南及现有 Home、共享 Header、BrandLogo、AccountAvatar、AI、Auth 边界已审计。
- 原工作站在 `feature/b-travelassist-engine-contract`，保持不动。C 盘空间不足导致最初 fetch 失败，执行迁移至独立仓库 `F:/CodexWorktrees/TravelAssist-TASK0252`；精确 develop 对照工作树为 `F:/CodexWorktrees/TravelAssist-TASK0252-baseline`。
- WBS 3.2 before: 主表仍是旧“首页动画背景区域 / 阻塞”。已先按正式修订改为“首页背景区域 — 静态 Production MVP / A / 1.16,3.1 / 进行中”，登记 3.2.1 Deferred，启动提交 `f85af85`。
- TASK-024 merged: PR [#244](https://github.com/kanzakimy0/TravelAssist/pull/244)，merge `1d1e3aa9ddc33b1a69fba5e11b35980d847a05e4`；1.13 仍待审查。
- PR #248 仍 Open / Draft；未合并、未 cherry-pick、未从其分支继续开发。本 Task 独立从最新 develop 实施较新的概念规格，包含等价的静态导入与 blur placeholder 小改动；后续合并时需结合 #248 跟踪去重。

## Tracking

- Issue: [#251](https://github.com/kanzakimy0/TravelAssist/issues/251)
- Related: [#246](https://github.com/kanzakimy0/TravelAssist/issues/246)
- Branch: `feature/a-homepage-concept-fidelity`
- First delivery (superseded): `a965214b1845423d8ef263e499e8d4dca29f42b5`
- Concept background correction: `1ceab08315b8e82e5acbb8e8f1a8f23853dbc0b4`
- Draft PR: [#252](https://github.com/kanzakimy0/TravelAssist/pull/252)
- WBS 3.2: **待审查**；3.2.1 / #247 **未开始 / Deferred**。

## Concept Fidelity

- Header: 复用唯一 MainHeader / BrandLogo，Home 专属暖白半透明胶囊；只在 Home 裁去同一 Logo 资产的透明留白。默认语言保持 native details，显示“中文 ⌄”。其他 Header adapters 的样式与几何不变。
- Hero center: 内容真正居中；1672×941 下 Eyebrow 起点约 y=212，标题 y=288，CTA x=646 / y=463，宽 380 / 高 88。
- Eyebrow: 大写、加宽字距、下方 52×3px 珊瑚短线。
- Title: 使用共享 `--font-heading`，桌面约 92px，深墨色，移动端自然两行。
- Subtitle: 保留“规划行程 · 对话调整”，桌面约 28px，适度字距。
- CTA: 实际 `/start` Link，保留“让我们开始吧”；暖朱红同系渐变，白字，轻阴影；Hover 不位移，键盘 focus ring 保留。
- User/login entry: CTA 下方暖白胶囊，复用 AccountAvatar 的“旅”，显示“游客 · 个人中心”；原 disabled 登录按钮及其说明保留。
- AI entry: 复用原图标与交互，桌面 92px 暖白圆环，朱红内圆；Mobile 64px；面板底部安全间距随按钮调整。
- Background/crop: 用户明确要求概念图效果后，使用 built-in image_gen 从所提供概念图去除 UI 并局部补绘，接入 `public/media/home-concept/home-hero-sakura-sunset.webp`（1672×941，325542 bytes）。樱花、粉色夕阳、海面反光、住宅和列车构图保留；Desktop 50%、Tablet 60%、Mobile 72% 水平 crop。旧 Poster 原文件保持不变，已退出首页运行时接线。
- 首屏: 静态导入提供自动 blur placeholder / preload。`sizes` 同时考虑 viewport 高度，避免纵屏 cover 时选中低分辨率小图再放大。
- Scope: Home、共享 Header 的 Home 外观适配，以及新背景必需的既有资产清单登记。全局 tokens、BrandLogo/AccountAvatar 实现、其他业务页面未改变。新增背景来源、授权、完整提示词和 SHA 见 `docs/assets/home-hero-sakura-sunset.provenance.json`。

## Auth Boundary

- Logged-in behavior: 当前 Main Shell 尚未绑定 Session 用户信息，保留 TASK-024 的中性入口。真实 `/personal-center` 访问保护与已有 Auth 流程不变；没有扩展 WBS 3.4。
- Guest behavior: 显式游客；点击个人中心由现有保护跳到 `/login?returnTo=%2Fpersonal-center`。首页登录按钮仍 disabled，没有虚构可用性。
- Hard-coded fake identity: **No**。概念图的 Yuki / 人像不进入 runtime。PC 回归仅用已有本机视觉 fixture，不声称验证 live Auth。

## Responsive QA

- 1672×941: 中轴、字号与按钮尺寸符合正式 desktop bands。
- 1440×900: Hero 居中、海岸列车清晰，操作不重叠。
- 1024×768: Header 两端无碰撞，CTA 完整，保留中心焦点。
- 390×844: 两行标题、安全边距、纵屏列车裁切，AI 不遮挡操作。
- 320×568: 全部入口位于首屏，无水平或垂直溢出，触控区域完整。
- Reduced motion: 1440×900 单独验证；静态背景，零视频节点 / 请求。
- Six cases: CLS=0，单一 main / h1，Logo/CTA/个人中心目标正确；键盘 skip / focus、Hover 无位移、语言展开、AI open / close / Escape / focus return、浏览器 back / forward 均通过。
- 延迟 Poster 请求: blur 占位可见、无黑屏，图片完成前后标题几何完全相同。

## Regression

- Start / Planner / Detail / Personal Center：五尺寸共 **20/20** 组几何与精确 develop 基线完全一致。
- Planner 地图、右栏、底栏；Detail（实际点击“保存到浏览器并进入详情”后）工作台；PC Sidebar / Content；Start main 容器均已比较。
- 新 console / hydration errors: **0**。基线及候选首次页面加载均有 `/favicon.ico` 404，完整保留于报告；没有新背景资源错误或缺失视频 404。
- 额外修复已在 develop 与候选原版双重复现的首页 skip-link 历史问题：原生 fragment 后进入 Start 再返回会 URL/内容不一致。新的 HomeSkipLink 直接聚焦原 main，不增加 hash-only history；无 JS 时仍保留原生锚点 fallback，不修改 Start 或路由业务。

## Validation

- `npm ci`: PASS，锁定安装 395 packages，audit 0 vulnerabilities；package/lock 未改。
- `npm run lint`: PASS，0 warnings。
- `npm run typecheck`: PASS。
- `npm run build`: PASS，Next 16.3.4 Turbopack production build。
- `npm test --if-present`: PASS / 无 test script。
- `node --import ./tests/register-route-ts.mjs --test tests/*.test.mjs`: **699/699 PASS**。
- `node --import ./tests/register-route-ts.mjs --test tests/task-025-2-concept-fidelity.test.mjs`: **6/6 PASS**。
- `git diff --check`: PASS。
- 浏览器: Microsoft Edge / Chromium，真实本机 production build；五 viewport + reduced-motion，不等同真机测试。

## Visual Evidence

见 [QA README](../qa/TASK-025.2/README.md)、[browser report](../qa/TASK-025.2/browser-report.json)、[geometry baseline](../qa/TASK-025.2/regression-baseline.json)、[geometry report](../qa/TASK-025.2/regression-report.json)、[evidence manifest](../qa/TASK-025.2/evidence-manifest.json)。

本机完整 PNG 位于 `F:/CodexWorktrees/TravelAssist-TASK0252/.cache/qa/task0252-screenshots/`，包含五尺寸、reduced-motion、加载占位，以及 concept-production-comparison.png。提交文件包含绝对路径 / SHA-256 / 复现方法，二进制不进入产品素材库。

**请用户并排查看 concept-production-comparison.png 与生产截图，进行本轮视觉验收。此前 TASK-024 的验收不代替本次验收。**

## Problems / Deferred

- Historical Blocked: 旧 TASK-025 Result 中“缺少授权视频 → 阻塞”保留原文，未删除或改写历史。
- Current Scope Revision: 视频已移至 3.2.1 / TASK-025.1 / #247；缺少视频不再阻塞当前静态 MVP。
- Current Result: 概念图背景与真实组件已共同接入，手机裁切已校准，等待用户视觉确认及 PR 合并。
- 第一版保留旧 Poster 的交付未获用户视觉认可，本版已按其明确要求接入概念图纯背景；不再以“记录背景差异”代替实现。此前版本保留在 Git 历史。图片使用 built-in image_gen 去除界面及局部补绘；原 UI 遮挡处无法声称逐像素恢复，但主体构图及樱花夕阳视觉已保留。
- 输入概念图由用户提供并明确要求项目使用；本地同名首页 ZIP 为空，因此以实际 PNG 为编辑源。生成模式及完整提示词已记录；没有联网随机下载。
- 真实游客入口继续复用 AccountAvatar，未伪造参考图 Yuki 或已登录人像。
- live Auth / Map Provider、正式视频、WBS 3.3 / 3.4 / 3.5 / 3.7 均未实施。
- 本机预览使用 `next start`；当前仓库 `output: standalone` 会输出运行方式提示。本次是本地 QA，没有部署或声称完成云发布。

## WBS Updated

**Yes**。仅当前 3.2 / 3.2.1 与本任务跟踪段落更新；其他工作站与历史记录保留。PR 未合并，3.2 不标完成。

## Next Task

**Stop. Do not start automatically.** 等待用户视觉验收；不启动视频、3.3 或其他任务。
