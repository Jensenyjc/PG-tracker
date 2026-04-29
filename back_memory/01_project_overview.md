# PG-Tracker 桌面版项目详情

> 本文档记录 `pg-tracker-v2` 桌面软件的项目定位、功能模块、数据模型和当前维护边界。
>
> 版本：v1.3 | 更新日期：2026-04-29

---

## 目录

1. [项目定位](#一项目定位)
2. [技术栈](#二技术栈)
3. [功能模块](#三功能模块)
4. [数据模型](#四数据模型)
5. [运行和构建](#五运行和构建)
6. [当前仓库状态](#六当前仓库状态)
7. [维护优先级](#七维护优先级)

---

## 一、项目定位

### 1.1 项目目标

PG-Tracker 是一个面向保研申请流程的本地桌面管理软件。核心目标是帮助用户集中管理：

- 目标院校和申请层级。
- 导师联系信息和联系状态。
- 申请任务、截止日期和时间线。
- 本地材料文件、面经记录和导师相关资料。
- 邮件模板、变量填充和最终邮件内容。

### 1.2 当前产品形态

| 项目 | 内容 |
|------|------|
| 产品形态 | Electron 桌面软件 |
| 数据存储 | 本地 SQLite |
| 数据访问 | Electron 主进程通过 Prisma 访问 |
| 前端通信 | Renderer 通过 preload 暴露的 `window.api` 调用 IPC |
| 页面切换 | `src/App.tsx` 使用本地状态控制 |
| 当前重点 | 软件修复、稳定性、数据安全、打包可靠性 |

### 1.3 非当前重点

| 内容 | 说明 |
|------|------|
| Web 迁移 | 不作为当前软件修复主线 |
| 多用户协作 | 当前没有账号系统 |
| 云端同步 | 当前数据以本地 SQLite 为主 |
| 浏览器路由 | 当前详情页不是 URL 路由 |

---

## 二、技术栈

### 2.1 核心技术

| 层级 | 技术 | 说明 |
|------|------|------|
| 桌面运行时 | Electron 33 | 主窗口、系统能力、IPC |
| 构建工具 | electron-vite + Vite 5 | main/preload/renderer 分别构建 |
| 前端框架 | React 18 + TypeScript | Renderer UI |
| 状态管理 | Zustand | 全局业务状态和 CRUD action |
| UI 基础 | Tailwind CSS + Radix UI | shadcn 风格本地组件 |
| 图标 | lucide-react | 业务图标和按钮图标 |
| 数据库 | SQLite | 本地数据 |
| ORM | Prisma 5 | 数据模型和查询 |
| 打包 | electron-builder | Windows/macOS/Linux 安装包 |

### 2.2 目标平台

| 平台 | 当前配置 | 待确认点 |
|------|----------|----------|
| Windows | `electron-builder.yml` | NSIS 安装、Prisma engine、seed DB |
| macOS | `electron-builder-mac.yml` | x64/arm64、dmg/zip、签名策略 |
| Linux | `electron-builder-linux.yml` | AppImage/deb、图标路径、OpenSSL 版本 |

---

## 三、功能模块

### 3.1 模块总览

| 模块 | 入口文件 | 主要功能 |
|------|----------|----------|
| 总览 | `src/components/features/Dashboard.tsx` | 统计院校、导师、任务、截止日期和完成率 |
| 院校看板 | `src/components/features/KanbanBoard.tsx` | 按冲/稳/保展示院校，支持新增和编辑 |
| 院校详情 | `src/components/features/InstitutionDetail.tsx` | 管理导师、任务、文件、面经和院校详情 |
| 日程 | `src/components/features/Timeline.tsx` | 聚合院校截止日期、院校任务和独立任务 |
| 邮件模板 | `src/components/features/EmailTemplates.tsx` | 管理模板、变量、预览和最终邮件内容 |
| 设置 | `src/components/features/Settings.tsx` | 主题、颜色、导入导出、清空数据、联系信息 |

### 3.2 总览模块

入口组件：`src/components/features/Dashboard.tsx`

展示内容：

- 院校数量、导师数量、待办任务数量。
- 任务完成率。
- 近期院校截止日期。
- 待办任务列表。
- 冲/稳/保三个申请层级概览。

### 3.3 院校看板模块

入口组件：`src/components/features/KanbanBoard.tsx`

主要能力：

- 按 `REACH`、`MATCH`、`SAFETY` 三类展示院校。
- 新增院校。
- 编辑院校。
- 点击院校卡片进入详情页。

### 3.4 院校详情模块

入口组件：`src/components/features/InstitutionDetail.tsx`

主要能力：

- 展示院校基本信息。
- 展示和管理导师列表。
- 展示和管理院校关联任务。
- 新增面经。
- 绑定本地材料文件。
- 修改导师联系状态。
- 删除院校。

注意：详情页不是 URL 路由进入，而是 `src/App.tsx` 用 `selectedInstitutionId` 做本地状态切换。

### 3.5 日程模块

入口组件：`src/components/features/Timeline.tsx`

主要能力：

- 汇总夏令营截止、预推免截止、院校关联任务和独立任务。
- 按已过期、今天、明天、本周、即将到来分组。
- 独立任务支持完成、编辑、删除。
- 院校截止日期可在日程页编辑。

### 3.6 邮件模板模块

入口组件：`src/components/features/EmailTemplates.tsx`

主要能力：

- 默认模板初始化。
- 模板新增、编辑、删除。
- 变量识别、变量插入和变量填充。
- 实时预览。
- 一键复制最终邮件内容。

### 3.7 设置模块

入口组件：`src/components/features/Settings.tsx`

主要能力：

- 浅色、深色、跟随系统主题。
- 多套颜色主题。
- JSON 数据导出和导入。
- 清空数据双重确认。
- 联系信息展示。

---

## 四、数据模型

### 4.1 Prisma Schema

位置：`prisma/schema.prisma`

| 模型 | 说明 | 关键关系 |
|------|------|----------|
| `Institution` | 院校基础信息、申请层级、截止日期、名额、政策标签 | 拥有 advisors、tasks |
| `Advisor` | 导师信息、邮箱、主页、联系状态、评分、备注 | 属于 institution，拥有 assets、interviews |
| `Task` | 申请任务，可关联院校或独立存在 | 可选关联 institution |
| `Asset` | 导师相关本地文件路径 | 属于 advisor |
| `Interview` | 面经记录，包含日期、形式和 Markdown 笔记 | 属于 advisor |
| `EmailTemplate` | 邮件模板 | 拥有 variables |
| `EmailVariable` | 邮件变量定义 | 属于 template |

### 4.2 数据存储策略

| 环境 | 数据库位置 | 说明 |
|------|------------|------|
| 开发环境 | `prisma/dev.db` | 本地开发数据库 |
| 生产环境 | `app.getPath('userData')/dev.db` | 用户真实数据 |
| 首次启动 | 从 resources 中复制 `prisma/dev.db` | 当前依赖打包资源存在 |
| 升级场景 | 当前存在删除并复制 seed DB 的风险 | 需要改为迁移策略 |

---

## 五、运行和构建

### 5.1 常用命令

```powershell
npm run dev
npm run prisma:generate
npx tsc -b
npm run build
```

### 5.2 打包命令

```powershell
npm run build:win
npm run build:mac-standalone
npm run build:linux-standalone
```

### 5.3 当前已验证

| 命令 | 状态 | 备注 |
|------|------|------|
| `npx tsc -b` | 已通过 | 会生成临时 `.jsx/.js/.d.ts` 和 `tsbuildinfo` 文件 |
| `npm run build` | 已通过 | electron-vite 构建通过 |

---

## 六、当前仓库状态

### 6.1 文档目录

| 目录 | 说明 |
|------|------|
| `back_memory/` | 当前桌面软件维护文档 |
| `back-memory/` | Web 迁移或其他参考文档，不作为当前软件修复主依据 |

### 6.2 当前注意事项

| 事项 | 说明 |
|------|------|
| `npx tsc -b` 临时产物 | 验证后需要清理，或后续调整 typecheck 配置 |
| `prisma/dev.db` | 被 `.gitignore` 忽略，但打包首启可能依赖 |
| `resources/icon.png` | Linux 打包配置引用该路径，当前需要确认是否存在 |
| 业务源码 | 本轮文档整理不修改业务源码 |

---

## 七、维护优先级

### 7.1 高优先级

| 优先级 | 事项 | 原因 |
|--------|------|------|
| P0 | 生产数据库升级策略 | 已修复：备份 + 非破坏性补表 |
| P0 | `institution:update` 局部更新 | 已修复：patch 语义 |
| P0 | `advisor:update` 局部更新 | 已修复：patch 语义 |
| P1 | 资产和面经加载刷新 | 已修复：深层 include + 新增刷新 |
| P1 | 完整导入导出 | 已修复：backup:exportAll/importAll IPC |

### 7.2 中优先级

| 优先级 | 事项 | 原因 |
|--------|------|------|
| P1 | 邮件预览变量转义 | 已修复：htmlEscape 转义 |
| P1 | LaTeX 编译改造 | 已修复：spawn + path.dirname |
| P1 | 统一安全日期格式化 | 已修复：parseValidDate/formatDateSafe |
| P2 | IPC 入参类型和校验 | 降低主进程异常和数据污染风险 |

### 7.3 低优先级

| 优先级 | 事项 | 原因 |
|--------|------|------|
| P2 | 增加 lint/test 脚本 | 提升长期维护质量 |
| P2 | 补核心自动测试 | 降低回归风险 |
| P3 | 统一版本号来源 | 避免页面显示版本不一致 |
