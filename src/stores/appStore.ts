/**
 * @Project: PG-Tracker
 * @File: appStore.ts
 * @Description: 应用全局状态管理，通过 Zustand 管理院校、导师、任务、邮件模板等数据的增删改查及 UI 状态
 * @Author: 杨敬诚
 * @Date: 2026-04-08
 * Copyright (c) 2026. All rights reserved.
 */
import { create } from 'zustand'

export interface Institution {
  id: string
  name: string
  department: string
  tier: 'REACH' | 'MATCH' | 'SAFETY'
  degreeType: 'MASTER' | 'PROFESSIONAL' | 'PHD'
  campDeadline: string | null
  pushDeadline: string | null
  expectedQuota: number | null
  policyTags: string
  createdAt: string
  updatedAt: string
  advisors?: Advisor[]
  tasks?: Task[]
}

export interface Advisor {
  id: string
  institutionId: string
  name: string
  title: string | null
  researchArea: string
  email: string
  homepage: string | null
  contactStatus: 'PENDING' | 'SENT' | 'REPLIED' | 'INTERVIEW' | 'REJECTED' | 'ACCEPTED'
  lastContactDate: string | null
  reputationScore: number | null
  notes: string | null
  assets?: Asset[]
  interviews?: Interview[]
}

export interface Task {
  id: string
  institutionId: string
  title: string
  dueDate: string
  isCompleted: boolean
}

export interface Asset {
  id: string
  advisorId: string | null
  type: 'RESUME' | 'TRANSCRIPT' | 'RECOMMENDATION' | 'OTHER'
  localPath: string
}

export interface Interview {
  id: string
  advisorId: string
  date: string
  format: 'ONLINE' | 'OFFLINE'
  markdownNotes: string
}

export interface InstitutionInput {
  name: string
  department: string
  tier: Institution['tier']
  degreeType: Institution['degreeType']
  campDeadline: string | Date | null
  pushDeadline: string | Date | null
  expectedQuota: number | null
  policyTags: string[]
}

export interface AdvisorInput {
  institutionId: string
  name: string
  title: string | null
  researchArea: string
  email: string
  homepage: string | null
  contactStatus: Advisor['contactStatus']
  lastContactDate?: string | Date | null
  reputationScore: number | null
  notes: string | null
}

export interface TaskInput {
  institutionId?: string
  title: string
  dueDate: string | Date
  isCompleted: boolean
}

export type TaskUpdate = Partial<Omit<TaskInput, 'dueDate'>> & {
  dueDate?: string | Date | null
}

export interface InterviewInput {
  advisorId: string
  date: string | Date
  format: Interview['format']
  markdownNotes: string
}

type View = 'dashboard' | 'kanban' | 'timeline' | 'templates' | 'settings'

interface AppState {
  currentView: View
  selectedInstitutionId: string | null
  institutions: Institution[]
  orphanTasks: Task[]
  isLoading: boolean
  error: string | null
  conflictWarnings: string[]
  emailTemplates: any[]
  setView: (view: View) => void
  setSelectedInstitutionId: (id: string | null) => void
  loadInstitutions: () => Promise<void>
  loadOrphanTasks: () => Promise<void>
  addInstitution: (data: InstitutionInput) => Promise<Institution>
  updateInstitution: (id: string, data: Partial<InstitutionInput>) => Promise<Institution>
  deleteInstitution: (id: string) => Promise<void>
  addAdvisor: (data: AdvisorInput) => Promise<Advisor>
  updateAdvisor: (id: string, data: Partial<AdvisorInput>) => Promise<void>
  deleteAdvisor: (id: string) => Promise<void>
  addTask: (data: TaskInput) => Promise<Task>
  updateTask: (id: string, data: TaskUpdate) => Promise<void>
  deleteTask: (id: string) => Promise<void>
  addAsset: (data: Omit<Asset, 'id'>) => Promise<Asset>
  deleteAsset: (id: string) => Promise<void>
  addInterview: (data: InterviewInput) => Promise<Interview>
  updateInterview: (id: string, data: Partial<InterviewInput>) => Promise<void>
  deleteInterview: (id: string) => Promise<void>
  checkConflicts: (institutionId: string) => Promise<void>
  clearError: () => void
  loadEmailTemplates: () => Promise<void>
  createEmailTemplate: (data: { name: string; subject: string; content: string }) => Promise<any>
  updateEmailTemplate: (id: string, data: { name: string; subject: string; content: string }) => Promise<any>
  deleteEmailTemplate: (id: string) => Promise<void>
  createEmailVariable: (data: { name: string; templateId: string }) => Promise<any>
  deleteEmailVariable: (id: string) => Promise<void>
}

export const useStore = create<AppState>((set, get) => ({
  currentView: 'kanban',
  selectedInstitutionId: null,
  institutions: [],
  orphanTasks: [],
  isLoading: false,
  error: null,
  conflictWarnings: [],
  emailTemplates: [],

  setView: (view) => set({ currentView: view }),
  setSelectedInstitutionId: (id) => set({ selectedInstitutionId: id }),

  loadInstitutions: async () => {
    set({ isLoading: true, error: null })
    try {
      const data = await window.api.institution.getAll()
      set({ institutions: data, isLoading: false })
    } catch (error: any) {
      set({ error: error.message, isLoading: false })
    }
  },

  loadOrphanTasks: async () => {
    try {
      const tasks = await window.api.task.getOrphan()
      set({ orphanTasks: tasks })
    } catch (error: any) {
      set({ error: error.message })
    }
  },

  addInstitution: async (data) => {
    set({ isLoading: true, error: null })
    try {
      const newInstitution = await window.api.institution.create(data)
      const institutions = await window.api.institution.getAll()
      set({ institutions, isLoading: false })
      return institutions.find((i) => i.id === newInstitution.id) || newInstitution
    } catch (error: any) {
      set({ error: error.message, isLoading: false })
      throw error
    }
  },

  updateInstitution: async (id, data) => {
    set({ isLoading: true, error: null })
    try {
      const updated = await window.api.institution.update(id, data)
      const institutions = await window.api.institution.getAll()
      set({ institutions, isLoading: false })
      return institutions.find((i) => i.id === id) || updated
    } catch (error: any) {
      set({ error: error.message, isLoading: false })
      throw error
    }
  },

  deleteInstitution: async (id) => {
    set({ isLoading: true, error: null })
    try {
      await window.api.institution.delete(id)
      set((state) => ({
        institutions: state.institutions.filter((i) => i.id !== id),
        isLoading: false
      }))
    } catch (error: any) {
      set({ error: error.message, isLoading: false })
      throw error
    }
  },

  addAdvisor: async (data) => {
    try {
      const newAdvisor = await window.api.advisor.create(data)
      await get().loadInstitutions()
      return newAdvisor
    } catch (error: any) {
      set({ error: error.message })
      throw error
    }
  },

  updateAdvisor: async (id, data) => {
    try {
      await window.api.advisor.update(id, data)
      await get().loadInstitutions()
    } catch (error: any) {
      set({ error: error.message })
      throw error
    }
  },

  deleteAdvisor: async (id) => {
    try {
      await window.api.advisor.delete(id)
      await get().loadInstitutions()
    } catch (error: any) {
      set({ error: error.message })
      throw error
    }
  },

  addTask: async (data) => {
    try {
      const newTask = await window.api.task.create(data)
      await get().loadInstitutions()
      if (!data.institutionId) {
        await get().loadOrphanTasks()
      }
      return newTask
    } catch (error: any) {
      set({ error: error.message })
      throw error
    }
  },

  updateTask: async (id, data) => {
    try {
      const result = await window.api.task.update(id, data)
      // handler 现在返回 { success, data, error } 结构
      if (!result.success) {
        throw new Error(result.error || '更新任务失败')
      }
      await get().loadInstitutions()
    } catch (error: any) {
      set({ error: error.message })
      throw error
    }
  },

  deleteTask: async (id) => {
    try {
      await window.api.task.delete(id)
      await get().loadInstitutions()
    } catch (error: any) {
      set({ error: error.message })
      throw error
    }
  },

  addAsset: async (data) => {
    try {
      const asset = await window.api.asset.create(data)
      await get().loadInstitutions()
      return asset
    } catch (error: any) {
      set({ error: error.message })
      throw error
    }
  },

  deleteAsset: async (id) => {
    try {
      await window.api.asset.delete(id)
      await get().loadInstitutions()
    } catch (error: any) {
      set({ error: error.message })
      throw error
    }
  },

  addInterview: async (data) => {
    try {
      const interview = await window.api.interview.create(data)
      await get().loadInstitutions()
      return interview
    } catch (error: any) {
      set({ error: error.message })
      throw error
    }
  },

  updateInterview: async (id, data) => {
    try {
      await window.api.interview.update(id, data)
      await get().loadInstitutions()
    } catch (error: any) {
      set({ error: error.message })
      throw error
    }
  },

  deleteInterview: async (id) => {
    try {
      await window.api.interview.delete(id)
      await get().loadInstitutions()
    } catch (error: any) {
      set({ error: error.message })
      throw error
    }
  },

  checkConflicts: async (institutionId) => {
    try {
      const warnings = await window.api.advisor.getConflictWarnings(institutionId)
      set({ conflictWarnings: warnings })
    } catch (error: any) {
      set({ error: error.message })
    }
  },

  clearError: () => set({ error: null }),

  loadEmailTemplates: async () => {
    try {
      const result = await window.api.emailTemplate.getAll()
      if (!result.success) {
        set({ error: result.error })
        return
      }
      // data is the array of templates with their variables
      set({ emailTemplates: result.data })
    } catch (error: any) {
      set({ error: error.message })
    }
  },

  createEmailTemplate: async (data) => {
    try {
      const result = await window.api.emailTemplate.create(data)
      if (!result.success) {
        set({ error: result.error })
        throw new Error(result.error)
      }
      await get().loadEmailTemplates()
      return result.data
    } catch (error: any) {
      set({ error: error.message })
      throw error
    }
  },

  updateEmailTemplate: async (id, data) => {
    try {
      const result = await window.api.emailTemplate.update(id, data)
      if (!result.success) {
        set({ error: result.error })
        throw new Error(result.error)
      }
      await get().loadEmailTemplates()
      return result.data
    } catch (error: any) {
      set({ error: error.message })
      throw error
    }
  },

  deleteEmailTemplate: async (id) => {
    try {
      const result = await window.api.emailTemplate.delete(id)
      if (!result.success) {
        set({ error: result.error })
        throw new Error(result.error)
      }
      await get().loadEmailTemplates()
    } catch (error: any) {
      set({ error: error.message })
      throw error
    }
  },

  createEmailVariable: async (data) => {
    try {
      const result = await window.api.emailVariable.create(data)
      if (!result.success) {
        set({ error: result.error })
        throw new Error(result.error)
      }
      await get().loadEmailTemplates()
      return result.data
    } catch (error: any) {
      set({ error: error.message })
      throw error
    }
  },

  deleteEmailVariable: async (id) => {
    try {
      const result = await window.api.emailVariable.delete(id)
      if (!result.success) {
        set({ error: result.error })
        throw new Error(result.error)
      }
      await get().loadEmailTemplates()
    } catch (error: any) {
      set({ error: error.message })
      throw error
    }
  }
}))
