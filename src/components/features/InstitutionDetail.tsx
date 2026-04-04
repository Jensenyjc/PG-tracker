import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { ArrowLeft, Building2, Calendar, Users, Edit2, Trash2, Plus, Mail, ExternalLink, FileText, CheckCircle2, Circle, AlertTriangle } from 'lucide-react'
import { useStore, Institution, Advisor, Task } from '../../stores/appStore'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '../ui/dropdown-menu'
import AdvisorForm from './AdvisorForm'
import TaskForm from './TaskForm'
import InterviewForm from './InterviewForm'

interface InstitutionDetailProps {
  institutionId: string
  onBack: () => void
}

const tierColors = { REACH: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400', MATCH: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400', SAFETY: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' }
const statusColors = { PENDING: 'bg-gray-100 text-gray-800', SENT: 'bg-blue-100 text-blue-800', REPLIED: 'bg-purple-100 text-purple-800', INTERVIEW: 'bg-amber-100 text-amber-800', REJECTED: 'bg-red-100 text-red-800', ACCEPTED: 'bg-green-100 text-green-800' }
const statusLabels = { PENDING: '未联系', SENT: '已发送', REPLIED: '已回复', INTERVIEW: '面试中', REJECTED: '已拒绝', ACCEPTED: '已接受' }

export default function InstitutionDetail({ institutionId, onBack }: InstitutionDetailProps): JSX.Element {
  const { institutions, deleteInstitution, updateTask, deleteTask, conflictWarnings, checkConflicts } = useStore()
  const [showAdvisorForm, setShowAdvisorForm] = useState(false)
  const [showTaskForm, setShowTaskForm] = useState(false)
  const [showInterviewForm, setShowInterviewForm] = useState(false)
  const [selectedAdvisor, setSelectedAdvisor] = useState<Advisor | null>(null)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)

  const institution = institutions.find((i) => i.id === institutionId)

  useEffect(() => {
    if (institutionId) checkConflicts(institutionId)
  }, [institutionId, checkConflicts])

  if (!institution) {
    return <div className="h-full flex items-center justify-center"><p className="text-muted-foreground">院校信息加载中...</p></div>
  }

  const handleDelete = async (): Promise<void> => {
    if (confirm(`确定要删除 ${institution.name} 吗？此操作不可恢复。`)) {
      await deleteInstitution(institutionId)
      onBack()
    }
  }

  const handleToggleTask = async (task: Task): Promise<void> => {
    await updateTask(task.id, { ...task, isCompleted: !task.isCompleted })
  }

  const policyTags = institution.policyTags ? JSON.parse(institution.policyTags) : []

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <header className="p-4 border-b border-border bg-card">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onBack}><ArrowLeft className="h-5 w-5" /></Button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold">{institution.name}</h2>
              <Badge className={tierColors[institution.tier]}>{institution.tier === 'REACH' ? '冲' : institution.tier === 'MATCH' ? '稳' : '保'}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">{institution.department}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowTaskForm(true)}><Plus className="h-4 w-4 mr-1" />添加任务</Button>
            <Button variant="outline" size="sm" onClick={() => setShowAdvisorForm(true)}><Plus className="h-4 w-4 mr-1" />添加导师</Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><Edit2 className="h-4 w-4" /></Button></DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => { setSelectedAdvisor(null); setShowAdvisorForm(true) }}><Plus className="h-4 w-4 mr-2" />添加导师</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleDelete} className="text-destructive"><Trash2 className="h-4 w-4 mr-2" />删除院校</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {conflictWarnings.length > 0 && (
        <div className="px-4 py-2 bg-amber-50 border-b border-amber-200 dark:bg-amber-900/20">
          <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
            <AlertTriangle className="h-4 w-4" /><span className="text-sm font-medium">冲突警告</span>
          </div>
          {conflictWarnings.map((warning, index) => (
            <p key={index} className="text-sm text-amber-700 dark:text-amber-300 mt-1">{warning}</p>
          ))}
        </div>
      )}

      <div className="flex-1 overflow-auto">
        <Tabs defaultValue="overview" className="h-full">
          <div className="px-4 pt-4">
            <TabsList>
              <TabsTrigger value="overview">总览</TabsTrigger>
              <TabsTrigger value="advisors">导师 ({institution.advisors?.length || 0})</TabsTrigger>
              <TabsTrigger value="tasks">任务 ({institution.tasks?.length || 0})</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="overview" className="p-4 space-y-6">
            <section>
              <h3 className="text-lg font-semibold mb-3">基本信息</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2 text-sm">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">学位类型：</span>
                  <span>{institution.degreeType === 'MASTER' ? '学硕' : '直博'}</span>
                </div>
                {institution.expectedQuota && (
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">预计招生：</span>
                    <span>{institution.expectedQuota} 人</span>
                  </div>
                )}
                {institution.campDeadline && (
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">夏令营截止：</span>
                    <span>{format(new Date(institution.campDeadline), 'yyyy/MM/dd', { locale: zhCN })}</span>
                  </div>
                )}
                {institution.pushDeadline && (
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">预推免截止：</span>
                    <span>{format(new Date(institution.pushDeadline), 'yyyy/MM/dd', { locale: zhCN })}</span>
                  </div>
                )}
              </div>
            </section>

            {policyTags.length > 0 && (
              <section>
                <h3 className="text-lg font-semibold mb-3">特殊政策</h3>
                <div className="flex flex-wrap gap-2">
                  {policyTags.map((tag: string, index: number) => (
                    <Badge key={index} variant="secondary">{tag}</Badge>
                  ))}
                </div>
              </section>
            )}

            {institution.advisors && institution.advisors.length > 0 && (
              <section>
                <h3 className="text-lg font-semibold mb-3">导师预览</h3>
                <div className="space-y-2">
                  {institution.advisors.slice(0, 3).map((advisor) => (
                    <div key={advisor.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                      <div>
                        <p className="font-medium">{advisor.name}</p>
                        <p className="text-sm text-muted-foreground">{advisor.researchArea}</p>
                      </div>
                      <Badge className={statusColors[advisor.contactStatus as keyof typeof statusColors]}>
                        {statusLabels[advisor.contactStatus as keyof typeof statusLabels]}
                      </Badge>
                    </div>
                  ))}
                  {institution.advisors.length > 3 && (
                    <p className="text-sm text-muted-foreground text-center">还有 {institution.advisors.length - 3} 位导师...</p>
                  )}
                </div>
              </section>
            )}
          </TabsContent>

          <TabsContent value="advisors" className="p-4">
            {institution.advisors && institution.advisors.length > 0 ? (
              <div className="space-y-4">
                {institution.advisors.map((advisor) => (
                  <AdvisorCard key={advisor.id} advisor={advisor} onEdit={() => { setSelectedAdvisor(advisor); setShowAdvisorForm(true) }} onAddInterview={() => { setSelectedAdvisor(advisor); setShowInterviewForm(true) }} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Mail className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>暂无导师信息</p>
                <Button variant="outline" className="mt-3" onClick={() => setShowAdvisorForm(true)}><Plus className="h-4 w-4 mr-1" />添加导师</Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="tasks" className="p-4">
            {institution.tasks && institution.tasks.length > 0 ? (
              <div className="space-y-2">
                {institution.tasks.map((task) => (
                  <div key={task.id} className={`flex items-center gap-3 p-3 rounded-lg border ${task.isCompleted ? 'bg-muted/30 opacity-60' : 'bg-card'}`}>
                    <button onClick={() => handleToggleTask(task)}>
                      {task.isCompleted ? <CheckCircle2 className="h-5 w-5 text-green-600" /> : <Circle className="h-5 w-5 text-muted-foreground" />}
                    </button>
                    <div className="flex-1">
                      <p className={task.isCompleted ? 'line-through text-muted-foreground' : ''}>{task.title}</p>
                      <p className="text-xs text-muted-foreground">截止：{format(new Date(task.dueDate), 'yyyy/MM/dd', { locale: zhCN })}</p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => { setSelectedTask(task); setShowTaskForm(true) }}><Edit2 className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => deleteTask(task.id)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <CheckCircle2 className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>暂无任务</p>
                <Button variant="outline" className="mt-3" onClick={() => setShowTaskForm(true)}><Plus className="h-4 w-4 mr-1" />添加任务</Button>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {showAdvisorForm && <AdvisorForm institutionId={institutionId} advisor={selectedAdvisor} onClose={() => { setShowAdvisorForm(false); setSelectedAdvisor(null) }} />}
      {showTaskForm && <TaskForm institutionId={institutionId} task={selectedTask} onClose={() => { setShowTaskForm(false); setSelectedTask(null) }} />}
      {showInterviewForm && selectedAdvisor && <InterviewForm advisorId={selectedAdvisor.id} onClose={() => { setShowInterviewForm(false); setSelectedAdvisor(null) }} />}
    </div>
  )
}

interface AdvisorCardProps {
  advisor: Advisor
  onEdit: () => void
  onAddInterview: () => void
}

function AdvisorCard({ advisor, onEdit, onAddInterview }: AdvisorCardProps): JSX.Element {
  const [showAssets, setShowAssets] = useState(false)

  const handleOpenFile = async (path: string): Promise<void> => {
    try { await window.api.file.openExternal(path) } catch (error) { console.error('Failed to open file:', error) }
  }

  const handleSelectFile = async (advisorId: string, type: string): Promise<void> => {
    try {
      const path = await window.api.file.selectFile({ filters: [{ name: 'Documents', extensions: ['pdf', 'doc', 'docx', 'tex'] }, { name: 'All Files', extensions: ['*'] }] })
      if (path) await window.api.asset.create({ advisorId, type, localPath: path })
    } catch (error) { console.error('Failed to select file:', error) }
  }

  return (
    <div className="border rounded-lg p-4 bg-card">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h4 className="font-semibold">{advisor.name}</h4>
          <p className="text-sm text-muted-foreground">{advisor.title || '无职称'}</p>
        </div>
        <Badge className={statusColors[advisor.contactStatus as keyof typeof statusColors]}>
          {statusLabels[advisor.contactStatus as keyof typeof statusLabels]}
        </Badge>
      </div>

      <div className="space-y-2 text-sm mb-3">
        <p><span className="text-muted-foreground">研究方向：</span>{advisor.researchArea}</p>
        <p><span className="text-muted-foreground">邮箱：</span><a href={`mailto:${advisor.email}`} className="text-primary hover:underline">{advisor.email}</a></p>
        {advisor.homepage && (
          <p><span className="text-muted-foreground">主页：</span><a href={advisor.homepage} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1"><ExternalLink className="h-3 w-3" />访问</a></p>
        )}
        {advisor.lastContactDate && (
          <p><span className="text-muted-foreground">最后联系：</span>{format(new Date(advisor.lastContactDate), 'yyyy/MM/dd', { locale: zhCN })}</p>
        )}
        {advisor.reputationScore && (
          <p><span className="text-muted-foreground">评分：</span>{'★'.repeat(advisor.reputationScore)}{'☆'.repeat(5 - advisor.reputationScore)}</p>
        )}
      </div>

      {advisor.notes && (
        <div className="mb-3 p-2 bg-muted/30 rounded text-sm">
          <p className="text-muted-foreground mb-1">备注：</p>
          <p className="whitespace-pre-wrap">{advisor.notes}</p>
        </div>
      )}

      {advisor.assets && advisor.assets.length > 0 && (
        <div className="mb-3">
          <button onClick={() => setShowAssets(!showAssets)} className="text-sm text-primary hover:underline flex items-center gap-1">
            <FileText className="h-4 w-4" />相关文件 ({advisor.assets.length})
          </button>
          {showAssets && (
            <div className="mt-2 space-y-1">
              {advisor.assets.map((asset) => (
                <div key={asset.id} className="flex items-center justify-between p-2 bg-muted/30 rounded text-sm">
                  <span className="truncate flex-1">{asset.localPath.split(/[/\\]/).pop()}</span>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleOpenFile(asset.localPath)}><ExternalLink className="h-3 w-3" /></Button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="flex gap-2 pt-2 border-t">
        <Button size="sm" variant="outline" onClick={onEdit}><Edit2 className="h-4 w-4 mr-1" />编辑</Button>
        <Button size="sm" variant="outline" onClick={() => handleSelectFile(advisor.id, 'RESUME')}><FileText className="h-4 w-4 mr-1" />绑定文件</Button>
        <Button size="sm" variant="outline" onClick={onAddInterview}><Plus className="h-4 w-4 mr-1" />记录面经</Button>
      </div>
    </div>
  )
}
