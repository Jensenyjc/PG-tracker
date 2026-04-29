import { describe, it, expect } from 'vitest'
import {
  cn,
  parsePolicyTags,
  serializePolicyTags,
  parseValidDate,
  formatDateSafe,
  getDaysUntilDeadline,
  isValidEmail,
  isValidUrl,
} from './utils'

describe('cn (className merge)', () => {
  it('merges classes with tailwind conflict resolution', () => {
    const result = cn('px-4', 'px-2')
    expect(result).toContain('px-2')
  })

  it('handles conditional classes', () => {
    const result = cn('base', false && 'hidden', 'extra')
    expect(result).toBe('base extra')
  })

  it('returns empty string for no args', () => {
    expect(cn()).toBe('')
  })
})

describe('parsePolicyTags', () => {
  it('parses valid JSON array', () => {
    expect(parsePolicyTags('["985","211"]')).toEqual(['985', '211'])
  })

  it('returns empty array for null', () => {
    expect(parsePolicyTags(null)).toEqual([])
  })

  it('returns empty array for empty string', () => {
    expect(parsePolicyTags('')).toEqual([])
  })

  it('returns empty array for malformed JSON', () => {
    expect(parsePolicyTags('{bad')).toEqual([])
  })

  it('returns empty array for non-array JSON', () => {
    expect(parsePolicyTags('{"key": "val"}')).toEqual([])
  })
})

describe('serializePolicyTags', () => {
  it('serializes array to JSON string', () => {
    expect(serializePolicyTags(['A', 'B'])).toBe('["A","B"]')
  })

  it('serializes empty array', () => {
    expect(serializePolicyTags([])).toBe('[]')
  })
})

describe('parseValidDate', () => {
  it('parses ISO date string', () => {
    const result = parseValidDate('2026-06-01')
    expect(result).toBeInstanceOf(Date)
    expect(result!.getFullYear()).toBe(2026)
  })

  it('parses Date object', () => {
    const d = new Date('2026-06-01')
    const result = parseValidDate(d)
    expect(result!.getTime()).toBe(d.getTime())
  })

  it('returns null for null', () => {
    expect(parseValidDate(null)).toBeNull()
  })

  it('returns null for undefined', () => {
    expect(parseValidDate(undefined)).toBeNull()
  })

  it('returns null for empty string', () => {
    expect(parseValidDate('')).toBeNull()
  })

  it('returns null for invalid string', () => {
    expect(parseValidDate('not-a-date')).toBeNull()
  })

  it('returns null for invalid date object', () => {
    expect(parseValidDate(new Date('invalid'))).toBeNull()
  })
})

describe('formatDateSafe', () => {
  it('formats valid date with pattern', () => {
    const result = formatDateSafe('2026-06-01', 'yyyy-MM-dd')
    expect(result).toBe('2026-06-01')
  })

  it('returns fallback for null', () => {
    expect(formatDateSafe(null, 'yyyy-MM-dd')).toBe('--')
  })

  it('returns custom fallback for invalid date', () => {
    expect(formatDateSafe('invalid', 'yyyy/MM/dd', 'N/A')).toBe('N/A')
  })

  it('returns fallback for empty string', () => {
    expect(formatDateSafe('', 'yyyy-MM-dd')).toBe('--')
  })
})

describe('getDaysUntilDeadline', () => {
  it('returns null for null deadline', () => {
    expect(getDaysUntilDeadline(null)).toBeNull()
  })

  it('returns null for undefined deadline', () => {
    expect(getDaysUntilDeadline(undefined)).toBeNull()
  })

  it('returns null for empty string', () => {
    expect(getDaysUntilDeadline('')).toBeNull()
  })

  it('returns null for invalid date', () => {
    expect(getDaysUntilDeadline('not-a-date')).toBeNull()
  })

  it('returns negative number for past date', () => {
    expect(getDaysUntilDeadline('2020-01-01')).toBeLessThan(0)
  })

  it('returns positive number for future date', () => {
    const farFuture = new Date()
    farFuture.setFullYear(farFuture.getFullYear() + 1)
    expect(getDaysUntilDeadline(farFuture.toISOString())).toBeGreaterThan(0)
  })
})

describe('isValidEmail', () => {
  it('accepts valid email', () => {
    expect(isValidEmail('test@example.com')).toBe(true)
  })

  it('rejects email without domain', () => {
    expect(isValidEmail('test@')).toBe(false)
  })

  it('rejects email without @', () => {
    expect(isValidEmail('testexample.com')).toBe(false)
  })

  it('rejects empty string', () => {
    expect(isValidEmail('')).toBe(false)
  })
})

describe('isValidUrl', () => {
  it('accepts https URL', () => {
    expect(isValidUrl('https://example.com')).toBe(true)
  })

  it('accepts http URL', () => {
    expect(isValidUrl('http://example.com/path?q=1')).toBe(true)
  })

  it('rejects non-URL string', () => {
    expect(isValidUrl('not-a-url')).toBe(false)
  })

  it('rejects empty string', () => {
    expect(isValidUrl('')).toBe(false)
  })
})
