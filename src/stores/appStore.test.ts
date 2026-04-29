import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useStore } from './appStore'

// Mock window.api — must be set before tests run
const mockApi = {
  institution: {
    getAll: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  advisor: {
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    getConflictWarnings: vi.fn(),
  },
  task: {
    getOrphan: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  asset: {
    create: vi.fn(),
    delete: vi.fn(),
  },
  interview: {
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  emailTemplate: {
    getAll: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  emailVariable: {
    create: vi.fn(),
    delete: vi.fn(),
  },
}

// @ts-expect-error - we only mock the used properties
window.api = mockApi

beforeEach(() => {
  vi.clearAllMocks()
  useStore.setState({
    currentView: 'kanban',
    selectedInstitutionId: null,
    institutions: [],
    orphanTasks: [],
    isLoading: false,
    error: null,
    conflictWarnings: [],
    emailTemplates: [],
  })
})

describe('appStore — synchronous actions', () => {
  it('has kanban as default view', () => {
    useStore.setState({ currentView: 'kanban' })
    expect(useStore.getState().currentView).toBe('kanban')
  })

  it('setView changes currentView', () => {
    useStore.getState().setView('timeline')
    expect(useStore.getState().currentView).toBe('timeline')
  })

  it('setSelectedInstitutionId sets and clears', () => {
    useStore.getState().setSelectedInstitutionId('inst-1')
    expect(useStore.getState().selectedInstitutionId).toBe('inst-1')
    useStore.getState().setSelectedInstitutionId(null)
    expect(useStore.getState().selectedInstitutionId).toBeNull()
  })

  it('clearError clears error state', () => {
    useStore.setState({ error: 'something went wrong' })
    useStore.getState().clearError()
    expect(useStore.getState().error).toBeNull()
  })
})

describe('appStore — loadInstitutions', () => {
  it('sets institutions on success', async () => {
    const mockData = [{ id: '1', name: '清华大学', department: '计算机系', tier: 'REACH' }]
    mockApi.institution.getAll.mockResolvedValueOnce(mockData)

    await useStore.getState().loadInstitutions()

    expect(useStore.getState().institutions).toEqual(mockData)
    expect(useStore.getState().isLoading).toBe(false)
    expect(useStore.getState().error).toBeNull()
  })

  it('sets error on failure', async () => {
    mockApi.institution.getAll.mockRejectedValueOnce(new Error('network error'))

    await useStore.getState().loadInstitutions()

    expect(useStore.getState().error).toBe('network error')
    expect(useStore.getState().isLoading).toBe(false)
  })
})

describe('appStore — loadOrphanTasks', () => {
  it('sets orphanTasks on success', async () => {
    const tasks = [{ id: 't1', title: '准备材料', dueDate: '2026-05-01', isCompleted: false, institutionId: '' }]
    mockApi.task.getOrphan.mockResolvedValueOnce(tasks)

    await useStore.getState().loadOrphanTasks()

    expect(useStore.getState().orphanTasks).toEqual(tasks)
  })

  it('sets error on failure', async () => {
    mockApi.task.getOrphan.mockRejectedValueOnce(new Error('not found'))

    await useStore.getState().loadOrphanTasks()

    expect(useStore.getState().error).toBe('not found')
  })
})

describe('appStore — addInstitution', () => {
  it('creates institution and refreshes list', async () => {
    const input = { name: '北大', department: '数学', tier: 'REACH' as const, degreeType: 'MASTER' as const, campDeadline: null, pushDeadline: null, expectedQuota: 5, policyTags: [] }
    const created = { id: 'new-1', ...input, createdAt: '', updatedAt: '' }
    const all = [
      { id: 'old-1', name: '清华', department: 'CS', tier: 'MATCH' },
      created,
    ]
    mockApi.institution.create.mockResolvedValueOnce(created)
    mockApi.institution.getAll.mockResolvedValueOnce(all)

    const result = await useStore.getState().addInstitution(input)

    expect(mockApi.institution.create).toHaveBeenCalledWith(input)
    expect(mockApi.institution.getAll).toHaveBeenCalled()
    expect(useStore.getState().institutions).toEqual(all)
    expect(result.id).toBe('new-1')
  })

  it('sets error on failure', async () => {
    mockApi.institution.create.mockRejectedValueOnce(new Error('duplicate'))

    await expect(useStore.getState().addInstitution({ name: 'X', department: 'Y', tier: 'SAFETY', degreeType: 'PHD', campDeadline: null, pushDeadline: null, expectedQuota: null, policyTags: [] })).rejects.toThrow('duplicate')
    expect(useStore.getState().error).toBe('duplicate')
  })
})

describe('appStore — updateInstitution', () => {
  it('patches and refreshes list', async () => {
    const updated = { id: '1', name: '清华', department: 'CS', campDeadline: '2026-06-01' }
    mockApi.institution.update.mockResolvedValueOnce(updated)
    mockApi.institution.getAll.mockResolvedValueOnce([updated])

    await useStore.getState().updateInstitution('1', { campDeadline: '2026-06-01' })

    expect(mockApi.institution.update).toHaveBeenCalledWith('1', { campDeadline: '2026-06-01' })
    expect(mockApi.institution.getAll).toHaveBeenCalled()
    expect(useStore.getState().institutions).toEqual([updated])
  })
})

describe('appStore — deleteInstitution', () => {
  it('removes from local state without refetching all', async () => {
    useStore.setState({ institutions: [{ id: '1', name: '清华', department: 'CS', tier: 'REACH', degreeType: 'MASTER', campDeadline: null, pushDeadline: null, expectedQuota: null, policyTags: '[]', createdAt: '', updatedAt: '' }] })
    mockApi.institution.delete.mockResolvedValueOnce(undefined)

    await useStore.getState().deleteInstitution('1')

    expect(useStore.getState().institutions).toEqual([])
    expect(useStore.getState().isLoading).toBe(false)
  })
})

describe('appStore — addAdvisor', () => {
  it('creates advisor and reloads institutions', async () => {
    const input = { institutionId: '1', name: '张教授', title: '教授', researchArea: 'AI', email: 'z@t.edu', homepage: null, contactStatus: 'PENDING' as const, reputationScore: null, notes: null }
    const created = { id: 'a1', ...input }
    mockApi.advisor.create.mockResolvedValueOnce(created)
    mockApi.institution.getAll.mockResolvedValueOnce([])

    await useStore.getState().addAdvisor(input)

    expect(mockApi.advisor.create).toHaveBeenCalledWith(input)
    expect(mockApi.institution.getAll).toHaveBeenCalled()
  })
})

describe('appStore — updateAdvisor', () => {
  it('sends patch and reloads', async () => {
    mockApi.advisor.update.mockResolvedValueOnce({})
    mockApi.institution.getAll.mockResolvedValueOnce([])

    await useStore.getState().updateAdvisor('a1', { contactStatus: 'REPLIED' })

    expect(mockApi.advisor.update).toHaveBeenCalledWith('a1', { contactStatus: 'REPLIED' })
    expect(mockApi.institution.getAll).toHaveBeenCalled()
  })
})

describe('appStore — tasks', () => {
  it('addTask with institutionId reloads institutions', async () => {
    const input = { institutionId: '1', title: '提交材料', dueDate: '2026-06-01', isCompleted: false }
    mockApi.task.create.mockResolvedValueOnce({ id: 't1', ...input })
    mockApi.institution.getAll.mockResolvedValueOnce([])

    await useStore.getState().addTask(input)

    expect(mockApi.institution.getAll).toHaveBeenCalled()
  })

  it('addTask without institutionId also loads orphanTasks', async () => {
    const input = { title: '独立任务', dueDate: '2026-07-01', isCompleted: false }
    mockApi.task.create.mockResolvedValueOnce({ id: 't2', ...input, institutionId: '' })
    mockApi.institution.getAll.mockResolvedValueOnce([])
    mockApi.task.getOrphan.mockResolvedValueOnce([])

    await useStore.getState().addTask(input)

    expect(mockApi.task.getOrphan).toHaveBeenCalled()
    expect(mockApi.institution.getAll).toHaveBeenCalled()
  })

  it('updateTask throws when API returns failure', async () => {
    mockApi.task.update.mockResolvedValueOnce({ success: false, error: '日期格式错误', data: null })

    await expect(useStore.getState().updateTask('t1', { title: 'x' })).rejects.toThrow('日期格式错误')
  })

  it('deleteTask reloads institutions', async () => {
    mockApi.task.delete.mockResolvedValueOnce(undefined)
    mockApi.institution.getAll.mockResolvedValueOnce([])

    await useStore.getState().deleteTask('t1')

    expect(mockApi.institution.getAll).toHaveBeenCalled()
  })
})

describe('appStore — assets & interviews', () => {
  it('addAsset reloads institutions', async () => {
    mockApi.asset.create.mockResolvedValueOnce({ id: 'ast1', advisorId: 'a1', type: 'RESUME', localPath: '/f.pdf' })
    mockApi.institution.getAll.mockResolvedValueOnce([])

    await useStore.getState().addAsset({ advisorId: 'a1', type: 'RESUME', localPath: '/f.pdf' })

    expect(mockApi.institution.getAll).toHaveBeenCalled()
  })

  it('addInterview reloads institutions', async () => {
    mockApi.interview.create.mockResolvedValueOnce({ id: 'iv1', advisorId: 'a1', date: '2026-06-01', format: 'ONLINE', markdownNotes: '' })
    mockApi.institution.getAll.mockResolvedValueOnce([])

    await useStore.getState().addInterview({ advisorId: 'a1', date: '2026-06-01', format: 'ONLINE', markdownNotes: '' })

    expect(mockApi.institution.getAll).toHaveBeenCalled()
  })
})

describe('appStore — checkConflicts', () => {
  it('sets conflictWarnings on success', async () => {
    const warnings = ['张教授和李教授均在已发送状态下属于同一院校']
    mockApi.advisor.getConflictWarnings.mockResolvedValueOnce(warnings)

    await useStore.getState().checkConflicts('1')

    expect(useStore.getState().conflictWarnings).toEqual(warnings)
  })

  it('sets error on failure', async () => {
    mockApi.advisor.getConflictWarnings.mockRejectedValueOnce(new Error('timeout'))

    await useStore.getState().checkConflicts('1')

    expect(useStore.getState().error).toBe('timeout')
  })
})

describe('appStore — email templates', () => {
  it('loadEmailTemplates sets templates on success', async () => {
    const templates = [{ id: 'e1', name: '模板1', subject: '你好', content: '{{name}}', variables: [] }]
    mockApi.emailTemplate.getAll.mockResolvedValueOnce({ success: true, data: templates })

    await useStore.getState().loadEmailTemplates()

    expect(useStore.getState().emailTemplates).toEqual(templates)
  })

  it('loadEmailTemplates sets error on API failure', async () => {
    mockApi.emailTemplate.getAll.mockResolvedValueOnce({ success: false, error: '数据库错误', data: null })

    await useStore.getState().loadEmailTemplates()

    expect(useStore.getState().error).toBe('数据库错误')
  })

  it('createEmailTemplate reloads list', async () => {
    mockApi.emailTemplate.create.mockResolvedValueOnce({ success: true, data: { id: 'e1' } })
    mockApi.emailTemplate.getAll.mockResolvedValueOnce({ success: true, data: [{ id: 'e1' }] })

    await useStore.getState().createEmailTemplate({ name: '新模板', subject: 'S', content: 'C' })

    expect(useStore.getState().emailTemplates).toEqual([{ id: 'e1' }])
  })

  it('createEmailTemplate throws on failure', async () => {
    mockApi.emailTemplate.create.mockResolvedValueOnce({ success: false, error: '名称重复', data: null })

    await expect(useStore.getState().createEmailTemplate({ name: 'X', subject: 'S', content: 'C' })).rejects.toThrow('名称重复')
  })
})
