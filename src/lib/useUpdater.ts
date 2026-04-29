/**
 * @Project: PG-Tracker
 * @File: useUpdater.ts
 * @Description: 自动更新状态 Hook，封装 IPC 事件监听和更新操作
 * @Author: 杨敬诚
 * @Date: 2026-04-29
 */
import { useState, useEffect, useCallback } from 'react'

export interface UpdateStatus {
  phase: 'idle' | 'checking' | 'available' | 'not-available' | 'downloading' | 'downloaded' | 'error'
  version?: string
  percent?: number
  error?: string
}

export function useUpdater() {
  const [status, setStatus] = useState<UpdateStatus>({ phase: 'idle' })
  const [checking, setChecking] = useState(false)

  useEffect(() => {
    const unsubscribe = window.api.updater.onStatus((newStatus: UpdateStatus) => {
      setStatus(newStatus)
      if (newStatus.phase !== 'downloading') {
        setChecking(false)
      }
    })
    return unsubscribe
  }, [])

  const checkForUpdates = useCallback(async () => {
    setChecking(true)
    setStatus({ phase: 'checking' })
    try {
      await window.api.updater.check()
    } catch (err: any) {
      setStatus({ phase: 'error', error: err.message })
      setChecking(false)
    }
  }, [])

  const downloadUpdate = useCallback(async () => {
    try {
      await window.api.updater.download()
    } catch (err: any) {
      setStatus({ phase: 'error', error: err.message })
    }
  }, [])

  const installUpdate = useCallback(() => {
    window.api.updater.install()
  }, [])

  return { status, checking, checkForUpdates, downloadUpdate, installUpdate }
}
