import { ElectronAPI } from '@electron-toolkit/preload'

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
    create: (data: any) => Promise<any>
    update: (id: string, data: any) => Promise<any>
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
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: CustomAPI
  }
}
