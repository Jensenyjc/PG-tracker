/**
 * @Project: PG-Tracker
 * @File: Settings.tsx
 * @Description: 设置页面，提供主题切换、颜色主题选择、数据导入导出、数据清除及联系方式展示
 * @Author: 杨敬诚
 * @Date: 2026-04-08
 * Copyright (c) 2026. All rights reserved.
 */
import { Moon, Sun, Monitor, Database, Download, Upload, Trash2, Mail, Palette, RefreshCw } from 'lucide-react'
import avatarUrl from '../../assets/avatar.jpg'
import { useTheme } from 'next-themes'
import { useColorTheme, colorThemes } from '../ColorThemeContext'
import { useEffect, useState } from 'react'
import { Button } from '../ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Label } from '../ui/label'
import { ConfirmDialog } from '../ui/confirm-dialog'
import { useAppVersion } from '../../lib/useAppVersion'
import { useUpdater } from '../../lib/useUpdater'

export default function Settings(): JSX.Element | null {
  const { theme, setTheme } = useTheme()
  const { colorTheme, setColorTheme } = useColorTheme()
  const [mounted, setMounted] = useState(false)
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [showDoubleConfirm, setShowDoubleConfirm] = useState(false)
  const appVersion = useAppVersion()
  const { status, checking, checkForUpdates, downloadUpdate, installUpdate } = useUpdater()

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setMounted(true) }, [])

  if (!mounted) return null

  const handleExportData = async (): Promise<void> => {
    try {
      const result = await window.api.backup.exportAll()
      if (!result.success) {
        alert('导出失败：' + (result.error || '未知错误'))
        return
      }
      const json = JSON.stringify(result.data, null, 2)
      const blob = new Blob([json], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `pg-tracker-full-backup-${new Date().toISOString().split('T')[0]}.json`
      a.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Failed to export data:', error)
      alert('导出失败：' + (error as Error).message)
    }
  }

  const handleImportData = async (): Promise<void> => {
    try {
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = '.json'
      input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0]
        if (!file) return
        const readFile = (): Promise<string> => {
          return new Promise((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = (e) => resolve(e.target?.result as string)
            reader.onerror = reject
            reader.readAsText(file)
          })
        }
        try {
          const content = await readFile()
          const data = JSON.parse(content)
          // 检测新旧格式：新格式包含 institutions + emailTemplates 字段，旧格式是纯数组
          const payload = data.institutions !== undefined ? data : { institutions: Array.isArray(data) ? data : [] }
          const result = await window.api.backup.importAll(payload)
          if (!result.success) {
            alert('导入失败：' + (result.error || '无效的数据格式'))
            return
          }
          const { institutions: instCount, orphanTasks, emailTemplates: tplCount } = result.data || {}
          const parts = [`${instCount || 0} 所院校`]
          if (orphanTasks) parts.push(`${orphanTasks} 个独立任务`)
          if (tplCount) parts.push(`${tplCount} 个邮件模板`)
          alert(`导入成功！共导入 ${parts.join('、')}及关联的导师、文件、面经数据。`)
          window.location.reload()
        } catch {
          alert('导入失败：无效的数据文件')
        }
      }
      input.click()
    } catch (error) {
      console.error('Failed to import data:', error)
    }
  }

  const handleClearData = async (): Promise<void> => {
    try {
      const institutions = await window.api.institution.getAll()
      for (const inst of institutions) {
        await window.api.institution.delete(inst.id)
      }
      alert('数据已清除')
      window.location.reload()
    } catch (error) {
      console.error('Failed to clear data:', error)
      alert('清除失败：' + (error as Error).message)
    }
  }

  return (
    <div className="h-full overflow-auto p-6">
      <ConfirmDialog
        open={showClearConfirm}
        onOpenChange={(open) => {
          setShowClearConfirm(open)
          if (!open) setShowDoubleConfirm(false)
        }}
        title="清除所有数据"
        description="确定要清除所有数据吗？此操作不可恢复！"
        confirmText="继续"
        variant="destructive"
        onConfirm={() => setShowDoubleConfirm(true)}
      />
      <ConfirmDialog
        open={showDoubleConfirm}
        onOpenChange={setShowDoubleConfirm}
        title="最终确认"
        description="这是最后一次确认，清除后所有数据将永久丢失！建议先导出备份。"
        confirmText="清除数据"
        variant="destructive"
        onConfirm={handleClearData}
      />
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h2 className="text-3xl font-bold">设置</h2>
          <p className="text-muted-foreground">管理应用偏好和数据</p>
        </div>

        {/* 主题模式选择 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">外观模式</CardTitle>
            <CardDescription>选择浅色或深色显示模式</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="mb-2 block">显示模式</Label>
              <div className="flex gap-2">
                <Button variant={theme === 'light' ? 'default' : 'outline'} onClick={() => setTheme('light')} className="flex-1"><Sun className="h-4 w-4 mr-2" />浅色</Button>
                <Button variant={theme === 'dark' ? 'default' : 'outline'} onClick={() => setTheme('dark')} className="flex-1"><Moon className="h-4 w-4 mr-2" />深色</Button>
                <Button variant={theme === 'system' ? 'default' : 'outline'} onClick={() => setTheme('system')} className="flex-1"><Monitor className="h-4 w-4 mr-2" />跟随系统</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 颜色主题选择 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center gap-2"><Palette className="h-5 w-5" />颜色主题</CardTitle>
            <CardDescription>选择你喜欢的颜色风格</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {colorThemes.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setColorTheme(t.id)}
                  className={`relative p-3 rounded-lg border-2 transition-all hover:scale-105 ${
                    colorTheme === t.id
                      ? 'border-primary ring-2 ring-primary/20'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <div className="flex flex-col items-center gap-2">
                    <div
                      className="w-8 h-8 rounded-full shadow-md"
                      style={{ backgroundColor: t.color }}
                    />
                    <span className="text-xs font-medium">{t.name}</span>
                  </div>
                  {colorTheme === t.id && (
                    <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                      <svg className="w-2.5 h-2.5 text-primary-foreground" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              当前选择：<span className="font-medium">{colorThemes.find(t => t.id === colorTheme)?.name}</span>
              — {colorThemes.find(t => t.id === colorTheme)?.description}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center gap-2"><Database className="h-5 w-5" />数据管理</CardTitle>
            <CardDescription>导入、导出或清除你的数据</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleExportData} className="flex-1"><Download className="h-4 w-4 mr-2" />导出数据</Button>
              <Button variant="outline" onClick={handleImportData} className="flex-1"><Upload className="h-4 w-4 mr-2" />导入数据</Button>
            </div>
            <div className="pt-4 border-t">
              <Button variant="destructive" onClick={() => setShowClearConfirm(true)} className="w-full"><Trash2 className="h-4 w-4 mr-2" />清除所有数据</Button>
              <p className="text-xs text-muted-foreground text-center mt-2">清除后数据将永久丢失，请先导出备份</p>
            </div>
          </CardContent>
        </Card>

        {/* 软件更新 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center gap-2"><RefreshCw className="h-5 w-5" />软件更新</CardTitle>
            <CardDescription>检查并安装新版本</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">当前版本：{appVersion || '...'}</p>

            {status.phase === 'available' && (
              <div className="p-3 rounded-lg border border-primary/30 bg-primary/5">
                <p className="text-sm font-medium">发现新版本 v{status.version}</p>
              </div>
            )}

            {status.phase === 'downloading' && (
              <div className="space-y-2">
                <p className="text-sm">正在下载... {status.percent}%</p>
                <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary transition-all rounded-full" style={{ width: `${status.percent || 0}%` }} />
                </div>
              </div>
            )}

            {status.phase === 'downloaded' && (
              <div className="p-3 rounded-lg border border-green-500/30 bg-green-500/5">
                <p className="text-sm font-medium text-green-600 dark:text-green-400">下载完成，重启即可更新</p>
              </div>
            )}

            {status.phase === 'not-available' && (
              <p className="text-sm text-muted-foreground">已是最新版本</p>
            )}

            {status.phase === 'error' && (
              <div className="p-3 rounded-lg border border-destructive/30 bg-destructive/5">
                <p className="text-sm text-destructive">检查失败：{status.error}</p>
              </div>
            )}

            <div className="flex gap-2">
              {status.phase === 'available' && (
                <Button onClick={downloadUpdate} className="flex-1"><Download className="h-4 w-4 mr-2" />下载更新</Button>
              )}
              {status.phase === 'downloaded' && (
                <Button onClick={installUpdate} className="flex-1"><RefreshCw className="h-4 w-4 mr-2" />立即重启安装</Button>
              )}
              <Button variant="outline" onClick={checkForUpdates} disabled={checking} className={status.phase === 'downloaded' ? '' : 'flex-1'}>
                <RefreshCw className={`h-4 w-4 mr-2 ${checking ? 'animate-spin' : ''}`} />{checking ? '检查中...' : '检查更新'}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg font-semibold">关于</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p><strong>PG-Tracker</strong> - 保研信息收集与决策分析系统</p>
            <p>版本：{appVersion || '...'}</p>
            <p>数据存储：本地 SQLite 数据库</p>
            <p className="pt-2">本应用完全离线运行，所有数据均存储在本地设备上，保护你的隐私。</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg font-semibold flex items-center gap-2"><Mail className="h-5 w-5" />联系我们</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">使用中遇到问题、有功能建议，或想交流保研经验，欢迎随时联系：</p>
            <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/30">
              <img src={avatarUrl} alt="客服头像" className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">微信号</p>
                <p className="text-sm font-medium text-foreground select-all">W17331702101</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
