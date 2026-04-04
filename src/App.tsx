import { useState, useEffect } from 'react'
import { useStore } from './stores/appStore'
import Sidebar from './components/layout/Sidebar'
import KanbanBoard from './components/features/KanbanBoard'
import InstitutionDetail from './components/features/InstitutionDetail'
import Timeline from './components/features/Timeline'
import EmailTemplates from './components/features/EmailTemplates'
import Settings from './components/features/Settings'
import Dashboard from './components/features/Dashboard'

type View = 'dashboard' | 'kanban' | 'timeline' | 'templates' | 'settings'

function App(): JSX.Element {
  const [currentView, setCurrentView] = useState<View>('kanban')
  const [selectedInstitutionId, setSelectedInstitutionId] = useState<string | null>(null)
  const { loadInstitutions, institutions } = useStore()

  useEffect(() => {
    loadInstitutions()
  }, [loadInstitutions])

  const handleSelectInstitution = (id: string | null): void => {
    setSelectedInstitutionId(id)
    if (id) setCurrentView('kanban')
  }

  const handleBackToKanban = (): void => {
    setSelectedInstitutionId(null)
  }

  const renderContent = (): JSX.Element => {
    if (selectedInstitutionId) {
      return <InstitutionDetail institutionId={selectedInstitutionId} onBack={handleBackToKanban} />
    }

    switch (currentView) {
      case 'dashboard':
        return <Dashboard onSelectInstitution={handleSelectInstitution} />
      case 'timeline':
        return <Timeline institutions={institutions} />
      case 'templates':
        return <EmailTemplates />
      case 'settings':
        return <Settings />
      case 'kanban':
      default:
        return <KanbanBoard onSelectInstitution={handleSelectInstitution} />
    }
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar
        currentView={currentView}
        onViewChange={setCurrentView}
        onSelectInstitution={handleSelectInstitution}
      />
      <main className="flex-1 overflow-hidden">
        {renderContent()}
      </main>
    </div>
  )
}

export default App
