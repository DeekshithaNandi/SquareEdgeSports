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
    <div className="flex h-screen overflow-hidden" style={{ background: '#f0f5ff' }}>

      {/* Sidebar */}
      <aside className="w-[220px] h-screen flex flex-col fixed left-0 top-0 bottom-0 z-40"
        style={{ background: '#ffffff', borderRight: '1px solid #dde8f8' }}>

        <div className="px-5 py-6" style={{ borderBottom: '1px solid #dde8f8' }}>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: '#1352c9' }}>
              <Zap size={14} className="text-white" fill="white" />
            </div>
            <div className="font-display text-base font-bold leading-tight" style={{ color: '#0a1428' }}>
              Square<span style={{ color: '#1352c9' }}>Edge</span>Sports
            </div>
          </div>
        </div>

        <nav className="flex-1 py-3 overflow-y-auto">
          <div className="text-[9px] font-bold px-5 pt-2 pb-2 uppercase tracking-widest" style={{ color: '#9aaac8' }}>MENU</div>
          {NAV.map(item => (
            <div key={item.path}
              className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
              onClick={() => navigate(item.path)}>
              <item.icon size={16} className="flex-shrink-0" />{item.label}
            </div>
          ))}
          <div className="text-[9px] font-bold px-5 pt-4 pb-2 uppercase tracking-widest" style={{ color: '#9aaac8' }}>ACCOUNT</div>
          <div className={`nav-item ${location.pathname === '/profile' ? 'active' : ''}`} onClick={() => navigate('/profile')}>
            <User size={16} className="flex-shrink-0" />View Profile
          </div>
        </nav>

        <div className="p-3" style={{ borderTop: '1px solid #dde8f8' }}>
          <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl" style={{ background: '#f0f5ff' }}>
            <button onClick={() => navigate('/profile')} className="flex-shrink-0">
              <Avatar size={8} />
            </button>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold truncate" style={{ color: '#0a1428' }}>{user?.fullName}</div>
              <div className="text-[10px] capitalize" style={{ color: '#5a6a8a' }}>{user?.role?.replace('_', ' ')}</div>
            </div>
            <button onClick={logout} className="p-1.5 rounded-lg transition-all"
              style={{ background: '#fee2e2', border: '1px solid #fca5a5', color: '#dc2626' }}>
              <LogOut size={12} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="ml-[220px] flex-1 flex flex-col h-screen overflow-hidden">
        <header className="flex-shrink-0 h-[58px] flex items-center justify-between px-7 z-30"
          style={{ background: '#ffffff', borderBottom: '1px solid #dde8f8' }}>
          <div className="font-display text-base font-bold" style={{ color: '#0a1428' }}>
            {NAV.find(n => n.path === location.pathname)?.label || (location.pathname === '/profile' ? 'My Profile' : 'Dashboard')}
          </div>

          <div className="relative" ref={dropRef}>
            <button onClick={() => setDropOpen(o => !o)}
              className="flex items-center gap-2 px-2 py-1.5 rounded-xl transition-colors"
              style={{ ':hover': { background: '#f0f5ff' } }}>
              <Avatar size={8} />
              <div className="text-left hidden sm:block">
                <div className="text-xs font-bold leading-tight" style={{ color: '#0a1428' }}>{user?.fullName}</div>
                <div className="text-[10px] capitalize" style={{ color: '#5a6a8a' }}>{user?.role?.replace('_', ' ')}</div>
              </div>
              <ChevronDown size={14} style={{ color: '#9aaac8' }} className={`transition-transform ${dropOpen ? 'rotate-180' : ''}`} />
            </button>

            {dropOpen && (
              <div className="absolute right-0 top-full mt-2 w-44 rounded-xl shadow-xl py-1 z-50 fade-in"
                style={{ background: '#ffffff', border: '1px solid #dde8f8' }}>
                <button onClick={() => { navigate('/profile'); setDropOpen(false) }}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors hover:bg-[#f0f5ff]"
                  style={{ color: '#0a1428' }}>
                  <User size={14} style={{ color: '#9aaac8' }} /> View Profile
                </button>
                <div className="my-1" style={{ borderTop: '1px solid #dde8f8' }} />
                <button onClick={logout}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors hover:bg-[#fee2e2]"
                  style={{ color: '#dc2626' }}>
                  <LogOut size={14} /> Sign Out
                </button>
              </div>
            )}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto fade-in" style={{ background: '#f0f5ff' }}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
