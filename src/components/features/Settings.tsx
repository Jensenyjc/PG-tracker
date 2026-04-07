import { Moon, Sun, Monitor, Database, Download, Upload, Trash2, Mail } from 'lucide-react'
import avatarUrl from '../../assets/avatar.jpg'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { Button } from '../ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Label } from '../ui/label'

export default function Settings(): JSX.Element {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // 避免水合不匹配
  useEffect(() => { setMounted(true) }, [])

  if (!mounted) return null

  const handleExportData = async (): Promise<void> => {
    try {
      const data = await window.api.institution.getAll()
      const json = JSON.stringify(data, null, 2)
      const blob = new Blob([json], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `pg-tracker-backup-${new Date().toISOString().split('T')[0]}.json`
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
          if (Array.isArray(data)) {
            let importedCount = 0
            for (const institution of data) {
              const { id, advisors, tasks, createdAt, updatedAt, ...rest } = institution
              const created = await window.api.institution.create(rest)
              if (created && created.id) {
                // 导入关联的导师
                if (Array.isArray(advisors)) {
                  for (const advisor of advisors) {
                    const { id: aId, institutionId, assets, interviews, createdAt: aC, updatedAt: aU, ...advisorRest } = advisor
                    await window.api.advisor.create({ ...advisorRest, institutionId: created.id })
                  }
                }
                // 导入关联的任务
                if (Array.isArray(tasks)) {
                  for (const task of tasks) {
                    const { id: tId, institutionId, createdAt: tC, ...taskRest } = task
                    await window.api.task.create({ ...taskRest, institutionId: created.id })
                  }
                }
                importedCount++
              }
            }
            alert(`导入成功！共导入 ${importedCount} 所院校及关联数据。`)
            window.location.reload()
          } else {
            alert('导入失败：数据格式不正确（需要是院校数组）')
          }
        } catch (err) {
          alert('导入失败：无效的数据格式')
        }
      }
      input.click()
    } catch (error) {
      console.error('Failed to import data:', error)
    }
  }

  const handleClearData = async (): Promise<void> => {
    const confirmed = confirm('确定要清除所有数据吗？此操作不可恢复！')
    if (!confirmed) return
    const doubleConfirmed = confirm('这是最后一次确认，清除后所有数据将永久丢失！')
    if (!doubleConfirmed) return
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
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h2 className="text-3xl font-bold">设置</h2>
          <p className="text-muted-foreground">管理应用偏好和数据</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">外观</CardTitle>
            <CardDescription>自定义应用的外观效果</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="mb-2 block">主题</Label>
              <div className="flex gap-2">
                <Button variant={theme === 'light' ? 'default' : 'outline'} onClick={() => setTheme('light')} className="flex-1"><Sun className="h-4 w-4 mr-2" />浅色</Button>
                <Button variant={theme === 'dark' ? 'default' : 'outline'} onClick={() => setTheme('dark')} className="flex-1"><Moon className="h-4 w-4 mr-2" />深色</Button>
                <Button variant={theme === 'system' ? 'default' : 'outline'} onClick={() => setTheme('system')} className="flex-1"><Monitor className="h-4 w-4 mr-2" />跟随系统</Button>
              </div>
            </div>
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
              <Button variant="destructive" onClick={handleClearData} className="w-full"><Trash2 className="h-4 w-4 mr-2" />清除所有数据</Button>
              <p className="text-xs text-muted-foreground text-center mt-2">清除后数据将永久丢失，请先导出备份</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg font-semibold">关于</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p><strong>PG-Tracker</strong> - 保研信息收集与决策分析系统</p>
            <p>版本：2.2.0</p>
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
