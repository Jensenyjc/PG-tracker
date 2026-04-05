import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { ArrowLeft, Building2, Calendar, Users, Edit2, Trash2, Plus, Mail, ExternalLink, FileText, CheckCircle2, Circle, AlertTriangle, ArrowRight, ChevronDown, Check } from 'lucide-react'
import { useStore, Institution, Advisor, Task } from '../../stores/appStore'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from '../ui/dropdown-menu'
import AdvisorForm from './AdvisorForm'
import TaskForm from './TaskForm'
import InterviewForm from './InterviewForm'
import InstitutionForm from './InstitutionForm'

interface InstitutionDetailProps {
  institutionId: string
  onBack: () => void
}

const tierColors = { REACH: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400', MATCH: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400', SAFETY: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' }
const advisorStatusConfig: Record<string, { label: string; dot: string; badge: string }> = {
  PENDING:   { label: '未联系', dot: 'bg-gray-400',          badge: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' },
  SENT:      { label: '已发送', dot: 'bg-blue-500',          badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
  REPLIED:   { label: '已回复', dot: 'bg-purple-500',       badge: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300' },
  INTERVIEW: { label: '面试中', dot: 'bg-amber-500',        badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' },
  REJECTED:  { label: '已拒绝', dot: 'bg-red-400',          badge: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' },
  ACCEPTED:  { label: '已接受', dot: 'bg-green-500',        badge: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' },
}

export default function InstitutionDetail({ institutionId, onBack }: InstitutionDetailProps): JSX.Element {
  const { institutions, deleteInstitution, updateTask, deleteTask, updateAdvisor, conflictWarnings, checkConflicts } = useStore()
  const [showAdvisorForm, setShowAdvisorForm] = useState(false)
  const [showTaskForm, setShowTaskForm] = useState(false)
  const [showInterviewForm, setShowInterviewForm] = useState(false)
  const [showEditForm, setShowEditForm] = useState(false)
  const [selectedAdvisor, setSelectedAdvisor] = useState<Advisor | null>(null)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [activeTab, setActiveTab] = useState('overview')

  const institution = institutions.find((i) => i.id === institutionId)

  if (!institution) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-muted-foreground">院校信息加载中...</p>
      </div>
    )
  }

  useEffect(() => {
    if (institutionId) checkConflicts(institutionId)
  }, [institutionId, checkConflicts])

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
            <Button variant="ghost" size="icon" onClick={() => setShowEditForm(true)} title="编辑院校"><Edit2 className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" onClick={handleDelete} title="删除院校" className="text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
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
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
          <div className="px-4 pt-4">
            <TabsList>
              <TabsTrigger value="overview">总览</TabsTrigger>
              <TabsTrigger value="advisors">导师 ({institution.advisors?.length || 0})</TabsTrigger>
              <TabsTrigger value="tasks">任务 ({institution.tasks?.length || 0})</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="overview" className="p-4 space-y-4">
            {/*
              布局结构：
              - 顶部：基本信息（100% 宽，带细边框面板）
              - 下方：导师预览 + 任务预览（grid grid-cols-2，左右各 50%，gap-6）
              - policyTags 并入基本信息面板，不单独成区
            */}

            {/* ── 基本信息面板 ── */}
            <div className="border border-border rounded-lg p-5 bg-white dark:bg-transparent">
              <div className="flex items-center gap-2 mb-4">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-base font-semibold">基本信息</h3>
              </div>
              <div className="grid grid-cols-2 gap-x-8 gap-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">学位类型：</span>
                  <span className="font-medium">{institution.degreeType === 'MASTER' ? '学硕' : '直博'}</span>
                </div>
                {institution.expectedQuota && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">预计招生：</span>
                    <span className="font-medium">{institution.expectedQuota} 人</span>
                  </div>
                )}
                {institution.campDeadline && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">夏令营截止：</span>
                    <span className="font-medium">{format(new Date(institution.campDeadline), 'yyyy/MM/dd', { locale: zhCN })}</span>
                  </div>
                )}
                {institution.pushDeadline && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">预推免截止：</span>
                    <span className="font-medium">{format(new Date(institution.pushDeadline), 'yyyy/MM/dd', { locale: zhCN })}</span>
                  </div>
                )}
                {policyTags.length > 0 && (
                  <div className="flex items-center gap-2 text-sm col-span-2">
                    <span className="text-muted-foreground">特殊政策：</span>
                    <div className="flex flex-wrap gap-1.5">
                      {policyTags.map((tag: string) => (
                        <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ── 双列区域：导师预览 | 任务预览 ── */}
            <div className="grid grid-cols-2 gap-6">

              {/* 导师预览 */}
              <div className="border border-border rounded-lg p-5 bg-white dark:bg-transparent">
                {/* 标题行：标题自身即热区，右侧小图标提示可跳转 */}
                <button
                  onClick={() => setActiveTab('advisors')}
                  className="flex items-center gap-2 mb-4 w-full group text-left"
                >
                  <Users className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  <h3 className="text-base font-semibold group-hover:text-primary transition-colors">导师预览</h3>
                  <span className="text-xs text-muted-foreground group-hover:text-primary ml-1 transition-colors">
                    {institution.advisors?.length > 0 ? `(${institution.advisors.length})` : ''}
                  </span>
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary ml-auto transition-colors" />
                </button>

                {institution.advisors && institution.advisors.length > 0 ? (
                  <div className="space-y-2">
                    {institution.advisors.map((advisor) => {
                      const s = advisorStatusConfig[advisor.contactStatus] ?? advisorStatusConfig.PENDING
                      return (
                        <div key={advisor.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg hover:bg-muted/60 transition-colors group">
                          <div
                            onClick={() => setActiveTab('advisors')}
                            className="flex items-center gap-3 min-w-0 cursor-pointer flex-1"
                          >
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-sm truncate">{advisor.name}</p>
                              <p className="text-xs text-muted-foreground truncate">{advisor.researchArea}</p>
                            </div>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                onClick={(e) => e.stopPropagation()}
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border border-transparent hover:opacity-75 transition-opacity ml-2 flex-shrink-0 cursor-pointer ${s.badge}`}
                              >
                                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${s.dot}`} />
                                {s.label}
                                <ChevronDown className="h-2.5 w-2.5 opacity-60" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="min-w-[110px]">
                              {Object.entries(advisorStatusConfig).map(([key, config]) => (
                                <DropdownMenuItem
                                  key={key}
                                  onSelect={() => { updateAdvisor(advisor.id, { contactStatus: key as Advisor['contactStatus'] }) }}
                                  className="flex items-center gap-2 cursor-pointer"
                                >
                                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${config.dot}`} />
                                  <span className="flex-1 text-xs">{config.label}</span>
                                  {advisor.contactStatus === key && <Check className="h-3 w-3 text-primary flex-shrink-0" />}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <button onClick={() => setActiveTab('advisors')}
                    className="w-full py-6 text-sm text-muted-foreground hover:text-primary transition-colors border border-dashed border-muted rounded-lg hover:border-primary/40">
                    + 添加导师
                  </button>
                )}
              </div>

              {/* 任务预览 */}
              <div className="border border-border rounded-lg p-5 bg-white dark:bg-transparent">
                <button
                  onClick={() => setActiveTab('tasks')}
                  className="flex items-center gap-2 mb-4 w-full group text-left"
                >
                  <CheckCircle2 className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  <h3 className="text-base font-semibold group-hover:text-primary transition-colors">任务预览</h3>
                  <span className="text-xs text-muted-foreground group-hover:text-primary ml-1 transition-colors">
                    {institution.tasks && institution.tasks.length > 0 ? `(${institution.tasks.filter((t: Task) => !t.isCompleted).length} 未完成)` : ''}
                  </span>
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary ml-auto transition-colors" />
                </button>

                {institution.tasks && institution.tasks.length > 0 ? (
                  <div className="space-y-2">
                    {institution.tasks.slice(0, 4).map((task) => (
                      <div key={task.id} onClick={() => setActiveTab('tasks')}
                        className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer hover:bg-muted/60 transition-colors ${task.isCompleted ? 'bg-muted/10 opacity-60' : 'bg-muted/30'}`}>
                        <button onClick={(e) => { e.stopPropagation(); handleToggleTask(task) }}>
                          {task.isCompleted
                            ? <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                            : <Circle className="h-4 w-4 text-muted-foreground flex-shrink-0" />}
                        </button>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm truncate ${task.isCompleted ? 'line-through text-muted-foreground' : ''}`}>{task.title}</p>
                          <p className="text-xs text-muted-foreground">截止 {format(new Date(task.dueDate), 'MM/dd', { locale: zhCN })}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <button onClick={() => setActiveTab('tasks')}
                    className="w-full py-6 text-sm text-muted-foreground hover:text-primary transition-colors border border-dashed border-muted rounded-lg hover:border-primary/40">
                    + 添加任务
                  </button>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="advisors" className="p-4">
            {institution.advisors && institution.advisors.length > 0 ? (
              <div className="space-y-4">
                {institution.advisors.map((advisor) => (
                  <AdvisorCard key={advisor.id} advisor={advisor} onEdit={() => { setSelectedAdvisor(advisor); setShowAdvisorForm(true) }} onAddInterview={() => { setSelectedAdvisor(advisor); setShowInterviewForm(true) }} updateAdvisor={updateAdvisor} />
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
      {showEditForm && <InstitutionForm institution={institution} onClose={() => setShowEditForm(false)} onSuccess={() => { setShowEditForm(false) }} />}
    </div>
  )
}

interface AdvisorCardProps {
  advisor: Advisor
  onEdit: () => void
  onAddInterview: () => void
  updateAdvisor: (id: string, data: Partial<Advisor>) => Promise<void>
}

function AdvisorCard({ advisor, onEdit, onAddInterview, updateAdvisor }: AdvisorCardProps): JSX.Element {
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

  const handleStatusChange = async (status: string): Promise<void> => {
    await updateAdvisor(advisor.id, { contactStatus: status as Advisor['contactStatus'] })
  }

  const currentStatus = advisorStatusConfig[advisor.contactStatus] ?? advisorStatusConfig.PENDING

  return (
    <div className="border rounded-lg p-4 bg-card">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h4 className="font-semibold">{advisor.name}</h4>
          <p className="text-sm text-muted-foreground">{advisor.title || '无职称'}</p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border border-transparent cursor-pointer hover:opacity-80 transition-opacity ${currentStatus.badge}`}>
              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${currentStatus.dot}`} />
              {currentStatus.label}
              <ChevronDown className="h-3 w-3 opacity-60" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-[120px]">
            {Object.entries(advisorStatusConfig).map(([key, config]) => (
              <DropdownMenuItem
                key={key}
                onSelect={() => handleStatusChange(key)}
                className="flex items-center gap-2.5 cursor-pointer"
              >
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${config.dot}`} />
                <span className="flex-1">{config.label}</span>
                {advisor.contactStatus === key && <Check className="h-3.5 w-3.5 text-primary flex-shrink-0" />}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
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
