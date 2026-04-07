import { LayoutDashboard, Kanban, Calendar, Mail, Settings, GraduationCap } from 'lucide-react'

type View = 'dashboard' | 'kanban' | 'timeline' | 'templates' | 'settings'

interface SidebarProps {
  currentView: View
  onViewChange: (view: View) => void
  onSelectInstitution: (id: string | null) => void
}

const navItems = [
  { id: 'dashboard' as View, label: '总览', icon: <LayoutDashboard className="w-5 h-5" /> },
  { id: 'kanban' as View, label: '院校看板', icon: <Kanban className="w-5 h-5" /> },
  { id: 'timeline' as View, label: '日程', icon: <Calendar className="w-5 h-5" /> },
  { id: 'templates' as View, label: '邮件模板', icon: <Mail className="w-5 h-5" /> },
  { id: 'settings' as View, label: '设置', icon: <Settings className="w-5 h-5" /> }
]

export default function Sidebar({ currentView, onViewChange, onSelectInstitution }: SidebarProps): JSX.Element {
  return (
    <aside className="w-64 bg-card border-r border-border flex flex-col h-full">
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
            <GraduationCap className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-bold text-lg">PG-Tracker</h1>
            <p className="text-xs text-muted-foreground">保研信息管理系统</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-3">
        <ul className="space-y-1">
          {navItems.map((item) => (
            <li key={item.id}>
              <button
                onClick={() => {
                  onSelectInstitution(null)
                  onViewChange(item.id)
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  currentView === item.id
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                }`}
              >
                {item.icon}
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <div className="p-4 border-t border-border">
        <p className="text-xs text-muted-foreground text-center">
          v2.2.0 - 本地数据存储
        </p>
      </div>
    </aside>
  )
}
