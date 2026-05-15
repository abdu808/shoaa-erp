import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Building2, Users, FileText, UserCog, LogOut, Receipt, BarChart3, Settings
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'

const links = [
  { to: '/', icon: LayoutDashboard, label: 'لوحة التحكم', roles: ['superadmin', 'manager'] },
  { to: '/organizations', icon: Building2, label: 'المؤسسات', roles: ['superadmin'] },
  { to: '/clients', icon: Users, label: 'العملاء', roles: ['superadmin', 'manager'] },
  { to: '/invoices', icon: FileText, label: 'الفواتير', roles: ['superadmin', 'manager'] },
  { to: '/reports', icon: BarChart3, label: 'التقارير الضريبية', roles: ['superadmin', 'manager'] },
  { to: '/users', icon: UserCog, label: 'المستخدمون', roles: ['superadmin'] },
  { to: '/settings', icon: Settings, label: 'الإعدادات', roles: ['superadmin', 'manager'] },
]

export default function Sidebar() {
  const { userData, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const visibleLinks = links.filter(l => l.roles.includes(userData?.role))

  return (
    <aside className="w-64 min-h-screen bg-slate-900 text-white flex flex-col fixed right-0 top-0 z-50">
      <div className="p-6 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center">
            <Receipt size={20} />
          </div>
          <div>
            <p className="font-bold text-sm">نظام الفواتير</p>
            <p className="text-slate-400 text-xs">الاحترافي</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {visibleLinks.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-all ${
                isActive
                  ? 'bg-blue-600 text-white font-semibold'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-700">
        <div className="px-4 py-2 mb-2">
          <p className="text-sm font-medium">{userData?.name}</p>
          <p className="text-slate-400 text-xs">{userData?.role === 'superadmin' ? 'مدير النظام' : 'مدير مؤسسة'}</p>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-sm text-slate-400 hover:bg-red-900/40 hover:text-red-400 transition-all"
        >
          <LogOut size={18} />
          تسجيل الخروج
        </button>
      </div>
    </aside>
  )
}
