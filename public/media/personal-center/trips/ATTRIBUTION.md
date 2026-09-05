# Travel cover credits — WBS-5.1-B-COVERS

真实摄影衍生素材，不是 AI 生图、用户照片或占位图。仅交付素材，尚未接入网页。

## 来源与逐文件许可核对

本次于 **2026-09-05（Asia/Tokyo）** 打开以下三个文件页，分别核对作者、描述、原尺寸与该文件的 Licensing 区域。许可结论不来自站点页脚，也不适用于 Commons / Unsplash 的其他图片。

| 用途                                       | 作者与作品                               | 文件页 / 本次读取版本                                                                                                                                                                                                                 | 文件页许可记录                                                             |
| ------------------------------------------ | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `izu-hero-soft.webp`、`izu-card-soft.webp` | Peter Nguyen — Izu Peninsula, Izu, Japan | [文件页](<https://commons.wikimedia.org/wiki/File:Izu_Peninsula,_Izu,_Japan_(Unsplash).jpg>)；[revision 1037505648](<https://commons.wikimedia.org/w/index.php?title=File:Izu_Peninsula,_Izu,_Japan_(Unsplash).jpg&oldid=1037505648>) | CC0 1.0；页面记载原发布日 2016-08-25，适用 2017-06-05 前 Unsplash CC0 记录 |
| `coast-card-soft.webp`                     | Saigen Jiro — Shirahama-kaigan (Izu)     | [文件页](<https://commons.wikimedia.org/wiki/File:Shirahama-kaigan_(Izu).JPG>)；[revision 1180249234](<https://commons.wikimedia.org/w/index.php?title=File:Shirahama-kaigan_(Izu).JPG&oldid=1180249234>)                             | 作者 Own work / CC0 1.0 声明                                               |
| `weekend-card-soft.webp`                   | Sorasak — Kyoto, Japan                   | [文件页](<https://commons.wikimedia.org/wiki/File:Kyoto,_Japan_(Unsplash_UIN-pFfJ7c).jpg>)；[revision 1015368743](<https://commons.wikimedia.org/w/index.php?title=File:Kyoto,_Japan_(Unsplash_UIN-pFfJ7c).jpg&oldid=1015368743>)     | CC0 1.0；页面记载原发布日 2017-05-05，适用 2017-06-05 前 Unsplash CC0 记录 |

共同许可链接：[CC0 1.0 Universal](https://creativecommons.org/publicdomain/zero/1.0/)。保留作者署名，便于追溯。

伊豆与京都文件页仍带有 `Images from Unsplash (review needed)` 分类。本次确认的是当前文件页明确列出的 CC0 记录，并非声称 Commons 社区已完成其独立历史许可审查，也未独立核验 Wayback 历史快照。今后公开使用仍应保留此来源说明；不声称解决一切第三方权利问题。

## 下载与原图身份

实际原图只从 manifest 中列出的 HTTPS `upload.wikimedia.org` 原始链接取得，不使用缩略图。

| 源 ID   | 原尺寸      | 原始字节 | SHA-256                                                            |
| ------- | ----------- | -------- | ------------------------------------------------------------------ |
| izu     | 3872 × 2592 | 1332546  | `a90a76becc18530f06919dc2b434ced72d82185bee0ab8cd9226dbc695230f75` |
| coast   | 6016 × 4000 | 4218401  | `64264c998c8955bcf5aafa4228c116614ebf5ebae03d25861bda76ac3aa31f85` |
| weekend | 7360 × 4912 | 21040337 | `6439f7ecf286e5f13a48797f3189c527eb0ef36f5627e232b581ebaab992d6a0` |

伊豆、海岸同时匹配脚本原有 SHA-1；京都没有预固定 SHA-1，以上 SHA-256 是本次下载计算值。海岸原文件为 JPEG/MPF 容器，Pillow 12.3.0 识别为两帧 MPO，仅使用 6016 × 4000 的第 0 主帧；原字节与已知 SHA-1 未改变。

## 衍生处理

按既有脚本从原图一次处理：EXIF 朝向校正；有 ICC 时转 sRGB，无 ICC 时视作 sRGB；LANCZOS 填充裁切；饱和度 0.90、对比度 0.90、亮度 1.03、4% `#FAF6EF` 混合；WebP quality 84 / method 6。裁切中心与成品 SHA-256 详见 `manifest.json`。不放大小图，不反复调色，不写入文字、按钮或网页遮罩；移除 EXIF/GPS/XMP 等原始元数据。

京都街景只作为“周末旅行”示例，不标为伊豆。照片中的行人是原摄影内容，不表示 TravelAssist 用户或产品代言。伊豆 Hero 与卡片按 Task 共用同一原图，海岸与京都为另两张独立照片。
