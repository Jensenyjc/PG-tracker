/**
 * @Project: PG-Tracker
 * @File: main/index.ts
 * @Description: Electron 主进程入口，负责数据库初始化、IPC 处理器注册、窗口管理及系统集成
 * @Author: 杨敬诚
 * @Date: 2026-04-08
 * Copyright (c) 2026. All rights reserved.
 */
import { app, shell, BrowserWindow, ipcMain, dialog, type OpenDialogOptions } from 'electron'
import { join, dirname } from 'path'
import { existsSync, copyFileSync, mkdirSync, writeFileSync } from 'fs'
import log from 'electron-log'
import { spawn } from 'child_process'
import { initUpdater, autoUpdater } from './updater'

// ==================== 全局崩溃日志捕捉 ====================
// 必须在最早期注册，确保任何未捕获的异常都能记录
// 注意：dialog.showErrorBox 需要 app.ready 之后才能用，这里只写文件
const getCrashLogPath = (): string => {
  // 跨平台获取临时目录
  const tempDir = process.platform === 'win32'
    ? (process.env.TEMP || process.env.TMP || 'C:\\Windows\\Temp')
    : '/tmp'
  return join(tempDir, 'pg-tracker-crash.log')
}

process.on('uncaughtException', (error) => {
  const msg = `未捕获异常: ${error.message}\n\nStack: ${error.stack}`
  log.error('[CRASH]', msg)
  // 写日志文件，不在此处弹窗（app 可能还未 ready）
  try {
    const crashLogPath = getCrashLogPath()
    writeFileSync(crashLogPath, `[${new Date().toISOString()}] ${msg}\n`, { flag: 'a' })
  } catch {}
  // 顶层异常必须退出，否则进程处于不可预期状态
  process.exit(1)
})

process.on('unhandledRejection', (reason: any) => {
  const msg = `未处理的 Promise 拒绝: ${reason?.message || reason}\n\nStack: ${reason?.stack || '无堆栈信息'}`
  log.error('[CRASH]', msg)
  try {
    const crashLogPath = getCrashLogPath()
    writeFileSync(crashLogPath, `[${new Date().toISOString()}] ${msg}\n`, { flag: 'a' })
  } catch {}
})

// Platform detection
const isDev = !app.isPackaged
const platform = process.platform || 'win32'

// ==================== Prisma Client 初始化 ====================
let prisma: any = null
let prismaInitPromise: Promise<any> | null = null  // 防止并发初始化

/**
 * 获取数据库文件路径。
 * 开发：prisma/dev.db
 * 生产：userData/dev.db（由 app.getPath('userData') 确定，不依赖 .env）
 */
function getDatabasePath(): string {
  if (isDev) {
    return join(__dirname, '../../prisma/dev.db')
  }
  return join(app.getPath('userData'), 'dev.db')
}

/**
 * 获取 Prisma Client 模块路径。
 * 开发环境：node_modules/.prisma/client
 * 生产环境：extraResources/prisma-client（通过 extraResources 复制）
 */
function getPrismaClientPath(): string {
  if (isDev) {
    return join(__dirname, '../../node_modules/.prisma/client')
  }
  const extraPrismaPath = join(process.resourcesPath, '.prisma', 'client')
  log.info('Prisma client path (extraResources):', extraPrismaPath)
  log.info('index.js exists:', existsSync(join(extraPrismaPath, 'index.js')))
  return extraPrismaPath
}

function backupUserDatabase(userDbPath: string, reason: string): void {
  const backupDir = join(dirname(userDbPath), 'backups')
  mkdirSync(backupDir, { recursive: true })
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const backupBasePath = join(backupDir, `dev-${timestamp}`)

  for (const suffix of ['', '-wal', '-shm']) {
    const source = `${userDbPath}${suffix}`
    if (existsSync(source)) {
      copyFileSync(source, `${backupBasePath}.db${suffix}`)
    }
  }

  log.info(`[Prod] Backed up user database before ${reason}:`, backupBasePath)
}

async function ensureProductionDatabaseSchema(userDbPath: string): Promise<void> {
  let tmpPrisma: any = null
  try {
    const { PrismaClient: PC } = require(getPrismaClientPath())
    tmpPrisma = new PC({ datasources: { db: { url: `file:${userDbPath}` } } })

    const rows = await tmpPrisma.$queryRawUnsafe(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name IN ('EmailTemplate', 'EmailVariable')"
    )
    const existingTables = new Set((rows as Array<{ name: string }>).map((row) => row.name))
    const needsEmailTables = !existingTables.has('EmailTemplate') || !existingTables.has('EmailVariable')

    if (!needsEmailTables) {
      log.info('[Prod] User database schema is up to date')
      return
    }

    backupUserDatabase(userDbPath, 'schema migration')
    log.warn('[Prod] User database schema is missing email tables. Applying non-destructive migration.')

    await tmpPrisma.$executeRawUnsafe('BEGIN IMMEDIATE')
    try {
      await tmpPrisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "EmailTemplate" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "name" TEXT NOT NULL,
          "subject" TEXT NOT NULL,
          "content" TEXT NOT NULL,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" DATETIME NOT NULL
        )
      `)
      await tmpPrisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "EmailVariable" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "name" TEXT NOT NULL,
          "templateId" TEXT NOT NULL,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "EmailVariable_templateId_fkey"
            FOREIGN KEY ("templateId") REFERENCES "EmailTemplate" ("id")
            ON DELETE CASCADE ON UPDATE CASCADE
        )
      `)
      await tmpPrisma.$executeRawUnsafe('COMMIT')
      log.info('[Prod] Database schema migration completed without replacing user data')
    } catch (migrationError) {
      try { await tmpPrisma.$executeRawUnsafe('ROLLBACK') } catch {}
      throw migrationError
    }
  } finally {
    if (tmpPrisma) {
      try { await tmpPrisma.$disconnect() } catch {}
    }
  }
}

/**
 * 数据库初始化主函数。
 * 每次启动时检测用户数据库的 schema 版本，如果缺少 EmailTemplate 相关表，
 * 先备份用户数据库，再执行非破坏性迁移补齐缺失表，不覆盖真实用户数据。
 * 不再调用 getPrisma()（避免循环依赖），直接用临时 PrismaClient 按路径检测。
 */
async function initializeDatabase(): Promise<string> {
  const dbPath = getDatabasePath()

  if (isDev) {
    log.info('[Dev] Using local dev database at:', dbPath)
    return dbPath
  }

  const userDbPath = dbPath
  const resourceDbPath = join(process.resourcesPath, 'prisma', 'dev.db')

  // 确保 userData 目录存在
  const userDataDir = dirname(userDbPath)
  if (!existsSync(userDataDir)) {
    mkdirSync(userDataDir, { recursive: true })
    log.info('[Prod] Created userData directory:', userDataDir)
  }

  if (!existsSync(userDbPath)) {
    if (existsSync(resourceDbPath)) {
      copyFileSync(resourceDbPath, userDbPath)
      log.info('[Prod] First run: copied seed database from resources')
    } else {
      log.error('[Prod] FATAL: seed database not found at:', resourceDbPath)
      dialog.showErrorBox(
        'PG-Tracker 启动失败',
        `找不到初始数据库文件。\n预期路径: ${resourceDbPath}\n\n请尝试重新安装软件。`
      )
      throw new Error(`Seed database not found at ${resourceDbPath}`)
    }
    return userDbPath
  }

  await ensureProductionDatabaseSchema(userDbPath)
  return userDbPath
}

async function getPrisma(): Promise<any> {
  // 如果已经初始化完成，直接返回
  if (prisma) return prisma

  // 如果正在初始化中，等待现有初始化完成（防止竞态条件）
  if (prismaInitPromise) return prismaInitPromise

  // 开始初始化
  prismaInitPromise = (async () => {
    const prismaPath = getPrismaClientPath()
    const dbPath = getDatabasePath()
    const dbUrl = `file:${dbPath}`

    // 多路径搜索 query engine，兼容不同打包结构
    // Prisma 引擎文件命名规则：
    // - Windows: query_engine-windows.dll.node
    // - macOS Intel: libquery_engine-darwin.dylib.node
    // - macOS ARM: libquery_engine-darwin-arm64.dylib.node
    // - Linux: libquery_engine-debian-openssl-*.so.node
    // 注意：Windows 使用 'windows' 而非 'win32'，macOS/Linux 使用 'libquery_engine' 前缀
    const getEngineNames = (): string[] => {
      if (platform === 'win32') {
        return ['query_engine-windows.dll.node']
      } else if (platform === 'darwin') {
        return [
          'libquery_engine-darwin-arm64.dylib.node',
          'libquery_engine-darwin.dylib.node'
        ]
      } else {
        // Linux
        return [
          'libquery_engine-debian-openssl-3.0.x.so.node',
          'libquery_engine-debian-openssl-1.1.x.so.node'
        ]
      }
    }
    const engineNames = getEngineNames()
    const engineCandidates: string[] = []
    for (const engineName of engineNames) {
      engineCandidates.push(
        join(prismaPath, engineName),
        join(process.resourcesPath, 'node_modules', '@prisma', 'engines', engineName),
        join(process.resourcesPath, '.prisma', 'client', engineName)
      )
    }
    let engineFile: string | null = null
    for (const candidate of engineCandidates) {
      if (existsSync(candidate)) {
        engineFile = candidate
        break
      }
    }

    log.info('=== Prisma Init ===')
    log.info('  Prisma Client path:', prismaPath)
    log.info('  Database URL (explicit):', dbUrl)
    log.info('  app.isPackaged:', app.isPackaged)
    log.info('  query engine path:', engineFile)
    log.info('  query engine exists:', engineFile ? existsSync(engineFile) : false)

    if (!isDev && engineFile) {
      process.env.PRISMA_QUERY_ENGINE_LIBRARY = engineFile
    }

    if (!isDev && !engineFile) {
      const msg = `Prisma 查询引擎未找到！\n搜索路径:\n${engineCandidates.map(p => '  - ' + p + ' (' + (existsSync(p) ? '存在' : '不存在') + ')').join('\n')}`
      log.error(msg)
      dialog.showErrorBox('PG-Tracker 启动失败', msg)
    }

    try {
      const { PrismaClient } = require(prismaPath)
      // 显式传递 datasources.db.url，不再依赖 process.env.DATABASE_URL
      prisma = new PrismaClient({
        datasources: { db: { url: dbUrl } }
      })
    } catch (err) {
      log.error('Failed to load Prisma Client:', err)
      prismaInitPromise = null  // 重置以便重试
      throw err
    }
    return prisma
  })()

  return prismaInitPromise
}

function parseNullableDate(value: any, fieldName: string): Date | null {
  if (value === null || value === '' || value === undefined) return null
  const parsed = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`${fieldName} 格式不正确`)
  }
  return parsed
}

function parseDateRequired(value: any, fieldName: string): Date {
  if (value === null || value === undefined || value === '') {
    throw new Error(`${fieldName} 是必填项`)
  }
  const parsed = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`${fieldName} 格式不正确`)
  }
  return parsed
}

function buildInstitutionUpdateData(data: any): Record<string, any> {
  const updateData: Record<string, any> = {}

  if (data.name !== undefined) updateData.name = data.name
  if (data.department !== undefined) updateData.department = data.department
  if (data.tier !== undefined) updateData.tier = data.tier
  if (data.degreeType !== undefined) updateData.degreeType = data.degreeType
  if (data.campDeadline !== undefined) updateData.campDeadline = parseNullableDate(data.campDeadline, 'campDeadline')
  if (data.pushDeadline !== undefined) updateData.pushDeadline = parseNullableDate(data.pushDeadline, 'pushDeadline')
  if (data.expectedQuota !== undefined) updateData.expectedQuota = data.expectedQuota
  if (data.policyTags !== undefined) {
    updateData.policyTags = JSON.stringify(Array.isArray(data.policyTags) ? data.policyTags : [])
  }

  return updateData
}

function buildAdvisorUpdateData(data: any): Record<string, any> {
  const updateData: Record<string, any> = {}

  if (data.institutionId !== undefined) updateData.institutionId = data.institutionId
  if (data.name !== undefined) updateData.name = data.name
  if (data.title !== undefined) updateData.title = data.title
  if (data.researchArea !== undefined) updateData.researchArea = data.researchArea
  if (data.email !== undefined) updateData.email = data.email
  if (data.homepage !== undefined) updateData.homepage = data.homepage
  if (data.contactStatus !== undefined) updateData.contactStatus = data.contactStatus
  if (data.lastContactDate !== undefined) updateData.lastContactDate = parseNullableDate(data.lastContactDate, 'lastContactDate')
  if (data.reputationScore !== undefined) updateData.reputationScore = data.reputationScore
  if (data.notes !== undefined) updateData.notes = data.notes

  return updateData
}

log.transports.file.level = 'info'
log.info('Application starting...', { isDev, platform })

ipcMain.handle('app:getVersion', () => app.getVersion())

// ==================== 主窗口创建 ====================
let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    show: false,
    autoHideMenuBar: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    try {
      const parsed = new URL(details.url)
      if (['http:', 'https:', 'mailto:'].includes(parsed.protocol)) {
        shell.openExternal(details.url)
      }
    } catch {
      // 非法的 URL 格式，忽略
    }
    return { action: 'deny' }
  })

  // Load the app
  const renderUrl = process.env.ELECTRON_RENDERER_URL
  if (isDev && renderUrl) {
    mainWindow.loadURL(renderUrl)
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// ============== Institution CRUD ==============

ipcMain.handle('institution:getAll', async () => {
  try {
    const client = await getPrisma()
    return await client.institution.findMany({
      include: {
        advisors: { include: { assets: true, interviews: true } },
        tasks: true
      },
      orderBy: { createdAt: 'desc' }
    })
  } catch (error) {
    log.error('Error fetching institutions:', error)
    throw error
  }
})

ipcMain.handle('institution:getById', async (_, id: string) => {
  try {
    const client = await getPrisma()
    return await client.institution.findUnique({
      where: { id },
      include: {
        advisors: { include: { assets: true, interviews: true } },
        tasks: true
      }
    })
  } catch (error) {
    log.error('Error fetching institution:', error)
    throw error
  }
})

ipcMain.handle('institution:create', async (_, data: any) => {
  try {
    const client = await getPrisma()
    return await client.institution.create({
      data: {
        name: data.name,
        department: data.department,
        tier: data.tier,
        degreeType: data.degreeType,
        campDeadline: parseNullableDate(data.campDeadline, 'campDeadline'),
        pushDeadline: parseNullableDate(data.pushDeadline, 'pushDeadline'),
        expectedQuota: data.expectedQuota,
        policyTags: JSON.stringify(data.policyTags || [])
      },
      include: { advisors: true, tasks: true }
    })
  } catch (error) {
    log.error('Error creating institution:', error)
    throw error
  }
})

ipcMain.handle('institution:update', async (_, id: string, data: any) => {
  try {
    const client = await getPrisma()
    const updateData = buildInstitutionUpdateData(data)
    if (Object.keys(updateData).length === 0) {
      return await client.institution.findUnique({
        where: { id },
        include: { advisors: true, tasks: true }
      })
    }
    return await client.institution.update({
      where: { id },
      data: updateData,
      include: { advisors: true, tasks: true }
    })
  } catch (error) {
    log.error('Error updating institution:', error)
    throw error
  }
})

ipcMain.handle('institution:delete', async (_, id: string) => {
  try {
    const client = await getPrisma()
    await client.institution.delete({ where: { id } })
    return true
  } catch (error) {
    log.error('Error deleting institution:', error)
    throw error
  }
})

// ============== Advisor CRUD ==============

ipcMain.handle('advisor:getByInstitution', async (_, institutionId: string) => {
  try {
    const client = await getPrisma()
    return await client.advisor.findMany({
      where: { institutionId },
      include: { assets: true, interviews: true }
    })
  } catch (error) {
    log.error('Error fetching advisors:', error)
    throw error
  }
})

ipcMain.handle('advisor:create', async (_, data: any) => {
  try {
    const client = await getPrisma()
    return await client.advisor.create({
      data: {
        institutionId: data.institutionId,
        name: data.name,
        title: data.title,
        researchArea: data.researchArea,
        email: data.email,
        homepage: data.homepage,
        contactStatus: data.contactStatus || 'PENDING',
        lastContactDate: parseNullableDate(data.lastContactDate, 'lastContactDate'),
        reputationScore: data.reputationScore,
        notes: data.notes
      },
      include: { assets: true, interviews: true }
    })
  } catch (error) {
    log.error('Error creating advisor:', error)
    throw error
  }
})

ipcMain.handle('advisor:update', async (_, id: string, data: any) => {
  try {
    const client = await getPrisma()
    const updateData = buildAdvisorUpdateData(data)
    if (Object.keys(updateData).length === 0) {
      return await client.advisor.findUnique({
        where: { id },
        include: { assets: true, interviews: true }
      })
    }
    return await client.advisor.update({
      where: { id },
      data: updateData,
      include: { assets: true, interviews: true }
    })
  } catch (error) {
    log.error('Error updating advisor:', error)
    throw error
  }
})

ipcMain.handle('advisor:delete', async (_, id: string) => {
  try {
    const client = await getPrisma()
    await client.advisor.delete({ where: { id } })
    return true
  } catch (error) {
    log.error('Error deleting advisor:', error)
    throw error
  }
})

// ============== Task CRUD ==============

ipcMain.handle('task:getByInstitution', async (_, institutionId: string) => {
  try {
    const client = await getPrisma()
    return await client.task.findMany({
      where: { institutionId },
      orderBy: { dueDate: 'asc' }
    })
  } catch (error) {
    log.error('Error fetching tasks:', error)
    throw error
  }
})

ipcMain.handle('task:getOrphan', async () => {
  try {
    const client = await getPrisma()
    return await client.task.findMany({
      where: { institutionId: null },
      orderBy: { dueDate: 'asc' }
    })
  } catch (error) {
    log.error('Error fetching orphan tasks:', error)
    throw error
  }
})

ipcMain.handle('task:create', async (_, data: any) => {
  try {
    const client = await getPrisma()
    return await client.task.create({
      data: {
        institutionId: data.institutionId || null,
        title: data.title,
        dueDate: parseDateRequired(data.dueDate, 'dueDate'),
        isCompleted: false
      }
    })
  } catch (error) {
    log.error('Error creating task:', error)
    throw error
  }
})

ipcMain.handle('task:update', async (_, id: string, data: any) => {
  try {
    const client = await getPrisma()

    // 动态构建局部更新对象，只包含明确传递的字段
    const updateData: Record<string, any> = {}

    if (data.title !== undefined) {
      updateData.title = data.title
    }

    if (data.dueDate !== undefined && data.dueDate !== null && data.dueDate !== '') {
      const parsedDate = new Date(data.dueDate)
      if (isNaN(parsedDate.getTime())) {
        return { success: false, data: null, error: '传递的 dueDate 格式不正确' }
      }
      updateData.dueDate = parsedDate
    }

    if (data.isCompleted !== undefined) {
      updateData.isCompleted = data.isCompleted
    }

    const result = await client.task.update({ where: { id }, data: updateData })
    return { success: true, data: result, error: null }
  } catch (error: any) {
    log.error('Error updating task:', error)
    return { success: false, data: null, error: error.message }
  }
})

ipcMain.handle('task:delete', async (_, id: string) => {
  try {
    const client = await getPrisma()
    await client.task.delete({ where: { id } })
    return true
  } catch (error) {
    log.error('Error deleting task:', error)
    throw error
  }
})

// ============== Asset Management ==============

ipcMain.handle('asset:create', async (_, data: any) => {
  try {
    const client = await getPrisma()
    return await client.asset.create({
      data: {
        advisorId: data.advisorId,
        type: data.type,
        localPath: data.localPath
      }
    })
  } catch (error) {
    log.error('Error creating asset:', error)
    throw error
  }
})

ipcMain.handle('asset:delete', async (_, id: string) => {
  try {
    const client = await getPrisma()
    await client.asset.delete({ where: { id } })
    return true
  } catch (error) {
    log.error('Error deleting asset:', error)
    throw error
  }
})

// ============== Interview CRUD ==============

ipcMain.handle('interview:create', async (_, data: any) => {
  try {
    const client = await getPrisma()
    return await client.interview.create({
      data: {
        advisorId: data.advisorId,
        date: parseDateRequired(data.date, 'date'),
        format: data.format,
        markdownNotes: data.markdownNotes || ''
      }
    })
  } catch (error) {
    log.error('Error creating interview:', error)
    throw error
  }
})

ipcMain.handle('interview:update', async (_, id: string, data: any) => {
  try {
    const client = await getPrisma()
    const updateData: Record<string, any> = {}

    if (data.date !== undefined) {
      const parsed = new Date(data.date)
      if (isNaN(parsed.getTime())) {
        throw new Error('date 格式不正确')
      }
      updateData.date = parsed
    }
    if (data.format !== undefined) updateData.format = data.format
    if (data.markdownNotes !== undefined) updateData.markdownNotes = data.markdownNotes

    if (Object.keys(updateData).length === 0) {
      return await client.interview.findUnique({ where: { id } })
    }

    return await client.interview.update({
      where: { id },
      data: updateData
    })
  } catch (error) {
    log.error('Error updating interview:', error)
    throw error
  }
})

ipcMain.handle('interview:delete', async (_, id: string) => {
  try {
    const client = await getPrisma()
    await client.interview.delete({ where: { id } })
    return true
  } catch (error) {
    log.error('Error deleting interview:', error)
    throw error
  }
})

// ============== File Operations ==============

ipcMain.handle('file:selectFile', async (_, options: any) => {
  try {
    // 使用当前焦点窗口或 BrowserWindow.getFocusedWindow() 作为 fallback
    const targetWindow = mainWindow || BrowserWindow.getFocusedWindow()
    const dialogOptions: OpenDialogOptions = {
      properties: ['openFile'],
      filters: options?.filters || [
        { name: 'Documents', extensions: ['pdf', 'doc', 'docx', 'tex'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    }
    const result = targetWindow
      ? await dialog.showOpenDialog(targetWindow, dialogOptions)
      : await dialog.showOpenDialog(dialogOptions)
    return result.canceled ? null : result.filePaths[0]
  } catch (error) {
    log.error('Error selecting file:', error)
    throw error
  }
})

ipcMain.handle('file:openExternal', async (_, path: string) => {
  try {
    await shell.openPath(path)
    return true
  } catch (error) {
    log.error('Error opening file:', error)
    throw error
  }
})

ipcMain.handle('file:compileLatex', async (_, texPath: string) => {
  try {
    const dir = dirname(texPath)
    const exe = platform === 'win32' ? 'xelatex.exe' : 'xelatex'
    const args = ['-interaction=nonstopmode', texPath]

    return new Promise<{ success: boolean; stdout?: string; stderr?: string; error?: string }>((resolve) => {
      const proc = spawn(exe, args, { cwd: dir })
      let stdout = ''
      let stderr = ''
      proc.stdout?.on('data', (data) => { stdout += data.toString() })
      proc.stderr?.on('data', (data) => { stderr += data.toString() })
      proc.on('close', (code) => {
        if (code === 0) {
          resolve({ success: true, stdout, stderr })
        } else {
          resolve({ success: false, error: `xelatex exited with code ${code}`, stdout, stderr })
        }
      })
      proc.on('error', (err) => {
        resolve({ success: false, error: err.message })
      })
    })
  } catch (error: any) {
    log.error('Error compiling LaTeX:', error)
    return { success: false, error: error.message }
  }
})

// ============== Conflict Detection ==============

// ============== EmailTemplate CRUD ==============

ipcMain.handle('emailTemplate:getAll', async () => {
  try {
    const client = await getPrisma()
    const templates = await client.emailTemplate.findMany({
      include: { variables: true },
      orderBy: { createdAt: 'asc' }
    })
    return { success: true, data: templates }
  } catch (error: any) {
    log.error('Error fetching email templates:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('emailTemplate:create', async (_, data: any) => {
  try {
    const client = await getPrisma()
    const template = await client.emailTemplate.create({
      data: {
        name: data.name,
        subject: data.subject,
        content: data.content
      }
    })
    return { success: true, data: template }
  } catch (error: any) {
    log.error('Error creating email template:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('emailTemplate:update', async (_, id: string, data: any) => {
  try {
    const client = await getPrisma()
    const template = await client.emailTemplate.update({
      where: { id },
      data: {
        name: data.name,
        subject: data.subject,
        content: data.content
      },
      include: { variables: true }
    })
    return { success: true, data: template }
  } catch (error: any) {
    log.error('Error updating email template:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('emailTemplate:delete', async (_, id: string) => {
  try {
    const client = await getPrisma()
    await client.emailTemplate.delete({ where: { id } })
    return { success: true }
  } catch (error: any) {
    log.error('Error deleting email template:', error)
    return { success: false, error: error.message }
  }
})

// ============== EmailVariable CRUD ==============

ipcMain.handle('emailVariable:getByTemplate', async (_, templateId: string) => {
  try {
    const client = await getPrisma()
    const variables = await client.emailVariable.findMany({
      where: { templateId }
    })
    return { success: true, data: variables }
  } catch (error: any) {
    log.error('Error fetching email variables:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('emailVariable:create', async (_, data: any) => {
  try {
    const client = await getPrisma()
    const variable = await client.emailVariable.create({
      data: {
        name: data.name,
        templateId: data.templateId
      }
    })
    return { success: true, data: variable }
  } catch (error: any) {
    log.error('Error creating email variable:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('emailVariable:delete', async (_, id: string) => {
  try {
    const client = await getPrisma()
    await client.emailVariable.delete({ where: { id } })
    return { success: true }
  } catch (error: any) {
    log.error('Error deleting email variable:', error)
    return { success: false, error: error.message }
  }
})

// ============== Full Backup Export / Import ==============

ipcMain.handle('backup:exportAll', async () => {
  try {
    const client = await getPrisma()
    const [institutions, orphanTasks, emailTemplates] = await Promise.all([
      client.institution.findMany({
        include: {
          advisors: { include: { assets: true, interviews: true } },
          tasks: true
        }
      }),
      client.task.findMany({ where: { institutionId: null } }),
      client.emailTemplate.findMany({ include: { variables: true } })
    ])
    return {
      success: true,
      data: {
        version: app.getVersion(),
        exportedAt: new Date().toISOString(),
        institutions,
        orphanTasks,
        emailTemplates
      }
    }
  } catch (error: any) {
    log.error('Error exporting backup:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('backup:importAll', async (_, data: any) => {
  try {
    const client = await getPrisma()

    const counts = { institutions: 0, orphanTasks: 0, emailTemplates: 0 }

    await client.$transaction(async (tx: any) => {
      // 1. 导入邮件模板及变量（无外键依赖，先导入）
      if (Array.isArray(data.emailTemplates)) {
        for (const tpl of data.emailTemplates) {
          const { id, variables, ...tplRest } = tpl
          await tx.emailTemplate.create({ data: { id, ...tplRest } })
          if (Array.isArray(variables)) {
            for (const v of variables) {
              const { templateId, ...vRest } = v
              await tx.emailVariable.create({ data: { ...vRest, templateId: id } })
            }
          }
          counts.emailTemplates++
        }
      }

      // 2. 导入院校及其关联的导师、资产、面经、任务
      if (Array.isArray(data.institutions)) {
        for (const inst of data.institutions) {
          const { advisors, tasks, ...instRest } = inst
          await tx.institution.create({ data: instRest })
          if (Array.isArray(advisors)) {
            for (const advisor of advisors) {
              const { assets, interviews, ...advisorRest } = advisor
              const created = await tx.advisor.create({ data: advisorRest })
              if (Array.isArray(assets)) {
                for (const asset of assets) {
                  await tx.asset.create({ data: { ...asset, advisorId: created.id } })
                }
              }
              if (Array.isArray(interviews)) {
                for (const interview of interviews) {
                  await tx.interview.create({ data: { ...interview, advisorId: created.id } })
                }
              }
            }
          }
          if (Array.isArray(tasks)) {
            for (const task of tasks) {
              await tx.task.create({ data: { ...task, institutionId: inst.id } })
            }
          }
          counts.institutions++
        }
      }

      // 3. 导入独立任务
      if (Array.isArray(data.orphanTasks)) {
        for (const task of data.orphanTasks) {
          await tx.task.create({ data: { ...task, institutionId: null } })
          counts.orphanTasks++
        }
      }
    })

    return { success: true, data: counts }
  } catch (error: any) {
    log.error('Error importing backup:', error)
    return { success: false, error: error.message }
  }
})

// ============== Conflict Detection ==============

ipcMain.handle('advisor:getConflictWarnings', async (_, institutionId: string) => {
  try {
    const client = await getPrisma()
    const institution = await client.institution.findUnique({
      where: { id: institutionId },
      include: { advisors: true }
    })
    if (!institution) return []

    const warnings: string[] = []
    const sentAdvisors = institution.advisors.filter((a: any) => a.contactStatus === 'SENT')
    if (sentAdvisors.length > 1) {
      warnings.push(`同一院系 ${institution.name} 有 ${sentAdvisors.length} 位导师处于"已发送"状态但未回复`)
    }
    return warnings
  } catch (error) {
    log.error('Error checking conflicts:', error)
    throw error
  }
})

// App lifecycle
app.whenReady().then(async () => {
  if (platform === 'win32') {
    app.setAppUserModelId('com.pg-tracker.app')
  }

  // 初始化数据库（检测 schema 版本，必要时热替换）
  try {
    const dbPath = await initializeDatabase()
    process.env.DATABASE_URL = `file:${dbPath}`
    log.info('Database initialized at:', dbPath)

    const client = await getPrisma()
    await client.$connect()
    log.info('Database connected successfully')

    // 一次性清理重复的邮件模板（按 name 去重，只保留每个名称最早创建的一个）
    try {
      const allTemplates = await client.emailTemplate.findMany({ orderBy: { createdAt: 'asc' } })
      const seen = new Map<string, string>() // name -> first id
      const duplicateIds: string[] = []
      for (const tpl of allTemplates) {
        if (seen.has(tpl.name)) {
          duplicateIds.push(tpl.id)
        } else {
          seen.set(tpl.name, tpl.id)
        }
      }
      if (duplicateIds.length > 0) {
        await client.emailTemplate.deleteMany({ where: { id: { in: duplicateIds } } })
        log.info(`[Cleanup] Removed ${duplicateIds.length} duplicate email templates`)
      }
    } catch (err: any) {
      log.warn('[Cleanup] Failed to deduplicate email templates:', err?.message)
    }
  } catch (error: any) {
    const msg = `数据库初始化失败: ${error?.message}\n\nStack: ${error?.stack || '无堆栈'}`
    log.error(msg)
    dialog.showErrorBox('PG-Tracker 启动失败', msg)
    return // 初始化失败时不创建窗口，直接退出
  }

  createWindow()

  // 生产环境下初始化自动更新
  if (!isDev) {
    initUpdater(mainWindow!)
  }

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// ============== Auto Update IPC ==============

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
  if (prisma) {
    await prisma.$disconnect()
    prisma = null
  }
  autoUpdater.quitAndInstall()
})

app.on('window-all-closed', async () => {
  if (prisma) {
    await prisma.$disconnect()
  }
  if (platform !== 'darwin') {
    app.quit()
  }
})
