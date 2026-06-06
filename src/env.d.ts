/**
 * @Project: PG-Tracker
 * @File: env.d.ts
 * @Description: TypeScript 全局类型声明，扩展 ElectronAPI 并定义 renderer 进程中 IPC 调用接口
 * @Author: 杨敬诚
 * @Date: 2026-04-08
 * Copyright (c) 2026. All rights reserved.
 */
import { ElectronAPI } from '@electron-toolkit/preload'
import type {
  Advisor,
  AdvisorInput,
  Asset,
  EmailTemplate,
  EmailVariable,
  Institution,
  InstitutionInput,
  Interview,
  InterviewInput,
  PersonalResource,
  PersonalResourceInput,
  Task,
  TaskInput,
  TaskUpdate
} from './stores/appStore'

/** 统一的 API 响应格式 */
interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
}

interface FileSelectOptions {
  title?: string
  filters?: Array<{ name: string; extensions: string[] }>
  properties?: Array<'openFile' | 'openDirectory' | 'multiSelections'>
}

interface BackupData {
  version?: string
  exportedAt?: string
  institutions?: Institution[]
  orphanTasks?: Task[]
  emailTemplates?: EmailTemplate[]
  personalResources?: PersonalResource[]
}

interface CustomAPI {
  app: {
    getVersion: () => Promise<string>
  }
  institution: {
    getAll: () => Promise<Institution[]>
    getById: (id: string) => Promise<Institution | null>
    create: (data: InstitutionInput) => Promise<Institution>
    update: (id: string, data: Partial<InstitutionInput>) => Promise<Institution>
    reorder: (tier: Institution['tier'], orderedIds: string[]) => Promise<boolean>
    move: (id: string, tier: Institution['tier'], orderedIds: string[]) => Promise<boolean>
    delete: (id: string) => Promise<boolean>
  }
  advisor: {
    getByInstitution: (institutionId: string) => Promise<Advisor[]>
    create: (data: AdvisorInput) => Promise<Advisor>
    update: (id: string, data: Partial<AdvisorInput>) => Promise<Advisor>
    delete: (id: string) => Promise<boolean>
    getConflictWarnings: (institutionId: string) => Promise<string[]>
  }
  task: {
    getByInstitution: (institutionId: string) => Promise<Task[]>
    getOrphan: () => Promise<Task[]>
    create: (data: TaskInput) => Promise<Task>
    update: (id: string, data: TaskUpdate) => Promise<ApiResponse<Task>>
    delete: (id: string) => Promise<boolean>
  }
  asset: {
    create: (data: Omit<Asset, 'id'>) => Promise<Asset>
    delete: (id: string) => Promise<boolean>
  }
  interview: {
    create: (data: InterviewInput) => Promise<Interview>
    update: (id: string, data: Partial<InterviewInput>) => Promise<Interview>
    delete: (id: string) => Promise<boolean>
  }
  personalResource: {
    getAll: () => Promise<PersonalResource[]>
    create: (data: PersonalResourceInput) => Promise<PersonalResource>
    update: (id: string, data: Partial<PersonalResourceInput>) => Promise<PersonalResource>
    delete: (id: string) => Promise<boolean>
  }
  file: {
    selectFile: (options?: FileSelectOptions) => Promise<string | null>
    selectPaths: (options?: FileSelectOptions) => Promise<string[]>
    openExternal: (path: string) => Promise<boolean>
    compileLatex: (texPath: string) => Promise<{ success: boolean; stdout?: string; stderr?: string; error?: string }>
  }
  emailTemplate: {
    getAll: () => Promise<ApiResponse<EmailTemplate[]>>
    create: (data: { name: string; subject: string; content: string }) => Promise<ApiResponse<EmailTemplate>>
    update: (id: string, data: { name: string; subject: string; content: string }) => Promise<ApiResponse<EmailTemplate>>
    delete: (id: string) => Promise<ApiResponse>
  }
  emailVariable: {
    getByTemplate: (templateId: string) => Promise<ApiResponse<EmailVariable[]>>
    create: (data: { name: string; templateId: string }) => Promise<ApiResponse<EmailVariable>>
    delete: (id: string) => Promise<ApiResponse>
  }
  backup: {
    exportAll: () => Promise<ApiResponse<{ version: string; exportedAt: string; institutions: Institution[]; orphanTasks: Task[]; emailTemplates: EmailTemplate[]; personalResources: PersonalResource[] }>>
    clearAll: () => Promise<ApiResponse>
    importAll: (data: BackupData, options?: { mode?: 'replace' | 'append' }) => Promise<ApiResponse<{ institutions: number; orphanTasks: number; emailTemplates: number; personalResources: number }>>
  }
  updater: {
    check: () => Promise<ApiResponse>
    download: () => Promise<ApiResponse>
    install: () => void
    onStatus: (callback: (status: UpdateStatus) => void) => () => void
  }
}

interface UpdateStatus {
  phase: 'idle' | 'checking' | 'available' | 'not-available' | 'downloading' | 'downloaded' | 'error'
  version?: string
  percent?: number
  error?: string
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: CustomAPI
  }
}

export {}
