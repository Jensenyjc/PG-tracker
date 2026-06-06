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
  sortOrder?: number | null
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

export interface PersonalResource {
  id: string
  name: string
  localPath: string
  kind: 'FILE' | 'FOLDER'
  fileType: string | null
  category: string
  tags: string
  notes: string | null
  sizeBytes: number | null
  modifiedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface EmailVariable {
  id: string
  name: string
  templateId: string
  createdAt?: string
}

export interface EmailTemplate {
  id: string
  name: string
  subject: string
  content: string
  createdAt?: string
  updatedAt?: string
  variables?: EmailVariable[]
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

export interface PersonalResourceInput {
  name?: string
  localPath: string
  kind?: PersonalResource['kind']
  fileType?: string | null
  category?: string
  tags?: string[]
  notes?: string | null
}

type View = 'dashboard' | 'kanban' | 'timeline' | 'templates' | 'resources' | 'settings'

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

function getInstitutionSortOrder(institution: Institution): number {
  return Number.isFinite(institution.sortOrder) ? Number(institution.sortOrder) : 0
}

function getInstitutionCreatedAtTime(institution: Institution): number {
  const time = new Date(institution.createdAt).getTime()
  return Number.isNaN(time) ? 0 : time
}

function sortInstitutionsForDisplay(a: Institution, b: Institution): number {
  const orderDiff = getInstitutionSortOrder(a) - getInstitutionSortOrder(b)
  if (orderDiff !== 0) return orderDiff
  return getInstitutionCreatedAtTime(b) - getInstitutionCreatedAtTime(a)
}

interface AppState {
  currentView: View
  selectedInstitutionId: string | null
  institutions: Institution[]
  orphanTasks: Task[]
  personalResources: PersonalResource[]
  isLoading: boolean
  error: string | null
  conflictWarnings: string[]
  emailTemplates: EmailTemplate[]
  setView: (view: View) => void
  setSelectedInstitutionId: (id: string | null) => void
  loadInstitutions: () => Promise<void>
  loadOrphanTasks: () => Promise<void>
  loadPersonalResources: () => Promise<void>
  addInstitution: (data: InstitutionInput) => Promise<Institution>
  updateInstitution: (id: string, data: Partial<InstitutionInput>) => Promise<Institution>
  reorderInstitutions: (tier: Institution['tier'], orderedIds: string[]) => Promise<void>
  moveInstitutionToTier: (id: string, targetTier: Institution['tier'], orderedIds: string[]) => Promise<void>
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
  addPersonalResource: (data: PersonalResourceInput) => Promise<PersonalResource>
  addPersonalResourcesFromPaths: (paths: string[], category?: string) => Promise<void>
  updatePersonalResource: (id: string, data: Partial<PersonalResourceInput>) => Promise<PersonalResource>
  deletePersonalResource: (id: string) => Promise<void>
  checkConflicts: (institutionId: string) => Promise<void>
  clearError: () => void
  loadEmailTemplates: () => Promise<void>
  createEmailTemplate: (data: { name: string; subject: string; content: string }) => Promise<EmailTemplate>
  updateEmailTemplate: (id: string, data: { name: string; subject: string; content: string }) => Promise<EmailTemplate>
  deleteEmailTemplate: (id: string) => Promise<void>
  createEmailVariable: (data: { name: string; templateId: string }) => Promise<EmailVariable>
  deleteEmailVariable: (id: string) => Promise<void>
}

export const useStore = create<AppState>((set, get) => ({
  currentView: 'kanban',
  selectedInstitutionId: null,
  institutions: [],
  orphanTasks: [],
  personalResources: [],
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
    } catch (error: unknown) {
      set({ error: getErrorMessage(error), isLoading: false })
    }
  },

  loadOrphanTasks: async () => {
    try {
      const tasks = await window.api.task.getOrphan()
      set({ orphanTasks: tasks })
    } catch (error: unknown) {
      set({ error: getErrorMessage(error) })
    }
  },

  addInstitution: async (data) => {
    set({ isLoading: true, error: null })
    try {
      const newInstitution = await window.api.institution.create(data)
      const institutions = await window.api.institution.getAll()
      set({ institutions, isLoading: false })
      return institutions.find((i) => i.id === newInstitution.id) || newInstitution
    } catch (error: unknown) {
      set({ error: getErrorMessage(error), isLoading: false })
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
    } catch (error: unknown) {
      set({ error: getErrorMessage(error), isLoading: false })
      throw error
    }
  },

  loadPersonalResources: async () => {
    try {
      const resources = await window.api.personalResource.getAll()
      set({ personalResources: resources })
    } catch (error: unknown) {
      set({ error: getErrorMessage(error) })
    }
  },

  reorderInstitutions: async (tier, orderedIds) => {
    const previousInstitutions = get().institutions
    const schoolsById = new Map(previousInstitutions.map((institution) => [institution.id, institution]))
    const orderedIdSet = new Set(orderedIds)
    const reorderedSchools: Institution[] = []
    orderedIds.forEach((schoolId, index) => {
      const school = schoolsById.get(schoolId)
      if (school) {
        reorderedSchools.push({ ...school, sortOrder: index })
      }
    })
    const nextInstitutions = [
      ...previousInstitutions.filter((institution) => institution.tier !== tier || !orderedIdSet.has(institution.id)),
      ...reorderedSchools
    ].sort(sortInstitutionsForDisplay)

    set({ institutions: nextInstitutions, error: null })
    try {
      await window.api.institution.reorder(tier, orderedIds)
      const institutions = await window.api.institution.getAll()
      set({ institutions })
    } catch (error: unknown) {
      set({ institutions: previousInstitutions, error: getErrorMessage(error) })
      throw error
    }
  },

  moveInstitutionToTier: async (id, targetTier, orderedIds) => {
    const previousInstitutions = get().institutions
    const movingInstitution = previousInstitutions.find((institution) => institution.id === id)
    if (!movingInstitution) {
      const error = new Error('院校不存在或尚未加载')
      set({ error: error.message })
      throw error
    }

    const targetOrder = new Map(orderedIds.map((schoolId, index) => [schoolId, index]))
    const sourceOrder = new Map(
      previousInstitutions
        .filter((institution) => institution.tier === movingInstitution.tier && institution.id !== id)
        .map((institution, index) => [institution.id, index])
    )
    const nextInstitutions = previousInstitutions.map((institution) => {
      if (institution.id === id) {
        return { ...institution, tier: targetTier, sortOrder: targetOrder.get(institution.id) ?? 0 }
      }
      if (institution.tier === targetTier && targetOrder.has(institution.id)) {
        return { ...institution, sortOrder: targetOrder.get(institution.id) ?? 0 }
      }
      if (movingInstitution.tier !== targetTier && institution.tier === movingInstitution.tier && sourceOrder.has(institution.id)) {
        return { ...institution, sortOrder: sourceOrder.get(institution.id) ?? 0 }
      }
      return institution
    }).sort(sortInstitutionsForDisplay)

    set({ institutions: nextInstitutions, error: null })
    try {
      await window.api.institution.move(id, targetTier, orderedIds)
      const institutions = await window.api.institution.getAll()
      set({ institutions })
    } catch (error: unknown) {
      set({ institutions: previousInstitutions, error: getErrorMessage(error) })
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
    } catch (error: unknown) {
      set({ error: getErrorMessage(error), isLoading: false })
      throw error
    }
  },

  addAdvisor: async (data) => {
    try {
      const newAdvisor = await window.api.advisor.create(data)
      await get().loadInstitutions()
      return newAdvisor
    } catch (error: unknown) {
      set({ error: getErrorMessage(error) })
      throw error
    }
  },

  updateAdvisor: async (id, data) => {
    try {
      await window.api.advisor.update(id, data)
      await get().loadInstitutions()
    } catch (error: unknown) {
      set({ error: getErrorMessage(error) })
      throw error
    }
  },

  deleteAdvisor: async (id) => {
    try {
      await window.api.advisor.delete(id)
      await get().loadInstitutions()
    } catch (error: unknown) {
      set({ error: getErrorMessage(error) })
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
    } catch (error: unknown) {
      set({ error: getErrorMessage(error) })
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
      await get().loadOrphanTasks()
    } catch (error: unknown) {
      set({ error: getErrorMessage(error) })
      throw error
    }
  },

  deleteTask: async (id) => {
    try {
      await window.api.task.delete(id)
      await get().loadInstitutions()
      await get().loadOrphanTasks()
    } catch (error: unknown) {
      set({ error: getErrorMessage(error) })
      throw error
    }
  },

  addAsset: async (data) => {
    try {
      const asset = await window.api.asset.create(data)
      await get().loadInstitutions()
      return asset
    } catch (error: unknown) {
      set({ error: getErrorMessage(error) })
      throw error
    }
  },

  deleteAsset: async (id) => {
    try {
      await window.api.asset.delete(id)
      await get().loadInstitutions()
    } catch (error: unknown) {
      set({ error: getErrorMessage(error) })
      throw error
    }
  },

  addInterview: async (data) => {
    try {
      const interview = await window.api.interview.create(data)
      await get().loadInstitutions()
      return interview
    } catch (error: unknown) {
      set({ error: getErrorMessage(error) })
      throw error
    }
  },

  updateInterview: async (id, data) => {
    try {
      await window.api.interview.update(id, data)
      await get().loadInstitutions()
    } catch (error: unknown) {
      set({ error: getErrorMessage(error) })
      throw error
    }
  },

  deleteInterview: async (id) => {
    try {
      await window.api.interview.delete(id)
      await get().loadInstitutions()
    } catch (error: unknown) {
      set({ error: getErrorMessage(error) })
      throw error
    }
  },

  addPersonalResource: async (data) => {
    try {
      const resource = await window.api.personalResource.create(data)
      set((state) => ({ personalResources: [resource, ...state.personalResources] }))
      await get().loadPersonalResources()
      return resource
    } catch (error: unknown) {
      set({ error: getErrorMessage(error) })
      throw error
    }
  },

  addPersonalResourcesFromPaths: async (paths, category = '其他') => {
    try {
      for (const localPath of paths) {
        await window.api.personalResource.create({ localPath, category })
      }
      await get().loadPersonalResources()
    } catch (error: unknown) {
      set({ error: getErrorMessage(error) })
      throw error
    }
  },

  updatePersonalResource: async (id, data) => {
    try {
      const updated = await window.api.personalResource.update(id, data)
      set((state) => ({
        personalResources: state.personalResources.map((resource) => resource.id === id ? updated : resource)
      }))
      return updated
    } catch (error: unknown) {
      set({ error: getErrorMessage(error) })
      throw error
    }
  },

  deletePersonalResource: async (id) => {
    try {
      await window.api.personalResource.delete(id)
      set((state) => ({
        personalResources: state.personalResources.filter((resource) => resource.id !== id)
      }))
    } catch (error: unknown) {
      set({ error: getErrorMessage(error) })
      throw error
    }
  },

  checkConflicts: async (institutionId) => {
    try {
      const warnings = await window.api.advisor.getConflictWarnings(institutionId)
      set({ conflictWarnings: warnings })
    } catch (error: unknown) {
      set({ error: getErrorMessage(error) })
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
    } catch (error: unknown) {
      set({ error: getErrorMessage(error) })
    }
  },

  createEmailTemplate: async (data) => {
    try {
      const result = await window.api.emailTemplate.create(data)
      if (!result.success) {
        set({ error: result.error })
        throw new Error(result.error)
      }
      if (!result.data) {
        throw new Error('Email template response missing data')
      }
      await get().loadEmailTemplates()
      return result.data
    } catch (error: unknown) {
      set({ error: getErrorMessage(error) })
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
      if (!result.data) {
        throw new Error('Email template response missing data')
      }
      await get().loadEmailTemplates()
      return result.data
    } catch (error: unknown) {
      set({ error: getErrorMessage(error) })
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
    } catch (error: unknown) {
      set({ error: getErrorMessage(error) })
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
      if (!result.data) {
        throw new Error('Email variable response missing data')
      }
      await get().loadEmailTemplates()
      return result.data
    } catch (error: unknown) {
      set({ error: getErrorMessage(error) })
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
    } catch (error: unknown) {
      set({ error: getErrorMessage(error) })
      throw error
    }
  }
}))
