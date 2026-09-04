# TravelAssist Web 开发环境

本文帮助第一次接触项目的开发者在本地安装、运行和检查 TravelAssist Web 工程。

## 1. 项目是什么

TravelAssist 是一个先以响应式 Web 形式开发、后续再扩展至手机 App 的旅行规划项目。本工程使用 Next.js App Router，所有正式功能仍须依据项目文档和对应 Task 开发。

## 2. 开发环境

项目当前使用：

- Node.js 24（当前验证版本为 24.18.0）
- npm 11.16.0
- Next.js 16.3.4
- React 19.2.8
- TypeScript 6.0.3
- ESLint 9.39.5

Next.js 16 的最低 Node.js 要求是 20.9.0。项目统一使用 Node.js 24，以便两位开发者保持一致；仓库根目录的 `.nvmrc` 记录了该主版本。

ESLint 固定在 9.39.5，是因为当前 Next.js ESLint 插件链尚不接受 ESLint 10。TypeScript 固定在 6.0.3，是因为当前 TypeScript ESLint 链要求 TypeScript 低于 6.1。`package.json` 和 `package-lock.json` 记录了完整版本。

### 安装 Node.js

最简单的方式是从 Node.js 官方网站安装 Node.js 24。安装完成后，重新打开终端并运行：

```bash
node -v
npm -v
```

`node -v` 应显示 `v24` 开头的版本。npm 会随 Node.js 一起安装。

如果电脑已安装 Node 版本管理工具，可以在项目目录运行：

```bash
nvm use
```

Windows 上使用的版本管理工具命令可能略有不同；关键是最终 `node -v` 显示 Node.js 24。

## 3. 安装依赖

先进入项目目录：

```bash
cd F:\TravelAssist
```

首次使用或依赖发生变化时运行：

```bash
npm install
```

该命令会根据 `package.json` 和 `package-lock.json` 安装依赖。项目统一使用 npm，不要额外生成 yarn 或 pnpm 的 lock file。

## 4. 启动开发环境

```bash
npm run dev
```

终端显示服务已启动后，在浏览器访问：

```text
http://localhost:3000
```

停止服务时，在运行服务的终端按 `Ctrl+C`。

## 5. Lint

```bash
npm run lint
```

Lint 会检查常见代码质量问题。提交代码前应确保命令成功结束。

## 6. TypeScript 检查

```bash
npm run typecheck
```

该命令先让 Next.js 生成路由类型，再由 TypeScript 检查类型，不生成业务构建文件。出现错误时，应修复错误后再提交。

## 7. Build

```bash
npm run build
```

Build 会生成生产环境版本。成功完成代表项目可以被 Next.js 正常编译。

## 8. Production 启动

先完成 build，再启动生产服务器：

```bash
npm run build
npm run start
```

默认仍可通过 `http://localhost:3000` 访问。完成验证后按 `Ctrl+C` 停止服务。

## 9. 从 GitHub 更新代码

开始新 Task 前，先回到 `develop` 并取得最新代码：

```bash
git checkout develop
git pull --ff-only origin develop
```

然后根据具体 Task 创建自己的 feature 分支：

```bash
git checkout -b feature/b-example-task
```

不要直接在 `develop` 或 `main` 上开发。

## 10. 提交代码

标准流程如下：

```text
develop
↓
feature 分支
↓
开发
↓
测试
↓
commit
↓
push
↓
Pull Request
↓
合并 develop
```

提交前先检查变更：

```bash
git status
git diff
npm run lint
npm run typecheck
npm run build
```

确认无误后提交并推送当前 feature 分支：

```bash
git add .
git commit -m "type: describe the change"
git push -u origin feature/b-example-task
```

随后在 GitHub 创建 Pull Request，目标分支选择 `develop`。

## 11. 环境变量

`.env.example` 只记录项目需要哪些环境变量，不包含真实密钥。需要本地变量时，可以复制为 `.env.local`：

```bash
copy .env.example .env.local
```

只在 `.env.local` 中填写自己的本地值。不得提交 API Key、密码、Token 或其他 Secret；`.env.local` 已被 `.gitignore` 忽略。

当前基础工程不需要任何环境变量，因此不必创建 `.env.local`。
