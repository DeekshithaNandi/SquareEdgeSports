import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { adminAPI } from '../../api'
import StatCard from '../../components/common/StatCard'
import Spinner from '../../components/common/Spinner'
import Badge from '../../components/common/Badge'
import { Users, Building2, Star, UserCheck, Activity, CalendarDays } from 'lucide-react'
import { fmtLocal } from '../../utils/helpers'

export default function AdminOverview() {
  const [stats,    setStats]    = useState(null)
  const [bookings, setBookings] = useState([])
  const [loading,  setLoading]  = useState(true)

  const todayStr = fmtLocal(new Date())

  useEffect(() => {
    Promise.all([adminAPI.stats(), adminAPI.bookingsByDate(todayStr)])
      .then(([s, b]) => { setStats(s.data); setBookings(b.data) })
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex justify-center py-20"><Spinner size={28} /></div>

  // Only show CONFIRMED/IN_PROGRESS bookings in today's table (skip orphaned PENDING)
  const displayBookings = bookings.filter(b => b.status !== 'PENDING' && b.paymentStatus !== 'PENDING')
  const confirmed = bookings.filter(b => b.status === 'CONFIRMED').length
  const pending   = bookings.filter(b => b.paymentStatus === 'PENDING').length

  return (
    <div className="page-wrap space-y-6">
      <div>
        <h1 className="section-title">Dashboard Overview</h1>
        <p className="section-sub">Welcome to SquareEdgeSports admin panel</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Users"      value={stats?.totalUsers ?? 0}   icon={Users}        color="accent" />
        <StatCard title="Active Courts"    value={stats?.activeCourts ?? 0} icon={Building2}    color="green"  />
        <StatCard title="Today's Bookings" value={bookings.length}          icon={CalendarDays} color="blue"   />
        <StatCard title="Avg Rating"       value={stats?.avgRating ? Number(stats.avgRating).toFixed(1) : '—'} icon={Star} color="yellow" />
      </div>

      <div className="card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#dde8f8]">
          <div className="flex items-center gap-2">
            <CalendarDays size={16} className="text-accent" />
            <span className="font-bold text-sm">Today's Bookings</span>
            <span className="text-xs text-muted ml-1">— {todayStr}</span>
          </div>
          <div className="flex gap-3 text-xs">
            <span className="text-green-400 font-semibold">{confirmed} confirmed</span>
            <span className="text-yellow-300 font-semibold">{pending} pending</span>
          </div>
        </div>
        {displayBookings.length === 0 ? (
          <div className="text-center py-12 text-muted text-sm">No confirmed bookings today</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr><th>User</th><th>Sport · Assignment</th><th>Time</th><th>Amount</th><th>Status</th></tr>
            </thead>
            <tbody>
              {displayBookings.map(b => {
                const courtLabel = b.laneNumber  ? `Lane ${b.laneNumber}`
                                 : b.courtNumber ? `Court ${b.courtNumber}`
                                 : b.boxGroup    ? b.boxGroup.replace('_', ' ')
                                 : '⏳ Pending'
                return (
                  <tr key={b.id}>
                    <td>
                      <div className="font-semibold text-sm">{b.userName || '—'}</div>
                      <div className="text-xs text-muted">{b.userEmail || ''}</div>
                    </td>
                    <td>
                      <div className="text-xs font-semibold">{b.bookingType?.replace(/_/g, ' ')}</div>
                      <div className={`text-[10px] mt-0.5 ${b.laneNumber || b.courtNumber ? 'text-green-400' : 'text-yellow-400/70'}`}>{courtLabel}</div>
                    </td>
                    <td className="text-xs text-muted">{b.startTime?.toString().slice(0,5)} – {b.endTime?.toString().slice(0,5)}</td>
                    <td className="text-sm font-bold">₹{b.amountPaid ?? '—'}</td>
                    <td><Badge value={b.status} /></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      <div className="card p-5">
        <div className="font-bold text-sm mb-4">Quick Actions</div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Manage Users',  to: '/admin/users?role=PLAYER',  icon: Users,     color: 'text-accent'    },
            { label: 'View Bookings', to: '/admin/bookings',            icon: Activity,  color: 'text-green-400' },
            { label: 'Courts Setup',  to: '/admin/courts',              icon: Building2, color: 'text-blue-400'  },
            { label: 'All Employees', to: '/admin/users?role=EMPLOYEE', icon: UserCheck, color: 'text-purple-400'},
          ].map(({ label, to, icon: Icon, color }) => (
            <Link key={label} to={to}
              className="flex flex-col items-center gap-2 p-4 rounded-xl bg-[#f8faff] border border-[#dde8f8] hover:bg-[#f8faff] hover:border-accent/30 transition-all cursor-pointer group">
              <Icon size={20} className={`${color} group-hover:scale-110 transition-transform`} />
              <span className="text-xs font-semibold text-center">{label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
