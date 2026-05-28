/**
 * @Project: PG-Tracker
 * @File: KanbanBoard.tsx
 * @Description: 院校申请看板页面，以冲/稳/保三列视图展示目标院校，支持按等级筛选
 * @Author: 杨敬诚
 * @Date: 2026-04-08
 * Copyright (c) 2026. All rights reserved.
 */
import { useRef, useState, type DragEvent } from 'react'
import { Plus } from 'lucide-react'
import { useStore, Institution } from '../../stores/appStore'
import InstitutionCard from './InstitutionCard'
import InstitutionForm from './InstitutionForm'
import { Button } from '../ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'

interface KanbanBoardProps {
  onSelectInstitution: (id: string) => void
}

type Tier = Institution['tier']

const tierConfig = {
  REACH: { label: '冲', color: 'text-reach', borderColor: 'border-reach' },
  MATCH: { label: '稳', color: 'text-match', borderColor: 'border-match' },
  SAFETY: { label: '保', color: 'text-safety', borderColor: 'border-safety' }
}

function reorderSchoolIds(schools: Institution[], draggedId: string, targetId: string | null): string[] {
  const orderedIds = schools.map((school) => school.id)
  const fromIndex = orderedIds.indexOf(draggedId)
  if (fromIndex === -1) return orderedIds

  const [draggedSchoolId] = orderedIds.splice(fromIndex, 1)
  const targetIndex = targetId ? orderedIds.indexOf(targetId) : orderedIds.length
  orderedIds.splice(targetIndex === -1 ? orderedIds.length : targetIndex, 0, draggedSchoolId)
  return orderedIds
}

function hasSameOrder(left: string[], right: string[]): boolean {
  return left.length === right.length && left.every((id, index) => id === right[index])
}

export default function KanbanBoard({ onSelectInstitution }: KanbanBoardProps): JSX.Element {
  const { institutions, reorderInstitutions } = useStore()
  const [showForm, setShowForm] = useState(false)
  const [editingInstitution, setEditingInstitution] = useState<Institution | null>(null)
  const [activeTab, setActiveTab] = useState('all')
  const [draggedSchool, setDraggedSchool] = useState<{ id: string; tier: Tier } | null>(null)
  const [dragOverSchoolId, setDragOverSchoolId] = useState<string | null>(null)
  const [dragOverTier, setDragOverTier] = useState<Tier | null>(null)
  const suppressClickRef = useRef(false)

  const reachSchools = institutions.filter((i) => i.tier === 'REACH')
  const matchSchools = institutions.filter((i) => i.tier === 'MATCH')
  const safetySchools = institutions.filter((i) => i.tier === 'SAFETY')

  const handleEdit = (institution: Institution): void => {
    setEditingInstitution(institution)
    setShowForm(true)
  }

  const getSchoolsForTier = (tier: Tier): Institution[] => {
    if (tier === 'REACH') return reachSchools
    if (tier === 'MATCH') return matchSchools
    return safetySchools
  }

  const resetDragState = (): void => {
    setDraggedSchool(null)
    setDragOverSchoolId(null)
    setDragOverTier(null)
  }

  const handleSelect = (id: string): void => {
    if (suppressClickRef.current) return
    onSelectInstitution(id)
  }

  const handleDragStart = (event: DragEvent<HTMLDivElement>, school: Institution): void => {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', school.id)
    suppressClickRef.current = true
    setDraggedSchool({ id: school.id, tier: school.tier })
  }

  const handleDragOverCard = (event: DragEvent<HTMLDivElement>, school: Institution): void => {
    if (!draggedSchool || draggedSchool.tier !== school.tier || draggedSchool.id === school.id) return
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
    setDragOverTier(school.tier)
    setDragOverSchoolId(school.id)
  }

  const handleDragOverColumn = (event: DragEvent<HTMLDivElement>, tier: Tier): void => {
    if (!draggedSchool || draggedSchool.tier !== tier) return
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
    setDragOverTier(tier)
  }

  const persistReorder = async (tier: Tier, targetId: string | null): Promise<void> => {
    if (!draggedSchool || draggedSchool.tier !== tier) return
    const schools = getSchoolsForTier(tier)
    const currentIds = schools.map((school) => school.id)
    const orderedIds = reorderSchoolIds(schools, draggedSchool.id, targetId)
    if (hasSameOrder(currentIds, orderedIds)) return
    try {
      await reorderInstitutions(tier, orderedIds)
    } catch {
      // Store rolls the optimistic order back and exposes the error state.
    }
  }

  const handleDropOnCard = (event: DragEvent<HTMLDivElement>, school: Institution): void => {
    event.preventDefault()
    event.stopPropagation()
    void persistReorder(school.tier, school.id).finally(resetDragState)
  }

  const handleDropOnColumn = (event: DragEvent<HTMLDivElement>, tier: Tier): void => {
    event.preventDefault()
    void persistReorder(tier, null).finally(resetDragState)
  }

  const handleDragEnd = (): void => {
    resetDragState()
    window.setTimeout(() => {
      suppressClickRef.current = false
    }, 0)
  }

  const dragColumnProps = {
    draggedInstitutionId: draggedSchool?.id ?? null,
    dragOverInstitutionId: dragOverSchoolId,
    dragOverTier,
    onDragStart: handleDragStart,
    onDragOverCard: handleDragOverCard,
    onDropOnCard: handleDropOnCard,
    onDragOverColumn: handleDragOverColumn,
    onDropOnColumn: handleDropOnColumn,
    onDragEnd: handleDragEnd
  }

  return (
    <div className="h-full flex flex-col">
      <header className="p-4 border-b border-border flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">院校申请看板</h2>
          <p className="text-sm text-muted-foreground">管理你的保研目标院校</p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4 mr-2" />
          添加院校
        </Button>
      </header>

      <div className="flex-1 overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
          <div className="px-4 pt-4">
            <TabsList>
              <TabsTrigger value="all">全部 ({institutions.length})</TabsTrigger>
              <TabsTrigger value="reach" className="text-reach">冲 ({reachSchools.length})</TabsTrigger>
              <TabsTrigger value="match" className="text-match">稳 ({matchSchools.length})</TabsTrigger>
              <TabsTrigger value="safety" className="text-safety">保 ({safetySchools.length})</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="all" className="flex-1 overflow-auto p-4">
            <div className="grid grid-cols-3 gap-4 h-full">
              <KanbanColumn tier="REACH" schools={reachSchools} config={tierConfig.REACH} onSelect={handleSelect} onEdit={handleEdit} {...dragColumnProps} />
              <KanbanColumn tier="MATCH" schools={matchSchools} config={tierConfig.MATCH} onSelect={handleSelect} onEdit={handleEdit} {...dragColumnProps} />
              <KanbanColumn tier="SAFETY" schools={safetySchools} config={tierConfig.SAFETY} onSelect={handleSelect} onEdit={handleEdit} {...dragColumnProps} />
            </div>
          </TabsContent>

          <TabsContent value="reach" className="flex-1 overflow-auto p-4">
            <KanbanColumn tier="REACH" schools={reachSchools} config={tierConfig.REACH} onSelect={handleSelect} onEdit={handleEdit} {...dragColumnProps} fullHeight />
          </TabsContent>
          <TabsContent value="match" className="flex-1 overflow-auto p-4">
            <KanbanColumn tier="MATCH" schools={matchSchools} config={tierConfig.MATCH} onSelect={handleSelect} onEdit={handleEdit} {...dragColumnProps} fullHeight />
          </TabsContent>
          <TabsContent value="safety" className="flex-1 overflow-auto p-4">
            <KanbanColumn tier="SAFETY" schools={safetySchools} config={tierConfig.SAFETY} onSelect={handleSelect} onEdit={handleEdit} {...dragColumnProps} fullHeight />
          </TabsContent>
        </Tabs>
      </div>

      {showForm && (
        <InstitutionForm
          institution={editingInstitution}
          onClose={() => { setShowForm(false); setEditingInstitution(null) }}
          onSuccess={(savedInstitution) => {
            setShowForm(false)
            setEditingInstitution(null)
            if (savedInstitution?.tier) setActiveTab(savedInstitution.tier.toLowerCase())
          }}
        />
      )}
    </div>
  )
}

interface KanbanColumnProps {
  tier: Tier
  schools: Institution[]
  config: { label: string; color: string; borderColor: string }
  onSelect: (id: string) => void
  onEdit: (institution: Institution) => void
  draggedInstitutionId: string | null
  dragOverInstitutionId: string | null
  dragOverTier: Tier | null
  onDragStart: (event: DragEvent<HTMLDivElement>, school: Institution) => void
  onDragOverCard: (event: DragEvent<HTMLDivElement>, school: Institution) => void
  onDropOnCard: (event: DragEvent<HTMLDivElement>, school: Institution) => void
  onDragOverColumn: (event: DragEvent<HTMLDivElement>, tier: Tier) => void
  onDropOnColumn: (event: DragEvent<HTMLDivElement>, tier: Tier) => void
  onDragEnd: () => void
  fullHeight?: boolean
}

function KanbanColumn({
  tier,
  schools,
  config,
  onSelect,
  onEdit,
  draggedInstitutionId,
  dragOverInstitutionId,
  dragOverTier,
  onDragStart,
  onDragOverCard,
  onDropOnCard,
  onDragOverColumn,
  onDropOnColumn,
  onDragEnd,
  fullHeight
}: KanbanColumnProps): JSX.Element {
  const tierLabels = { REACH: '冲', MATCH: '稳', SAFETY: '保' }
  const tierDescs = { REACH: '超出自身水平，但值得一试', MATCH: '匹配自身水平', SAFETY: '保底选择' }

  return (
    <div
      className={`flex flex-col bg-muted/30 rounded-lg transition-shadow ${fullHeight ? 'h-full min-h-[400px]' : 'min-h-[200px]'} ${dragOverTier === tier ? 'ring-2 ring-primary/25' : ''}`}
      onDragOver={(event) => onDragOverColumn(event, tier)}
      onDrop={(event) => onDropOnColumn(event, tier)}
    >
      <div className={`p-3 border-b-2 ${config.borderColor}`}>
        <h3 className={`font-bold ${config.color}`}>
          {config.label} — {tierLabels[tier]} ({schools.length})
        </h3>
        <p className="text-xs text-muted-foreground mt-0.5">{tierDescs[tier]}</p>
      </div>
      <div className="flex-1 p-2 space-y-2 overflow-auto">
        {schools.map((school) => (
          <InstitutionCard
            key={school.id}
            institution={school}
            onClick={() => onSelect(school.id)}
            onEdit={() => onEdit(school)}
            draggable
            isDragging={draggedInstitutionId === school.id}
            isDragOver={dragOverInstitutionId === school.id}
            onDragStart={(event) => onDragStart(event, school)}
            onDragOver={(event) => onDragOverCard(event, school)}
            onDrop={(event) => onDropOnCard(event, school)}
            onDragEnd={onDragEnd}
          />
        ))}
        {schools.length === 0 && (
          <div className="text-center py-8 text-muted-foreground text-sm">暂无院校</div>
        )}
      </div>
    </div>
  )
}
