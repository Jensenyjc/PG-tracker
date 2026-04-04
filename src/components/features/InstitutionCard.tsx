import { format, isPast, differenceInDays } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { Calendar, AlertCircle, Edit2, Mail, Users } from 'lucide-react'
import { Institution } from '../../stores/appStore'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'

interface InstitutionCardProps {
  institution: Institution
  onClick: () => void
  onEdit: () => void
}

const tierColors = {
  REACH: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  MATCH: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  SAFETY: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
}

const degreeTypeLabels = { MASTER: '学硕', PHD: '直博' }

export default function InstitutionCard({ institution, onClick, onEdit }: InstitutionCardProps): JSX.Element {
  const deadline = institution.campDeadline || institution.pushDeadline
  const isOverdue = deadline ? isPast(new Date(deadline)) : false
  const daysLeft = deadline ? differenceInDays(new Date(deadline), new Date()) : null

  const getDeadlineStatus = (): { color: string; label: string } => {
    if (!deadline) return { color: 'text-muted-foreground', label: '无截止日期' }
    if (isOverdue) return { color: 'text-destructive', label: '已过期' }
    if (daysLeft !== null && daysLeft <= 7) return { color: 'text-destructive', label: `${daysLeft}天后截止` }
    if (daysLeft !== null && daysLeft <= 14) return { color: 'text-amber-600', label: `${daysLeft}天后截止` }
    return { color: 'text-green-600', label: `${daysLeft}天后截止` }
  }

  const deadlineStatus = getDeadlineStatus()
  const policyTags = institution.policyTags ? JSON.parse(institution.policyTags) : []

  return (
    <div
      className="bg-card rounded-lg border border-border p-3 cursor-pointer hover:shadow-md hover:border-primary/50 transition-all group"
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-sm truncate">{institution.name}</h4>
          <p className="text-xs text-muted-foreground truncate">{institution.department}</p>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); onEdit() }}>
            <Edit2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-1 mb-2">
        <Badge variant="secondary" className={`text-xs ${tierColors[institution.tier]}`}>
          {institution.tier === 'REACH' ? '冲' : institution.tier === 'MATCH' ? '稳' : '保'}
        </Badge>
        <Badge variant="outline" className="text-xs">
          {degreeTypeLabels[institution.degreeType]}
        </Badge>
        {institution.expectedQuota && (
          <Badge variant="outline" className="text-xs">
            <Users className="h-3 w-3 mr-1" />
            {institution.expectedQuota}人
          </Badge>
        )}
      </div>

      {policyTags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {policyTags.slice(0, 2).map((tag: string, index: number) => (
            <span key={index} className="text-xs px-1.5 py-0.5 bg-accent rounded text-accent-foreground">
              {tag}
            </span>
          ))}
          {policyTags.length > 2 && <span className="text-xs text-muted-foreground">+{policyTags.length - 2}</span>}
        </div>
      )}

      {deadline && (
        <div className={`flex items-center gap-1.5 text-xs ${deadlineStatus.color}`}>
          <Calendar className="h-3.5 w-3.5" />
          <span>{format(new Date(deadline), 'yyyy/MM/dd', { locale: zhCN })}</span>
          {daysLeft !== null && daysLeft <= 7 && !isOverdue && <AlertCircle className="h-3.5 w-3.5" />}
        </div>
      )}

      {institution.advisors && institution.advisors.length > 0 && (
        <div className="mt-2 pt-2 border-t border-border">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Mail className="h-3 w-3" />
            <span>{institution.advisors.length} 位导师</span>
          </div>
        </div>
      )}
    </div>
  )
}
