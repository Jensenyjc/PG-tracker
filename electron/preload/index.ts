/**
 * @Project: PG-Tracker
 * @File: preload/index.ts
 * @Description: Electron 预加载脚本，向渲染进程暴露安全的 IPC 桥接接口
 * @Author: 杨敬诚
 * @Date: 2026-04-08
 * Copyright (c) 2026. All rights reserved.
 */
import { contextBridge, ipcRenderer } from 'electron'

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
    create: (data: any) => ipcRenderer.invoke('institution:create', data),
    update: (id: string, data: any) => ipcRenderer.invoke('institution:update', id, data),
    delete: (id: string) => ipcRenderer.invoke('institution:delete', id)
  },
  advisor: {
    getByInstitution: (institutionId: string) => ipcRenderer.invoke('advisor:getByInstitution', institutionId),
    create: (data: any) => ipcRenderer.invoke('advisor:create', data),
    update: (id: string, data: any) => ipcRenderer.invoke('advisor:update', id, data),
    delete: (id: string) => ipcRenderer.invoke('advisor:delete', id),
    getConflictWarnings: (institutionId: string) => ipcRenderer.invoke('advisor:getConflictWarnings', institutionId)
  },
  task: {
    getByInstitution: (institutionId: string) => ipcRenderer.invoke('task:getByInstitution', institutionId),
    getOrphan: () => ipcRenderer.invoke('task:getOrphan'),
    create: (data: any) => ipcRenderer.invoke('task:create', data),
    update: (id: string, data: any) => ipcRenderer.invoke('task:update', id, data),
    delete: (id: string) => ipcRenderer.invoke('task:delete', id)
  },
  asset: {
    create: (data: any) => ipcRenderer.invoke('asset:create', data),
    delete: (id: string) => ipcRenderer.invoke('asset:delete', id)
  },
  interview: {
    create: (data: any) => ipcRenderer.invoke('interview:create', data),
    update: (id: string, data: any) => ipcRenderer.invoke('interview:update', id, data),
    delete: (id: string) => ipcRenderer.invoke('interview:delete', id)
  },
  file: {
    selectFile: (options?: any) => ipcRenderer.invoke('file:selectFile', options),
    openExternal: (path: string) => ipcRenderer.invoke('file:openExternal', path),
    compileLatex: (texPath: string) => ipcRenderer.invoke('file:compileLatex', texPath)
  },
  emailTemplate: {
    getAll: () => ipcRenderer.invoke('emailTemplate:getAll'),
    create: (data: any) => ipcRenderer.invoke('emailTemplate:create', data),
    update: (id: string, data: any) => ipcRenderer.invoke('emailTemplate:update', id, data),
    delete: (id: string) => ipcRenderer.invoke('emailTemplate:delete', id)
  },
  emailVariable: {
    getByTemplate: (templateId: string) => ipcRenderer.invoke('emailVariable:getByTemplate', templateId),
    create: (data: any) => ipcRenderer.invoke('emailVariable:create', data),
    delete: (id: string) => ipcRenderer.invoke('emailVariable:delete', id)
  },
  backup: {
    exportAll: () => ipcRenderer.invoke('backup:exportAll'),
    importAll: (data: any) => ipcRenderer.invoke('backup:importAll', data)
  },
  updater: {
    check: () => ipcRenderer.invoke('update:check'),
    download: () => ipcRenderer.invoke('update:download'),
    install: () => ipcRenderer.invoke('update:install'),
    onStatus: (callback: (status: any) => void) => {
      const listener = (_event: any, status: any) => callback(status)
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
