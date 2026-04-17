/**
 * @Project: PG-Tracker
 * @File: constants.ts
 * @Description: 应用共享常量定义，包括申请层次、学位类型、导师状态等配置
 * @Author: 杨敬诚
 * @Date: 2026-04-15
 * Copyright (c) 2026. All rights reserved.
 */

// ==================== 申请层次 (Tier) ====================
export type Tier = 'REACH' | 'MATCH' | 'SAFETY'

export const tierLabels: Record<Tier, string> = {
  REACH: '冲',
  MATCH: '稳',
  SAFETY: '保'
}

export const tierDescriptions: Record<Tier, string> = {
  REACH: '冲 — 超出自身水平',
  MATCH: '稳 — 匹配自身水平',
  SAFETY: '保 — 保底选择'
}

export const tierColors: Record<Tier, string> = {
  REACH: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  MATCH: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  SAFETY: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
}

export const tierBorderColors: Record<Tier, string> = {
  REACH: 'border-red-300 dark:border-red-700',
  MATCH: 'border-amber-300 dark:border-amber-700',
  SAFETY: 'border-green-300 dark:border-green-700'
}

// ==================== 学位类型 (Degree Type) ====================
export type DegreeType = 'MASTER' | 'PROFESSIONAL' | 'PHD'

export const degreeTypeLabels: Record<DegreeType, string> = {
  MASTER: '学硕',
  PROFESSIONAL: '专硕',
  PHD: '直博'
}

// ==================== 导师联系状态 (Contact Status) ====================
export type ContactStatus = 'PENDING' | 'SENT' | 'REPLIED' | 'INTERVIEW' | 'REJECTED' | 'ACCEPTED'

export interface StatusConfig {
  label: string
  color: string
  badge: string
  dot: string
  icon?: string
}

export const contactStatusConfig: Record<ContactStatus, StatusConfig> = {
  PENDING: {
    label: '待联系',
    color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
    badge: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
    dot: 'bg-gray-500 dark:bg-gray-400'
  },
  SENT: {
    label: '已发送',
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    badge: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    dot: 'bg-blue-500 dark:bg-blue-400'
  },
  REPLIED: {
    label: '已回复',
    color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    badge: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    dot: 'bg-green-500 dark:bg-green-400'
  },
  INTERVIEW: {
    label: '面试中',
    color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
    badge: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
    dot: 'bg-purple-500 dark:bg-purple-400'
  },
  REJECTED: {
    label: '已拒绝',
    color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    badge: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    dot: 'bg-red-500 dark:bg-red-400'
  },
  ACCEPTED: {
    label: '已录取',
    color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
    badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
    dot: 'bg-emerald-500 dark:bg-emerald-400'
  }
}

export const statusOptions: { value: ContactStatus; label: string }[] = [
  { value: 'PENDING', label: '待联系' },
  { value: 'SENT', label: '已发送' },
  { value: 'REPLIED', label: '已回复' },
  { value: 'INTERVIEW', label: '面试中' },
  { value: 'REJECTED', label: '已拒绝' },
  { value: 'ACCEPTED', label: '已录取' }
]

// 别名导出，兼容 InstitutionDetail 中的引用
export const advisorStatusConfig = contactStatusConfig

// ==================== 面试形式 (Interview Format) ====================
export type InterviewFormat = 'ONLINE' | 'OFFLINE'

export const interviewFormatLabels: Record<InterviewFormat, string> = {
  ONLINE: '线上',
  OFFLINE: '线下'
}

// ==================== 资产类型 (Asset Type) ====================
export type AssetType = 'RESUME' | 'TRANSCRIPT' | 'RECOMMENDATION' | 'OTHER'

export const assetTypeLabels: Record<AssetType, string> = {
  RESUME: '简历',
  TRANSCRIPT: '成绩单',
  RECOMMENDATION: '推荐信',
  OTHER: '其他'
}
