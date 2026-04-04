import { create } from 'zustand'

export interface Institution {
  id: string
  name: string
  department: string
  tier: 'REACH' | 'MATCH' | 'SAFETY'
  degreeType: 'MASTER' | 'PHD'
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

interface AppState {
  institutions: Institution[]
  isLoading: boolean
  error: string | null
  conflictWarnings: string[]
  loadInstitutions: () => Promise<void>
  addInstitution: (data: Omit<Institution, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Institution>
  updateInstitution: (id: string, data: Partial<Institution>) => Promise<void>
  deleteInstitution: (id: string) => Promise<void>
  addAdvisor: (data: Omit<Advisor, 'id'>) => Promise<Advisor>
  updateAdvisor: (id: string, data: Partial<Advisor>) => Promise<void>
  deleteAdvisor: (id: string) => Promise<void>
  addTask: (data: Omit<Task, 'id'>) => Promise<Task>
  updateTask: (id: string, data: Partial<Task>) => Promise<void>
  deleteTask: (id: string) => Promise<void>
  addAsset: (data: Omit<Asset, 'id'>) => Promise<Asset>
  deleteAsset: (id: string) => Promise<void>
  addInterview: (data: Omit<Interview, 'id'>) => Promise<Interview>
  updateInterview: (id: string, data: Partial<Interview>) => Promise<void>
  deleteInterview: (id: string) => Promise<void>
  checkConflicts: (institutionId: string) => Promise<void>
  clearError: () => void
}

export const useStore = create<AppState>((set, get) => ({
  institutions: [],
  isLoading: false,
  error: null,
  conflictWarnings: [],

  loadInstitutions: async () => {
    set({ isLoading: true, error: null })
    try {
      const data = await window.api.institution.getAll()
      set({ institutions: data, isLoading: false })
    } catch (error: any) {
      set({ error: error.message, isLoading: false })
    }
  },

  addInstitution: async (data) => {
    set({ isLoading: true, error: null })
    try {
      const newInstitution = await window.api.institution.create(data)
      set((state) => ({
        institutions: [newInstitution, ...state.institutions],
        isLoading: false
      }))
      return newInstitution
    } catch (error: any) {
      set({ error: error.message, isLoading: false })
      throw error
    }
  },

  updateInstitution: async (id, data) => {
    set({ isLoading: true, error: null })
    try {
      const updated = await window.api.institution.update(id, data)
      set((state) => ({
        institutions: state.institutions.map((i) => (i.id === id ? updated : i)),
        isLoading: false
      }))
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
      return newTask
    } catch (error: any) {
      set({ error: error.message })
      throw error
    }
  },

  updateTask: async (id, data) => {
    try {
      await window.api.task.update(id, data)
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
      return await window.api.asset.create(data)
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
      return await window.api.interview.create(data)
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

  clearError: () => set({ error: null })
}))
