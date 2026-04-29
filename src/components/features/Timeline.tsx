/**
 * @Project: PG-Tracker
 * @File: Timeline.tsx
 * @Description: 日程时间线页面，统一展示夏令营截止、预推免截止和普通任务，按已过期/今天/明天/本周/即将到来分组
 * @Author: 杨敬诚
 * @Date: 2026-04-08
 * Copyright (c) 2026. All rights reserved.
 */
import { useState, useEffect, useMemo } from 'react'
import { isPast, isToday, isTomorrow, isThisWeek } from 'date-fns'
import { Calendar, Clock, AlertCircle, CheckCircle2, Circle, ArrowRight, Plus, X, Edit2, Trash2 } from 'lucide-react'
import { Institution, Task, useStore } from '../../stores/appStore'
import { Button } from '../ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../ui/select'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { ConfirmDialog } from '../ui/confirm-dialog'
import { formatDateSafe, parseValidDate } from '../../lib/utils'

interface TimelineProps {
  institutions: Institution[]
}

type ScheduleType = 'camp' | 'push' | 'task'

export default function Timeline({ institutions }: TimelineProps): JSX.Element {
  const { setSelectedInstitutionId, setView, addTask, deleteTask, updateInstitution, orphanTasks, loadOrphanTasks } = useStore()
  const [showAddModal, setShowAddModal] = useState(false)
  const [newType, setNewType] = useState<ScheduleType>('task')
  const [newInstitutionId, setNewInstitutionId] = useState('')
  const [newTitle, setNewTitle] = useState('')
  const [newDate, setNewDate] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // 编辑独立任务
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editDate, setEditDate] = useState('')

  // 删除确认对话框
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null)

  // 乐观更新用的本地映射：taskId → isCompleted
  // 初始化时从 store 同步，之后独立维护
  const [orphanTaskCompletion, setOrphanTaskCompletion] = useState<Record<string, boolean>>({})

  // 同步 store orphanTasks → 本地乐观状态
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const map: Record<string, boolean> = {}
    orphanTasks.forEach(t => { map[t.id] = t.isCompleted })
    setOrphanTaskCompletion(map)
  }, [orphanTasks])
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => { loadOrphanTasks() }, [])

  // 使用 useMemo 优化性能，避免每帧重算
  const timelineEvents = useMemo(() => {
    const events: Array<{
      id: string; title: string; type: ScheduleType; date: string
      institution: Institution | null; completed?: boolean; taskId?: string
    }> = []
    institutions.forEach((inst) => {
      if (inst.campDeadline) events.push({
        id: `${inst.id}-camp`, title: `${inst.name} - 夏令营截止`,
        type: 'camp', date: inst.campDeadline, institution: inst
      })
      if (inst.pushDeadline) events.push({
        id: `${inst.id}-push`, title: `${inst.name} - 预推免截止`,
        type: 'push', date: inst.pushDeadline, institution: inst
      })
      inst.tasks?.forEach((task) => events.push({
        id: task.id, title: task.title,
        type: 'task', date: task.dueDate,
        institution: inst, completed: task.isCompleted, taskId: task.id
      }))
    })
    orphanTasks.forEach((task) => events.push({
      id: task.id, title: task.title,
      type: 'task' as ScheduleType, date: task.dueDate,
      institution: null,
      completed: task.id in orphanTaskCompletion ? orphanTaskCompletion[task.id] : task.isCompleted,
      taskId: task.id
    }))
    return events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  }, [institutions, orphanTasks, orphanTaskCompletion])

  const groupedEvents = useMemo(() => {
    const groups: Record<string, typeof timelineEvents> = { overdue: [], today: [], tomorrow: [], thisWeek: [], upcoming: [] }
    timelineEvents.forEach((event) => {
      const date = new Date(event.date)
      if (isPast(date) && !isToday(date)) groups.overdue.push(event)
      else if (isToday(date)) groups.today.push(event)
      else if (isTomorrow(date)) groups.tomorrow.push(event)
      else if (isThisWeek(date)) groups.thisWeek.push(event)
      else groups.upcoming.push(event)
    })
    return groups
  }, [timelineEvents])

  const getDateLabel = (date: string): { label: string; color: string } => {
    const d = parseValidDate(date)
    if (!d) return { label: '--', color: 'text-muted-foreground' }
    if (isPast(d) && !isToday(d)) return { label: '已过期', color: 'text-destructive' }
    if (isToday(d)) return { label: '今天', color: 'text-primary' }
    if (isTomorrow(d)) return { label: '明天', color: 'text-amber-600' }
    if (isThisWeek(d)) return { label: '本周', color: 'text-blue-600' }
    return { label: formatDateSafe(d, 'MM/dd'), color: 'text-muted-foreground' }
  }

  const handleAddSchedule = async (): Promise<void> => {
    if (!newDate || (newType === 'task' && !newTitle.trim())) return
    if (newType !== 'task' && (!newInstitutionId || newInstitutionId === '__none__')) return
    setIsSubmitting(true)
    try {
      if (newType === 'task') {
        await addTask({
          institutionId: newInstitutionId === '__none__' ? undefined : newInstitutionId || undefined,
          title: newTitle.trim(),
          dueDate: new Date(newDate),
          isCompleted: false
        })
      } else {
        const field = newType === 'camp' ? 'campDeadline' : 'pushDeadline'
        await updateInstitution(newInstitutionId, { [field]: new Date(newDate) })
      }
      setShowAddModal(false)
      setNewInstitutionId('')
      setNewTitle('')
      setNewDate('')
      setNewType('task')
      await loadOrphanTasks()
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleToggleTask = (taskId: string, currentCompleted: boolean): void => {
    const newCompleted = !currentCompleted

    // 1. 乐观更新：立刻修改本地状态，UI 瞬间变化
    setOrphanTaskCompletion(prev => ({ ...prev, [taskId]: newCompleted }))

    // 2. 直接调 IPC 更新数据库（不走 store 的 updateTask，避免 reloadInstitutions 刷掉 orphanTasks）
    window.api.task.update(taskId, { isCompleted: newCompleted })
      .then(() => {
        // 3. 数据库更新成功后，同步刷新 store 的 orphanTasks
        loadOrphanTasks()
      })
      .catch((err: any) => {
        console.error('任务状态更新失败，回滚 UI', err)
        // 4. 失败回滚到之前的状态
        setOrphanTaskCompletion(prev => ({ ...prev, [taskId]: currentCompleted }))
        alert('更新失败：' + (err?.message || '未知错误'))
      })
  }

  const handleDeleteTask = async (taskId: string): Promise<void> => {
    await deleteTask(taskId)
    await loadOrphanTasks()
  }

  const confirmDeleteTask = (taskId: string): void => {
    setTaskToDelete(taskId)
    setDeleteConfirmOpen(true)
  }

  const handleOpenEdit = (task: Task): void => {
    setEditingTask(task)
    setEditTitle(task.title)
    setEditDate(task.dueDate.substring(0, 10))
  }

  const handleSaveEdit = async (): Promise<void> => {
    if (!editingTask || !editTitle.trim() || !editDate) return
    await window.api.task.update(editingTask.id, { title: editTitle.trim(), dueDate: new Date(editDate) })
    setEditingTask(null)
    await loadOrphanTasks()
  }

  const handleRowClick = (event: typeof timelineEvents[0]): void => {
    if (event.institution) {
      setSelectedInstitutionId(event.institution.id)
      setView('kanban')
    }
  }

  const groupLabels: Record<string, string> = { overdue: '已过期', today: '今天', tomorrow: '明天', thisWeek: '本周', upcoming: '即将到来' }

  return (
    <div className="h-full overflow-auto p-6">
      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title="删除任务"
        description="确定要删除此任务吗？此操作不可恢复。"
        confirmText="删除"
        variant="destructive"
        onConfirm={() => taskToDelete && handleDeleteTask(taskToDelete)}
      />
      <div className="max-w-4xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold">日程</h2>
            <p className="text-muted-foreground">查看所有截止日期和任务</p>
          </div>
          <Button onClick={() => setShowAddModal(true)} className="gap-1.5">
            <Plus className="h-4 w-4" />添加日程
          </Button>
        </div>

        {/* 统计行 */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: '夏令营截止', count: timelineEvents.filter(e => e.type === 'camp').length, icon: '🏫', color: 'bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-900' },
            { label: '预推免截止', count: timelineEvents.filter(e => e.type === 'push').length, icon: '📋', color: 'bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900' },
            { label: '待办任务', count: timelineEvents.filter(e => e.type === 'task' && !e.completed).length, icon: '✅', color: 'bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900' },
          ].map(({ label, count, color }) => (
            <div key={label} className={`flex items-center justify-between px-4 py-2.5 rounded-lg ${color}`}>
              <span className="text-sm font-medium">{label}</span>
              <span className="text-lg font-bold">{count}</span>
            </div>
          ))}
        </div>

        {timelineEvents.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground border-2 border-dashed border-muted rounded-lg">
            <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="mb-3">暂无日程安排</p>
            <Button variant="outline" onClick={() => setShowAddModal(true)} className="gap-1.5">
              <Plus className="h-4 w-4" />添加第一个日程
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedEvents).map(([group, events]) => {
              if (events.length === 0) return null
              return (
                <div key={group}>
                  <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    {group === 'overdue' && <AlertCircle className="h-5 w-5 text-destructive" />}
                    {group === 'today' && <Clock className="h-5 w-5 text-primary" />}
                    {(group === 'tomorrow' || group === 'thisWeek' || group === 'upcoming') && <Calendar className="h-5 w-5" />}
                    {groupLabels[group]}
                    <span className="text-sm font-normal text-muted-foreground">({events.length})</span>
                  </h3>
                  <div className="space-y-2">
                    {events.map((event) => {
                      const dateInfo = getDateLabel(event.date)
                      const isOrphan = event.institution === null

                      return (
                        <div
                          key={event.id}
                          className={`flex items-center gap-3 p-3.5 rounded-lg border transition-colors group ${event.completed ? 'bg-muted/20 opacity-60' : 'bg-card'} ${isOrphan ? '' : 'cursor-pointer hover:bg-muted/40'}`}
                          onClick={() => !isOrphan && handleRowClick(event)}
                        >
                          {/* 完成状态切换 / 日期标签 */}
                          <div className="w-20 flex-shrink-0 text-center">
                            {event.type === 'task' && event.institution === null ? (
                              // 独立任务：可切换完成状态
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  e.preventDefault()
                                  const tid = event.taskId
                                  if (tid) handleToggleTask(tid, !!event.completed)
                                }}
                                className="mx-auto block p-1 rounded hover:bg-muted/50 transition-colors cursor-pointer"
                              >
                                {event.completed
                                  ? <CheckCircle2 className="h-5 w-5 text-green-600" />
                                  : <Circle className="h-5 w-5 text-muted-foreground hover:text-green-600 transition-colors" />}
                              </button>
                            ) : event.completed ? (
                              <CheckCircle2 className="h-5 w-5 text-green-600 mx-auto" />
                            ) : (
                              <span className={`text-xs font-semibold px-2 py-0.5 rounded ${dateInfo.color.replace('text-', 'bg-').replace('600', '100').replace('500', '100').replace('text-primary', 'bg-primary/10 text-primary')}`}>
                                {dateInfo.label}
                              </span>
                            )}
                          </div>

                          {/* 类型标签 */}
                          <div className="flex-shrink-0">
                            {event.type === 'camp' && (
                              <span className="px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300">夏令营</span>
                            )}
                            {event.type === 'push' && (
                              <span className="px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">预推免</span>
                            )}
                            {event.type === 'task' && (
                              <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">任务</span>
                            )}
                          </div>

                          {/* 标题 + 院校 */}
                          <div className="flex-1 min-w-0">
                            <p className={`font-medium text-sm truncate ${event.completed ? 'line-through text-muted-foreground' : ''}`}>{event.title}</p>
                            <p className="text-xs text-muted-foreground truncate">
                              {event.institution ? `${event.institution.name} · ${event.institution.department}` : '无关联院校'}
                            </p>
                          </div>

                          {/* 日期 */}
                          <div className="flex-shrink-0 text-xs text-muted-foreground mr-1">
                            {formatDateSafe(event.date, 'yyyy/MM/dd')}
                          </div>

                          {/* 独立任务行内操作 */}
                          {isOrphan && event.taskId && (
                            <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={(e) => { e.stopPropagation(); const t = orphanTasks.find(t => t.id === event.taskId); if (t) handleOpenEdit(t) }}
                                className="p-1.5 rounded hover:bg-muted transition-colors"
                                title="编辑"
                              >
                                <Edit2 className="h-4 w-4 text-muted-foreground" />
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); confirmDeleteTask(event.taskId!) }}
                                className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                                title="删除"
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </button>
                            </div>
                          )}

                          {/* 跳转箭头 */}
                          {event.institution && <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* 添加日程弹窗 */}
      <Dialog open={showAddModal} onOpenChange={o => { if (!o) setShowAddModal(false) }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              添加日程
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">日程类型</Label>
              <Select value={newType} onValueChange={(v) => { setNewType(v as ScheduleType); setNewTitle('') }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="task">普通任务</SelectItem>
                  <SelectItem value="camp">夏令营截止</SelectItem>
                  <SelectItem value="push">预推免截止</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">关联院校 {newType !== 'task' && <span className="text-destructive">*</span>}</Label>
              <Select value={newInstitutionId} onValueChange={setNewInstitutionId}>
                <SelectTrigger><SelectValue placeholder="选择院校" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">不关联院校</SelectItem>
                  {institutions.map((inst) => (
                    <SelectItem key={inst.id} value={inst.id}>
                      <span>{inst.name}</span>
                      <span className="text-xs text-muted-foreground ml-2">{inst.department}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {newType === 'task' && (
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">任务标题</Label>
                <Input autoFocus placeholder="如：提交推荐信" value={newTitle} onChange={e => setNewTitle(e.target.value)} />
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">截止日期</Label>
              <Input type="date" value={newDate} onChange={e => setNewDate(e.target.value)} />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowAddModal(false)} className="gap-1.5">
              <X className="h-4 w-4" />取消
            </Button>
            <Button
              onClick={handleAddSchedule}
              disabled={
                isSubmitting ||
                !newDate ||
                (newType === 'task' && !newTitle.trim()) ||
                (newType !== 'task' && (!newInstitutionId || newInstitutionId === '__none__'))
              }
              className="gap-1.5"
            >
              <Plus className="h-4 w-4" />{isSubmitting ? '添加中...' : '确认添加'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 编辑独立任务弹窗 */}
      <Dialog open={!!editingTask} onOpenChange={o => { if (!o) setEditingTask(null) }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>编辑任务</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">任务标题</label>
              <Input autoFocus value={editTitle} onChange={e => setEditTitle(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">截止日期</label>
              <Input type="date" value={editDate} onChange={e => setEditDate(e.target.value)} />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditingTask(null)} className="gap-1.5">
              <X className="h-4 w-4" />取消
            </Button>
            <Button onClick={handleSaveEdit} disabled={!editTitle.trim() || !editDate} className="gap-1.5">
              <Plus className="h-4 w-4" />保存修改
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
