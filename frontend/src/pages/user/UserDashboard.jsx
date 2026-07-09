import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { bookingAPI, publicAPI } from '../../api'
import StatCard from '../../components/common/StatCard'
import Badge from '../../components/common/Badge'
import { formatCurrency } from '../../utils/helpers'
import { X, LayoutList, PlayCircle, BadgeDollarSign, Ban } from 'lucide-react'

function CmsBlock({ item, onDismiss }) {
  if (item.contentType === 'BANNER') {
    return (
      <div className="relative rounded-2xl overflow-hidden mb-4"
        style={{ background: item.imageUrl ? 'none' : 'linear-gradient(135deg,#7c5cfc22,#4f8ef722)' }}>
        {item.imageUrl && (
          <img src={item.imageUrl} alt={item.title}
            className="absolute inset-0 w-full h-full object-cover opacity-20 pointer-events-none" />
        )}
        <div className="relative px-6 py-5 border border-[#dde8f8] rounded-2xl"
          style={{ background: item.imageUrl ? 'linear-gradient(135deg,rgba(124,92,252,0.25),rgba(79,142,247,0.15))' : '' }}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              {item.title && <div className="font-display font-bold text-base mb-1">{item.title}</div>}
              {item.body  && <p className="text-sm text-muted leading-relaxed">{item.body}</p>}
            </div>
            <button onClick={() => onDismiss(item.id)}
              className="p-1 rounded-lg text-muted hover:text-[#0a1428] hover:bg-[#f0f5ff] transition-all flex-shrink-0">
              <X size={14} />
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (item.contentType === 'ANNOUNCEMENT') {
    return (
      <div className="flex items-start gap-3 bg-accent/5 border border-accent/20 rounded-xl px-4 py-3 mb-3">
        <span className="text-base mt-0.5 flex-shrink-0">📢</span>
        <div className="flex-1 min-w-0">
          {item.title && <div className="text-sm font-bold mb-0.5">{item.title}</div>}
          {item.body  && <p className="text-xs text-muted leading-relaxed">{item.body}</p>}
        </div>
        <button onClick={() => onDismiss(item.id)}
          className="p-1 rounded-lg text-muted hover:text-[#0a1428] hover:bg-[#f0f5ff] transition-all flex-shrink-0 mt-0.5">
          <X size={12} />
        </button>
      </div>
    )
  }

  if (item.contentType === 'PAGE') {
    return (
      <div className="card p-4 mb-3">
        {item.title && <div className="font-bold text-sm mb-1.5">{item.title}</div>}
        {item.body  && <p className="text-xs text-muted leading-relaxed whitespace-pre-line">{item.body}</p>}
      </div>
    )
  }

  return null
}

export default function UserDashboard() {
  const { user }  = useAuth()
  const navigate  = useNavigate()
  const [bookings,  setBookings]  = useState([])
  const [cmsItems,  setCmsItems]  = useState([])
  const [dismissed, setDismissed] = useState(new Set())

  useEffect(() => {
    bookingAPI.myBookings().then(r => setBookings(r.data)).catch(() => {})
    publicAPI.cms().then(r => {
      const active = (r.data || [])
        .filter(i => i.active)
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
      setCmsItems(active)
    }).catch(() => {})
  }, [])

  const dismiss = (id) => setDismissed(prev => new Set([...prev, id]))
  const visible = cmsItems.filter(i => !dismissed.has(i.id))

  const banners       = visible.filter(i => i.contentType === 'BANNER')
  const announcements = visible.filter(i => i.contentType === 'ANNOUNCEMENT')
  const pages         = visible.filter(i => i.contentType === 'PAGE')

  const active    = bookings.filter(b => b.status === 'CONFIRMED' || b.status === 'IN_PROGRESS')
  const cancelled = bookings.filter(b => b.status === 'CANCELLED')
  const spent     = bookings.filter(b => b.status !== 'CANCELLED').reduce((s, b) => s + (b.amountPaid || 0), 0)

  return (
    <div className="page-wrap">
      <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold mb-1">👋 Welcome back, {user?.fullName?.split(' ')[0]}!</h1>
          <p className="text-sm text-muted">{new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 rounded-xl text-sm font-semibold bg-[#f8faff] border border-[#dde8f8] hover:bg-[#f0f5ff] transition-all"
            onClick={() => navigate('/bookings')}>My Bookings</button>
          <button className="px-4 py-2 rounded-xl text-sm font-semibold bg-gradient-to-r from-accent to-a2 text-white hover:opacity-90 transition-all"
            onClick={() => navigate('/feedback')}>+ Feedback</button>
        </div>
      </div>

      {/* CMS Banners */}
      {banners.map(item => <CmsBlock key={item.id} item={item} onDismiss={dismiss} />)}

      {/* CMS Announcements */}
      {announcements.length > 0 && (
        <div className="mb-5">
          {announcements.map(item => <CmsBlock key={item.id} item={item} onDismiss={dismiss} />)}
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-7">
        <StatCard label="Total Bookings" value={bookings.length}       icon={LayoutList}       color="#7c5cfc" sub="All time" />
        <StatCard label="Active"         value={active.length}         icon={PlayCircle}       color="#4f8ef7" sub="Upcoming sessions" />
        <StatCard label="Total Spent"    value={formatCurrency(spent)} icon={BadgeDollarSign}  color="#f5c842" sub="Confirmed bookings" />
        <StatCard label="Cancelled"      value={cancelled.length}      icon={Ban}              color="#22c55e" sub="Past cancellations" />
      </div>

      {/* Cancellation policy */}
      <div className="bg-yellow-50 border border-yellow-300 rounded-xl px-4 py-3 mb-6 text-xs text-yellow-700">
        <strong>📋 Cancellation Policy:</strong> Free refund 24+ hrs · 50% within 1–24 hrs · No refund &lt;1 hr before session
      </div>

      {/* CMS Page blocks */}
      {pages.length > 0 && (
        <div className="mb-6">
          {pages.map(item => <CmsBlock key={item.id} item={item} onDismiss={dismiss} />)}
        </div>
      )}

      {/* Recent bookings */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="section-title">Recent Bookings</div>
          <div className="section-sub">Last {Math.min(5, bookings.length)} sessions</div>
        </div>
        <button className="text-xs text-accent font-semibold hover:underline"
          onClick={() => navigate('/bookings')}>View All →</button>
      </div>

      <div className="card overflow-hidden">
        <table className="data-table">
          <thead>
            <tr><th>Sport</th><th>Court</th><th>Date</th><th>Time</th><th>Amount</th><th>Status</th></tr>
          </thead>
          <tbody>
            {bookings.slice(0, 5).map(b => (
              <tr key={b.id}>
                <td>{b.bookingType}</td>
                <td className="font-semibold text-xs">
                  {b.courtName || (b.laneNumber ? 'Lane ' + b.laneNumber : b.courtNumber ? 'Court ' + b.courtNumber : '—')}
                </td>
                <td className="text-xs">{b.bookingDate}</td>
                <td className="text-xs text-muted">{b.startTime} – {b.endTime}</td>
                <td className="font-bold">{formatCurrency(b.amountPaid)}</td>
                <td><Badge value={b.status} /></td>
              </tr>
            ))}
            {bookings.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center text-muted py-10">
                  No bookings yet. Book your first session!
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
