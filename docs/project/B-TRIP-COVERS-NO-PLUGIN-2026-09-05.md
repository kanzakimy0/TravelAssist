# B 旅行封面：无需图片生成插件的制作流程

> 日期：2026-09-05 · Owner：B · 关联：5.1 素材补充 / PR #68  
> 基线：develop `fd5e4492f202c07567593199baadd25425190367`  
> 接续素材分支：`assets/b-personal-center-identity-20260905`  
> 当前状态：脚本已完成；真实封面尚未生成、上传或实装。

## 1. 本轮变更

用户不安装图片生成插件。本轮保留之前已上传的三个身份 SVG，新增一个真实照片处理脚本及八项离线测试。没有调用任何图片生成服务，没有新增 GitHub Actions、运行时依赖、API Key、自动提交或自动合并流程。

本文件是素材制作说明，不是新的正式开发 Task，不改变已完成的 5.1 状态。历史交付记录中提到的插件连接建议已不再作为依赖。

## 2. 已核对的来源与目标输出

| 场景 | 作者 / 文件页记载许可 | 目标文件 |
| --- | --- | --- |
| 伊豆层叠山景 | Peter Nguyen / CC0 1.0 | `izu-hero-soft.webp`，1920 × 720；`izu-card-soft.webp`，960 × 600 |
| 白浜海岸 | Saigen Jiro / CC0 1.0 | `coast-card-soft.webp`，960 × 600 |
| 京都街景 | Sorasak / CC0 1.0 | `weekend-card-soft.webp`，960 × 600 |

来源文件页（2026-09-05 读取；不是从 Commons 页脚推断许可）：

- <https://commons.wikimedia.org/wiki/File:Izu_Peninsula,_Izu,_Japan_(Unsplash).jpg>
- <https://commons.wikimedia.org/wiki/File:Shirahama-kaigan_(Izu).JPG>
- <https://commons.wikimedia.org/wiki/File:Kyoto,_Japan_(Unsplash_UIN-pFfJ7c).jpg>

已通过网页工具查看这三个原图或缩略图的构图。但网页可显示图片，不等于本地执行环境已取得原图。第一、三张是 Commons 记录的旧 Unsplash CC0 文件；不得推广为所有 Unsplash 图片都采用 CC0。使用前复核具体文件记录，图片许可也不代表取得所有其他权利。

这条路线使用真实摄影再裁切调色，不是从文字生成新场景；仅作为 Mock 示例素材，不宣称为用户拍摄或真实订单证据。

## 3. 脚本行为

入口：`tools/assets/personal-center/prepare_trip_covers.py`。

三个原始场景导出四个文件。饱和度 0.90、对比度 0.90、亮度 1.03，叠加 4% 暖象牙白；从原图一次性处理，避免反复累计降色。导出 WebP，去除 EXIF / GPS；自动产生来源、作者、处理参数、尺寸、SHA-256 清单和预览拼图。

下载只允许 HTTPS 的 `upload.wikimedia.org`，单文件上限 32 MiB。检查三个原图的格式、尺寸、长度，并对有公开校验值的前两张检查 SHA-1；京都没有预先取得的 SHA-1，因此不伪造，而是记录下载后 SHA-256。来源尺寸、长度或校验值改变时必须人工复核，不能删除验证强行通过。

输入缺失或验证失败会报错退出；不会生成假的占位封面。输出目录必须不存在，所有素材通过后才发布到输出目录；不覆盖既有文件。缓存与输出必须为彼此独立的目录。预览文件不是网页截图，脚本完成不等于视觉验收。

## 4. 联网工作站运行

需要 Python 3.10+ 与支持 WebP 的 Pillow。将工具环境、原图缓存与输出放在仓库外；无需插件或图片 API。可在临时虚拟环境安装本轮已测试版本：

```sh
python -m pip install Pillow==12.3.0
python -m unittest discover -s tools/assets/personal-center -p 'test_*.py' -v
python tools/assets/personal-center/prepare_trip_covers.py --output ../travelassist-covers --cache ../travelassist-photo-cache
```

上述 `python` 应为临时工具环境的解释器，不要为此修改网站 package.json、锁文件或全局工程版本。Pillow 的处理接口参考：<https://pillow.readthedocs.io/en/stable/reference/ImageEnhance.html>。

已取得相同原图时，可将其放入缓存目录并分别命名 `izu.jpg`、`coast.jpg`、`weekend.jpg`，加 `--offline` 执行；仍进行原图校验。输出存在时改用新的目录名，不能自动删除别人的成果。

## 5. Codex 后续操作边界

先读取最新 origin/develop、PR #68 的状态和头提交，检查同类 Task / Issue / PR。若 PR 仍未合并且该素材分支没有其他人在并行修改，接续已有素材分支；不要为了运行脚本强制回退、强推或创建重复素材 PR。若 PR 已合并，则从最新 develop 建立独立后续分支，按仓库规则追踪。

在联网工作站运行脚本，实际检查 `preview.jpg`、四张图片的构图及字重对比。Hero 必须保留页面左侧文字遮罩；调色不能替代遮罩。街景只能作为周末旅行的示例，不要将它错误描述为伊豆。

检查通过后，把四个 WebP、`manifest.json` 和 `ATTRIBUTION.md` 添加到 `public/media/personal-center/trips/`，预览图放在验收证据目录。提交前检查现有同名路径及其他人的修改。更新本轮真实交付状态与 PR，明确图片是否已经显示在网页。不要提交缓存原图、工具虚拟环境、合成测试图片或 API 凭据。

网页接入属于独立实装工作：保留五项导航、已经实现的头像菜单、原有鸟居图与主纹理，不修改 A 首页、Step 1–5 或其他 Task。不能为了填充这三张封面重做 IA，也不能把图片生成成功直接记为 5.1 页面验收通过。

## 6. 本轮实际验证

- Python 语法编译通过；Pillow 12.3.0。
- 八项离线测试通过：域名白名单、尺寸与元数据清理、不放大小图、WebP 解码、坏哈希拒绝、拒绝覆盖、缺图不输出、四文件完整处理流程。
- 完整流程测试使用临时合成色块，测试后删除；不是生成的真实旅行封面。
- 真实下载尝试失败：`Temporary failure in name resolution`，退出码 1。
- 真实封面输出目录没有产生；没有上传任何新摄影封面。
- 未执行网站 build、lint、typecheck 或浏览器路由验收。
