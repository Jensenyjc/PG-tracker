import { useMemo } from 'react'
import { format, isPast, differenceInDays } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { Calendar, TrendingUp, Users, AlertCircle, CheckCircle2, Clock, ArrowRight } from 'lucide-react'
import { useStore, Institution } from '../../stores/appStore'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'

interface DashboardProps {
  onSelectInstitution: (id: string) => void
}

export default function Dashboard({ onSelectInstitution }: DashboardProps): JSX.Element {
  const { institutions } = useStore()

  const stats = useMemo(() => {
    const total = institutions.length
    const reach = institutions.filter((i) => i.tier === 'REACH').length
    const match = institutions.filter((i) => i.tier === 'MATCH').length
    const safety = institutions.filter((i) => i.tier === 'SAFETY').length
    const totalAdvisors = institutions.reduce((acc, i) => acc + (i.advisors?.length || 0), 0)
    const totalTasks = institutions.reduce((acc, i) => acc + (i.tasks?.length || 0), 0)
    const completedTasks = institutions.reduce((acc, i) => acc + (i.tasks?.filter((t) => t.isCompleted).length || 0), 0)

    const upcomingDeadlines = institutions
      .filter((i) => i.campDeadline || i.pushDeadline)
      .map((i) => ({ institution: i, deadline: i.campDeadline || i.pushDeadline!, type: i.campDeadline ? '夏令营' : '预推免' }))
      .filter((d) => !isPast(new Date(d.deadline)))
      .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())
      .slice(0, 5)

    return { total, reach, match, safety, totalAdvisors, totalTasks, completedTasks, upcomingDeadlines, taskProgress: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0 }
  }, [institutions])

  return (
    <div className="h-full overflow-auto p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h2 className="text-3xl font-bold">总览</h2>
          <p className="text-muted-foreground">跟踪你的保研申请进度</p>
        </div>

        <div className="grid grid-cols-4 gap-4">
          <StatsCard title="院校总数" value={stats.total} icon={<TrendingUp className="h-5 w-5" />} description={`冲 ${stats.reach} | 稳 ${stats.match} | 保 ${stats.safety}`} />
          <StatsCard title="导师数量" value={stats.totalAdvisors} icon={<Users className="h-5 w-5" />} description="已录入导师信息" />
          <StatsCard title="待办任务" value={stats.totalTasks - stats.completedTasks} icon={<Clock className="h-5 w-5" />} description={`共 ${stats.totalTasks} 项任务`} />
          <StatsCard title="任务完成率" value={`${stats.taskProgress}%`} icon={<CheckCircle2 className="h-5 w-5" />} description={`${stats.completedTasks} 项已完成`} />
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-semibold flex items-center gap-2"><Calendar className="h-5 w-5" />即将截止</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.upcomingDeadlines.length > 0 ? (
              <div className="space-y-3">
                {stats.upcomingDeadlines.map(({ institution, deadline, type }) => {
                  const daysLeft = differenceInDays(new Date(deadline), new Date())
                  const urgency = daysLeft <= 7 ? 'text-destructive' : daysLeft <= 14 ? 'text-amber-600' : ''
                  return (
                    <div key={institution.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 cursor-pointer transition-colors" onClick={() => onSelectInstitution(institution.id)}>
                      <div className="flex items-center gap-3">
                        <div className={`font-semibold ${urgency}`}>{daysLeft}天</div>
                        <div>
                          <p className="font-medium">{institution.name}</p>
                          <p className="text-sm text-muted-foreground">{institution.department}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <BadgeTier tier={institution.tier} type={type} />
                        <span className="text-sm text-muted-foreground">{format(new Date(deadline), 'yyyy/MM/dd', { locale: zhCN })}</span>
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground"><Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" /><p>暂无即将截止的申请</p></div>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-3 gap-4">
          <TierOverview tier="REACH" label="冲" description="超出自身水平，但值得一试" institutions={institutions.filter((i) => i.tier === 'REACH')} onSelect={onSelectInstitution} />
          <TierOverview tier="MATCH" label="稳" description="匹配自身水平" institutions={institutions.filter((i) => i.tier === 'MATCH')} onSelect={onSelectInstitution} />
          <TierOverview tier="SAFETY" label="保" description="保底选择" institutions={institutions.filter((i) => i.tier === 'SAFETY')} onSelect={onSelectInstitution} />
        </div>
      </div>
    </div>
  )
}

function StatsCard({ title, value, icon, description }: { title: string; value: string | number; icon: React.ReactNode; description: string }) {
  return (
    <Card>
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

function TierOverview({ tier, label, description, institutions, onSelect }: { tier: 'REACH' | 'MATCH' | 'SAFETY'; label: string; description: string; institutions: Institution[]; onSelect: (id: string) => void }) {
  const colors = { REACH: 'border-reach bg-red-50 dark:bg-red-900/10', MATCH: 'border-match bg-amber-50 dark:bg-amber-900/10', SAFETY: 'border-safety bg-green-50 dark:bg-green-900/10' }
  const textColors = { REACH: 'text-reach', MATCH: 'text-match', SAFETY: 'text-safety' }
  const tierLabels = { REACH: '冲', MATCH: '稳', SAFETY: '保' }

  return (
    <Card className={colors[tier]}>
      <CardHeader className="pb-2">
        <CardTitle className={`text-lg font-bold ${textColors[tier]}`}>{label} — {tierLabels[tier]}</CardTitle>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardHeader>
      <CardContent>
        {institutions.length > 0 ? (
          <div className="space-y-2">
            {institutions.slice(0, 3).map((inst) => (
              <div key={inst.id} className="flex items-center justify-between p-2 rounded hover:bg-background/50 cursor-pointer transition-colors" onClick={() => onSelect(inst.id)}>
                <span className="text-sm font-medium truncate">{inst.name}</span>
                <span className="text-xs text-muted-foreground">{inst.advisors?.length || 0} 位导师</span>
              </div>
            ))}
            {institutions.length > 3 && <p className="text-xs text-muted-foreground text-center">还有 {institutions.length - 3} 所学校...</p>}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">暂无院校</p>
        )}
      </CardContent>
    </Card>
  )
}

function Badge({ tier, type }: { tier: 'REACH' | 'MATCH' | 'SAFETY'; type: string }) {
  const tierColors = { REACH: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400', MATCH: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400', SAFETY: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' }
  return <span className={`px-2 py-0.5 rounded text-xs font-medium ${tierColors[tier]}`}>{type}</span>
}

function BadgeTier({ tier, type }: { tier: 'REACH' | 'MATCH' | 'SAFETY'; type: string }) {
  const tierColors = { REACH: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400', MATCH: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400', SAFETY: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' }
  return <span className={`px-2 py-0.5 rounded text-xs font-medium ${tierColors[tier]}`}>{type}</span>
}
