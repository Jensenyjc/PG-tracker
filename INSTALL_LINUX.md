# 🐧 PG-Tracker Linux 使用指南

本项目为 Linux 用户提供了 `.AppImage` 和 `.deb` 两种格式。

### 方法 1：使用 .AppImage (推荐，免安装)

`.AppImage` 是一种便携式应用格式，下载后只需赋予执行权限即可运行，无需安装。

1. 下载 `PG-Tracker-2.2.1-linux-x64.AppImage` 文件。
2. 在终端中进入文件所在目录。
3. 赋予执行权限（或通过文件管理器右键 → 属性 → 权限 → 勾选"允许作为程序执行文件"）：

   `chmod +x PG-Tracker-2.2.1-linux-x64.AppImage`

4. 双击该文件，或在终端中运行：

   `./PG-Tracker-2.2.1-linux-x64.AppImage`

### 方法 2：使用 .deb 安装包 (仅限 Ubuntu/Debian 系)

1. 下载 `.deb` 安装包。
2. 双击通过系统软件中心安装，或在终端中执行：

   `sudo dpkg -i PG-Tracker-2.2.1-linux-x64.deb`
   `sudo apt-get install -f` (用于修复可能的依赖问题)
