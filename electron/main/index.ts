import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import log from 'electron-log'
import { PrismaClient } from '@prisma/client'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

// Initialize Prisma
const prisma = new PrismaClient()

// Setup logging
log.transports.file.level = 'info'
log.info('Application starting...')

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
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// ============== Institution CRUD ==============

ipcMain.handle('institution:getAll', async () => {
  try {
    return await prisma.institution.findMany({
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
    return await prisma.institution.findUnique({
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
    return await prisma.institution.create({
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
    return await prisma.institution.update({
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
    await prisma.institution.delete({ where: { id } })
    return true
  } catch (error) {
    log.error('Error deleting institution:', error)
    throw error
  }
})

// ============== Advisor CRUD ==============

ipcMain.handle('advisor:getByInstitution', async (_, institutionId: string) => {
  try {
    return await prisma.advisor.findMany({
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
    return await prisma.advisor.create({
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
    return await prisma.advisor.update({
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
    await prisma.advisor.delete({ where: { id } })
    return true
  } catch (error) {
    log.error('Error deleting advisor:', error)
    throw error
  }
})

// ============== Task CRUD ==============

ipcMain.handle('task:getByInstitution', async (_, institutionId: string) => {
  try {
    return await prisma.task.findMany({
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
    return await prisma.task.create({
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
    return await prisma.task.update({
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
    await prisma.task.delete({ where: { id } })
    return true
  } catch (error) {
    log.error('Error deleting task:', error)
    throw error
  }
})

// ============== Asset Management ==============

ipcMain.handle('asset:create', async (_, data: any) => {
  try {
    return await prisma.asset.create({
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
    await prisma.asset.delete({ where: { id } })
    return true
  } catch (error) {
    log.error('Error deleting asset:', error)
    throw error
  }
})

// ============== Interview CRUD ==============

ipcMain.handle('interview:create', async (_, data: any) => {
  try {
    return await prisma.interview.create({
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
    return await prisma.interview.update({
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
    await prisma.interview.delete({ where: { id } })
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
    const command = process.platform === 'win32'
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
    const institution = await prisma.institution.findUnique({
      where: { id: institutionId },
      include: { advisors: true }
    })
    if (!institution) return []

    const warnings: string[] = []
    const sentAdvisors = institution.advisors.filter(a => a.contactStatus === 'SENT')
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
app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.pg-tracker.app')
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  prisma.$connect().then(() => {
    log.info('Database connected')
  }).catch((error) => {
    log.error('Database connection failed:', error)
  })

  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  prisma.$disconnect()
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
