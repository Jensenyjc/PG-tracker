import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import { join, dirname } from 'path'
import { existsSync, copyFileSync, mkdirSync } from 'fs'
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
 * 获取数据库路径。
 * 开发环境：项目根目录 prisma/dev.db
 * 生产环境：userData 目录（可写），首次运行时从 extraResources 复制
 */
function getDatabasePath(): string {
  if (isDev) {
    return join(__dirname, '../../prisma/dev.db')
  }

  // 生产环境：使用 userData 目录（可写，不在 asar 内）
  const userDataPath = app.getPath('userData')
  const userDbPath = join(userDataPath, 'dev.db')

  // 如果 userData 中没有 db 文件，从 extraResources 复制一份作为初始数据库
  // 注意：只有首次安装时才复制，之后用户数据会保留在 userData 中
  if (!existsSync(userDbPath)) {
    const resourceDbPath = join(process.resourcesPath, 'prisma', 'dev.db')
    log.info('First run detected: copying seed database from resources to userData:', resourceDbPath, '->', userDbPath)
    if (existsSync(resourceDbPath)) {
      copyFileSync(resourceDbPath, userDbPath)
    } else {
      log.warn('No seed database found at:', resourceDbPath)
      // 如果连 seed 都没有，创建一个空数据库文件
      // Prisma 会在首次连接时自动创建表结构
    }
  } else {
    log.info('User database found at:', userDbPath, '- preserving existing data')
  }

  return userDbPath
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
    const dbPath = getDatabasePath()

    log.info('=== Prisma Init ===')
    log.info('  Prisma Client path:', prismaPath)
    log.info('  Database path:', dbPath)
    log.info('  app.isPackaged:', app.isPackaged)
    log.info('  process.resourcesPath:', process.resourcesPath)

    // 验证关键文件存在
    const engineFile = join(prismaPath, 'query_engine-windows.dll.node')
    const schemaFile = join(prismaPath, 'schema.prisma')
    log.info('  query engine exists:', existsSync(engineFile))
    log.info('  schema.prisma exists:', existsSync(schemaFile))

    // 告诉 Prisma 引擎的确切位置（生产环境必需）
    if (!isDev) {
      process.env.PRISMA_QUERY_ENGINE_LIBRARY = engineFile
    }

    try {
      const { PrismaClient } = require(prismaPath)
      prisma = new PrismaClient({
        datasources: {
          db: {
            url: `file:${dbPath}`
          }
        }
      })
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

ipcMain.handle('task:create', async (_, data: any) => {
  try {
    const client = await getPrisma()
    return await client.task.create({
      data: {
        institutionId: data.institutionId,
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
    return await client.task.update({
      where: { id },
      data: {
        title: data.title,
        dueDate: new Date(data.dueDate),
        isCompleted: data.isCompleted
      }
    })
  } catch (error) {
    log.error('Error updating task:', error)
    throw error
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
  // Set app user model id for windows
  if (platform === 'win32') {
    app.setAppUserModelId('com.pg-tracker.app')
  }

  // Initialize Prisma
  try {
    const client = await getPrisma()
    await client.$connect()
    log.info('Database connected successfully')
  } catch (error) {
    log.error('Database connection failed:', error)
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
