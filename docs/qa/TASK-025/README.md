# TASK-025-A Static Production Background QA

执行基线：`088f467b8ff666ddd9774f8d6b7ad351fd54f00a`。仅静态 MVP；视频增强留在 3.2.1 / #247。

## 实际结果

- Edge + Next 16.3.4 生产构建：四尺寸 × no-preference / reduce，共 8/8。
- 每组保留相同 Hero、Header、CTA、Login、Personal Center、AI 几何；延迟图片、图片完成、普通页面往返和正常刷新后位置一致，CLS = 0。
- 真正拦住图片响应检查内联同图预览，释放后检查真实图片解码、预览消退、可访问内容和无视频请求。
- 无 console / hydration / HTTP 错误。没有 WebM / MP4 请求，没有 GIF / CSS 背景动画或视频生产。
- Skip link、真实 Tab 焦点、AI 打开 / Escape / 回焦点、首页 → Start → 返回、个人中心游客保护 → 登录 → 返回均实测。登录按钮维持既有 disabled 状态，不接新的 Auth。
- 8 张完整页面、2 张慢加载截图及 1 张移动端对照图见 screenshots.json；本地路径在任务工作树 `.cache/qa/task025-screenshots/`。未把 QA 截图加入业务素材目录。

## 裁切与图片资源

原始 Poster：1672×941，161854 bytes，SHA-256 `7464b34430b89ea9c010242bed05156e374aff347d1d7875d5bedbb57c4a5466`，没有修改。

| Viewport | Object position | Next 请求宽度（DPR 1） | 图片响应 body |
| -------- | --------------- | ---------------------- | ------------- |
| 1440×900 | 58% 50%         | 1920                   | 77338 bytes   |
| 1024×768 | 58% 50%         | 1080                   | 36746 bytes   |
| 390×844  | 67% 50%         | 640                    | 15548 bytes   |
| 320×568  | 67% 50%         | 640                    | 15548 bytes   |

布局、CSS 裁切、Overlay 及材质保持已验收值。Next 的静态图片 import 提供哈希资源名、图片元数据和微小 blurDataURL，原 preload / fill / sizes=100vw 保留。完成后移除临时 blur，最终画面没有额外模糊。

report.json 的 measured 为受控延迟加载；naturalLoad 为不再延迟的正常刷新。本机热服务端缓存、DPR 1、无带宽限制，LCP 60–80ms、图片请求约18–26ms只是本机样本，不作为公网性能承诺。各组实际 URL、响应类型、Cache-Control、body bytes 和完整请求记录均在报告中。

## 已确认的基线例外

`known-baseline-history.json` 记录独立诊断：先使用 skip link（URL 带 `#home-content`），再进入 Start 并后退，URL 回到首页锚点但内容仍为 Start。旧 TASK-024 生产构建与当前构建均复现；普通不带锚点的往返正常。当前背景变化没有修改导航；本轮没有越界修复该既有 hash-history 问题。

专项脚本分别测试 skip link 的焦点行为和普通 URL 的往返，不能将 8/8 解读为这个既有组合路径也通过。

## 复现

1. `npm ci`，然后 `npm run build`（生成 Next 图片类型声明），`npm run typecheck`、`npm run lint`。
2. 启动 `npm start -- -p 3128`。本次使用原本地预览配置；不需要真实账户、外部 Auth 或 Map token。
3. 指定本机 Playwright 包位置到 `PLAYWRIGHT_MODULE`；安装的浏览器默认 `msedge`，可通过 `CHROME_CHANNEL` 改为已有 Chromium channel。
4. `TASK_025_URL=http://localhost:3128`，运行 `node tools/qa/task-025-static-background-check.mjs`。可用 `TASK_025_BASELINE` 指向另一个几何基线；默认使用本目录已提交基线。
5. `node --test tests/task-025-static-background.test.mjs`；全仓 `node --import ./tests/register-route-ts.mjs --test tests/*.test.mjs`。

浏览器报告与截图是实现方验收证据，当前 Static MVP 的用户视觉验收仍待进行；不沿用 TASK-024 的用户通过作为本 Task 通过。
