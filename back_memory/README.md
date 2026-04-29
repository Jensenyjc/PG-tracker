# PG-Tracker 桌面版维护指南

> 本文档是 `pg-tracker-v2` Electron 桌面软件维护的总入口。每次做软件修复前，建议先阅读本文档和对应专项文档。
>
> 版本：v1.6 | 更新日期：2026-04-29

---

## 重要提示

```
┌────────────────────────────────────────────────────────────────────┐
│  当前目录只记录 pg-tracker-v2 桌面软件维护信息。                    │
│                                                                    │
│  每次开始修复前，请优先查看以下文档：                                │
│                                                                    │
│  1. 01_project_overview.md       - 项目详情与业务边界               │
│  2. 02_technical_details.md      - 技术细节、数据流、IPC 与打包      │
│  3. 03_project_progress.md       - 项目进展、风险清单、修复路线      │
│  4. 04_code_file_index.md        - 每个主要代码文件的功能索引        │
│  5. 05_change_records.md         - 每次阅读文件和代码修改记录        │
│                                                                    │
│  文档位置：D:\电脑屏幕文件\ai code\pg-tracker-v2\back_memory\        │
│  Web 迁移文档不作为当前软件修复依据。                                │
└────────────────────────────────────────────────────────────────────┘
```

---

## 一、项目概述

### 1.1 项目目标

PG-Tracker 桌面版用于本地管理保研申请流程，核心目标包括：

- 管理目标院校、申请层级、截止日期和政策标签。
- 管理导师信息、联系状态、研究方向和备注。
- 管理申请任务、日程提醒、院校相关材料和面经记录。
- 管理邮件模板与变量，快速生成联系导师邮件。
- 通过本地 SQLite 保存数据，优先保证桌面端稳定性和数据安全。

### 1.2 当前项目边界

| 项目 | 内容 |
|------|------|
| 当前形态 | Electron 桌面软件 |
| 当前重点 | 软件修复、数据安全、稳定性加固 |
| 非当前重点 | Web 版迁移、云端同步、多人协作 |
| 数据位置 | 本地 SQLite 数据库 |
| 主要通信方式 | Renderer -> Preload -> Electron IPC -> Prisma |

### 1.3 技术栈

| 层级 | 技术 |
|------|------|
| 桌面运行时 | Electron 33 |
| 构建工具 | electron-vite + Vite 5 |
| 前端框架 | React 18 + TypeScript |
| 状态管理 | Zustand |
| UI 基础 | Tailwind CSS + Radix UI + lucide-react |
| 数据库 | SQLite |
| ORM | Prisma 5 |
| 打包 | electron-builder |
| 目标平台 | Windows / macOS / Linux |

### 1.4 当前验证状态

| 验证项 | 状态 | 备注 |
|--------|------|------|
| TypeScript 构建 | 已通过 | `npx tsc -b` |
| 生产构建 | 已通过 | `npm run build` |
| 三平台打包 | 待复查 | 已有配置，但需要逐平台验证资源和 Prisma engine |
| 核心业务测试 | 待补充 | 当前没有系统化自动测试 |

---

## 二、文档导航

### 2.1 文档清单

| 文档 | 用途 | 何时查看 |
|------|------|----------|
| **01_project_overview.md** | 项目详情、业务模块、数据模型、当前边界 | 快速恢复项目背景 |
| **02_technical_details.md** | 技术架构、IPC、数据库初始化、数据流、打包细节 | 修改底层逻辑或排查技术问题 |
| **03_project_progress.md** | 当前进展、已知问题、风险等级、建议修复顺序 | 开始新一轮修复前 |
| **04_code_file_index.md** | 每个主要代码文件的职责和排查入口 | 不熟悉文件位置时 |
| **05_change_records.md** | 每次阅读文件、代码修改、验证命令和剩余风险记录 | 每次修改代码前后 |

### 2.2 文档内容概要

#### 01_project_overview.md（项目详情）

- 项目定位
- 功能模块
- 数据模型
- 运行构建命令
- 当前仓库状态
- 软件维护优先级

#### 02_technical_details.md（技术细节）

- Electron 三进程结构
- Zustand 状态管理
- IPC 接口清单
- 数据库初始化与升级风险
- 核心数据流
- 主题、样式、构建和打包

#### 03_project_progress.md（项目进展）

- 阶段进度总览
- 已实现能力
- 已知高风险和中风险问题
- 建议修复路线
- 每次修复后的验证清单

#### 04_code_file_index.md（代码文件功能索引）

- 根目录配置文件
- Electron main/preload
- Renderer 入口
- Store、lib、主题、布局、业务组件
- UI 基础组件
- 按问题定位入口

---

## 三、维护工作流

### 3.1 每次开始修复

```
1. 打开 03_project_progress.md，确认当前最高优先级问题。
2. 打开 04_code_file_index.md，定位相关文件。
3. 如涉及底层流程，再打开 02_technical_details.md。
4. 修复前先确认当前 git status，避免覆盖已有改动。
```

### 3.2 修复过程中

- 优先修复会导致数据丢失、白屏、构建失败、打包失败的问题。
- 对 Electron 桌面问题，先查 renderer 状态、IPC、Prisma 和本地路径，不按 Web 路由思路排查。
- 修改数据库、导入导出、打包逻辑前，先备份本地数据库。
- 涉及局部更新时，确认主进程 IPC 是否真的支持 patch 语义。
- 每次阅读关键文件、修改代码、运行验证命令后，都要追加记录到 `05_change_records.md`。
- 每次代码修改后，同步优化 `back_memory/` 中受影响的维护文档，避免文档落后于源码。

### 3.3 每次修复结束

```powershell
npx tsc -b
npm run build
git status --short
```

结束前还需要确认：

```powershell
git diff -- back_memory
```

如涉及打包，再按目标平台运行：

```powershell
npm run build:win
npm run build:mac-standalone
npm run build:linux-standalone
```

---

## 四、项目结构

### 4.1 整体结构

```
pg-tracker-v2/
├── electron/
│   ├── main/
│   │   └── index.ts              # 主进程、数据库、IPC、文件操作
│   └── preload/
│       └── index.ts              # contextBridge 暴露 window.api
│
├── src/
│   ├── components/
│   │   ├── features/             # Dashboard、Kanban、详情页、日程、设置
│   │   ├── layout/               # Sidebar
│   │   └── ui/                   # 本地 UI 基础组件
│   ├── lib/                      # constants、utils
│   ├── stores/                   # Zustand store
│   ├── App.tsx                   # 根组件和页面切换
│   └── main.tsx                  # React 入口
│
├── prisma/
│   └── schema.prisma             # SQLite 数据模型
│
├── back_memory/                  # 当前桌面版维护文档
├── electron-builder*.yml         # 三平台打包配置
├── electron.vite.config.ts       # electron-vite 配置
└── package.json                  # scripts 和依赖
```

### 4.2 容易混淆的目录

| 路径 | 说明 |
|------|------|
| `back_memory/` | 当前桌面软件维护文档 |
| `back-memory/` | 旧 Web 迁移方向文档或其他项目参考文档 |
| `out/` | electron-vite 构建产物 |
| `release/`、`dist-mac/`、`dist-linux/` | electron-builder 输出目录 |
| `prisma/dev.db` | 开发/种子 SQLite 数据库，打包首启依赖需要确认 |

---

## 五、关键决策记录

### 5.1 已确定决策

| 决策 | 当前结论 |
|------|----------|
| 当前维护对象 | `pg-tracker-v2` 桌面软件 |
| 当前数据方案 | 本地 SQLite + Prisma |
| 当前页面切换方式 | `src/App.tsx` 本地状态切换，不依赖 URL 路由 |
| 当前修复优先级 | 数据安全 > 业务正确性 > 稳定性安全 > 工程质量 |
| 当前文档目录 | `back_memory/` |
| 每次代码修改后的记录要求 | 追加 `05_change_records.md`，并更新相关 `back_memory` 文档 |

### 5.2 待确认决策

| 决策点 | 建议方向 |
|--------|----------|
| 生产数据库升级 | 已完成 EmailTemplate/EmailVariable 缺失场景的备份 + 非破坏性补表；后续 schema 变化继续补迁移脚本 |
| 数据备份恢复 | 新增完整 `backup:exportAll/importAll` IPC |
| IPC 类型 | 抽出共享 DTO，减少 `any` |
| 自动测试 | 先补核心 store/IPC 级测试 |
| 跨平台打包 | 逐平台验证图标、seed DB、Prisma engine |

---

## 六、风险提示

### 6.1 高风险

当前 P0-P1 业务风险已全部修复。

### 6.2 中风险

| 风险 | 影响 | 优先级 |
|------|------|--------|
| 打包资源不完整 | 安装包首启失败或图标缺失 | P2 |
| 缺少自动测试 | 回归风险高 | P2 |
| ~~缺少 ESLint/code quality 检查~~ | 已修复 | ~~P2~~ |
| ~~缺少自动测试~~ | 已修复 | ~~P2~~ |
| ~~外部链接打开策略未限制~~ | 已修复 | ~~P2~~ |

---

## 七、命令速查

### 7.1 开发命令

```powershell
npm run dev
npm run prisma:generate
```

### 7.2 构建命令

```powershell
npx tsc -b
npm run build
```

### 7.3 打包命令

```powershell
npm run build:win
npm run build:mac-standalone
npm run build:linux-standalone
```

### 7.4 状态检查

```powershell
git status --short --untracked-files=all
```

---

## 八、文档更新规范

### 8.1 什么时候更新文档

- 修复了高风险问题后，更新 `03_project_progress.md`。
- 修改了架构、IPC、数据库、打包流程后，更新 `02_technical_details.md`。
- 新增、删除或重命名代码文件后，更新 `04_code_file_index.md`。
- 项目目标、技术栈或维护边界变化后，更新 `01_project_overview.md` 和本 README。
- 任何代码修改完成后，都追加 `05_change_records.md`：记录阅读文件、关键发现、改动文件、改动说明、验证命令和剩余风险。

### 8.2 状态标记

| 标记 | 含义 |
|------|------|
| 已完成 | 已实现并完成基本验证 |
| 进行中 | 正在修复或验证 |
| 待开始 | 尚未处理 |
| 阻塞 | 需要额外信息或外部条件 |
| 风险 | 当前存在潜在 bug 或维护隐患 |

---

## 九、更新日志

| 日期 | 版本 | 内容 |
|------|------|------|
| 2026-04-29 | v1.0 | 创建桌面版维护文档：项目详情、技术细节、项目进展、代码文件索引 |
| 2026-04-29 | v1.1 | 按 `pg-tracker-web/back-memory` 的风格补充 README、目录、表格、工作流和风险格式 |
| 2026-04-29 | v1.2 | 增加每次代码修改后的 back_memory 维护和 `05_change_records.md` 记录要求 |
| 2026-04-29 | v1.5 | 完整备份导入导出 IPC、任务 dueDate 安全处理；P0-P1 业务风险全部修复 |
| 2026-04-29 | v1.6 | 新增 typecheck 脚本，修复 tsconfig.web.json outDir；阶段五完成，阶段六启动 |
| 2026-04-29 | v1.7 | 新增 ESLint 配置和 lint 脚本，0 error 通过 |
| 2026-04-29 | v1.8 | 新增 vitest，74 个测试覆盖 store/utils/patch-builder；阶段六完成 |
