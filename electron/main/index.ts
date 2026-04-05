import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import { join, dirname } from 'path'
import { existsSync, copyFileSync, unlinkSync } from 'fs'
import log from 'electron-log'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

// Platform detection
const isDev = !app.isPackaged
const platform = process.platform || 'win32'

// ==================== Prisma Client 初始化 ====================
let prisma: any = null

/**
 * 数据库初始化主函数。
 * 每次启动时检测用户数据库的 schema 版本，如果缺少 EmailTemplate 表，
 * 说明是旧版本安装后覆盖安装的场景，强制用安装包里的最新数据库替换。
 */
async function initializeDatabase(): Promise<string> {
  if (isDev) {
    log.info('[Dev] Using local dev database at:', join(__dirname, '../../prisma/dev.db'))
    return join(__dirname, '../../prisma/dev.db')
  }

  const userDataPath = app.getPath('userData')
  const userDbPath = join(userDataPath, 'dev.db')
  const resourceDbPath = join(process.resourcesPath, 'prisma', 'dev.db')

  if (!existsSync(userDbPath)) {
    // 首次安装
    if (existsSync(resourceDbPath)) {
      copyFileSync(resourceDbPath, userDbPath)
      log.info('[Prod] First run: copied seed database from resources')
    }
    return userDbPath
  }

  // 覆盖安装场景：检测 EmailTemplate 表是否存在于用户数据库
  try {
    const client = await getPrisma()
    await client.emailTemplate.findFirst({ select: { id: true } })
    log.info('[Prod] User database schema is up to date')
    return userDbPath
  } catch (err: any) {
    // 表不存在，说明是旧版本覆盖安装
    log.warn('[Prod] User database schema is outdated. Replacing with fresh database from resources.', err?.message)
    try { unlinkSync(userDbPath) } catch {}
    if (existsSync(resourceDbPath)) {
      copyFileSync(resourceDbPath, userDbPath)
      log.info('[Prod] Database replaced successfully')
    }
    return userDbPath
  }
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

  // 生产环境：extraResources 中的 .prisma/client 目录
  const extraPrismaPath = join(process.resourcesPath, '.prisma', 'client')
  log.info('Prisma client path (extraResources):', extraPrismaPath)
  log.info('index.js exists:', existsSync(join(extraPrismaPath, 'index.js')))
  return extraPrismaPath
}

async function getPrisma(): Promise<any> {
  if (!prisma) {
    const prismaPath = getPrismaClientPath()

    // 验证关键文件存在
    const engineFile = join(prismaPath, 'query_engine-windows.dll.node')
    log.info('=== Prisma Init ===')
    log.info('  Prisma Client path:', prismaPath)
    log.info('  Database URL:', process.env.DATABASE_URL)
    log.info('  app.isPackaged:', app.isPackaged)
    log.info('  query engine exists:', existsSync(engineFile))

    if (!isDev) {
      process.env.PRISMA_QUERY_ENGINE_LIBRARY = engineFile
    }

    try {
      const { PrismaClient } = require(prismaPath)
      prisma = new PrismaClient()
    } catch (err) {
      log.error('Failed to load Prisma Client:', err)
      throw err
    }
  }
  return prisma
}

log.transports.file.level = 'info'
log.info('Application starting...', { isDev, platform })

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
    shell.openExternal(details.url)
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
      include: { advisors: true, tasks: true },
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
        campDeadline: data.campDeadline ? new Date(data.campDeadline) : null,
        pushDeadline: data.pushDeadline ? new Date(data.pushDeadline) : null,
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
    return await client.institution.update({
      where: { id },
      data: {
        name: data.name,
        department: data.department,
        tier: data.tier,
        degreeType: data.degreeType,
        campDeadline: data.campDeadline ? new Date(data.campDeadline) : null,
        pushDeadline: data.pushDeadline ? new Date(data.pushDeadline) : null,
        expectedQuota: data.expectedQuota,
        policyTags: JSON.stringify(data.policyTags || [])
      },
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
    return await client.advisor.update({
      where: { id },
      data: {
        name: data.name,
        title: data.title,
        researchArea: data.researchArea,
        email: data.email,
        homepage: data.homepage,
        contactStatus: data.contactStatus,
        lastContactDate: data.lastContactDate ? new Date(data.lastContactDate) : null,
        reputationScore: data.reputationScore,
        notes: data.notes
      },
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
        dueDate: new Date(data.dueDate),
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

    if (data.dueDate !== undefined) {
      if (data.dueDate === null || data.dueDate === '') {
        updateData.dueDate = null
      } else {
        const parsedDate = new Date(data.dueDate)
        if (isNaN(parsedDate.getTime())) {
          return { success: false, data: null, error: '传递的 dueDate 格式不正确' }
        }
        updateData.dueDate = parsedDate
      }
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
        date: new Date(data.date),
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
    return await client.interview.update({
      where: { id },
      data: {
        date: new Date(data.date),
        format: data.format,
        markdownNotes: data.markdownNotes
      }
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
    const result = await dialog.showOpenDialog(mainWindow!, {
      properties: ['openFile'],
      filters: options?.filters || [
        { name: 'Documents', extensions: ['pdf', 'doc', 'docx', 'tex'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    })
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
    const dir = texPath.substring(0, texPath.lastIndexOf('/') || texPath.lastIndexOf('\\'))
    const command = platform === 'win32'
      ? `cd /d "${dir}" && xelatex -interaction=nonstopmode "${texPath}"`
      : `cd "${dir}" && xelatex -interaction=nonstopmode "${texPath}"`
    const { stdout, stderr } = await execAsync(command)
    return { success: true, stdout, stderr }
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
  } catch (error) {
    log.error('Database initialization failed:', error)
  }

  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', async () => {
  if (prisma) {
    await prisma.$disconnect()
  }
  if (platform !== 'darwin') {
    app.quit()
  }
})
