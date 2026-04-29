/**
 * @Project: PG-Tracker
 * @File: updater.ts
 * @Description: 自动更新模块，基于 electron-updater 实现三平台软件更新
 * @Author: 杨敬诚
 * @Date: 2026-04-29
 */
import { autoUpdater } from 'electron-updater'
import { BrowserWindow } from 'electron'
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

  autoUpdater.logger = log
  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = false

  autoUpdater.on('checking-for-update', () => {
    sendStatus({ phase: 'checking' })
  })

  autoUpdater.on('update-available', (info) => {
    sendStatus({ phase: 'available', version: info.version })
  })

  autoUpdater.on('update-not-available', () => {
    sendStatus({ phase: 'not-available' })
  })

  autoUpdater.on('download-progress', (progress) => {
    sendStatus({ phase: 'downloading', percent: Math.round(progress.percent) })
  })

  autoUpdater.on('update-downloaded', (info) => {
    sendStatus({ phase: 'downloaded', version: info.version })
  })

  autoUpdater.on('error', (err) => {
    log.error('Updater error:', err)
    sendStatus({ phase: 'error', error: err.message })
  })

  // 启动后 1 秒自动检查
  setTimeout(() => {
    autoUpdater.checkForUpdates().catch((err) => {
      log.error('Initial update check failed:', err)
    })
  }, 1000)

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
