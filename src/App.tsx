import { useEffect } from 'react'
import { useStore } from './stores/appStore'
import ThemeProvider from './components/ThemeProvider'
import Sidebar from './components/layout/Sidebar'
import KanbanBoard from './components/features/KanbanBoard'
import InstitutionDetail from './components/features/InstitutionDetail'
import Timeline from './components/features/Timeline'
import EmailTemplates from './components/features/EmailTemplates'
import Settings from './components/features/Settings'
import Dashboard from './components/features/Dashboard'

function App(): JSX.Element {
  const { currentView, selectedInstitutionId, setView, setSelectedInstitutionId, loadInstitutions, institutions } = useStore()

  useEffect(() => {
    loadInstitutions()
  }, [loadInstitutions])

  const handleSelectInstitution = (id: string | null): void => {
    setSelectedInstitutionId(id)
    if (id) setView('kanban')
  }

  const handleBackToKanban = (): void => {
    setSelectedInstitutionId(null)
    setView('kanban')
  }

  const renderContent = (): JSX.Element => {
    if (selectedInstitutionId) {
      const exists = institutions.some((i) => i.id === selectedInstitutionId)
      if (exists) {
        return <InstitutionDetail institutionId={selectedInstitutionId} onBack={handleBackToKanban} />
      }
      // institution not loaded yet, show kanban
      return <KanbanBoard onSelectInstitution={handleSelectInstitution} />
    }

    switch (currentView) {
      case 'dashboard':
        return <Dashboard />
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
    <ThemeProvider>
    <div className="flex h-screen bg-background">
      <Sidebar
        currentView={currentView}
        onViewChange={setView}
        onSelectInstitution={handleSelectInstitution}
      />
      <main className="flex-1 overflow-hidden">
        {renderContent()}
      </main>
    </div>
    </ThemeProvider>
  )
}

export default App
