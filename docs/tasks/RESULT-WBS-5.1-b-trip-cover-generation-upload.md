# WBS-5.1-B-COVERS Result

- Status: 待验收（素材制作、视觉检查、GitHub 上传及回读均通过；非已合并或网页验收）
- Issue: #70（Open）
- Branch: `assets/b-personal-center-identity-20260905`
- Base: `04472e3d75b3f28f4972e9efd5cba2812cab22a5`（普通 merge 同步的 develop；启动基线 fd5e449）
- Implementation Commit: `6b269406bf21c7464162afd77c65b25d9fb78b87`
- PR: [#68](https://github.com/kanzakimy0/TravelAssist/pull/68)（Draft）
- Original scenes verified: 3/3
- WebP covers generated: 4/4

## Files

目录：`public/media/personal-center/trips/`。

| 文件                     | 尺寸     | 字节   | SHA-256                                                            |
| ------------------------ | -------- | ------ | ------------------------------------------------------------------ |
| `izu-hero-soft.webp`     | 1920×720 | 14518  | `8bec8cb1758098a7c000de25800cc2d34fed262f53693e36d9f49b01ffd9015a` |
| `izu-card-soft.webp`     | 960×600  | 16934  | `54896be4f0fcfc7568cadf2ba6a1c7fb58bb1805b1380a4fa93c23ff898e6ecb` |
| `coast-card-soft.webp`   | 960×600  | 64886  | `755527c8c5b3f6bf52f22d3fb0ee2d062a85c50addb53bbe0d5ecd3c28628ec1` |
| `weekend-card-soft.webp` | 960×600  | 115076 | `ec2641ca8dfc7d1e016e389bdade4c1256ab7ed6ee7f73349b35cbc10f909bf6` |

其他实际文件：`manifest.json`、`ATTRIBUTION.md`；`docs/qa/WBS-5.1-B-COVERS/preview.jpg`、`README.md`、`checks.json`、`remote-readback.json`。

## Validation

- Source/license check: 三个具体 Commons 文件页作者与 CC0 记录已于 2026-09-05 核对；原尺寸/bytes/主图完整解码及两个预固定 SHA-1 通过，京都无预固定 SHA-1。见 [来源说明](../../public/media/personal-center/trips/ATTRIBUTION.md)。伊豆/京都仍有 Commons `review needed` 分类；本次是文件页核对，不冒充社区历史许可审查或全权利保证。
- Environment: 仓库外独立 Python 3.13.5 / Pillow 12.3.0 / WebP 支持正常，pip check 通过；未修改网站依赖。
- Syntax: 两个 Python 文件编译检查通过。
- Offline tests: 既有 8/8 通过；局部修复后共 13/13 通过。
- Real-image checks: 3 张不同原图、4 张 WEBP/RGB/完整解码/正确尺寸/预算/无 EXIF、GPS、XMP；manifest 来源、参数和实际文件匹配；独立从原图重现后逐字节一致，详见 [checks.json](../qa/WBS-5.1-B-COVERS/checks.json)。
- Visual review: Passed；实际打开四张成品与预览，对照原图。保留摄影细节，未烘焙 UI；京都仅周末示例。见 [逐张记录与预览](../qa/WBS-5.1-B-COVERS/README.md)。
- Task-scoped format / git diff --check: Passed。本 Task 新增及独占的 JSON/MD 格式全部通过；Master WBS 在 origin/develop 和当前工作区均有既有 Prettier 格式问题，本次只新增一行，不越界重排。去除该行后的 WBS 与基线逐行一致。
- Website lint / typecheck / build / browser acceptance: 各项均 Not run — asset-only。
- GitHub upload + readback: Passed。首次真实上传并回读 head `5090c92ad2e778774982f910a1b920afc538bac8`：使用 GitHub Contents API 按提交 SHA 回读 14 个文件，Base64 解码后的 bytes / SHA-256 / Git blob 均与本地一致。证据：[remote-readback.json](../qa/WBS-5.1-B-COVERS/remote-readback.json)。此证据固定记录该历史 head，不自称包含后续追踪文档修订；后续提交不改变四张 WebP、manifest、ATTRIBUTION 或预览，最终 head 的再次回读结果同步至 Issue #70 / PR #68。

## Tracking and boundaries

- Master WBS follow-up row: 待审查；仅本 Task 新增行。
- Parent 5.1 / 5.2 preserved: Yes；所有其他追踪行亦保持不变。
- Website runtime integrated: No；manifest 每张 `runtime_integrated=false`。
- Merged into develop: No；不解除 Draft、不自动合并、不强推、不直接 push develop。
- 保留三个身份 SVG、默认头像、鸟居、背景和其他既有素材；未改 `src/`、CSS、导航、5.2 菜单或 package/lock。
- Remaining blockers: None（已解决的本机 Python TLS 与海岸 JPEG/MPO 识别问题见下；等待用户素材验收不是技术阻塞）。
- Result file: `docs/tasks/RESULT-WBS-5.1-b-trip-cover-generation-upload.md`。

## Problems resolved / audit notes

1. Python 首次下载证书过期，改用 Windows curl/Schannel，正常 TLS 校验取得同一原图。有限请求：伊豆 2 次，其余各 1 次；无不明代理、证书绕过或缩略图替代。
2. 海岸原图的已知 SHA-1 完全匹配，但 Pillow 识别为两帧 MPO。仅该源增加明确格式/帧数记录并选用原尺寸主帧，保留原校验并添加正反向测试；未更换来源或删除校验。
3. 修正脚本自动写死许可日期为显式核验日期，未核验时 null；新增日期测试。预览仍标明不是网页截图。
4. Task 启动时已新增进行中 WBS 行并同步 Issue #70；父项及其他人任务不回退。PR #69 与 Issue #67/#64 只读核对，不修改。
5. 执行期间 A 的 PR #69 和追踪 PR #71 先后合入 develop。普通 merge 同步 f5d5ef2、04472e3，仅解决 WBS 相邻行冲突，保留 A 的最新已完成行及本 Task 独立待审查行。所有其他 WBS 行与最终同步基线完全一致；网站代码与依赖的上游变化是同步带入，不是本 Task 实装。未在本 Task 运行网站构建或安装新 Node 依赖。

完成本次上传与追踪后停止；不继续执行网页接入。
