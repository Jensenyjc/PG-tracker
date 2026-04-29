# PG-Tracker 自动更新实现指南

> 本文档详细描述 PG-Tracker 桌面软件的自动更新实现方案，包括技术选型、数据库保护机制、完整实现步骤和运维流程。
>
> 版本：v1.0 | 创建日期：2026-04-29

---

## 一、需求背景

### 1.1 核心需求

| 需求 | 说明 |
|------|------|
| 自动检测更新 | 用户打开软件后自动检测是否有新版本 |
| 一键更新 | 发现新版本后用户可以一键下载并安装更新 |
| 数据不丢失 | 更新过程不影响用户本地 SQLite 数据库 |
| 三平台支持 | Windows (NSIS)、macOS (DMG)、Linux (AppImage) |

### 1.2 当前条件

| 条件 | 现状 |
|------|------|
| 打包工具 | electron-builder 25.x |
| 发布平台 | GitHub Releases |
| CI/CD | GitHub Actions（tag push `v*` 自动构建） |
| 数据库位置 | `app.getPath('userData')/dev.db` |
| Schema 迁移 | `ensureProductionDatabaseSchema()` 启动时自动执行 |
| 备份机制 | `backupUserDatabase()` 迁移前自动备份 |

---

## 二、技术选型

### 2.1 方案对比

| 方案 | 优点 | 缺点 | 结论 |
|------|------|------|------|
| **electron-updater** | electron-builder 官方配套；直接复用 GitHub Releases；免费；支持三平台；内置差量更新 | 需要 GitHub Token 避免 API 限流 | **选用** |
| Squirrel.Windows + Squirrel.Mac | 原生方案 | 需要独立服务器部署更新 API；配置复杂；不支持 Linux | 不选 |
| 手动下载 + 替换 | 完全可控 | 需自建服务器；需自行实现进度、校验、安装逻辑；工作量大 | 不选 |

### 2.2 electron-updater 工作原理

```
┌──────────────────────────────────────────────────────────────────┐
│                        GitHub Releases                            │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │  latest.yml / latest-mac.yml / latest-linux.yml           │    │
│  │  (electron-builder 打包时自动生成，包含版本号、文件URL、    │    │
│  │   SHA512 校验和、文件大小)                                  │    │
│  │                                                            │    │
│  │  PG-Tracker-2.4.0-win-setup.exe                            │    │
│  │  PG-Tracker-2.4.0-mac-x64.dmg                              │    │
│  │  PG-Tracker-2.4.0-linux-x86_64.AppImage                    │    │
│  └──────────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────┘
                              ▲
                              │ HTTP GET (latest.yml)
                              │
┌─────────────────────────────┴────────────────────────────────────┐
│                     electron-updater (客户端)                      │
│                                                                    │
│  1. autoUpdater.checkForUpdates()                                  │
│     └─ 下载 latest.yml，解析版本号、文件 URL                       │
│                                                                    │
│  2. autoUpdater.downloadUpdate()                                   │
│     └─ 下载新版本安装包到临时目录                                   │
│     └─ 校验 SHA512 确保文件完整                                    │
│                                                                    │
│  3. autoUpdater.quitAndInstall()                                   │
│     └─ 运行安装包（NSIS 静默安装 / DMG 替换 / AppImage 替换）     │
│     └─ 重启应用（新版本）                                          │
│                                                                    │
│  ⚠️ 整个过程中，app.getPath('userData') 完全不被触碰               │
└──────────────────────────────────────────────────────────────────┘
```

---

## 三、数据库保护机制（核心）

### 3.1 文件系统隔离

electron-updater 更新时**只替换应用安装目录**下的文件，不同平台如下：

| 平台 | 应用安装目录（被更新） | 用户数据目录（不受影响） |
|------|------------------------|----------------------------|
| Windows | `%LOCALAPPDATA%\pg-tracker\` | `%APPDATA%\pg-tracker\` |
| macOS | `/Applications/PG-Tracker.app/` | `~/Library/Application Support/pg-tracker/` |
| Linux | AppImage 文件本身 | `~/.config/pg-tracker/` |

### 3.2 受保护的用户数据

`app.getPath('userData')` 目录结构：

```
%APPDATA%/pg-tracker/  (Windows 示例)
├── dev.db              ← 主 SQLite 数据库
├── dev.db-wal          ← SQLite WAL 日志
├── dev.db-shm          ← SQLite 共享内存文件
└── backups/            ← 自动备份目录
    ├── dev-2026-04-29T10-30-00-000Z.db
    ├── dev-2026-04-29T10-30-00-000Z.db-wal
    └── dev-2026-04-29T10-30-00-000Z.db-shm
```

### 3.3 更新后的 Schema 迁移流程

```
软件启动
  │
  ├─ initializeDatabase()
  │   ├─ 检测 userData 下是否存在 dev.db
  │   │   ├─ 不存在 → 从 resources/prisma/dev.db 复制种子库（首次安装）
  │   │   └─ 已存在 → 跳过复制，保护已有数据 ✅
  │   │
  │   └─ ensureProductionDatabaseSchema()
  │       ├─ 检测 schema 版本（查 EmailTemplate/EmailVariable 表是否存在）
  │       ├─ 已是最新 → 跳过
  │       └─ 需要迁移 →
  │           ├─ backupUserDatabase()  ← 先备份！
  │           ├─ BEGIN IMMEDIATE
  │           ├─ CREATE TABLE IF NOT EXISTS ...
  │           ├─ COMMIT
  │           └─ 失败自动 ROLLBACK
  │
  └─ getPrisma() → 正常使用数据库
```

### 3.4 极端情况保护

| 场景 | 保护机制 |
|------|----------|
| 更新中断电/崩溃 | 安装包有校验，不完整不会安装；数据库在 userData 不受影响 |
| 新版本 schema 不兼容 | `ensureProductionDatabaseSchema` 使用 `CREATE TABLE IF NOT EXISTS`，已存在的表不会被覆盖 |
| 新版本 Prisma engine 变化 | `getPrismaClientPath()` 多路径 fallback 搜索引擎文件 |
| 用户手动回滚到旧版本 | 备份目录保留迁移前数据，可手动恢复 |

---

## 四、详细实现

### 4.1 安装依赖

```bash
npm install electron-updater
```

`electron-updater` 是**运行时依赖**（放在 `dependencies`），打包后随应用一起发布。

### 4.2 修改 electron-builder 配置

在三个打包配置文件的顶层增加 `publish` 节点：

**electron-builder.yml** (Windows):
```yaml
appId: com.pg-tracker.app
productName: PG-Tracker

publish:
  provider: github
  owner: Jensenyjc       # 替换为实际 GitHub 用户名
  repo: pg-tracker-v2    # 替换为实际仓库名

# ... 其余不变
```

**electron-builder-mac.yml** 和 **electron-builder-linux.yml** 同样增加。

GitHub Token：构建时需要 `GH_TOKEN` 环境变量，当前 GitHub Actions 已配置 `${{ secrets.GITHUB_TOKEN }}`。

### 4.3 创建更新模块 `electron/main/updater.ts`

```typescript
import { autoUpdater } from 'electron-updater'
import { BrowserWindow, dialog } from 'electron'
import log from 'electron-log'

export interface UpdateStatus {
  phase: 'idle' | 'checking' | 'available' | 'not-available' | 'downloading' | 'downloaded' | 'error'
  version?: string
  percent?: number
  error?: string
}

let mainWindow: BrowserWindow | null = null
let updateCheckTimer: ReturnType<typeof setInterval> | null = null

function sendStatus(status: UpdateStatus): void {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('update:status', status)
  }
}

export function initUpdater(window: BrowserWindow): void {
  mainWindow = window

  // 配置日志和更新源
  autoUpdater.logger = log
  autoUpdater.autoDownload = false      // 不自动下载，让用户决定
  autoUpdater.autoInstallOnAppQuit = false

  // 事件：开始检查更新
  autoUpdater.on('checking-for-update', () => {
    sendStatus({ phase: 'checking' })
  })

  // 事件：发现新版本
  autoUpdater.on('update-available', (info) => {
    sendStatus({
      phase: 'available',
      version: info.version,
    })
  })

  // 事件：已是最新版本
  autoUpdater.on('update-not-available', () => {
    sendStatus({ phase: 'not-available' })
  })

  // 事件：下载进度
  autoUpdater.on('download-progress', (progress) => {
    sendStatus({
      phase: 'downloading',
      percent: Math.round(progress.percent),
    })
  })

  // 事件：下载完成
  autoUpdater.on('update-downloaded', (info) => {
    sendStatus({
      phase: 'downloaded',
      version: info.version,
    })
  })

  // 事件：错误
  autoUpdater.on('error', (err) => {
    log.error('Updater error:', err)
    sendStatus({
      phase: 'error',
      error: err.message,
    })
  })

  // 启动后 5 秒自动检查一次（避免影响启动速度）
  setTimeout(() => {
    autoUpdater.checkForUpdates().catch((err) => {
      log.error('Initial update check failed:', err)
    })
  }, 5000)

  // 之后每 4 小时检查一次
  updateCheckTimer = setInterval(() => {
    autoUpdater.checkForUpdates().catch((err) => {
      log.error('Periodic update check failed:', err)
    })
  }, 4 * 60 * 60 * 1000)
}

export function destroyUpdater(): void {
  if (updateCheckTimer) {
    clearInterval(updateCheckTimer)
    updateCheckTimer = null
  }
  mainWindow = null
}

export { autoUpdater }
```

### 4.4 修改主进程 `electron/main/index.ts`

**导入 updater 模块：**
```typescript
import { initUpdater, autoUpdater } from './updater'
```

**在 `app.whenReady()` 的 `createWindow()` 后注册 IPC：**

```typescript
// === 自动更新 IPC ===

ipcMain.handle('update:check', async () => {
  try {
    const result = await autoUpdater.checkForUpdates()
    return { success: true, data: result }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
})

ipcMain.handle('update:download', async () => {
  try {
    await autoUpdater.downloadUpdate()
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
})

ipcMain.handle('update:install', async () => {
  // 安装前断开数据库连接
  if (prisma) {
    await prisma.$disconnect()
    prisma = null
  }
  autoUpdater.quitAndInstall()
})
```

**在 `app.whenReady()` 中 `createWindow()` 后初始化 updater：**
```typescript
if (!isDev) {
  initUpdater(mainWindow!)
}
```

### 4.5 修改预加载脚本 `electron/preload/index.ts`

在 `api` 对象中新增：

```typescript
updater: {
  check: () => ipcRenderer.invoke('update:check'),
  download: () => ipcRenderer.invoke('update:download'),
  install: () => ipcRenderer.invoke('update:install'),
  onStatus: (callback: (status: any) => void) => {
    const listener = (_event: any, status: any) => callback(status)
    ipcRenderer.on('update:status', listener)
    // 返回取消监听的函数
    return () => { ipcRenderer.removeListener('update:status', listener) }
  }
}
```

### 4.6 修改类型声明 `src/env.d.ts`

```typescript
interface UpdateStatus {
  phase: 'idle' | 'checking' | 'available' | 'not-available' | 'downloading' | 'downloaded' | 'error'
  version?: string
  percent?: number
  error?: string
}

// 在 Window.api 接口中新增：
updater: {
  check: () => Promise<{ success: boolean; data?: any; error?: string }>
  download: () => Promise<{ success: boolean; error?: string }>
  install: () => void
  onStatus: (callback: (status: UpdateStatus) => void) => () => void
}
```

### 4.7 创建更新 Hook `src/lib/useUpdater.ts`

```typescript
import { useState, useEffect, useCallback } from 'react'

export interface UpdateStatus {
  phase: 'idle' | 'checking' | 'available' | 'not-available' | 'downloading' | 'downloaded' | 'error'
  version?: string
  percent?: number
  error?: string
}

export function useUpdater() {
  const [status, setStatus] = useState<UpdateStatus>({ phase: 'idle' })
  const [checking, setChecking] = useState(false)

  useEffect(() => {
    const unsubscribe = window.api.updater.onStatus((newStatus) => {
      setStatus(newStatus)
      if (newStatus.phase !== 'downloading') {
        setChecking(false)
      }
    })
    return unsubscribe
  }, [])

  const checkForUpdates = useCallback(async () => {
    setChecking(true)
    setStatus({ phase: 'checking' })
    try {
      await window.api.updater.check()
    } catch (err: any) {
      setStatus({ phase: 'error', error: err.message })
      setChecking(false)
    }
  }, [])

  const downloadUpdate = useCallback(async () => {
    try {
      await window.api.updater.download()
    } catch (err: any) {
      setStatus({ phase: 'error', error: err.message })
    }
  }, [])

  const installUpdate = useCallback(() => {
    window.api.updater.install()
  }, [])

  return { status, checking, checkForUpdates, downloadUpdate, installUpdate }
}
```

### 4.8 修改设置页 `src/components/features/Settings.tsx`

在设置页"联系"卡片之前，新增"软件更新"卡片：

```tsx
{/* 软件更新 */}
<Card>
  <CardHeader>
    <CardTitle className="text-lg font-semibold flex items-center gap-2">
      <RefreshCw className="h-5 w-5" />
      软件更新
    </CardTitle>
    <CardDescription>检查并安装最新版本</CardDescription>
  </CardHeader>
  <CardContent className="space-y-3">
    <p className="text-sm text-muted-foreground">
      当前版本：{appVersion || '...'}
    </p>

    {/* 状态提示 */}
    {status.phase === 'checking' && (
      <p className="text-sm text-muted-foreground">正在检查更新...</p>
    )}
    {status.phase === 'not-available' && (
      <p className="text-sm text-green-600">已是最新版本</p>
    )}
    {status.phase === 'available' && status.version && (
      <div className="space-y-2">
        <p className="text-sm">
          发现新版本 <span className="font-semibold">v{status.version}</span>
        </p>
        <Button onClick={downloadUpdate} className="w-full">
          下载更新
        </Button>
      </div>
    )}
    {status.phase === 'downloading' && (
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">
          正在下载... {status.percent ?? 0}%
        </p>
        <div className="w-full bg-muted rounded-full h-2">
          <div
            className="bg-primary h-2 rounded-full transition-all"
            style={{ width: `${status.percent ?? 0}%` }}
          />
        </div>
      </div>
    )}
    {status.phase === 'downloaded' && (
      <div className="space-y-2">
        <p className="text-sm text-green-600">下载完成，重启后生效</p>
        <Button onClick={installUpdate} className="w-full">
          立即重启并安装
        </Button>
      </div>
    )}
    {status.phase === 'error' && (
      <p className="text-sm text-destructive">
        更新失败：{status.error || '未知错误'}
      </p>
    )}

    <Button
      variant="outline"
      onClick={checkForUpdates}
      disabled={checking}
      className="w-full"
    >
      {checking ? '检查中...' : '检查更新'}
    </Button>
  </CardContent>
</Card>
```

需要新增 import：
```tsx
import { RefreshCw } from 'lucide-react'
import { useUpdater } from '../../lib/useUpdater'
```

组件内调用：
```tsx
const { status, checking, checkForUpdates, downloadUpdate, installUpdate } = useUpdater()
```

---

## 五、CI/CD 集成

### 5.1 GitHub Actions 修改

当前 `.github/workflows/release.yml` 已满足需求，`electron-builder` 在构建时发现 `publish: provider: github` 会自动：
1. 上传安装包到对应 GitHub Release
2. 生成 `latest.yml` / `latest-mac.yml` / `latest-linux.yml`
3. 将 yml 文件也上传到 Release

需要确认的配置：
- `GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}` — 已存在 ✅
- `npm run build:win` / `build:mac-standalone` / `build:linux-standalone` — 脚本中已包含完整构建流程 ✅

### 5.2 发版流程

```bash
# 1. 修改 package.json 版本号
# "version": "2.3.2" → "version": "2.4.0"

# 2. 提交版本变更
git add package.json
git commit -m "v2.4.0: 新功能描述"

# 3. 打 tag 并推送
git tag v2.4.0
git push origin main --tags

# 4. GitHub Actions 自动触发构建
# 构建完成后，安装包和 latest.yml 自动发布到 GitHub Release

# 5. 已安装旧版本的用户下次启动时自动检测到更新
```

---

## 六、更新流程图

```
用户启动软件
     │
     ├─ app.whenReady()
     │   ├─ initializeDatabase()  ← 保护用户数据
     │   ├─ createWindow()
     │   └─ initUpdater()  ← 初始化更新模块
     │
     ├─ 5 秒后首次自动检查
     │   ├─ 下载 latest.yml
     │   ├─ 比较当前版本 vs 远程版本
     │   │   ├─ 相同 → 不提示
     │   │   └─ 新版可用 → 静默（不弹窗）
     │   └─ 每 4 小时重复
     │
     ├─ 用户打开设置页手动检查
     │   ├─ 点击"检查更新"
     │   ├─ 已是最新 → 绿色提示
     │   └─ 发现新版本 → 显示版本号 + "下载更新"按钮
     │
     ├─ 用户点击"下载更新"
     │   ├─ 下载安装包（显示进度条）
     │   └─ 校验 SHA512
     │
     └─ 用户点击"立即重启并安装"
         ├─ 断开数据库连接 ($disconnect)
         ├─ autoUpdater.quitAndInstall()
         ├─ NSIS 安装（Windows）/ DMG 挂载（macOS）/ 替换 AppImage（Linux）
         └─ 启动新版本
              └─ initializeDatabase() → migrate → 一切正常 ✅
```

---

## 七、调试与故障排查

### 7.1 开发环境调试

开发环境下 electron-updater 默认不工作（`app.isPackaged === false`）。调试方法：

```typescript
// 在 initUpdater 中临时添加，强制启用开发环境检查
if (isDev) {
  autoUpdater.forceDevUpdateConfig = true
  // 需要本地运行一个静态服务器提供 latest.yml
}
```

### 7.2 常见问题

| 问题 | 原因 | 解决 |
|------|------|------|
| 检查更新返回 404 | GitHub Release 中没有 latest.yml | 确认构建时 GH_TOKEN 有效，publish 配置正确 |
| 下载后校验失败 | 安装包损坏或网络不稳定 | autoUpdater 会自动重试，或提示用户手动下载 |
| macOS 无法自动安装 | 应用未签名 | 用户需手动拖拽到 Applications；建议后续签名 |
| Linux AppImage 权限问题 | AppImage 无执行权限 | electron-updater 会自动 chmod +x |
| 更新后数据库错误 | schema 变化未处理 | `ensureProductionDatabaseSchema` 会自动迁移，查看日志确认 |

### 7.3 日志查看

```typescript
// electron-updater 使用 electron-log 输出日志
// 日志位置：
// Windows: %APPDATA%/pg-tracker/logs/
// macOS:   ~/Library/Logs/pg-tracker/
// Linux:   ~/.config/pg-tracker/logs/
```

搜索日志关键字：
- `[updater]` — 更新相关日志
- `checking for update` — 开始检查
- `Update for version` — 发现新版本
- `File has 404` — 更新文件找不到
- `Cannot download differentially` — 差量更新失败（会 fallback 到完整下载）

---

## 八、安全考量

### 8.1 安装包完整性

- electron-updater 下载后自动校验 **SHA512** 哈希值
- 哈希值在 `latest.yml` 中由 electron-builder 打包时自动生成
- 验证失败会拒绝安装

### 8.2 更新源可信性

- 更新元数据直接从 GitHub Releases 下载（HTTPS）
- GitHub 的 TLS 证书保证传输层安全
- 不经过第三方服务器

### 8.3 代码签名（可选增强）

| 平台 | 签名方式 | 成本 |
|------|----------|------|
| Windows | EV Code Signing Certificate + `signAndEditExecutable: true` | ~$300/年 |
| macOS | Apple Developer Program + `identity: "Developer ID Application: ..."` | $99/年 |
| Linux | 无强制要求 | 免费 |

当前不签名也可使用 electron-updater，但 macOS 用户体验较差。

---

## 九、更新日志

| 日期 | 版本 | 内容 |
|------|------|------|
| 2026-04-29 | v1.0 | 创建自动更新实现指南文档 |

---

## 附录：相关文件路径

```
pg-tracker-v2/
├── electron/
│   ├── main/
│   │   ├── index.ts          ← 主进程入口，集成 updater
│   │   └── updater.ts        ← 新增：更新模块
│   └── preload/
│       └── index.ts          ← 暴露 updater API 给 renderer
├── src/
│   ├── lib/
│   │   └── useUpdater.ts     ← 新增：更新状态 Hook
│   ├── components/features/
│   │   └── Settings.tsx      ← 修改：新增更新 UI
│   └── env.d.ts              ← 修改：新增类型声明
├── electron-builder.yml      ← 修改：新增 publish 配置
├── electron-builder-mac.yml  ← 修改：新增 publish 配置
├── electron-builder-linux.yml← 修改：新增 publish 配置
├── package.json              ← 修改：新增 electron-updater 依赖
└── back_memory/
    └── 06_auto_update_guide.md ← 本文档
```
