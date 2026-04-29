# PG-Tracker 桌面版技术细节

> 本文档记录当前桌面软件的关键技术实现、进程结构、数据流、IPC 约定、数据库初始化、构建打包方式和维护注意事项。
>
> 版本：v1.4 | 更新日期：2026-04-29

---

## 目录

1. [系统架构](#一系统架构)
2. [状态管理](#二状态管理)
3. [IPC 接口](#三ipc-接口)
4. [数据库初始化](#四数据库初始化)
5. [核心数据流](#五核心数据流)
6. [样式和主题](#六样式和主题)
7. [构建与打包](#七构建与打包)
8. [验证命令](#八验证命令)
9. [维护注意事项](#九维护注意事项)

---

## 一、系统架构

### 1.1 整体架构图

```
┌──────────────────────────────────────────────────────────────┐
│                         Renderer                              │
│  React + TypeScript + Zustand + Tailwind                      │
│  src/App.tsx / src/components/features/*                      │
└───────────────────────────────┬──────────────────────────────┘
                                │ window.api
┌───────────────────────────────▼──────────────────────────────┐
│                          Preload                              │
│  electron/preload/index.ts                                    │
│  contextBridge.exposeInMainWorld                              │
└───────────────────────────────┬──────────────────────────────┘
                                │ ipcRenderer.invoke
┌───────────────────────────────▼──────────────────────────────┐
│                        Main Process                           │
│  electron/main/index.ts                                       │
│  BrowserWindow / IPC handlers / file system / Prisma Client   │
└───────────────────────────────┬──────────────────────────────┘
                                │ Prisma
┌───────────────────────────────▼──────────────────────────────┐
│                         SQLite                                │
│  prisma/dev.db 或 userData/dev.db                              │
└──────────────────────────────────────────────────────────────┘
```

### 1.2 主进程

入口：`electron/main/index.ts`

| 职责 | 说明 |
|------|------|
| 创建窗口 | 创建 Electron 主窗口，加载 dev server 或构建后的 renderer |
| 初始化数据库 | 判断开发/生产环境数据库路径 |
| 加载 Prisma | 动态加载 Prisma Client 和 query engine |
| 注册 IPC | 注册院校、导师、任务、文件、邮件模板等 handler |
| 文件能力 | 文件选择、打开本地文件、LaTeX 编译 |
| 生命周期 | 应用退出时断开 Prisma 连接 |

主窗口安全配置：

| 配置 | 当前值 | 说明 |
|------|--------|------|
| `contextIsolation` | `true` | 正确，renderer 与 preload 隔离 |
| `nodeIntegration` | `false` | 正确，renderer 不直接使用 Node |
| `sandbox` | `false` | 后续可评估开启 |
| `preload` | `electron/preload/index.ts` | 暴露受控 API |

### 1.3 Preload

入口：`electron/preload/index.ts`

职责：

- 通过 `contextBridge.exposeInMainWorld` 暴露 `window.electron`。
- 暴露 `window.api`，将 renderer 的业务调用映射为 `ipcRenderer.invoke(...)`。
- 隔离 renderer 和 Node/Electron 原生能力。

当前技术债：

| 问题 | 建议 |
|------|------|
| 大量参数类型是 `any` | 抽出共享 DTO 类型 |
| preload 和 `src/env.d.ts` 易不同步 | 统一生成或共享接口定义 |
| 缺少运行时校验 | 对 IPC 入参加 zod 或手写校验 |

### 1.4 渲染进程

入口：`src/main.tsx`

根组件：`src/App.tsx`

职责：

- 挂载 React 应用。
- 引入全局样式 `src/index.css`。
- 初始化加载院校数据。
- 根据 `currentView` 和 `selectedInstitutionId` 渲染当前页面。
- 使用本地状态切换详情页，不依赖浏览器 URL 路由。

---

## 二、状态管理

### 2.1 Store 文件

位置：`src/stores/appStore.ts`

### 2.2 核心状态

| 状态 | 说明 |
|------|------|
| `currentView` | 当前页面：Dashboard、Kanban、Timeline、EmailTemplates、Settings |
| `selectedInstitutionId` | 当前选中的院校 ID |
| `institutions` | 院校主数据源，包含导师和任务 |
| `orphanTasks` | 独立任务 |
| `emailTemplates` | 邮件模板列表 |
| `isLoading` | 加载状态 |
| `error` | 全局错误 |
| `conflictWarnings` | 导师联系冲突提示 |

### 2.3 主要 Action

| 分类 | Action |
|------|--------|
| 院校 | `loadInstitutions`、`addInstitution`、`updateInstitution`、`deleteInstitution` |
| 导师 | `addAdvisor`、`updateAdvisor`、`deleteAdvisor` |
| 任务 | `loadOrphanTasks`、`addTask`、`updateTask`、`deleteTask` |
| 文件 | `addAsset`、`deleteAsset` |
| 面经 | `addInterview`、`updateInterview`、`deleteInterview` |
| 邮件模板 | `loadEmailTemplates`、`createEmailTemplate`、`updateEmailTemplate`、`deleteEmailTemplate` |
| 邮件变量 | `createEmailVariable`、`deleteEmailVariable` |

### 2.4 当前注意事项

| 问题 | 影响 | 建议 |
|------|------|------|
| `institution:getAll` 深层 include 已包含 assets/interviews | 已修复 | 已修改为 `advisors: { include: { assets: true, interviews: true } }` |
| `addAsset` 成功后没有统一刷新详情数据 | 已修复 | 成功后调用 `loadInstitutions()` |
| `addInterview` 成功后没有统一刷新详情数据 | 已修复 | 成功后调用 `loadInstitutions()` |
| 部分组件直接调用 `window.api` | 状态刷新容易不一致 | 统一收敛到 store action |

---

## 三、IPC 接口

主进程注册位置：`electron/main/index.ts`

### 3.1 Institution

| 接口 | 用途 | 风险 |
|------|------|------|
| `institution:getAll` | 获取院校列表 | 已修复：深层 include advisors.assets 和 advisors.interviews |
| `institution:getById` | 获取单个院校详情 | renderer 未稳定使用 |
| `institution:create` | 创建院校 | 需要校验必填字段 |
| `institution:update` | 更新院校 | 已改为 patch 语义，只更新明确传入字段 |
| `institution:delete` | 删除院校 | 需要确认级联删除符合预期 |

重点风险：

- `Timeline.tsx` 只传一个 deadline 字段更新院校。
- 主进程已改为只写入明确传入的字段。
- 日程页只更新一个截止日期时，不再清空院校名称、院系、层级、标签等其他字段。

### 3.2 Advisor

| 接口 | 用途 | 风险 |
|------|------|------|
| `advisor:getByInstitution` | 获取院校导师 | 与 store 数据源可能重复 |
| `advisor:create` | 创建导师 | 当前未写入 `lastContactDate` |
| `advisor:update` | 更新导师 | 已改为 patch 语义，只更新明确传入字段 |
| `advisor:delete` | 删除导师 | 需要确认 assets/interviews 级联 |
| `advisor:getConflictWarnings` | 获取联系冲突 | 用于同院校多导师已发送提示 |

重点风险：

- 详情页切换导师状态只传 `{ contactStatus }`。
- 主进程已改为 patch 语义，切换 `contactStatus` 不再清空姓名、邮箱、研究方向等字段。

### 3.3 Task

| 接口 | 用途 | 风险 |
|------|------|------|
| `task:getByInstitution` | 获取院校任务 | 与 institution include 数据可能重复 |
| `task:getOrphan` | 获取独立任务 | 日程页使用 |
| `task:create` | 创建任务 | 当前忽略传入的 `isCompleted` |
| `task:update` | 更新任务 | 已修复：`dueDate` 为 null/空时跳过字段 |
| `task:delete` | 删除任务 | 需要刷新对应页面 |

当前特点：

- `task:update` 已经接近局部更新语义。
- 返回值通常是 `{ success, data, error }`。

### 3.4 Asset

| 接口 | 用途 | 风险 |
|------|------|------|
| `asset:create` | 保存导师材料文件记录 | 只保存路径，不复制文件 |
| `asset:delete` | 删除材料记录 | 需要刷新详情页 |

维护建议：

- 如果希望备份完整可靠，后续应考虑复制文件到应用数据目录。
- 当前只保存原始本地路径，文件被移动后记录会失效。

### 3.5 Interview

| 接口 | 用途 | 风险 |
|------|------|------|
| `interview:create` | 新增面经 | 新增后 store 不一定刷新 |
| `interview:update` | 更新面经 | 需要校验日期 |
| `interview:delete` | 删除面经 | 需要刷新详情页 |

### 3.6 File

| 接口 | 用途 | 风险 |
|------|------|------|
| `file:selectFile` | 打开系统文件选择器 | 需要限制文件类型时可扩展 |
| `file:openExternal` | 打开本地文件路径 | 命名容易误解，实际是 `shell.openPath` |
| `file:compileLatex` | 编译 `.tex` 文件 | 路径解析和命令注入风险 |

重点风险：

- LaTeX 编译已改用 `spawn` + `path.dirname()`，不再使用 `exec` 拼接 shell 命令。
- 路径解析已使用 `path.dirname()` 替代手动字符串处理。

### 3.8 Backup

| 接口 | 用途 | 风险 |
|------|------|------|
| `backup:exportAll` | 导出全部数据（institutions、advisors、tasks、assets、interviews、emailTemplates、emailVariables） | 不含文件内容复制，只存路径 |
| `backup:importAll` | 在一个事务中导入全部数据，保持关系完整性 | 导入前建议先备份当前数据库 |

### 3.7 Email

| 接口 | 用途 | 风险 |
|------|------|------|
| `emailTemplate:getAll` | 获取模板及变量 | 启动时会做默认模板初始化 |
| `emailTemplate:create` | 创建模板 | 需要校验 name 唯一性 |
| `emailTemplate:update` | 更新模板 | 需要同步变量识别 |
| `emailTemplate:delete` | 删除模板 | 需要同步变量删除 |
| `emailVariable:getByTemplate` | 获取变量 | 与模板 include 数据可能重复 |
| `emailVariable:create` | 创建变量 | 需要避免重复 |
| `emailVariable:delete` | 删除变量 | 需要刷新模板状态 |

---

## 四、数据库初始化

### 4.1 数据库路径

逻辑位置：`electron/main/index.ts`

| 环境 | 路径 |
|------|------|
| 开发环境 | `prisma/dev.db` |
| 生产环境 | `app.getPath('userData')/dev.db` |

### 4.2 生产首次启动

流程：

```
1. 检查 userData 下是否存在 dev.db。
2. 如果不存在，从 process.resourcesPath/prisma/dev.db 复制。
3. 初始化 Prisma Client。
4. 通过 IPC 为 renderer 提供数据。
```

### 4.3 生产升级风险

当前逻辑：

- 首次启动时，如果 userData 下没有 `dev.db`，仍从 `resources/prisma/dev.db` 复制初始数据库。
- 覆盖安装或旧数据库启动时，检测 `EmailTemplate` 和 `EmailVariable` 表是否存在。
- 如果缺少邮件模板相关表，先将 `dev.db`、`dev.db-wal`、`dev.db-shm` 复制到 `userData/backups/`，再用 SQL 补齐缺失表。
- 不再删除或替换已有用户数据库。

风险：

| 风险 | 影响 |
|------|------|
| 覆盖用户真实数据库 | 已修复：不再删除旧库并复制 seed DB |
| schema 检测过于粗糙 | 已缓解：当前只针对缺失邮件表做非破坏性迁移 |
| 无升级前备份 | 已修复：迁移前复制数据库和 WAL/SHM 到 `backups/` |

建议升级策略：

```
1. 启动前复制 userData/dev.db 为带时间戳的备份。
2. 检测缺失表或字段。
3. 使用 SQL migration 或 Prisma migrate 执行迁移。
4. 迁移完成后再初始化默认邮件模板。
5. 失败时保留原数据库和错误日志。
```

---

## 五、核心数据流

### 5.1 启动加载

```
App.tsx
  -> loadInstitutions()
  -> appStore.ts
  -> window.api.institution.getAll()
  -> ipcMain.handle('institution:getAll')
  -> Prisma Institution.findMany({ include: { advisors: true, tasks: true } })
  -> renderer 渲染 Dashboard / Kanban / Timeline / InstitutionDetail
```

注意：

- 当前 `getAll` 已深层 include `advisors`、`tasks`、`assets` 和 `interviews`。
- 详情页直接从 store 的 `institutions` 读取即可获得完整数据。

### 5.2 进入院校详情

```
InstitutionCard 点击
  -> onSelectInstitution(id)
  -> App.tsx 设置 selectedInstitutionId
  -> App.tsx 渲染 InstitutionDetail
  -> InstitutionDetail 从 store.institutions 查找院校
```

排查提示：

- 点击院校后白屏，优先查 `InstitutionDetail.tsx` 的渲染、hook 顺序、日期格式化和空数据处理。
- 不要先按 Web 路由或部署问题排查。

### 5.3 日程更新院校截止日期

```
Timeline.tsx
  -> updateInstitution(newInstitutionId, { [field]: new Date(newDate) })
  -> window.api.institution.update(id, data)
  -> ipcMain.handle('institution:update')
  -> Prisma Institution.update(...)
```

当前问题：

- renderer 传的是 patch。
- main handler 当前更像 full update。
- 需要统一为 patch 语义。

### 5.4 邮件模板初始化

```
EmailTemplates.tsx
  -> loadEmailTemplates()
  -> 如果数据库无模板，创建默认模板和变量
  -> 应用启动主进程也会按 name 去重默认模板
```

维护建议：

- 默认模板初始化逻辑应集中，避免 renderer 和 main 重复承担。
- 邮件变量填充值进入预览前必须转义。

---

## 六、样式和主题

### 6.1 全局样式

位置：`src/index.css`

内容：

- Tailwind base/components/utilities。
- 浅色和深色主题 CSS 变量。
- 多颜色主题变量。
- 滚动条样式。

### 6.2 主题组件

| 文件 | 说明 |
|------|------|
| `src/components/ThemeProvider.tsx` | 使用 `next-themes` 控制浅色、深色、跟随系统 |
| `src/components/ColorThemeContext.tsx` | 自定义颜色主题，读取/保存 localStorage，通过 `data-theme` 切换变量 |

### 6.3 UI 组件

位置：`src/components/ui/*`

特点：

- 本地封装组件。
- 风格接近 shadcn/ui。
- 基于 Radix UI 和 Tailwind CSS。

---

## 七、构建与打包

### 7.1 构建入口

配置文件：`electron.vite.config.ts`

输出目录：

| 目标 | 输出 |
|------|------|
| main | `out/main` |
| preload | `out/preload` |
| renderer | `out/renderer` |

### 7.2 electron-builder 配置

| 平台 | 配置文件 | 输出 |
|------|----------|------|
| Windows | `electron-builder.yml` | NSIS 安装包 |
| macOS | `electron-builder-mac.yml` | dmg / zip |
| Linux | `electron-builder-linux.yml` | AppImage / deb |

### 7.3 Prisma 打包资源

当前配置关注：

- 复制 `prisma` 目录到 resources。
- 复制 `node_modules/.prisma/client`。
- 复制 `node_modules/@prisma/engines`。
- `asarUnpack` 包含 `*.node`、Prisma client 和 engines。

风险：

| 风险 | 说明 |
|------|------|
| seed DB 缺失 | `.gitignore` 忽略 `prisma/dev.db`，打包时需要确认实际存在 |
| Linux 图标路径 | `electron-builder-linux.yml` 引用 `resources/icon.png`，当前需要确认文件存在 |
| OpenSSL 差异 | Linux Prisma binaryTargets 需要覆盖目标发行版 |

---

## 八、验证命令

### 8.1 通用验证

```powershell
npx tsc -b
npm run build
git status --short
```

### 8.2 打包验证

```powershell
npm run build:win
npm run build:mac-standalone
npm run build:linux-standalone
```

### 8.3 涉及数据库时

修复数据库、导入导出、升级策略前建议：

```
1. 复制 prisma/dev.db 或 userData/dev.db 作为备份。
2. 用旧数据启动应用。
3. 执行迁移或导入导出。
4. 验证院校、导师、任务、文件、面经、邮件模板仍存在。
```

---

## 九、维护注意事项

### 9.1 高优先级技术债

| 技术债 | 建议处理 |
|--------|----------|
| 数据库升级覆盖风险 | 已改为备份 + 非破坏性补表；后续 schema 变更仍需继续补 migration |
| 院校和导师更新语义不一致 | 已改为 patch update |
| 详情页数据源不完整 | 已修复：深层 include assets/interviews |
| 导入导出不完整 | 已修复：新增 `backup:exportAll`/`backup:importAll` IPC |
| 日期格式化分散 | 已统一为 `parseValidDate`/`formatDateSafe` helper |

### 9.2 中优先级技术债

| 技术债 | 建议处理 |
|--------|----------|
| 邮件预览 XSS | 已修复：填充值统一 HTML escape |
| LaTeX shell 拼接 | 已修复：使用 `spawn` + `path.dirname()` |
| IPC 类型松散 | 共享 DTO + 运行时校验 |
| 缺少测试 | 先覆盖 store 和关键 IPC |

### 9.3 修复原则

- 先保数据安全，再改体验和工程质量。
- 主进程 handler 必须明确 full update 与 patch update 的边界。
- 涉及 Electron 桌面能力时，优先检查本地路径、Prisma engine、userData、resources。
- 修复后至少跑 TypeScript 构建和生产构建。
