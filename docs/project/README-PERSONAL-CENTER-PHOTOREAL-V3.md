# Personal Center 写实素材包 v3 — 解压说明

## 解压位置

将 ZIP **直接解压到 `F:\TravelAssist\` 项目根目录**，不是 `public` 目录。ZIP 不包含额外的外层总目录。

解压后新增：

```text
F:\TravelAssist\
├── public/media/personal-center/photoreal-v3/     # 7 个运行时图片
├── assets/design/personal-center/photoreal-v3/   # 来源、预览、JSON 与校验
└── docs/project/
    ├── WBS-5.1-VISUAL-ASSET-MANIFEST-PHOTOREAL-V3.md
    └── README-PERSONAL-CENTER-PHOTOREAL-V3.md
```

这是摄影风格素材的本地交付包，不是页面代码补丁。旧鸟居 SVG、现有四张旅行照片、Logo、Avatar 和所有代码均不覆盖。本包不自动上传 GitHub，不修改任何 Task / WBS 状态。

先查看 `assets/design/personal-center/photoreal-v3/previews/asset-contact-sheet.jpg`，确认 7 张实际文件。

**解压后需要接入。** 旧页面继续引用旧路径时，新素材不会自动显示。完整路径、裁切、透明度、来源和确认状态见同目录 Manifest。

## 可复制给 Codex 的接入说明（不是新开发 Task）

```text
在 F:\TravelAssist 中检查工作区，先阅读：
docs/project/WBS-5.1-VISUAL-ASSET-MANIFEST-PHOTOREAL-V3.md

先核对 public/media/personal-center/photoreal-v3/ 的 7 张图片和预览。
在用户确认这批具体图片之前，不修改页面、不修改旧素材。
用户确认后，仅在 Personal Center 范围内按 Manifest 更新图片引用和必要图层。
保留 sidebar-torii-watercolor.svg，禁止用 WebP 冒充 SVG。
保留现有京都 Hero 和京都/大阪/北海道封面，不重新选目的地、换照片或改文案。
不执行 5.2，不修改 A 主系统，不覆盖其他人的 Task/WBS 记录。
不要自由发挥字体、配色、布局；按用户确认稿与 Manifest 还原。
在 1920×1080、1440×900、1280×720 及窄屏检查裁切、点击和横向溢出。
截图记录接入前后差异；只有实际测试过的项目才能报告通过。
```

## 重要来源说明

照片风格源图来自本对话 AI 生成内容。它们不是实地拍摄，也不是已确认的实际地理场景。各装饰是裁切/调色/透明度衍生版本；当前探索卡是樱花摄影细节，与旧水彩枫叶不同，需用户确认。
