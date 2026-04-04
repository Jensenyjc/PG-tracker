# PG-Tracker

保研信息收集与决策分析系统

一款专为中国大学生设计的保研申请管理桌面应用，帮助你系统化管理目标院校、导师信息、申请进度和面试记录，所有数据完全本地存储，保护隐私。

![License](https://img.shields.io/badge/license-MIT-green)
![Version](https://img.shields.io/badge/version-1.0.0-blue)
![Electron](https://img.shields.io/badge/Electron-33.2.0-47848F)
![React](https://img.shields.io/badge/React-18.3-61DAFB)

---

## 软件概述

PG-Tracker 围绕保研申请的完整生命周期设计，将院校筛选、导师联系、材料管理、日程追踪等环节整合在一个工具中。核心理念是**以院校为中心、以看板为视角、以时间线为驱动**，让保研准备过程井然有序。

### 整体工作流

```
添加目标院校（按冲/稳/保分类）
    ├── 录入导师信息 → 追踪联系状态 → 记录面经
    ├── 创建待办任务 → 按截止日期排序
    ├── 绑定申请材料 → 简历、成绩单、推荐信
    └── 使用邮件模板 → 一键生成自荐信/询问信/感谢信
```

---

## 功能详解

### 1. 总览仪表板

应用首页提供保研全局概览：

- **统计面板**：院校总数、导师数量、待办任务数、任务完成率，均按冲/稳/保分类统计
- **截止日期预警**：展示最近 5 个即将到期的事项，按紧急程度颜色编码（红色 ≤ 7 天、黄色 7-14 天、绿色 > 14 天）
- **三分类速览**：冲/稳/保各列最多展示 5 所院校，快速掌握申请分布

点击任意院校或截止事项可直接跳转到院校详情页。

### 2. 院校看板（Kanban）

以看板视图管理所有目标院校，三列分别对应：

| 列 | 含义 | 颜色 |
|----|------|------|
| 冲（REACH） | 超出自身水平但值得一试的院校 | 红色 |
| 稳（MATCH） | 与自身水平匹配的院校 | 黄色 |
| 保（SAFETY） | 保底选择 | 绿色 |

每张院校卡片展示：院校名称、院系、学位类型（学硕/直博）、招生名额、特殊政策标签、截止日期倒计时、导师数量。支持按等级标签筛选（全部/冲/稳/保）。

### 3. 院校详情页

点击院校卡片进入详情页，包含三个选项卡：

**总览**
- 基本信息：学位类型、招生名额、夏令营截止日期、预推免截止日期
- 特殊政策标签展示
- 导师快速预览（最多 3 位）

**导师**
- 完整的导师信息卡片列表，每位导师展示：
  - 姓名、职称、研究方向
  - 邮箱（可点击发送）、个人主页链接
  - 联系状态流转：未联系 → 已发送 → 已回复 → 面试中 → 已接受/已拒绝
  - 声誉评分（1-5 分）
  - 备注（导师评价、实验室情况、避雷信息等）
  - 关联文件（简历、成绩单、推荐信等）
  - 面经记录入口
- 冲突检测：同一院系多位导师同时处于"已发送"状态时会弹出警告

**任务**
- 为该院校创建的待办事项列表
- 每条任务可标记完成/未完成，支持编辑和删除
- 按截止日期排序

### 4. 日程视图（Timeline）

将所有院校的截止日期和任务统一汇总为时间线，按时间段分组：

- 已过期（红色警告）
- 今天
- 明天
- 本周
- 即将到来

事件类型包括夏令营截止、预推免截止和自定义待办任务。已完成的任务会以删除线和透明效果显示。

### 5. 邮件模板

内置 3 套常用邮件模板，覆盖保研联系导师的主要场景：

| 模板 | 用途 |
|------|------|
| 自荐信 | 首次联系导师，介绍个人背景和科研经历 |
| 询问名额 | 简洁地询问导师是否有招生名额 |
| 感谢信 | 面试后向导师表达感谢 |

支持变量占位符（如 `{{ADVISOR_NAME}}`、`{{YOUR_NAME}}`、`{{RESEARCH_AREA}}` 等），点击变量按钮快速插入，编辑完成后一键复制到剪贴板。

### 6. 面经记录

为每位导师记录面试经历，表单包含：

- 面试日期、面试形式（线上/线下）
- Markdown 格式的面经内容，预填充结构化模板：
  - 面试问题记录
  - 专业问题
  - 算法题（含代码块）
  - 英语问答
  - 总结与反思

### 7. 文件管理

为导师绑定本地文件，支持的文件类型分类：

- 简历（RESUME）
- 成绩单（TRANSCRIPT）
- 推荐信（RECOMMENDATION）
- 其他文件

通过系统文件选择器绑定本地路径，可一键调用系统默认程序打开。同时支持 LaTeX 编译功能（调用本地 `xelatex`）。

### 8. 设置

- **主题切换**：浅色 / 深色 / 跟随系统
- **数据导出**：将所有数据导出为 JSON 文件备份（命名格式：`pg-tracker-backup-YYYY-MM-DD.json`）
- **数据导入**：从 JSON 备份文件恢复数据
- **数据清除**：清空所有本地数据（双重确认防误删）

---

## 数据模型

```
Institution（院校）
├── name          院校名称
├── department    院系
├── tier          等级（REACH / MATCH / SAFETY）
├── degreeType    学位类型（MASTER / PHD）
├── campDeadline  夏令营截止日期
├── pushDeadline  预推免截止日期
├── expectedQuota 预计招生名额
├── policyTags    特殊政策标签
├── advisors[]    导师列表
│   ├── name / title / researchArea / email / homepage
│   ├── contactStatus   联系状态（6 种状态流转）
│   ├── reputationScore 评分（1-5）
│   ├── notes           备注
│   ├── assets[]        关联文件
│   └── interviews[]    面经记录
└── tasks[]       待办任务
    ├── title     任务标题
    ├── dueDate   截止日期
    └── isCompleted 完成状态
```

所有数据存储在本地 SQLite 数据库中，不联网、不上传，完全保护隐私。

---

## 技术栈

| 类别 | 技术 |
|------|------|
| 桌面框架 | Electron 33.2 |
| 前端 | React 18.3 + TypeScript |
| 构建工具 | electron-vite + Vite 5 |
| 打包 | electron-builder |
| UI 组件 | shadcn/ui (Radix UI + Tailwind CSS) |
| 数据库 | SQLite + Prisma ORM 5.x |
| 状态管理 | Zustand |
| 日期处理 | date-fns |

---

## 项目结构

```
pg-tracker-v2/
├── electron/
│   ├── main/index.ts          # 主进程：数据库操作、文件操作、IPC 处理
│   └── preload/index.ts       # 预加载脚本：安全的 IPC 桥接层
├── prisma/
│   ├── schema.prisma          # 数据库模型定义
│   └── dev.db                 # SQLite 数据库文件
├── src/
│   ├── App.tsx                # 应用主入口，视图路由
│   ├── components/
│   │   ├── features/
│   │   │   ├── Dashboard.tsx       # 总览仪表板
│   │   │   ├── KanbanBoard.tsx     # 院校看板
│   │   │   ├── InstitutionCard.tsx # 院校卡片
│   │   │   ├── InstitutionDetail.tsx # 院校详情页
│   │   │   ├── InstitutionForm.tsx # 院校表单
│   │   │   ├── AdvisorForm.tsx     # 导师表单
│   │   │   ├── InterviewForm.tsx   # 面经记录表单
│   │   │   ├── TaskForm.tsx        # 任务表单
│   │   │   ├── Timeline.tsx        # 日程时间线
│   │   │   ├── EmailTemplates.tsx  # 邮件模板
│   │   │   └── Settings.tsx        # 设置页面
│   │   ├── layout/
│   │   │   └── Sidebar.tsx         # 左侧导航栏
│   │   └── ui/                     # 基础 UI 组件
│   ├── stores/
│   │   └── appStore.ts        # Zustand 全局状态管理
│   └── lib/
│       └── utils.ts           # 工具函数
├── electron.vite.config.ts    # electron-vite 构建配置
└── package.json
```

---

## 快速开始

```bash
# 安装依赖
npm install

# 开发模式运行
npm run dev

# 构建 Windows 便携版
npm run build:win
```

构建产物位于 `release/win-unpacked/`，双击 `PG-Tracker.exe` 即可运行，无需安装。

---

## 运行环境

- Windows 10/11 (64-bit)
- macOS / Linux（需单独构建）

---

## License

MIT
