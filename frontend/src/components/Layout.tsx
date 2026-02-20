import { NavLink, Outlet } from 'react-router-dom'
import { Database, Search, History, Settings, Zap } from 'lucide-react'

const navItems = [
  { to: '/query', icon: Search, label: '查询工作台' },
  { to: '/datasources', icon: Database, label: '数据源管理' },
  { to: '/history', icon: History, label: '查询历史' },
  { to: '/settings', icon: Settings, label: '系统设置' },
]

export default function Layout() {
  return (
    <div className="flex h-screen bg-slate-50">
      {/* Sidebar */}
      <aside className="w-56 bg-slate-900 text-white flex flex-col shrink-0">
        <div className="p-4 border-b border-slate-700">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
              <Zap size={16} className="text-white" />
            </div>
            <div>
              <div className="text-sm font-bold leading-tight">AI Database</div>
              <div className="text-xs text-slate-400 leading-tight">Query Platform</div>
            </div>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`
              }
            >
              <Icon size={16} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-slate-700">
          <div className="text-xs text-slate-500 text-center">v1.0.0 · 单用户版</div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-hidden flex flex-col">
        <Outlet />
      </main>
    </div>
  )
}
