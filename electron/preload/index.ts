/**
 * @Project: PG-Tracker
 * @File: preload/index.ts
 * @Description: Electron 预加载脚本，向渲染进程暴露安全的 IPC 桥接接口
 * @Author: 杨敬诚
 * @Date: 2026-04-08
 * Copyright (c) 2026. All rights reserved.
 */
import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron'

interface InstitutionInput {
  name: string
  department: string
  tier: 'REACH' | 'MATCH' | 'SAFETY'
  degreeType: 'MASTER' | 'PROFESSIONAL' | 'PHD'
  campDeadline: string | Date | null
  pushDeadline: string | Date | null
  expectedQuota: number | null
  policyTags: string[]
}

interface AdvisorInput {
  institutionId: string
  name: string
  title: string | null
  researchArea: string
  email: string
  homepage: string | null
  contactStatus: 'PENDING' | 'SENT' | 'REPLIED' | 'INTERVIEW' | 'REJECTED' | 'ACCEPTED'
  lastContactDate?: string | Date | null
  reputationScore: number | null
  notes: string | null
}

interface TaskInput {
  institutionId?: string
  title: string
  dueDate: string | Date
  isCompleted: boolean
}

type TaskUpdate = Partial<Omit<TaskInput, 'dueDate'>> & {
  dueDate?: string | Date | null
}

interface AssetInput {
  advisorId: string | null
  type: 'RESUME' | 'TRANSCRIPT' | 'RECOMMENDATION' | 'OTHER'
  localPath: string
}

interface InterviewInput {
  advisorId: string
  date: string | Date
  format: 'ONLINE' | 'OFFLINE'
  markdownNotes: string
}

interface FileSelectOptions {
  title?: string
  filters?: Array<{ name: string; extensions: string[] }>
  properties?: Array<'openFile' | 'openDirectory' | 'multiSelections'>
}

interface BackupData {
  version?: string
  exportedAt?: string
  institutions?: unknown[]
  orphanTasks?: unknown[]
  emailTemplates?: unknown[]
}

interface UpdateStatus {
  phase: 'idle' | 'checking' | 'available' | 'not-available' | 'downloading' | 'downloaded' | 'error'
  version?: string
  percent?: number
  error?: string
}

// Electron API exposed to renderer
const electronAPI = {
  platform: process.platform
}

const api = {
  app: {
    getVersion: () => ipcRenderer.invoke('app:getVersion')
  },
  institution: {
    getAll: () => ipcRenderer.invoke('institution:getAll'),
    getById: (id: string) => ipcRenderer.invoke('institution:getById', id),
    create: (data: InstitutionInput) => ipcRenderer.invoke('institution:create', data),
    update: (id: string, data: Partial<InstitutionInput>) => ipcRenderer.invoke('institution:update', id, data),
    reorder: (tier: 'REACH' | 'MATCH' | 'SAFETY', orderedIds: string[]) => ipcRenderer.invoke('institution:reorder', tier, orderedIds),
    delete: (id: string) => ipcRenderer.invoke('institution:delete', id)
  },
  advisor: {
    getByInstitution: (institutionId: string) => ipcRenderer.invoke('advisor:getByInstitution', institutionId),
    create: (data: AdvisorInput) => ipcRenderer.invoke('advisor:create', data),
    update: (id: string, data: Partial<AdvisorInput>) => ipcRenderer.invoke('advisor:update', id, data),
    delete: (id: string) => ipcRenderer.invoke('advisor:delete', id),
    getConflictWarnings: (institutionId: string) => ipcRenderer.invoke('advisor:getConflictWarnings', institutionId)
  },
  task: {
    getByInstitution: (institutionId: string) => ipcRenderer.invoke('task:getByInstitution', institutionId),
    getOrphan: () => ipcRenderer.invoke('task:getOrphan'),
    create: (data: TaskInput) => ipcRenderer.invoke('task:create', data),
    update: (id: string, data: TaskUpdate) => ipcRenderer.invoke('task:update', id, data),
    delete: (id: string) => ipcRenderer.invoke('task:delete', id)
  },
  asset: {
    create: (data: AssetInput) => ipcRenderer.invoke('asset:create', data),
    delete: (id: string) => ipcRenderer.invoke('asset:delete', id)
  },
  interview: {
    create: (data: InterviewInput) => ipcRenderer.invoke('interview:create', data),
    update: (id: string, data: Partial<InterviewInput>) => ipcRenderer.invoke('interview:update', id, data),
    delete: (id: string) => ipcRenderer.invoke('interview:delete', id)
  },
  file: {
    selectFile: (options?: FileSelectOptions) => ipcRenderer.invoke('file:selectFile', options),
    openExternal: (path: string) => ipcRenderer.invoke('file:openExternal', path),
    compileLatex: (texPath: string) => ipcRenderer.invoke('file:compileLatex', texPath)
  },
  emailTemplate: {
    getAll: () => ipcRenderer.invoke('emailTemplate:getAll'),
    create: (data: { name: string; subject: string; content: string }) => ipcRenderer.invoke('emailTemplate:create', data),
    update: (id: string, data: { name: string; subject: string; content: string }) => ipcRenderer.invoke('emailTemplate:update', id, data),
    delete: (id: string) => ipcRenderer.invoke('emailTemplate:delete', id)
  },
  emailVariable: {
    getByTemplate: (templateId: string) => ipcRenderer.invoke('emailVariable:getByTemplate', templateId),
    create: (data: { name: string; templateId: string }) => ipcRenderer.invoke('emailVariable:create', data),
    delete: (id: string) => ipcRenderer.invoke('emailVariable:delete', id)
  },
  backup: {
    exportAll: () => ipcRenderer.invoke('backup:exportAll'),
    clearAll: () => ipcRenderer.invoke('backup:clearAll'),
    importAll: (data: BackupData, options?: { mode?: 'replace' | 'append' }) => ipcRenderer.invoke('backup:importAll', data, options)
  },
  updater: {
    check: () => ipcRenderer.invoke('update:check'),
    download: () => ipcRenderer.invoke('update:download'),
    install: () => ipcRenderer.invoke('update:install'),
    onStatus: (callback: (status: UpdateStatus) => void) => {
      const listener = (_event: IpcRendererEvent, status: UpdateStatus) => callback(status)
      ipcRenderer.on('update:status', listener)
      return () => { ipcRenderer.removeListener('update:status', listener) }
    }
  }
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-expect-error - window.electron may not exist in type definitions
  window.electron = electronAPI
  // @ts-expect-error - window.api may not exist in type definitions
  window.api = api
}
