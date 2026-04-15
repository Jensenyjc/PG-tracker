/**
 * @Project: PG-Tracker
 * @File: env.d.ts
 * @Description: TypeScript 全局类型声明，扩展 ElectronAPI 并定义 renderer 进程中 IPC 调用接口
 * @Author: 杨敬诚
 * @Date: 2026-04-08
 * Copyright (c) 2026. All rights reserved.
 */
import { ElectronAPI } from '@electron-toolkit/preload'

/** 统一的 API 响应格式 */
interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
}

interface CustomAPI {
  institution: {
    getAll: () => Promise<any[]>
    getById: (id: string) => Promise<any>
    create: (data: any) => Promise<any>
    update: (id: string, data: any) => Promise<any>
    delete: (id: string) => Promise<boolean>
  }
  advisor: {
    getByInstitution: (institutionId: string) => Promise<any[]>
    create: (data: any) => Promise<any>
    update: (id: string, data: any) => Promise<any>
    delete: (id: string) => Promise<boolean>
    getConflictWarnings: (institutionId: string) => Promise<string[]>
  }
  task: {
    getByInstitution: (institutionId: string) => Promise<any[]>
    getOrphan: () => Promise<any[]>
    create: (data: any) => Promise<any>
    update: (id: string, data: any) => Promise<ApiResponse>
    delete: (id: string) => Promise<boolean>
  }
  asset: {
    create: (data: any) => Promise<any>
    delete: (id: string) => Promise<boolean>
  }
  interview: {
    create: (data: any) => Promise<any>
    update: (id: string, data: any) => Promise<any>
    delete: (id: string) => Promise<boolean>
  }
  file: {
    selectFile: (options?: any) => Promise<string | null>
    openExternal: (path: string) => Promise<boolean>
    compileLatex: (texPath: string) => Promise<{ success: boolean; stdout?: string; stderr?: string; error?: string }>
  }
  emailTemplate: {
    getAll: () => Promise<ApiResponse<any[]>>
    create: (data: any) => Promise<ApiResponse>
    update: (id: string, data: any) => Promise<ApiResponse>
    delete: (id: string) => Promise<ApiResponse>
  }
  emailVariable: {
    getByTemplate: (templateId: string) => Promise<ApiResponse<any[]>>
    create: (data: any) => Promise<ApiResponse>
    delete: (id: string) => Promise<ApiResponse>
  }
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: CustomAPI
  }
}
