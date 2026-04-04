# PG-Tracker

保研信息收集与决策分析系统

一款专为中国大学生设计的保研申请管理桌面应用，帮助你管理目标院校、导师信息和申请进度。

![License](https://img.shields.io/badge/license-MIT-green)
![Version](https://img.shields.io/badge/version-1.0.0-blue)
![Electron](https://img.shields.io/badge/Electron-33.2.0-47848F)
![React](https://img.shields.io/badge/React-18.3-61DAFB)

---

## 功能特性

| 功能 | 说明 |
|------|------|
| 🏫 院校管理 | 按冲/稳/保三分类组织学校信息 |
| 👨‍🏫 导师情报 | 追踪导师联系状态，防止海投冲突 |
| 📅 日程管理 | 截止日期倒计时和任务管理 |
| 📁 文档管理 | 绑定本地文件，一键打开 |
| 📧 邮件模板 | 常用邮件模板，变量替换 |
| 💾 本地存储 | SQLite 数据库，完全离线，保护隐私 |

---

## 下载安装

### Windows 便携版（推荐）

1. 进入 `release/win-unpacked/` 目录
2. 双击 `PG-Tracker.exe` 即可运行
3. 无需安装，直接使用

### 构建自己的版本

```bash
# 安装依赖
npm install

# 开发模式
npm run dev

# 构建 Windows 便携版
npx electron-builder --win portable

# 构建 Windows 目录版
npx electron-builder --win dir
```

---

## 项目结构

```
pg-tracker-v2/
├── electron/
│   ├── main/index.ts      # 主进程（Electron API、数据库操作）
│   └── preload/index.ts     # 预加载脚本（IPC 桥接）
├── prisma/
│   └── schema.prisma      # 数据库模型定义
├── src/
│   ├── components/       # React 组件
│   │   ├── features/      # 功能组件（看板、详情、模板等）
│   │   ├── layout/        # 布局组件
│   │   └── ui/           # UI 基础组件
│   ├── stores/            # Zustand 状态管理
│   ├── lib/               # 工具函数
│   └── App.tsx           # 主应用入口
├── release/              # 构建输出目录
│   └── win-unpacked/     # Windows 便携版
│       └── PG-Tracker.exe
└── package.json
```

---

## 技术栈

| 类别 | 技术 |
|------|------|
| 框架 | Electron 33.2 + React 18.3 + TypeScript |
| 构建 | electron-vite + electron-builder |
| UI | Tailwind CSS + Radix UI |
| 数据库 | SQLite + Prisma ORM |
| 状态管理 | Zustand |

---

## GitHub 发布指南

### 首次设置

1. **在 GitHub 创建新仓库** `pg-tracker`

2. **推送代码**：
```bash
git init
git add .
git commit -m "feat: PG-Tracker v1.0.0"
git remote add origin https://github.com/你的用户名/pg-tracker.git
git push -u origin main
```

3. **确保 GitHub Actions 有权限**：
   - 仓库 Settings → Actions → General
   - 选择 "Read and write permissions"

### 发布新版本

```bash
# 修改代码后
git add .
git commit -m "feat: 你的更新内容"
git push

# 创建版本标签
git tag v1.0.0
git push origin v1.0.0
```

GitHub Actions 会自动构建，完成后在 **Releases** 页面编辑并发布。

---

## 运行环境

- Node.js >= 18
- Windows 10/11 (64-bit)
- macOS / Linux (需单独构建)

---

## License

MIT
