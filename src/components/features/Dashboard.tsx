/**
 * @Project: PG-Tracker
 * @File: Dashboard.tsx
 * @Description: 总览仪表板页面，展示院校/导师/任务统计、截止日期预警、三分类院校速览
 * @Author: 杨敬诚
 * @Date: 2026-04-08
 * Copyright (c) 2026. All rights reserved.
 */
import { useMemo, useEffect } from 'react'
import { format, isPast, differenceInDays } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { Calendar, TrendingUp, Users, CheckCircle2, Clock, ArrowRight, List } from 'lucide-react'
import { useStore, Institution } from '../../stores/appStore'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'

export default function Dashboard(): JSX.Element {
  const { institutions, orphanTasks, loadOrphanTasks, setView, setSelectedInstitutionId } = useStore()

  useEffect(() => { loadOrphanTasks() }, [])

  const stats = useMemo(() => {
    const total = institutions.length
    const reach = institutions.filter((i) => i.tier === 'REACH').length
    const match = institutions.filter((i) => i.tier === 'MATCH').length
    const safety = institutions.filter((i) => i.tier === 'SAFETY').length
    const totalAdvisors = institutions.reduce((acc, i) => acc + (i.advisors?.length || 0), 0)
    const totalTasks = institutions.reduce((acc, i) => acc + (i.tasks?.length || 0), 0)
    const completedTasks = institutions.reduce((acc, i) => acc + (i.tasks?.filter((t) => t.isCompleted).length || 0), 0)

    return { total, reach, match, safety, totalAdvisors, totalTasks, completedTasks, taskProgress: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0 }
  }, [institutions])

  // 所有未过期的院校截止日期
  const allDeadlines = useMemo(() => {
    const items: { institution: Institution; deadline: string; type: '夏令营' | '预推免'; daysLeft: number }[] = []
    for (const inst of institutions) {
      if (inst.campDeadline && !isPast(new Date(inst.campDeadline))) {
        items.push({ institution: inst, deadline: inst.campDeadline, type: '夏令营', daysLeft: differenceInDays(new Date(inst.campDeadline), new Date()) })
      }
      if (inst.pushDeadline && !isPast(new Date(inst.pushDeadline))) {
        items.push({ institution: inst, deadline: inst.pushDeadline, type: '预推免', daysLeft: differenceInDays(new Date(inst.pushDeadline), new Date()) })
      }
    }
    return items.sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())
  }, [institutions])

  // 所有未完成任务（院校任务 + 独立任务）
  const allPendingTasks = useMemo(() => {
    const items: { institution: Institution | null; task: any }[] = []
    for (const inst of institutions) {
      for (const task of inst.tasks || []) {
        if (!task.isCompleted) {
          items.push({ institution: inst, task })
        }
      }
    }
    // 合并独立任务（institutionId 为 null 的任务）
    for (const task of orphanTasks) {
      if (!task.isCompleted) {
        items.push({ institution: null, task })
      }
    }
    return items.sort((a, b) => new Date(a.task.dueDate).getTime() - new Date(b.task.dueDate).getTime())
  }, [institutions, orphanTasks])

  return (
    <div className="h-full overflow-auto p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h2 className="text-3xl font-bold">总览</h2>
          <p className="text-muted-foreground">跟踪你的保研申请进度</p>
        </div>

        {/* 统计卡片 — 均支持点击跳转 */}
        <div className="grid grid-cols-4 gap-4">
          <StatsCard title="院校总数" value={stats.total} icon={<TrendingUp className="h-5 w-5" />} description={`冲 ${stats.reach} | 稳 ${stats.match} | 保 ${stats.safety}`} onClick={() => setView('kanban')} />
          <StatsCard title="导师数量" value={stats.totalAdvisors} icon={<Users className="h-5 w-5" />} description="已录入导师信息" onClick={() => setView('kanban')} />
          <StatsCard title="待办任务" value={stats.totalTasks - stats.completedTasks} icon={<Clock className="h-5 w-5" />} description={`共 ${stats.totalTasks} 项任务`} onClick={() => setView('timeline')} />
          <StatsCard title="任务完成率" value={`${stats.taskProgress}%`} icon={<CheckCircle2 className="h-5 w-5" />} description={`${stats.completedTasks} 项已完成`} onClick={() => setView('timeline')} />
        </div>

        {/* 日程总览 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-semibold flex items-center gap-2"><Calendar className="h-5 w-5" />日程总览</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => setView('timeline')}>查看完整时间线 <ArrowRight className="h-4 w-4 ml-1" /></Button>
          </CardHeader>
          <CardContent className="space-y-4">

            {/* 院校截止日期 */}
            <div className="bg-slate-50 dark:bg-slate-800/20 rounded-lg p-4">
              <p className="text-sm font-medium text-muted-foreground mb-3">院校截止日期</p>
              <div className="max-h-48 overflow-y-auto scrollbar-thin pr-1">
                {allDeadlines.length > 0 ? (
                  <div className="space-y-2">
                    {allDeadlines.map(({ institution, deadline, type, daysLeft }) => {
                      const urgency = daysLeft <= 7 ? 'urgent' : daysLeft <= 14 ? 'warning' : 'normal'
                      return (
                        <div key={`${institution.id}-${type}`} className="flex items-center justify-between p-3 rounded-lg bg-white dark:bg-slate-900/40 hover:bg-muted/50 cursor-pointer transition-colors" onClick={() => { setSelectedInstitutionId(institution.id); setView('kanban') }}>
                          <div className="flex items-center gap-3 min-w-0">
                            <span className={`text-sm font-semibold w-14 flex-shrink-0 text-center rounded bg-slate-100 dark:bg-slate-700 py-0.5 ${urgency === 'urgent' ? 'text-red-600' : urgency === 'warning' ? 'text-amber-600' : 'text-muted-foreground'}`}>{daysLeft}天</span>
                            <div className="min-w-0">
                              <p className="font-medium text-sm truncate">{institution.name}</p>
                              <p className="text-xs text-muted-foreground truncate">{institution.department}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                            <UrgencyBadge urgency={urgency} />
                            <BadgeTier tier={institution.tier} type={type} />
                            <span className="text-xs text-muted-foreground">{format(new Date(deadline), 'MM/dd', { locale: zhCN })}</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-6">暂无即将截止的申请</p>
                )}
              </div>
            </div>

            {/* 待办任务 */}
            <div className="bg-slate-50 dark:bg-slate-800/20 rounded-lg p-4">
              <p className="text-sm font-medium text-muted-foreground mb-3">待办任务</p>
              <div className="max-h-48 overflow-y-auto scrollbar-thin pr-1">
                {allPendingTasks.length > 0 ? (
                  <div className="space-y-2">
                    {allPendingTasks.map(({ institution, task }) => {
                      const daysLeft = differenceInDays(new Date(task.dueDate), new Date())
                      const urgency = daysLeft <= 7 ? 'urgent' : daysLeft <= 14 ? 'warning' : 'normal'
                      return (
                        <div key={task.id} className={`flex items-center justify-between p-3 rounded-lg bg-white dark:bg-slate-900/40 hover:bg-muted/50 transition-colors ${institution ? 'cursor-pointer' : ''}`} onClick={() => { if (institution) { setSelectedInstitutionId(institution.id); setView('kanban') } }}>
                          <div className="flex items-center gap-3 min-w-0">
                            <span className={`text-sm font-semibold w-14 flex-shrink-0 text-center rounded bg-slate-100 dark:bg-slate-700 py-0.5 ${urgency === 'urgent' ? 'text-red-600' : urgency === 'warning' ? 'text-amber-600' : 'text-muted-foreground'}`}>{daysLeft}天</span>
                            <div className="min-w-0">
                              <p className="font-medium text-sm truncate">{task.title}</p>
                              <p className="text-xs text-muted-foreground truncate">{institution ? `${institution.name} · ${institution.department}` : '无关联院校'}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                            <UrgencyBadge urgency={urgency} />
                            <span className="text-xs text-muted-foreground">{format(new Date(task.dueDate), 'MM/dd', { locale: zhCN })}</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-6">暂无待办任务</p>
                )}
              </div>
            </div>

          </CardContent>
        </Card>

        {/* 三分类院校 */}
        <div className="grid grid-cols-3 gap-4">
          <TierOverview tier="REACH" label="冲" description="超出自身水平，但值得一试" institutions={institutions.filter((i) => i.tier === 'REACH')} />
          <TierOverview tier="MATCH" label="稳" description="匹配自身水平" institutions={institutions.filter((i) => i.tier === 'MATCH')} />
          <TierOverview tier="SAFETY" label="保" description="保底选择" institutions={institutions.filter((i) => i.tier === 'SAFETY')} />
        </div>
      </div>
    </div>
  )
}

function UrgencyBadge({ urgency }: { urgency: 'urgent' | 'warning' | 'normal' }) {
  if (urgency === 'urgent') {
    return <span className="px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">紧急</span>
  }
  if (urgency === 'warning') {
    return <span className="px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">提醒</span>
  }
  return null
}

function StatsCard({ title, value, icon, description, onClick }: { title: string; value: string | number; icon: React.ReactNode; description: string; onClick?: () => void }) {
  return (
    <Card className={onClick ? 'cursor-pointer hover:bg-muted/30 transition-colors' : ''} onClick={onClick}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-xs text-muted-foreground mt-1">{description}</p>
          </div>
          <div className="text-muted-foreground">{icon}</div>
        </div>
      </CardContent>
    </Card>
  )
}

function TierOverview({ tier, label, description, institutions }: { tier: 'REACH' | 'MATCH' | 'SAFETY'; label: string; description: string; institutions: Institution[] }) {
  const colors = { REACH: 'border-reach bg-red-50 dark:bg-red-900/10', MATCH: 'border-match bg-amber-50 dark:bg-amber-900/10', SAFETY: 'border-safety bg-green-50 dark:bg-green-900/10' }
  const textColors = { REACH: 'text-reach', MATCH: 'text-match', SAFETY: 'text-safety' }
  const tierLabels = { REACH: '冲', MATCH: '稳', SAFETY: '保' }
  const { setView, setSelectedInstitutionId } = useStore()

  return (
    <Card className={colors[tier]}>
      <CardHeader className="pb-2">
        <CardTitle className={`text-lg font-bold ${textColors[tier]}`}>{label} — {tierLabels[tier]}</CardTitle>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardHeader>
      <CardContent>
        <div className="max-h-60 overflow-y-auto">
          {institutions.length > 0 ? (
            <div className="space-y-1">
              {institutions.slice(0, 5).map((inst) => (
                <div key={inst.id} className="flex items-center justify-between p-2 rounded hover:bg-background/50 cursor-pointer transition-colors" onClick={() => { setSelectedInstitutionId(inst.id); setView('kanban') }}>
                  <span className="text-sm font-medium truncate">{inst.name}</span>
                  <span className="text-xs text-muted-foreground">{inst.advisors?.length || 0} 位导师</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">暂无院校</p>
          )}
        </div>
        {institutions.length > 5 && (
          <button className="w-full mt-2 text-xs text-center text-muted-foreground hover:text-primary transition-colors flex items-center justify-center gap-1" onClick={() => setView('kanban')}>
            还有 {institutions.length - 5} 所 <List className="h-3 w-3" />
          </button>
        )}
        {institutions.length > 0 && (
          <button className="w-full mt-1 text-xs text-center text-muted-foreground hover:text-primary transition-colors" onClick={() => setView('kanban')}>
            查看全部 <ArrowRight className="h-3 w-3 inline" />
          </button>
        )}
      </CardContent>
    </Card>
  )
}

function BadgeTier({ tier, type }: { tier: 'REACH' | 'MATCH' | 'SAFETY'; type: string }) {
  const tierColors = { REACH: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400', MATCH: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400', SAFETY: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' }
  return <span className={`px-2 py-0.5 rounded text-xs font-medium ${tierColors[tier]}`}>{type}</span>
}
