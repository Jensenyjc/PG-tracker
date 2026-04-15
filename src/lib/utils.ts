/**
 * @Project: PG-Tracker
 * @File: utils.ts
 * @Description: 通用工具函数库，封装 Tailwind CSS 类名合并、数据解析、日期处理等工具
 * @Author: 杨敬诚
 * @Date: 2026-04-08
 * Copyright (c) 2026. All rights reserved.
 */
import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

// ==================== Tailwind CSS 工具 ====================
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}

// ==================== 数据解析工具 ====================

/**
 * 安全解析 policyTags JSON 字符串
 * @param policyTags - JSON 字符串或 null
 * @returns 解析后的字符串数组，解析失败返回空数组
 */
export function parsePolicyTags(policyTags: string | null): string[] {
  if (!policyTags) return []
  try {
    const parsed = JSON.parse(policyTags)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

/**
 * 将字符串数组序列化为 policyTags JSON 字符串
 * @param tags - 字符串数组
 * @returns JSON 字符串
 */
export function serializePolicyTags(tags: string[]): string {
  return JSON.stringify(tags)
}

// ==================== 日期工具 ====================

/**
 * 格式化日期为本地字符串
 * @param date - 日期字符串或 Date 对象
 * @param options - Intl.DateTimeFormatOptions
 * @returns 格式化后的日期字符串
 */
export function formatDate(
  date: string | Date | null | undefined,
  options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric' }
): string {
  if (!date) return ''
  try {
    const d = typeof date === 'string' ? new Date(date) : date
    if (isNaN(d.getTime())) return ''
    return d.toLocaleDateString('zh-CN', options)
  } catch {
    return ''
  }
}

/**
 * 计算距离截止日期的剩余天数
 * @param deadline - 截止日期字符串
 * @returns 剩余天数，负数表示已过期，null 表示无截止日期
 */
export function getDaysUntilDeadline(deadline: string | null | undefined): number | null {
  if (!deadline) return null
  try {
    const deadlineDate = new Date(deadline)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    deadlineDate.setHours(0, 0, 0, 0)
    const diffTime = deadlineDate.getTime() - today.getTime()
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  } catch {
    return null
  }
}

// ==================== 验证工具 ====================

/**
 * 验证邮箱格式
 * @param email - 邮箱地址
 * @returns 是否有效
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * 验证 URL 格式
 * @param url - URL 地址
 * @returns 是否有效
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}
