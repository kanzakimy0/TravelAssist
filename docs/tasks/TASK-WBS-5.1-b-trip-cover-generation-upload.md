# WBS-5.1-B-COVERS — 制作四张清淡旅行封面并上传 GitHub

> 创建日期：2026-09-05（Asia/Tokyo）。这是正式执行 Task，不是素材或网页已经完成的记录。

## Metadata

- Task ID: `WBS-5.1-B-COVERS`
- Owner: B
- Status: 待验收
- WBS: 5.1（completed-task asset follow-up；不回退父项状态）
- GitHub Issue: #70
- Task File: `docs/tasks/TASK-WBS-5.1-b-trip-cover-generation-upload.md`
- Branch: `assets/b-personal-center-identity-20260905`
- Pull Request: #68（既有 Draft，接续交付，不创建重复素材 PR）
- Depends On: 已有封面脚本与三个身份 SVG 可读取；不依赖 PR #68 先合并
- Reviewed develop: `04472e3d75b3f28f4972e9efd5cba2812cab22a5`（执行期间普通 merge 同步；启动基线为 fd5e449）
- Reviewed asset head: `202f588f5b2135a9dd4d568a5f742113a8b6c7a8`（启动实际远端头）
- Commit: `6b269406bf21c7464162afd77c65b25d9fb78b87`（四张真实封面与校验的素材实现提交）
- Master WBS Sync: 本 Task 追踪行待审查；父项及其他行不变
- Result File: `docs/tasks/RESULT-WBS-5.1-b-trip-cover-generation-upload.md`（已创建；真实上传与回读通过）

## 1. 目标与范围

在 B 的联网工作站上执行已上传的照片处理脚本，真实取得三张原图，制作四张清淡暖色封面，检查成品并上传 GitHub。必须交付图片文件，不能只返回脚本、下载链接或提示词。

本次使用真实摄影裁切调色，不是文字生图。用户已经允许使用 Apixel；本 Task 采用现有免插件路线，既不依赖该插件，也不要求用户再次确认安装。不自动订阅或购买外部服务。

本次只完成素材制作、检查与上传。网页接入仍是独立工作，不修改页面组件、CSS、五项导航、已完成的头像菜单或业务数据。保留原 5.1、5.2 已完成记录；素材到位不等于网页实装或页面验收完成。

### 必须交付

| 文件                     | 场景与用途                 | 尺寸       | 大小上限 |
| ------------------------ | -------------------------- | ---------- | -------- |
| `izu-hero-soft.webp`     | 伊豆下一次旅行 Hero        | 1920 × 720 | 450 KiB  |
| `izu-card-soft.webp`     | 伊豆旅行卡片               | 960 × 600  | 240 KiB  |
| `coast-card-soft.webp`   | 海岸慢游卡片               | 960 × 600  | 240 KiB  |
| `weekend-card-soft.webp` | 周末旅行卡片；京都街景示例 | 960 × 600  | 240 KiB  |

三个独立原始场景导出四个文件；Hero 与伊豆卡允许共用同一张伊豆原图。不得将同一照片裁切四次冒充三个独立场景。

运行时目录：`public/media/personal-center/trips/`。同时交付该目录内的 `manifest.json`、`ATTRIBUTION.md`；预览和验收记录放入 `docs/qa/WBS-5.1-B-COVERS/`。

## 2. 开始前必须读取

- `AGENTS.md`、`README.md`、`CONTRIBUTING.md`、`docs/README.md`。
- `docs/project/WBS-TravelAssist.md`、`docs/development/task-tracking.md`。
- `docs/ui/personal-center.md`、`docs/ui/personal-center-shell.md`。
- `docs/project/B-TRIP-COVERS-NO-PLUGIN-2026-09-05.md`。
- `tools/assets/personal-center/prepare_trip_covers.py`。
- `tools/assets/personal-center/test_prepare_trip_covers.py`。
- PR #68、Issue #70，以及最新 A/B Task、Issue 和 PR。

以上素材脚本与本 Task 当前在 PR #68 的分支，不一定在 develop。不能只检出 develop 后因找不到脚本就宣告阻塞。

## 3. Git 与追踪启动

1. 检查当前目录及仓库远端，确认目标为 `kanzakimy0/TravelAssist`。读取 `git status --short --branch`；不覆盖用户未提交内容，不自动 stash、reset、clean、强推或删除分支。存在无关本地修改时使用独立干净 worktree。
2. 执行 `git fetch --all --prune`。读取最新 `origin/develop`、PR #68 的状态与头提交、Issue #70，确认没有重复实施或并行写入本素材分支。本文中的 SHA 只用于审计，禁止强制回退。
3. PR #68 仍打开时，接续 `assets/b-personal-center-identity-20260905` 的最新头提交；先将本地分支快进到远端，再按需要以普通 merge 同步最新 develop。此为接续已有素材工作的分支例外，不要求另建重复 feature 分支/PR，也不要求先合并 #68。
4. PR #68 已合并时，先检查四张成品是否已经存在。若本 Task 全部条件已满足，执行核验与追踪同步，不重复制作。仍有缺口时从最新 develop 新建唯一 `feature/b-wbs-5-1-trip-covers` 分支，沿用 Issue #70，创建对应后续 Draft PR并更新本 Task 元数据。
5. PR #68 已关闭但未合并、存在不明并行改动、或同步发生无法判定的冲突时，停止写入，记录真实阻塞。不得整体搬运旧分支覆盖最新 develop。
6. 开始制作前，将本 Task 与 Issue #70 更新为“进行中”，在 Master WBS 的“当前 Task 追踪记录”中新增下面一行。父 WBS 5.1、5.2 和其他行全部保持不变。行已存在时只更新该行，禁止重复追加或整表重写。

```md
| WBS-5.1-B-COVERS | 5.1（素材补充） | B | 进行中 | #70 | `docs/tasks/TASK-WBS-5.1-b-trip-cover-generation-upload.md` | `assets/b-personal-center-identity-20260905` | PENDING | #68 |
```

本 Task 创建阶段未修改 Master WBS；补齐此行是执行启动要求，不应被误解为父项需要重新验收。

## 4. 原图与网络准备

使用脚本 `SOURCES` 中的三个具体 Commons 文件，逐一复核来源文件页、作者、该文件的许可记录和真实原图。历史说明记录的是三个文件的 CC0 信息，不代表 Commons 或 Unsplash 所有照片都适用同一许可。禁止仅根据站点页脚判断图片许可。

- 原图只经 HTTPS 从脚本允许的 `upload.wikimedia.org` 下载；必要的文件页核对访问 `commons.wikimedia.org`。
- 允许安装本 Task 所需的独立 Python 工具依赖、读取上述公开来源和推送本仓库；不向外部服务上传仓库内容、个人资料、密钥或未公开数据。
- 验证 JPEG 格式、原尺寸、字节数与已知 SHA-1；记录三张原图下载后的 SHA-256。京都源没有预先固定的 SHA-1，不能声称三张都有预固定哈希。
- 原图不足、返回 HTML/错误页、来源信息改变、校验不匹配时停止。确有合法源更新，只能在重新核对证据并补充测试后局部更新源记录；不能删除校验强行通过。
- 不绕过 TLS，不安装不明证书，不使用来源不明代理，不把 DNS/403/429 错误当下载成功。

网络失败时可有限重试（每个来源最多三次，429 尊重 Retry-After）。可以用其他标准下载工具取得同一已核验原图，再走离线缓存校验；不能把缩略图冒充原图。仍失败则记录来源、错误、尝试次数和阻塞原因，不反复无限重试。

## 5. 执行照片处理

需要 Python 3.10+ 与支持 WebP 的 Pillow。虚拟环境、缓存、临时输出全部放在仓库外的本次专用新目录；缓存与输出不得相同或互相嵌套。

Windows PowerShell 示例（从仓库根目录执行；已有 Python 可按实际解释器路径适配）：

```powershell
$ErrorActionPreference = "Stop"
$parent = Split-Path -Parent (Get-Location).Path
$work = Join-Path $parent ("travelassist-covers-" + [guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Path $work -ErrorAction Stop | Out-Null
py -3 -m venv (Join-Path $work "venv")
if ($LASTEXITCODE -ne 0) { throw "创建独立 Python 环境失败" }
$python = Join-Path $work "venv/Scripts/python.exe"
& $python -c "import sys; assert sys.version_info >= (3, 10), sys.version"
if ($LASTEXITCODE -ne 0) { throw "需要 Python 3.10+" }
& $python -m pip install Pillow==12.3.0
if ($LASTEXITCODE -ne 0) { throw "Pillow 安装失败；记录实际错误，不修改网站依赖" }
& $python -c "from PIL import features; assert features.check('webp')"
if ($LASTEXITCODE -ne 0) { throw "Pillow 不支持 WebP" }
& $python -m unittest discover -s tools/assets/personal-center -p 'test_*.py' -v
if ($LASTEXITCODE -ne 0) { throw "离线测试失败" }
& $python tools/assets/personal-center/prepare_trip_covers.py `
  --output (Join-Path $work "exports") `
  --cache (Join-Path $work "cache") --timeout 35
if ($LASTEXITCODE -ne 0) { throw "真实封面未完成；不要提交假图片" }
```

Pillow 版本来自已有制作说明；执行时验证可取得且可用，不能把安装失败写成通过。其他操作系统使用对应的虚拟环境解释器，步骤与校验要求相同。不得修改网站 package.json、锁文件或 Node/npm/TypeScript 版本。

已取得相同原图时，将原图缓存命名为 `izu.jpg`、`coast.jpg`、`weekend.jpg`，使用同一脚本加 `--offline`。缓存模式仍执行原图校验。输出目录已存在时改用新的专用目录，不删除或覆盖别人的成果。

固定处理方向：饱和度 0.90、对比度 0.90、亮度 1.03、4% 暖象牙白 `#FAF6EF`。从原图一次处理，不反复降低饱和度；使用脚本的裁切与 WebP 质量策略，不放大小图。必要的裁切调整需记录实际参数、保留真实摄影感，并重新测试。

## 6. 验收与发布到仓库

### 文件检查

四张 WebP 必须真实存在且可完整解码，逐个检查格式、尺寸、RGB、字节数、无 EXIF/GPS、SHA-256。三张原图哈希不同；不能只看脚本退出码。Hero ≤ 460800 字节，各卡片 ≤ 245760 字节。

核对 `manifest.json` 的四个条目、来源、作者、尺寸、字节数、裁切参数、处理参数、WebP 质量与实际文件一致。修正历史脚本中的固定核验日期为本次实际核验日期；未经核验不能填写已核验。`synthetic` 应为 false，每张的 `runtime_integrated` 必须继续为 false。

### 视觉检查

逐一打开四张成品与 `preview.jpg`，不能只运行合成色块单元测试。确认伊豆山景、海岸、京都街景三个场景确实不同，构图没有错误裁切，暖色不发黄、不泛灰，保留摄影细节。京都街景只标为周末示例，不错写成伊豆。

Hero 的左侧文字遮罩属于后续网页实装，不把文字或按钮烘焙进图片。可另做只读裁切/遮罩预览作为证据，不修改实际网页；这种预览不叫网页截图或浏览器验收。无法查看成品时，视觉验收写“未验证”，不得写全部通过。

### 复制与交付

1. 先检查目标目录和同名文件；已存在时比较哈希与追踪来源，不自动覆盖。相同且已核验可复用，不同且来源不明则停止并记录。
2. 将四张 WebP、`manifest.json`、`ATTRIBUTION.md` 添加到 `public/media/personal-center/trips/`。
3. 将 `preview.jpg` 与真实检查说明放入 `docs/qa/WBS-5.1-B-COVERS/`。本次检查通过时可将 manifest 状态改成 `ASSET_REVIEWED_PENDING_INTEGRATION`，仍保留未接入标记；未通过则维持 pending 状态。
4. 创建本 Task 的 Result MD，区分“制作成功”“视觉检查”“上传成功”“已合并”“网页已接入”。来源核验、参数与交付结果不得混写。
5. 不提交原图缓存、虚拟环境、临时文件、合成测试图片、字体文件、账户信息或凭据。只暂存本 Task 允许的文件，禁止无差别 `git add .`。

## 7. 允许修改范围

允许：

- `public/media/personal-center/trips/` 内本次四张成品与清单。
- `docs/qa/WBS-5.1-B-COVERS/`。
- 本 Task 与对应 Result 文件。
- `docs/project/WBS-TravelAssist.md` 中仅本 Task 新增的追踪行。
- PR #68 / Issue #70 的本次进度与交付说明。
- 确有必要时局部修复 `tools/assets/personal-center/prepare_trip_covers.py` 及其测试，记录原因并重跑全部相关测试；不是重写工具。

禁止：

- 更改三个已上传身份 SVG、原鸟居、主背景纹理、A 首页照片、Step 1–5 背景。
- 修改任何其他 Task、其他 WBS 行、其他 Issue/PR、主系统代码或 5.2 头像菜单。
- 修改网站依赖、全局工程规范、工作流、认证/数据库/会员系统。
- 为通过格式检查重排全仓文档，或回退历史已完成任务。

## 8. 验证、Push 与三方追踪

至少执行并记录：Python 版本/Pillow 版本/WebP 支持；脚本语法检查；现有八项离线测试及新增测试（如有）；真实三原图/四输出流程；解码/尺寸/体积/元数据/哈希检查；逐张视觉检查；`git diff --check`；本次 JSON/MD 的格式检查。

不改网页代码的本 Task 不强制重新安装整个网站。网站 lint/typecheck/build/浏览器验收未运行时分别写 `Not run — asset-only`，不能借用旧 Task 的 Passed。全仓格式失败需区分既有与新增，仅修本 Task 引入的问题。

交付完成后：

1. 本 Task → 待验收；WBS 中本 Task 行 → 待审查；Issue #70 保持 Open，并附真实 Result。
2. Commit subject 使用 `assets(WBS-5.1-B-COVERS): ...` 或 `fix(WBS-5.1-B-COVERS): ...`。记录素材实现提交；不要将创建 Task 文档的提交算作素材实现。
3. Push 前再次 fetch 并比对远端头。远端前进则先复核、正常整合，再运行受影响的检查；禁止强推覆盖。正常 push 只推本分支。
4. 沿用 PR #68，保留 Draft，补充 `Refs #70`、Task/Result 路径、真实交付与检查结果。不要把 A 的 PR #69 或旧 Issue #34 关联成关闭目标。
5. 从远端 Git 或 GitHub 回读本次四张 WebP 与清单，比较 Git blob/SHA-256 和本地结果；记录 head commit。仅本地有文件不算上传成功。
6. 禁止自动 merge、启用自动合并、将 Draft 改为 Ready 或直接 push develop。现有仓库工作流会尝试合并非 Draft PR，因此保持 Draft 是必要条件。
7. 只有用户验收通过且对应交付已合入 develop 后，才同步为已完成并关闭 Issue #70。若按仓库规则使用 `Closes #70`，只应在批准进入合并阶段时添加；提前关闭需如实纠正。

原 WBS 5.1 / 5.2 的已完成状态与原 Task/Issue 均保留。本次追踪行可以独立处于进行中、待审查或阻塞。

## 9. 阻塞处理

网络、权限、图片来源、安装、校验、预算或视觉检查不通过时，保留已核实结果；Task/新增 WBS 行标为阻塞，Issue #70 Open / Blocked，PR #68 仍 Draft。Result 写明具体错误、已尝试的方法、哪些输出确实存在。

不得使用测试色块、纯色占位、低清缩略图、重复图片或未核验的第三方图片补足数字，不得删除校验。未成功上传时列明 Upload failed/PENDING；仍可提交不含假素材的诊断记录。不要自动推进网页实装或开始其他任务。

## 10. Codex 返回格式

```text
# WBS-5.1-B-COVERS Result
Status: 待验收 / 阻塞 / 已完成（仅合并并验收后）
Issue: #70
Branch: <实际分支>
Base: <实际同步的 develop>
Implementation Commit: <实际提交或 PENDING>
PR: #68 / <实际后续 PR>
Original scenes verified: 0–3
WebP covers generated: 0–4
Files: <文件名、尺寸、字节数、SHA-256>
Source/license check: <真实结果>
Offline tests: <通过数/总数>
Real-image checks: <真实结果>
Visual review: Passed / Failed / Not verified
GitHub upload + readback: <真实结果与 head>
Master WBS follow-up row: <状态>
Parent 5.1 / 5.2 preserved: Yes / No
Website runtime integrated: No
Merged into develop: Yes / No
Remaining blockers: <实际问题或 None>
Result file: docs/tasks/RESULT-WBS-5.1-b-trip-cover-generation-upload.md
```

## 11. 审计来源

任务创建时读取了 develop `fd5e449` 的 WBS、协作规则、Issue 模板与自动合并规则，以及 PR #68 的 `2040c1c` 素材说明和完整处理脚本。GitHub Issue #70 是本 Task 的独立执行记录；原 5.1/5.2 已完成，PR #68 尚为 Draft。执行时以最新远端状态为准。

- Repository: https://github.com/kanzakimy0/TravelAssist
- Issue: https://github.com/kanzakimy0/TravelAssist/issues/70
- Asset PR: https://github.com/kanzakimy0/TravelAssist/pull/68
