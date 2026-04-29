/**
 * @Project: PG-Tracker
 * @File: KanbanBoard.tsx
 * @Description: 院校申请看板页面，以冲/稳/保三列视图展示目标院校，支持按等级筛选
 * @Author: 杨敬诚
 * @Date: 2026-04-08
 * Copyright (c) 2026. All rights reserved.
 */
import { useState } from 'react'
import { Plus } from 'lucide-react'
import { useStore, Institution } from '../../stores/appStore'
import InstitutionCard from './InstitutionCard'
import InstitutionForm from './InstitutionForm'
import { Button } from '../ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'

interface KanbanBoardProps {
  onSelectInstitution: (id: string) => void
}

const tierConfig = {
  REACH: { label: '冲', color: 'text-reach', borderColor: 'border-reach' },
  MATCH: { label: '稳', color: 'text-match', borderColor: 'border-match' },
  SAFETY: { label: '保', color: 'text-safety', borderColor: 'border-safety' }
}

export default function KanbanBoard({ onSelectInstitution }: KanbanBoardProps): JSX.Element {
  const { institutions } = useStore()
  const [showForm, setShowForm] = useState(false)
  const [editingInstitution, setEditingInstitution] = useState<Institution | null>(null)
  const [activeTab, setActiveTab] = useState('all')

  const reachSchools = institutions.filter((i) => i.tier === 'REACH')
  const matchSchools = institutions.filter((i) => i.tier === 'MATCH')
  const safetySchools = institutions.filter((i) => i.tier === 'SAFETY')

  const handleEdit = (institution: Institution): void => {
    setEditingInstitution(institution)
    setShowForm(true)
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
              <KanbanColumn tier="REACH" schools={reachSchools} config={tierConfig.REACH} onSelect={onSelectInstitution} onEdit={handleEdit} />
              <KanbanColumn tier="MATCH" schools={matchSchools} config={tierConfig.MATCH} onSelect={onSelectInstitution} onEdit={handleEdit} />
              <KanbanColumn tier="SAFETY" schools={safetySchools} config={tierConfig.SAFETY} onSelect={onSelectInstitution} onEdit={handleEdit} />
            </div>
          </TabsContent>

          <TabsContent value="reach" className="flex-1 overflow-auto p-4">
            <KanbanColumn tier="REACH" schools={reachSchools} config={tierConfig.REACH} onSelect={onSelectInstitution} onEdit={handleEdit} fullHeight />
          </TabsContent>
          <TabsContent value="match" className="flex-1 overflow-auto p-4">
            <KanbanColumn tier="MATCH" schools={matchSchools} config={tierConfig.MATCH} onSelect={onSelectInstitution} onEdit={handleEdit} fullHeight />
          </TabsContent>
          <TabsContent value="safety" className="flex-1 overflow-auto p-4">
            <KanbanColumn tier="SAFETY" schools={safetySchools} config={tierConfig.SAFETY} onSelect={onSelectInstitution} onEdit={handleEdit} fullHeight />
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
  tier: 'REACH' | 'MATCH' | 'SAFETY'
  schools: Institution[]
  config: { label: string; color: string; borderColor: string }
  onSelect: (id: string) => void
  onEdit: (institution: Institution) => void
  fullHeight?: boolean
}

function KanbanColumn({ tier, schools, config, onSelect, onEdit, fullHeight }: KanbanColumnProps): JSX.Element {
  const tierLabels = { REACH: '冲', MATCH: '稳', SAFETY: '保' }
  const tierDescs = { REACH: '超出自身水平，但值得一试', MATCH: '匹配自身水平', SAFETY: '保底选择' }

  return (
    <div className={`flex flex-col bg-muted/30 rounded-lg ${fullHeight ? 'h-full min-h-[400px]' : 'min-h-[200px]'}`}>
      <div className={`p-3 border-b-2 ${config.borderColor}`}>
        <h3 className={`font-bold ${config.color}`}>
          {config.label} — {tierLabels[tier]} ({schools.length})
        </h3>
        <p className="text-xs text-muted-foreground mt-0.5">{tierDescs[tier]}</p>
      </div>
      <div className="flex-1 p-2 space-y-2 overflow-auto">
        {schools.map((school) => (
          <InstitutionCard key={school.id} institution={school} onClick={() => onSelect(school.id)} onEdit={() => onEdit(school)} />
        ))}
        {schools.length === 0 && (
          <div className="text-center py-8 text-muted-foreground text-sm">暂无院校</div>
        )}
      </div>
    </div>
  )
}
