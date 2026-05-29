import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import {
  LayoutDashboard, CalendarDays, Users, CreditCard,
  TrendingUp, Building2, DollarSign, Star, FileText,
  LogOut, ShieldCheck, Zap
} from 'lucide-react'
import { userAPI } from '../../api'

const ALL_NAV = [
  { section: 'OVERVIEW' },
  { path: '/admin',          icon: LayoutDashboard, label: 'Overview',  always: true },
  { section: 'MANAGE' },
  { path: '/admin/bookings', icon: CalendarDays,    label: 'Bookings',  perm: 'canManageBookings' },
  { path: '/admin/users',    icon: Users,           label: 'Users',     perm: 'canManageUsers'    },
  { path: '/admin/payments', icon: CreditCard,      label: 'Payments',  perm: 'canManagePayments' },
  { section: 'ANALYTICS' },
  { path: '/admin/revenue',  icon: TrendingUp,      label: 'Revenue',   perm: 'canViewReports'    },
  { section: 'SETTINGS' },
  { path: '/admin/courts',   icon: Building2,       label: 'Courts',    perm: 'canManageCourts'   },
  { path: '/admin/pricing',  icon: DollarSign,      label: 'Pricing',   adminOnly: true },
  { path: '/admin/feedback', icon: Star,            label: 'Feedback',  adminOnly: true },
  { path: '/admin/cms',      icon: FileText,        label: 'CMS',       adminOnly: true },
]


export default function AdminLayout() {
  const { user, logout } = useAuth()
  const navigate  = useNavigate()
  const location  = useLocation()
  const [permissions, setPermissions] = useState(null)

  const isEmployee    = user?.role === 'EMPLOYEE'
  const isSuperOrAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMINISTRATOR'

  const fetchPerms = () => {
    if (!isEmployee) return
    // Use /user/my-permissions — accessible by EMPLOYEE (not blocked by admin PreAuthorize)
    userAPI.myPermissions()
      .then(r => setPermissions(r.data))
      .catch(() => setPermissions({}))
  }

  // Fetch on mount
  useEffect(() => { fetchPerms() }, [user?.id, isEmployee])

  // Poll every 15s so permission changes from admin take effect quickly
  useEffect(() => {
    if (!isEmployee) return
    const interval = setInterval(fetchPerms, 15000)
    return () => clearInterval(interval)
  }, [user?.id, isEmployee])

  const canSee = (item) => {
    if (item.always) return true
    if (isSuperOrAdmin) return true
    if (item.adminOnly) return false
    if (!isEmployee) return false
    if (item.perm && permissions) return !!permissions[item.perm]
    return false  // hide until permissions loaded
  }

  // Build nav — hide section headers if all their items are hidden
  const visibleNav = ALL_NAV.reduce((acc, item, i) => {
    if (!item.section) {
      if (canSee(item)) acc.push(item)
      return acc
    }
    // It's a section header — peek ahead to see if anything in this section is visible
    const sectionItems = []
    for (let j = i + 1; j < ALL_NAV.length; j++) {
      if (ALL_NAV[j].section) break
      sectionItems.push(ALL_NAV[j])
    }
    if (sectionItems.some(canSee)) acc.push(item)
    return acc
  }, [])

  // Redirect employee away from pages they lost access to
  useEffect(() => {
    if (!isEmployee || !permissions) return
    const current = ALL_NAV.find(n => n.path && n.path !== '/admin' && location.pathname.startsWith(n.path))
    if (current?.perm && !permissions[current.perm]) {
      navigate('/admin', { replace: true })
    }
  }, [permissions, location.pathname, isEmployee])

  const initials  = (user?.fullName || 'A').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  const photoSrc  = user?.profilePicture || null
  const currentLabel = ALL_NAV.find(n => n.path && (n.path === '/admin'
    ? location.pathname === '/admin'
    : location.pathname.startsWith(n.path)))?.label || 'Admin'

  return (
    <div className="flex h-screen overflow-hidden bg-bg">
      <aside className="w-[230px] h-screen bg-surface border-r border-white/[0.07] flex flex-col fixed left-0 top-0 bottom-0 z-40">
        <div className="px-5 py-6 border-b border-white/[0.07]">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-accent to-a2 flex items-center justify-center flex-shrink-0">
              <Zap size={14} className="text-white" fill="white" />
            </div>
            <div>
              <div className="font-display text-sm font-bold bg-gradient-to-r from-accent to-a2 bg-clip-text text-transparent leading-tight">
                SquareEdge<span className="text-white/80">Sports</span>
              </div>
              <div className="text-[9px] text-muted uppercase tracking-widest">Admin Panel</div>
            </div>
          </div>
        </div>

        <nav className="flex-1 py-3 overflow-y-auto">
          {visibleNav.map((item, i) => item.section ? (
            <div key={i} className="text-[9px] text-white/20 uppercase tracking-widest font-bold px-5 pt-4 pb-2">{item.section}</div>
          ) : (
            <div key={item.path}
              className={`nav-item ${(item.path === '/admin' ? location.pathname === '/admin' : location.pathname.startsWith(item.path)) ? 'active' : ''}`}
              onClick={() => navigate(item.path)}>
              <item.icon size={16} className="flex-shrink-0" />{item.label}
            </div>
          ))}
        </nav>

        <div className="p-3 border-t border-white/[0.07]">
          <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-white/[0.04]">
            {photoSrc
              ? <img src={photoSrc} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
              : <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center text-xs font-bold text-white flex-shrink-0">{initials}</div>
            }
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold truncate">{user?.fullName}</div>
              <div className="text-[10px] text-muted capitalize">{user?.role?.replace('_', ' ')}</div>
            </div>
            <button onClick={logout} className="p-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all">
              <LogOut size={12} />
            </button>
          </div>
        </div>
      </aside>

      <div className="ml-[230px] flex-1 flex flex-col h-screen overflow-hidden">
        <header className="flex-shrink-0 h-[58px] bg-surface border-b border-white/[0.07] flex items-center justify-between px-7 z-30">
          <div className="font-display text-base font-bold">{currentLabel}</div>
          <div className="flex items-center gap-3">
            <div className="text-xs text-muted">
              {new Date().toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-accent/15 border border-accent/30 text-accent">
              <ShieldCheck size={11} /> {user?.role?.replace('_', ' ')}
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto fade-in"><Outlet /></main>
      </div>
    </div>
  )
}
