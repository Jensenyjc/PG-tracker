# PG-Tracker 桌面版代码文件功能索引

> 本文档按文件列出当前桌面软件主要代码与配置文件的作用，方便后续快速定位问题。
>
> 版本：v1.5 | 更新日期：2026-04-29

---

## 目录

1. [根目录配置](#一根目录配置)
2. [GitHub Actions](#二github-actions)
3. [Prisma](#三prisma)
4. [Electron 主进程与 Preload](#四electron-主进程与-preload)
5. [Renderer 入口](#五renderer-入口)
6. [Store](#六store)
7. [公共库](#七公共库)
8. [主题组件](#八主题组件)
9. [布局组件](#九布局组件)
10. [业务组件](#十业务组件)
11. [UI 基础组件](#十一ui-基础组件)
12. [静态资源和文档目录](#十二静态资源和文档目录)
13. [按问题定位入口](#十三按问题定位入口)

---

## 一、根目录配置

### 1.1 项目配置文件

| 文件 | 主要功能 | 维护注意 |
|------|----------|----------|
| `package.json` | 项目元数据、依赖和 npm scripts | 可补 `typecheck`、`lint`、`test` scripts |
| `package-lock.json` | npm 锁定文件，固定依赖解析结果 | 依赖升级后同步更新 |
| `index.html` | renderer 入口 HTML，挂载 React 根节点 | 一般少改 |
| `electron.vite.config.ts` | main、preload、renderer 构建入口和外部依赖配置 | 修改构建入口或外部依赖时查看 |
| `tsconfig.json` | TypeScript 根配置，引用 node 和 web 两个子项目 | 当前 `tsc -b` 会产生临时产物 |
| `tsconfig.node.json` | Electron main/preload 侧 TS 配置 | 主进程类型问题时查看 |
| `tsconfig.web.json` | Renderer/React 侧 TS 配置 | 前端类型问题时查看 |
| `tailwind.config.js` | Tailwind 扫描路径、主题、插件 | 新增组件目录时确认 content |
| `postcss.config.js` | PostCSS 配置，接入 Tailwind 和 autoprefixer | 一般少改 |

### 1.2 打包配置文件

| 文件 | 主要功能 | 维护注意 |
|------|----------|----------|
| `electron-builder.yml` | Windows 打包配置，包含 resources、Prisma extraResources、NSIS | 检查 seed DB 和 Prisma engine |
| `electron-builder-mac.yml` | macOS 打包配置，输出 dmg/zip，包含 x64/arm64 | 后续可能涉及签名和 notarize |
| `electron-builder-linux.yml` | Linux 打包配置，输出 AppImage/deb | 当前 icon 路径需确认 |

---

## 二、GitHub Actions

| 文件 | 主要功能 | 维护注意 |
|------|----------|----------|
| `.github/workflows/release.yml` | tag 推送时触发 Windows、macOS、Linux 构建并上传 Release | 修改打包脚本或资源后需要同步检查 |

---

## 三、Prisma

| 文件 | 主要功能 | 维护注意 |
|------|----------|----------|
| `prisma/schema.prisma` | 定义 SQLite 数据模型和 Prisma Client 生成配置 | 改 schema 前先设计迁移策略 |
| `prisma/dev.db` | 开发/种子 SQLite 数据库 | 当前可能被 `.gitignore` 忽略，打包首启需确认 |

### 3.1 主要模型

| 模型 | 说明 |
|------|------|
| `Institution` | 院校基础信息、申请层级、学位类型、截止日期、招生名额、政策标签 |
| `Advisor` | 导师信息、研究方向、邮箱、主页、联系状态、声誉评分、备注 |
| `Task` | 申请任务，可关联院校，也可作为独立任务 |
| `Asset` | 导师相关本地文件路径 |
| `Interview` | 导师面经记录 |
| `EmailTemplate` | 邮件模板 |
| `EmailVariable` | 邮件模板变量 |

---

## 四、Electron 主进程与 Preload

| 文件 | 主要功能 | 维护注意 |
|------|----------|----------|
| `electron/main/index.ts` | 主进程入口；创建窗口、初始化数据库、加载 Prisma、注册 IPC、处理文件操作和应用生命周期 | 数据安全、IPC、打包问题优先查这里 |
| `electron/preload/index.ts` | preload 脚本；通过 contextBridge 暴露 `window.electron` 和 `window.api` | 需要与 `src/env.d.ts` 保持一致 |

### 4.1 主进程重点区域

| 区域 | 说明 |
|------|------|
| 窗口创建 | BrowserWindow 配置、preload 路径、安全设置 |
| 数据库初始化 | 开发/生产 DB 路径、Prisma Client、query engine、生产库备份和非破坏性迁移 |
| Institution IPC | 院校 CRUD，`institution:update` 已按 patch 语义更新 |
| Advisor IPC | 导师 CRUD，`advisor:update` 已按 patch 语义更新 |
| Task IPC | 任务 CRUD，独立任务和院校任务共用 |
| Asset/Interview IPC | 文件记录和面经记录 |
| File IPC | 文件选择、打开、LaTeX 编译 |
| Email IPC | 邮件模板和变量 |

---

## 五、Renderer 入口

| 文件 | 主要功能 | 维护注意 |
|------|----------|----------|
| `src/main.tsx` | React 渲染入口，将 `App` 挂载到 DOM | 一般少改 |
| `src/App.tsx` | 根组件；加载院校数据，管理当前视图和选中院校，渲染 Sidebar 与页面内容 | 详情页不是 URL 路由，白屏时优先查这里和详情页 |
| `src/index.css` | 全局样式、Tailwind 层、主题变量、滚动条样式 | 主题或视觉问题时查看 |
| `src/env.d.ts` | 全局类型声明；声明 `window.electron` 和 `window.api` 接口 | IPC 类型调整时同步更新 |
| `src/assets.d.ts` | 图片资源模块声明，支持 jpg、jpeg、png 导入 | 新增资源类型时扩展 |

---

## 六、Store

| 文件 | 主要功能 | 维护注意 |
|------|----------|----------|
| `src/stores/appStore.ts` | Zustand 全局状态；保存当前视图、院校、独立任务、邮件模板、错误状态，并封装大部分业务 CRUD 调用 | 数据刷新、状态不同步、局部更新问题优先查 |

### 6.1 Store 维护重点

| 重点 | 说明 |
|------|------|
| `institutions` | 多个页面共用的数据源 |
| `orphanTasks` | Timeline 独立任务来源 |
| `emailTemplates` | 邮件模板页数据源 |
| `loadInstitutions` | 当前依赖 `institution:getAll` |
| `updateInstitution` | 调用主进程更新院校，需配合 patch 语义 |
| `updateAdvisor` | 调用主进程更新导师，需配合 patch 语义 |
| `addAsset/addInterview` | 当前成功后刷新策略需要加强 |

---

## 七、公共库

| 文件 | 主要功能 | 维护注意 |
|------|----------|----------|
| `src/lib/constants.ts` | 业务常量；申请层级、学位类型、导师联系状态、面试形式、资产类型及样式配置 | 状态样式或枚举变化时同步 |
| `src/lib/utils.ts` | 通用工具；className 合并、policyTags JSON 解析/序列化、安全日期解析/格式化（`parseValidDate`/`formatDateSafe`）、截止日计算、邮箱和 URL 校验 | 日期相关统一使用此处 helper |
| `src/lib/useAppVersion.ts` | Renderer 侧读取 Electron 应用版本号的 Hook | 版本号展示问题或新增关于页版本信息时同步使用 |

---

## 八、主题组件

| 文件 | 主要功能 | 维护注意 |
|------|----------|----------|
| `src/components/ThemeProvider.tsx` | 封装 `next-themes`，提供浅色、深色、跟随系统主题能力 | 主题模式问题时查看 |
| `src/components/ColorThemeContext.tsx` | 自定义颜色主题上下文；读取/保存 localStorage，并通过 `data-theme` 切换颜色变量 | 颜色主题问题时查看 |

---

## 九、布局组件

| 文件 | 主要功能 | 维护注意 |
|------|----------|----------|
| `src/components/layout/Sidebar.tsx` | 左侧导航栏；提供总览、院校看板、日程、邮件模板、设置五个入口 | 页面入口、版本号显示、导航状态问题时查看 |

---

## 十、业务组件

### 10.1 核心页面

| 文件 | 主要功能 | 维护注意 |
|------|----------|----------|
| `src/components/features/Dashboard.tsx` | 总览仪表板；展示院校、导师、任务统计，近期截止日期，待办任务和三分类院校速览 | 日期格式化风险仍需统一 |
| `src/components/features/KanbanBoard.tsx` | 院校看板；按冲/稳/保展示院校，提供新增和编辑院校入口 | 院校状态和表单联动问题时查看 |
| `src/components/features/InstitutionDetail.tsx` | 院校详情页；展示基本信息、导师、任务、文件、面经，并支持编辑、删除、状态切换 | 点击院校白屏、资产/面经不显示优先查 |
| `src/components/features/Timeline.tsx` | 日程页面；聚合院校截止日期、院校任务和独立任务，支持编辑删除 | 院校局部更新风险来自这里 |
| `src/components/features/EmailTemplates.tsx` | 邮件模板页面；管理模板、变量、实时预览、变量填充和最终邮件复制 | 变量填充值 XSS 风险 |
| `src/components/features/Settings.tsx` | 设置页面；管理主题、颜色主题、完整数据导入导出、清空数据和联系信息 | 导入导出已改为完整 backup IPC |

### 10.2 表单与卡片

| 文件 | 主要功能 | 维护注意 |
|------|----------|----------|
| `src/components/features/InstitutionCard.tsx` | 院校卡片；展示院校名称、院系、层级、学位类型、名额、政策标签、截止日期和导师数量 | 日期格式化风险仍需统一 |
| `src/components/features/InstitutionForm.tsx` | 院校表单；用于新增和编辑院校基础信息、截止日期、招生名额和政策标签 | 字段类型和 policyTags 序列化需注意 |
| `src/components/features/AdvisorForm.tsx` | 导师表单；用于新增和编辑导师姓名、职称、研究方向、邮箱、主页、联系状态、评分和备注 | lastContactDate 保存逻辑需确认 |
| `src/components/features/TaskForm.tsx` | 任务表单；用于新增和编辑院校关联任务 | dueDate 必填/可空语义需统一 |
| `src/components/features/InterviewForm.tsx` | 面经表单；为导师新增面试日期、线上/线下形式和 Markdown 面经记录 | 提交后刷新详情数据 |

---

## 十一、UI 基础组件

| 文件 | 主要功能 | 维护注意 |
|------|----------|----------|
| `src/components/ui/alert-dialog.tsx` | AlertDialog 封装；基于 Radix Alert Dialog，用于确认类弹窗 | 危险操作确认 |
| `src/components/ui/badge.tsx` | Badge 组件；展示状态、标签、分类等小徽章 | 状态样式 |
| `src/components/ui/button.tsx` | Button 组件；支持 default、destructive、outline、secondary、ghost、link 等变体和尺寸 | 按钮统一样式 |
| `src/components/ui/card.tsx` | Card 组件组；提供 Card、CardHeader、CardTitle、CardDescription、CardContent、CardFooter | 卡片布局 |
| `src/components/ui/confirm-dialog.tsx` | ConfirmDialog 业务封装；替代原生 confirm，用于删除和危险操作确认 | 删除确认优先使用 |
| `src/components/ui/dialog.tsx` | Dialog 组件组；基于 Radix Dialog，用于表单弹窗和普通弹窗 | 表单弹窗 |
| `src/components/ui/dropdown-menu.tsx` | DropdownMenu 组件组；用于状态下拉菜单等 | 状态切换 |
| `src/components/ui/input.tsx` | Input 组件；统一文本、数字、日期等输入框样式 | 表单输入 |
| `src/components/ui/label.tsx` | Label 组件；统一表单标签样式 | 表单标签 |
| `src/components/ui/select.tsx` | Select 组件组；基于 Radix Select，用于下拉选择 | 枚举选择 |
| `src/components/ui/tabs.tsx` | Tabs 组件组；用于院校详情、看板等分页切换 | 分页切换 |
| `src/components/ui/textarea.tsx` | Textarea 组件；统一多行文本输入样式 | 长文本输入 |

---

## 十二、静态资源和文档目录

| 路径 | 主要功能 | 维护注意 |
|------|----------|----------|
| `src/assets/avatar.jpg` | 设置页联系信息头像 | 文件替换后确认导入路径 |
| `docs/images/*` | README 使用的软件截图 | 文档截图 |
| `软件功能页面截屏/*` | 软件功能截图素材 | 可用于说明和发布页 |
| `back_memory/` | 当前桌面软件维护文档 | 本文档所在目录 |
| `back_memory/05_change_records.md` | 每次阅读文件、代码修改和验证记录 | 每次代码修改后必须追加 |
| `out/` | electron-vite 构建产物 | 不作为源码修改 |
| `release/`、`dist-mac/`、`dist-linux/` | electron-builder 输出目录 | 不作为源码修改 |
| `node_modules/` | 依赖目录 | 不手动修改 |

---

## 十三、按问题定位入口

### 13.1 常见问题定位表

| 问题类型 | 优先查看文件 |
|----------|--------------|
| 点击院校后白屏 | `src/App.tsx`、`src/components/features/InstitutionDetail.tsx`、`src/stores/appStore.ts` |
| 数据库启动失败 | `electron/main/index.ts`、`prisma/schema.prisma`、`electron-builder*.yml` |
| Prisma engine 找不到 | `electron/main/index.ts`、`prisma/schema.prisma`、`electron-builder*.yml` |
| 院校 CRUD 异常 | `electron/main/index.ts`、`src/stores/appStore.ts`、`InstitutionForm.tsx` |
| 新增院校后界面不刷新 | `src/stores/appStore.ts`、`InstitutionForm.tsx`、`KanbanBoard.tsx` |
| 版本号显示不正确 | `electron/main/index.ts`、`electron/preload/index.ts`、`src/env.d.ts`、`src/lib/useAppVersion.ts`、`Sidebar.tsx`、`Settings.tsx` |
| 导师 CRUD 异常 | `electron/main/index.ts`、`src/stores/appStore.ts`、`AdvisorForm.tsx` |
| 任务 CRUD 异常 | `electron/main/index.ts`、`src/stores/appStore.ts`、`TaskForm.tsx`、`Timeline.tsx` |
| 详情页文件不显示 | `InstitutionDetail.tsx`、`appStore.ts`、`institution:getAll/getById` |
| 详情页面经不显示 | `InstitutionDetail.tsx`、`InterviewForm.tsx`、`appStore.ts`、`institution:getAll/getById` |
| 日程问题 | `Timeline.tsx`、`Dashboard.tsx`、`task:update`、`institution:update` |
| 邮件模板问题 | `EmailTemplates.tsx`、邮件模板 IPC handler、`appStore.ts` |
| 导入导出问题 | `Settings.tsx`、`institution:getAll`、后续 backup IPC |
| 主题问题 | `ThemeProvider.tsx`、`ColorThemeContext.tsx`、`src/index.css` |
| 打包问题 | `electron-builder.yml`、`electron-builder-mac.yml`、`electron-builder-linux.yml`、`.github/workflows/release.yml` |

### 13.2 高风险问题对应文件

| 风险 | 主要文件 | 说明 |
|------|----------|------|
| 生产数据库升级覆盖数据 | `electron/main/index.ts` | 已改为迁移前备份并补缺失表，不再替换用户库；后续 schema 变化仍需加 migration |
| 院校局部更新写坏字段 | `electron/main/index.ts`、`Timeline.tsx`、`appStore.ts` | 已改为 patch 语义，Timeline 只传一个 deadline 字段不会清空其他字段 |
| 导师局部更新写坏字段 | `electron/main/index.ts`、`InstitutionDetail.tsx`、`appStore.ts` | 已改为 patch 语义，状态切换只改 `contactStatus` |
| 详情页资产和面经缺失 | `InstitutionDetail.tsx`、`appStore.ts`、`electron/main/index.ts` | 已修复：深层 include + 新增刷新 |
| 备份恢复不完整 | `Settings.tsx`、`electron/main/index.ts` | 已修复：导出全部 7 个数据模型，事务导入 |
| 邮件预览 XSS | `EmailTemplates.tsx` | 已修复：`htmlEscape()` 转义变量填充值 |
| LaTeX 编译命令风险 | `electron/main/index.ts` | 已修复：`spawn` + `path.dirname()` |

---

## 更新日志

| 日期 | 版本 | 内容 |
|------|------|------|
| 2026-04-29 | v1.0 | 创建代码文件功能索引 |
| 2026-04-29 | v1.1 | 按参考文档格式重排，增加目录、维护注意、问题定位入口和风险对应文件 |
| 2026-04-29 | v1.2 | 补充 `useAppVersion`、维护记录文件，以及新增院校刷新和版本号问题定位入口 |
| 2026-04-29 | v1.4 | 更新 P1 修复后的风险状态、utils 工具函数和 LaTeX 编译描述 |
