import { useMemo } from 'react'
import { format, isPast, isToday, isTomorrow, isThisWeek } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { Calendar, Clock, AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react'
import { Institution, useStore } from '../../stores/appStore'

interface TimelineProps {
  institutions: Institution[]
}

export default function Timeline({ institutions }: TimelineProps): JSX.Element {
  const { setSelectedInstitutionId, setView } = useStore()
  const timelineEvents = useMemo(() => {
    const events: Array<{ id: string; title: string; type: 'camp' | 'push' | 'task'; date: string; institution: Institution; completed?: boolean }> = []
    institutions.forEach((inst) => {
      if (inst.campDeadline) events.push({ id: `${inst.id}-camp`, title: `${inst.name} - 夏令营截止`, type: 'camp', date: inst.campDeadline, institution: inst })
      if (inst.pushDeadline) events.push({ id: `${inst.id}-push`, title: `${inst.name} - 预推免截止`, type: 'push', date: inst.pushDeadline, institution: inst })
      inst.tasks?.forEach((task) => events.push({ id: task.id, title: task.title, type: 'task', date: task.dueDate, institution: inst, completed: task.isCompleted }))
    })
    return events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  }, [institutions])

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
    const d = new Date(date)
    if (isPast(d) && !isToday(d)) return { label: '已过期', color: 'text-destructive' }
    if (isToday(d)) return { label: '今天', color: 'text-primary' }
    if (isTomorrow(d)) return { label: '明天', color: 'text-amber-600' }
    if (isThisWeek(d)) return { label: '本周', color: 'text-blue-600' }
    return { label: format(d, 'MM/dd', { locale: zhCN }), color: 'text-muted-foreground' }
  }

  return (
    <div className="h-full overflow-auto p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h2 className="text-3xl font-bold">日程</h2>
          <p className="text-muted-foreground">查看所有截止日期和任务</p>
        </div>

        {timelineEvents.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground"><Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" /><p>暂无日程安排</p></div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedEvents).map(([group, events]) => {
              if (events.length === 0) return null
              const groupLabels: Record<string, string> = { overdue: '已过期', today: '今天', tomorrow: '明天', thisWeek: '本周', upcoming: '即将到来' }
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
                      return (
                        <div
                          key={event.id}
                          className={`flex items-center gap-4 p-4 rounded-lg border cursor-pointer hover:bg-muted/30 transition-colors ${event.completed ? 'bg-muted/30 opacity-60' : 'bg-card'}`}
                          onClick={() => { setSelectedInstitutionId(event.institution.id); setView('kanban') }}
                        >
                          <div className="flex items-center gap-3 w-32">
                            {event.completed ? (
                              <CheckCircle2 className="h-5 w-5 text-green-600" />
                            ) : (
                              <div className={`text-sm font-medium ${dateInfo.color}`}>{dateInfo.label}</div>
                            )}
                          </div>
                          <div className="flex-1">
                            <p className={`font-medium ${event.completed ? 'line-through' : ''}`}>{event.title}</p>
                            <p className="text-sm text-muted-foreground">{event.institution.name} · {event.institution.department}</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-sm text-muted-foreground">{format(new Date(event.date), 'yyyy/MM/dd', { locale: zhCN })}</div>
                            <ArrowRight className="h-4 w-4 text-muted-foreground" />
                          </div>
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
    </div>
  )
}
