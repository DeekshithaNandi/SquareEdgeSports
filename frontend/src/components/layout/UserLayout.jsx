import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useState, useRef, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { LayoutDashboard, CalendarDays, CreditCard, Star, LogOut, User, Zap, ChevronDown } from 'lucide-react'

const NAV = [
  { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard'   },
  { path: '/bookings',  icon: CalendarDays,    label: 'My Bookings' },
  { path: '/payments',  icon: CreditCard,      label: 'Payments'    },
  { path: '/feedback',  icon: Star,            label: 'Feedback'    },
]

export default function UserLayout() {
  const { user, logout } = useAuth()
  const navigate  = useNavigate()
  const location  = useLocation()
  const [dropOpen, setDropOpen] = useState(false)
  const dropRef   = useRef()
  const initials  = (user?.fullName || 'U').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  const photoSrc  = user?.profilePicture || null

  useEffect(() => {
    const handler = e => { if (dropRef.current && !dropRef.current.contains(e.target)) setDropOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const Avatar = ({ size = 8, className = '' }) => photoSrc
    ? <img src={photoSrc} alt="" className={`w-${size} h-${size} rounded-full object-cover flex-shrink-0 ${className}`} />
    : <div className={`w-${size} h-${size} rounded-full bg-accent flex items-center justify-center text-xs font-bold text-white flex-shrink-0 ${className}`}>{initials}</div>

  return (
    <div className="flex h-screen overflow-hidden bg-bg">
      <aside className="w-[220px] h-screen bg-surface border-r border-white/[0.07] flex flex-col fixed left-0 top-0 bottom-0 z-40">
        <div className="px-5 py-6 border-b border-white/[0.07]">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-accent to-a2 flex items-center justify-center flex-shrink-0">
              <Zap size={14} className="text-white" fill="white" />
            </div>
            <div className="font-display text-base font-bold bg-gradient-to-r from-accent to-a2 bg-clip-text text-transparent leading-tight">
              SquareEdge<br />Sports
            </div>
          </div>
        </div>

        <nav className="flex-1 py-3 overflow-y-auto">
          <div className="text-[9px] text-white/20 uppercase tracking-widest font-bold px-5 pt-2 pb-2">MENU</div>
          {NAV.map(item => (
            <div key={item.path}
              className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
              onClick={() => navigate(item.path)}>
              <item.icon size={16} className="flex-shrink-0" />{item.label}
            </div>
          ))}
          <div className="text-[9px] text-white/20 uppercase tracking-widest font-bold px-5 pt-4 pb-2">ACCOUNT</div>
          <div className={`nav-item ${location.pathname === '/profile' ? 'active' : ''}`} onClick={() => navigate('/profile')}>
            <User size={16} className="flex-shrink-0" />View Profile
          </div>
        </nav>

        <div className="p-3 border-t border-white/[0.07]">
          <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-white/[0.04]">
            <button onClick={() => navigate('/profile')} className="flex-shrink-0">
              <Avatar size={8} />
            </button>
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

      <div className="ml-[220px] flex-1 flex flex-col h-screen overflow-hidden">
        <header className="flex-shrink-0 h-[58px] bg-surface border-b border-white/[0.07] flex items-center justify-between px-7 z-30">
          <div className="font-display text-base font-bold">
            {NAV.find(n => n.path === location.pathname)?.label || (location.pathname === '/profile' ? 'My Profile' : 'Dashboard')}
          </div>

          <div className="relative" ref={dropRef}>
            <button onClick={() => setDropOpen(o => !o)}
              className="flex items-center gap-2 px-2 py-1.5 rounded-xl hover:bg-white/[0.05] transition-colors">
              <Avatar size={8} />
              <div className="text-left hidden sm:block">
                <div className="text-xs font-bold leading-tight">{user?.fullName}</div>
                <div className="text-[10px] text-muted capitalize">{user?.role?.replace('_', ' ')}</div>
              </div>
              <ChevronDown size={14} className={`text-muted transition-transform ${dropOpen ? 'rotate-180' : ''}`} />
            </button>

            {dropOpen && (
              <div className="absolute right-0 top-full mt-2 w-44 bg-surface border border-white/[0.1] rounded-xl shadow-2xl py-1 z-50 fade-in">
                <button onClick={() => { navigate('/profile'); setDropOpen(false) }}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-white/[0.05] transition-colors">
                  <User size={14} className="text-muted" /> View Profile
                </button>
                <div className="border-t border-white/[0.06] my-1" />
                <button onClick={logout}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/[0.05] transition-colors">
                  <LogOut size={14} /> Sign Out
                </button>
              </div>
            )}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto fade-in"><Outlet /></main>
      </div>
    </div>
  )
}
