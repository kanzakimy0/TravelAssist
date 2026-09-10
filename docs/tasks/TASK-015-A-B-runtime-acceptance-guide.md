# TravelAssist — B 工作站完整 DB 环境安装与验收说明

> 适用：Windows 工作站
> 目标：从零安装 WSL2 + Docker Desktop，并完成 TravelAssist **`TASK-015-A`** 的 Supabase Local / DB Runtime 验收。
> 当前 DB 基础分支：**`origin/feature/a-db-orm-migration-foundation`**
> 建议验收分支：**`runtime/db-foundation-acceptance-b`**

---

# 0. 最终目标

B 完成后应达到：

```text
Windows
  ↓
WSL 2
  ↓
Docker Desktop（WSL 2 backend）
  ↓
TravelAssist DB 独立 Worktree
  ↓
Supabase Local
  ↓
db:start
db:status
db:reset
db:types
  ↓
lint
typecheck
build
  ↓
DB Runtime Acceptance PASS
```

---

# 1. 重要原则

本次只负责 **B 工作站数据库开发环境准备和 TASK-015-A Runtime 验收**。

禁止：

```text
不要修改当前 Planner / UI 工作分支
不要在有未提交修改的目录切 DB 分支
不要 git reset --hard
不要 git clean -fd
不要 git push --force
不要 git push --force-with-lease
不要手工建立正式业务表
不要提交真实数据库 Secret
不要使用 drizzle-kit push 修改正式数据库
```

数据库验收一律使用 **独立 Git Worktree**。

---

# 2. Windows 前置检查

推荐 Windows 11；Windows 10 也需满足 Docker Desktop 当前支持版本要求。

先在 PowerShell 执行：

```powershell
winver
```

Docker Desktop 使用 WSL 2 backend 时还要求：

```text
64-bit CPU
硬件虚拟化已启用
至少约 8 GB RAM
WSL >= 2.1.5
```

如果后续 Docker 报虚拟化错误，需要进入 BIOS / UEFI 开启：

```text
Intel VT-x / Intel Virtualization Technology
或
AMD-V / SVM Mode
```

---

# 3. 安装 WSL2

## 3.1 检查是否已经安装

打开 PowerShell：

```powershell
wsl --version
wsl --status
```

如果可以正常显示版本并且默认版本为 2，可以直接进入第 4 节。

---

## 3.2 WSL 未安装时

以 **管理员身份运行 PowerShell**：

```powershell
wsl --install
```

安装结束后：

```text
重启 Windows
```

---

## 3.3 重启后更新 WSL

PowerShell：

```powershell
wsl --update
wsl --version
wsl --status
wsl -l -v
```

验收：

```text
WSL Version >= 2.1.5
默认版本 = 2
```

如果需要：

```powershell
wsl --set-default-version 2
```

### 注意

Docker Desktop **不要求必须另外安装 Ubuntu**。

如果：

```powershell
wsl -l -v
```

最后只有：

```text
docker-desktop    Running    2
```

也可以正常使用 TravelAssist 的 Supabase Local。

---

# 4. 下载 Docker Desktop

只从 Docker 官方渠道下载。

官方页面：

```text
https://docs.docker.com/desktop/setup/install/windows-install/
```

进入页面后选择：

```text
Docker Desktop for Windows
```

绝大多数 Intel / AMD Windows PC 选择：

```text
x86_64
```

ARM Windows 设备才选择 ARM 版本。

下载文件通常为：

```text
Docker Desktop Installer.exe
```

---

# 5. 安装 Docker Desktop

双击：

```text
Docker Desktop Installer.exe
```

推荐采用默认的：

```text
Per-user installation
```

安装过程中如果出现 Backend 选择：

```text
Use WSL 2 instead of Hyper-V
```

应选择 / 保持开启。

完成安装后启动：

```text
Docker Desktop
```

第一次启动可能要求接受 Docker Desktop 条款。

---

# 6. 确认 Docker 使用 WSL2

打开 Docker Desktop：

```text
Settings
  ↓
General
  ↓
Use WSL 2 based engine
```

如果该选项已经默认开启或在当前版本中不显示，一般表示系统已经自动使用 WSL2 backend。

点击：

```text
Apply / Apply & Restart
```

（如果界面要求。）

---

# 7. 验证 Docker

PowerShell：

```powershell
docker --version
docker info
```

### PASS 标准

**`docker --version`** 能输出 Docker 版本。

**`docker info`** 能正常看到 Client / Server / Containers / Images 等信息。

然后：

```powershell
wsl -l -v
```

应至少可以看到：

```text
docker-desktop    Running    2
```

---

# 8. 如果 PowerShell 找不到 docker

先确认 Docker Desktop 已经启动完成。

然后关闭当前 PowerShell，重新打开，再执行：

```powershell
docker --version
docker info
```

仍失败时检查 Docker Desktop 是否显示：

```text
Engine running
```

---

# 9. 如果 Docker 报 WSL 错误

先：

```powershell
wsl --update
wsl --shutdown
```

重新启动 Docker Desktop。

再：

```powershell
docker info
```

---

# 10. 如果 Docker 报虚拟化错误

打开 Windows：

```text
Task Manager
  ↓
Performance
  ↓
CPU
  ↓
Virtualization
```

应显示：

```text
Enabled
```

如果是：

```text
Disabled
```

进入 BIOS / UEFI 开启：

```text
Intel Virtualization Technology / VT-x
或
AMD SVM / AMD-V
```

保存并重启 Windows。

---

# 11. 确认 Node / npm

PowerShell：

```powershell
node --version
npm.cmd --version
```

项目版本以 TravelAssist 仓库固定版本为准。

### 为什么推荐 `npm.cmd`

部分 Windows PowerShell 会出现：

```text
npm.ps1 cannot be loaded
PSSecurityException
```

这是 PowerShell Execution Policy 在拦截 **`npm.ps1`**，不是项目错误。

本说明统一使用：

```powershell
npm.cmd
```

无需修改 Windows 安全策略。

---

# 12. 检查 B 当前 TravelAssist 工作区

进入 B 自己当前 TravelAssist 仓库：

```powershell
git status
git branch --show-current
```

如果有任何：

```text
modified
untracked
ahead / behind
正在进行 UI / Planner 开发
```

不要切 DB 分支。
