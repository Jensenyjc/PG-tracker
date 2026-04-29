/**
 * Tests that mirror the main process patch-update builder semantics.
 * These verify the same logic used in buildInstitutionUpdateData / buildAdvisorUpdateData
 * without requiring Electron or Prisma imports.
 */
import { describe, it, expect } from 'vitest'

function parseNullableDate(value: unknown, fieldName: string): Date | null {
  if (value === null || value === '' || value === undefined) return null
  const parsed = value instanceof Date ? value : new Date(value as string)
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`${fieldName} 格式不正确`)
  }
  return parsed
}

function buildInstitutionUpdateData(data: Record<string, unknown>): Record<string, unknown> {
  const updateData: Record<string, unknown> = {}

  if (data.name !== undefined) updateData.name = data.name
  if (data.department !== undefined) updateData.department = data.department
  if (data.tier !== undefined) updateData.tier = data.tier
  if (data.degreeType !== undefined) updateData.degreeType = data.degreeType
  if (data.campDeadline !== undefined) updateData.campDeadline = parseNullableDate(data.campDeadline, 'campDeadline')
  if (data.pushDeadline !== undefined) updateData.pushDeadline = parseNullableDate(data.pushDeadline, 'pushDeadline')
  if (data.expectedQuota !== undefined) updateData.expectedQuota = data.expectedQuota
  if (data.policyTags !== undefined) {
    updateData.policyTags = JSON.stringify(Array.isArray(data.policyTags) ? data.policyTags : [])
  }

  return updateData
}

function buildAdvisorUpdateData(data: Record<string, unknown>): Record<string, unknown> {
  const updateData: Record<string, unknown> = {}

  if (data.institutionId !== undefined) updateData.institutionId = data.institutionId
  if (data.name !== undefined) updateData.name = data.name
  if (data.title !== undefined) updateData.title = data.title
  if (data.researchArea !== undefined) updateData.researchArea = data.researchArea
  if (data.email !== undefined) updateData.email = data.email
  if (data.homepage !== undefined) updateData.homepage = data.homepage
  if (data.contactStatus !== undefined) updateData.contactStatus = data.contactStatus
  if (data.lastContactDate !== undefined) updateData.lastContactDate = parseNullableDate(data.lastContactDate, 'lastContactDate')
  if (data.reputationScore !== undefined) updateData.reputationScore = data.reputationScore
  if (data.notes !== undefined) updateData.notes = data.notes

  return updateData
}

describe('buildInstitutionUpdateData (patch semantics)', () => {
  it('only includes fields that were explicitly passed', () => {
    const result = buildInstitutionUpdateData({ campDeadline: '2026-06-01' })
    expect(Object.keys(result)).toEqual(['campDeadline'])
    expect(result.campDeadline).toBeInstanceOf(Date)
  })

  it('handles null deadline (clearing the field)', () => {
    const result = buildInstitutionUpdateData({ campDeadline: null })
    expect(result.campDeadline).toBeNull()
  })

  it('handles empty string deadline as null', () => {
    const result = buildInstitutionUpdateData({ campDeadline: '' })
    expect(result.campDeadline).toBeNull()
  })

  it('serializes policyTags array to JSON string', () => {
    const result = buildInstitutionUpdateData({ policyTags: ['985', '211'] })
    expect(result.policyTags).toBe('["985","211"]')
  })

  it('handles non-array policyTags by storing empty array JSON', () => {
    const result = buildInstitutionUpdateData({ policyTags: 'invalid' })
    expect(result.policyTags).toBe('[]')
  })

  it('updates multiple fields together', () => {
    const result = buildInstitutionUpdateData({
      name: '北京大学',
      tier: 'REACH',
      campDeadline: '2026-07-01',
      expectedQuota: 10,
    })
    expect(result.name).toBe('北京大学')
    expect(result.tier).toBe('REACH')
    expect(result.campDeadline).toBeInstanceOf(Date)
    expect(result.expectedQuota).toBe(10)
    expect(Object.keys(result)).toHaveLength(4)
  })

  it('throws on invalid date', () => {
    expect(() => buildInstitutionUpdateData({ campDeadline: 'not-a-date' })).toThrow('campDeadline 格式不正确')
  })

  it('does not include undefined fields', () => {
    const result = buildInstitutionUpdateData({})
    expect(result).toEqual({})
  })
})

describe('buildAdvisorUpdateData (patch semantics)', () => {
  it('only updates contactStatus when that is the only field', () => {
    const result = buildAdvisorUpdateData({ contactStatus: 'REPLIED' })
    expect(Object.keys(result)).toEqual(['contactStatus'])
    expect(result.contactStatus).toBe('REPLIED')
    // name, email, researchArea MUST NOT be present
    expect(result.name).toBeUndefined()
    expect(result.email).toBeUndefined()
    expect(result.researchArea).toBeUndefined()
  })

  it('handles lastContactDate as Date string', () => {
    const result = buildAdvisorUpdateData({ lastContactDate: '2026-06-15' })
    expect(result.lastContactDate).toBeInstanceOf(Date)
  })

  it('handles null lastContactDate', () => {
    const result = buildAdvisorUpdateData({ lastContactDate: null })
    expect(result.lastContactDate).toBeNull()
  })

  it('updates multiple fields', () => {
    const result = buildAdvisorUpdateData({
      name: '李教授',
      researchArea: '机器学习',
      email: 'li@university.edu.cn',
    })
    expect(result.name).toBe('李教授')
    expect(result.researchArea).toBe('机器学习')
    expect(result.email).toBe('li@university.edu.cn')
    expect(Object.keys(result)).toHaveLength(3)
  })

  it('throws on invalid lastContactDate', () => {
    expect(() => buildAdvisorUpdateData({ lastContactDate: 'bad' })).toThrow('lastContactDate 格式不正确')
  })
})
