import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { bookingAPI, publicAPI, userAPI } from '../../api'
import StatCard from '../../components/common/StatCard'
import Badge from '../../components/common/Badge'
import { formatCurrency } from '../../utils/helpers'
import { X, CheckCircle, Crown } from 'lucide-react'
import toast from 'react-hot-toast'

const makeMembershipSports = (pricing = {}) => [
  { key: 'CRICKET_LANE', label: 'Cricket Lane', emoji: '🏏', memberKey: 'cricketLaneMember',
    fee: pricing.CRICKET_LANE_MEMBERSHIP ?? 50,
    save: (pricing.CRICKET_LANE ?? 30) - (pricing.CRICKET_LANE_MEMBER ?? 25), color: 'green' },
  { key: 'BOX_CRICKET',  label: 'Box Cricket',  emoji: '📦', memberKey: 'boxCricketMember',
    fee: pricing.BOX_CRICKET_MEMBERSHIP ?? 100,
    save: (pricing.BOX_CRICKET ?? 50) - (pricing.BOX_CRICKET_MEMBER ?? 40), color: 'violet' },
  { key: 'PICKLEBALL',   label: 'Pickleball',   emoji: '🏓', memberKey: 'pickleballMember',
    fee: pricing.PICKLEBALL_MEMBERSHIP ?? 50,
    save: (pricing.PICKLEBALL ?? 30) - (pricing.PICKLEBALL_MEMBER ?? 25), color: 'orange' },
]

// Renders a single CMS block based on its contentType
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
              {item.title && (
                <div className="font-display font-bold text-base mb-1">{item.title}</div>
              )}
              {item.body && (
                <p className="text-sm text-muted leading-relaxed">{item.body}</p>
              )}
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
          {item.title && (
            <div className="text-sm font-bold text-white mb-0.5">{item.title}</div>
          )}
          {item.body && (
            <p className="text-xs text-muted leading-relaxed">{item.body}</p>
          )}
        </div>
        <button onClick={() => onDismiss(item.id)}
          className="p-1 rounded-lg text-muted hover:text-[#0a1428] hover:bg-[#f0f5ff] transition-all flex-shrink-0 mt-0.5">
          <X size={12} />
        </button>
      </div>
    )
  }

  // PAGE type — shown as an info card
  if (item.contentType === 'PAGE') {
    return (
      <div className="card p-4 mb-3">
        {item.title && (
          <div className="font-bold text-sm mb-1.5">{item.title}</div>
        )}
        {item.body && (
          <p className="text-xs text-muted leading-relaxed whitespace-pre-line">{item.body}</p>
        )}
      </div>
    )
  }

  return null
}

export default function UserDashboard() {
  const { user, refreshUser } = useAuth()
  const navigate  = useNavigate()
  const [bookings,  setBookings]  = useState([])
  const [cmsItems,  setCmsItems]  = useState([])
  const [dismissed, setDismissed] = useState(new Set())
  const [buyingMembership, setBuyingMembership] = useState(null) // sportType being purchased
  const [pricing, setPricing] = useState({})

  const MEMBERSHIP_SPORTS = makeMembershipSports(pricing)

  useEffect(() => {
    bookingAPI.myBookings().then(r => setBookings(r.data)).catch(() => {})
    publicAPI.cms().then(r => {
      const active = (r.data || [])
        .filter(i => i.active)
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
      setCmsItems(active)
    }).catch(() => {})
    publicAPI.pricing().then(r => {
      const map = {}
      r.data.forEach(p => { map[p.ruleKey] = parseFloat(p.price) })
      setPricing(map)
    }).catch(() => {})
  }, [])

  const handleGetMembership = async (sport) => {
    setBuyingMembership(sport.key)
    try {
      const orderRes = await userAPI.membershipOrder({ sportType: sport.key })
      const { orderId, amount, currency, keyId } = orderRes.data
      await new Promise((resolve, reject) => {
        const options = {
          key: keyId, amount, currency, order_id: orderId,
          name: 'SquareEdgeSports',
          description: `${sport.label} Membership — 30 days`,
          handler: async (response) => {
            try {
              await userAPI.membershipConfirm({
                sportType:          sport.key,
                razorpayOrderId:    response.razorpay_order_id,
                razorpayPaymentId:  response.razorpay_payment_id,
                razorpaySignature:  response.razorpay_signature,
              })
              toast.success(`${sport.emoji} ${sport.label} membership activated!`)
              if (refreshUser) await refreshUser()
              resolve()
            } catch (e) {
              reject(e)
            }
          },
          prefill: { email: user?.email, name: user?.fullName },
          theme: { color: '#1352c9' },
          modal: { ondismiss: () => reject(new Error('dismissed')) },
        }
        new window.Razorpay(options).open()
      })
    } catch (e) {
      if (e?.message !== 'dismissed') toast.error(e?.response?.data?.message || 'Membership payment failed')
    } finally {
      setBuyingMembership(null)
    }
  }

  const dismiss = (id) => setDismissed(prev => new Set([...prev, id]))
  const visible = cmsItems.filter(i => !dismissed.has(i.id))

  // Split by type for ordered rendering: banners first, then announcements, then pages
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
          <button className="px-4 py-2 rounded-xl text-sm font-semibold bg-[#f8faff] border border-[#dde8f8] hover:bg-[#f0f5ff] transition-all" onClick={() => navigate('/bookings')}>My Bookings</button>
          <button className="px-4 py-2 rounded-xl text-sm font-semibold bg-gradient-to-r from-accent to-a2 text-white hover:opacity-90 transition-all" onClick={() => navigate('/feedback')}>+ Feedback</button>
        </div>
      </div>

      {/* CMS Banners */}
      {banners.map(item => (
        <CmsBlock key={item.id} item={item} onDismiss={dismiss} />
      ))}

      {/* CMS Announcements */}
      {announcements.length > 0 && (
        <div className="mb-5">
          {announcements.map(item => (
            <CmsBlock key={item.id} item={item} onDismiss={dismiss} />
          ))}
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-7">
        <StatCard label="Total Bookings" value={bookings.length}       icon="📅" color="#7c5cfc" sub="All time" />
        <StatCard label="Active"         value={active.length}         icon="✅" color="#4f8ef7" sub="Upcoming sessions" />
        <StatCard label="Total Spent"    value={formatCurrency(spent)} icon="💰" color="#f5c842" sub="Confirmed bookings" />
        <StatCard label="Cancelled"      value={cancelled.length}      icon="🚫" color="#22c55e" sub="Past cancellations" />
      </div>

      {/* Cancellation policy (static) */}
      <div className="bg-yellow-50 border border-yellow-300 rounded-xl px-4 py-3 mb-6 text-xs text-yellow-700">
        <strong>📋 Cancellation Policy:</strong> Free refund 24+ hrs · 50% within 1–24 hrs · No refund &lt;1 hr before session
      </div>

      {/* -- Membership Section ------------------------------------------------ */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Crown size={16} className="text-yellow-400" />
          <div className="section-title !mb-0">Memberships</div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {MEMBERSHIP_SPORTS.map(sport => {
            const expiry    = user?.membershipExpiry
            const isExpired = expiry && new Date(expiry + 'Z') < new Date()
            const isMember  = user?.[sport.memberKey] && !isExpired
            return (
              <div key={sport.key} className={`card p-4 border ${
                (isMember && !isExpired)
                  ? 'border-green-500/30 bg-green-500/[0.04]'
                  : 'border-[#dde8f8]'
              }`}>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="text-xl mb-1">{sport.emoji}</div>
                    <div className="font-bold text-sm">{sport.label}</div>
                  </div>
                  {isMember ? (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 border border-green-300 text-green-700 text-[10px] font-black uppercase">
                      <CheckCircle size={9} /> MEMBER
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full bg-[#f8faff] border border-[#dde8f8] text-[#5a6a8a] text-[10px] font-bold uppercase">
                      NON-MEMBER
                    </span>
                  )}
                </div>

                {isMember ? (
                  <div className="text-xs text-green-700 mb-3">
                    {isExpired ? 'Membership Expired' : `Save $${sport.save}/session · Active`}
                    {expiry && <div className="text-[10px] text-muted mt-0.5">Expires: {new Date(expiry).toLocaleDateString('en-IN')}</div>}
                  </div>
                ) : (
                  <div className="text-xs text-muted mb-3">
                    <span className="font-bold text-[#0a1428]"> ${sport.fee}/month</span>
                    <span className="ml-1">· save ${sport.save}/session</span>
                  </div>
                )}

                {!isMember ? (
                  <button
                    onClick={() => handleGetMembership(sport)}
                    disabled={buyingMembership === sport.key}
                    className="w-full py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-blue-700 to-blue-600 hover:opacity-90 transition-all text-white flex items-center justify-center gap-1.5">
                    {buyingMembership === sport.key
                      ? <><span className="w-3 h-3 border-2 border-[#dde8f8] border-t-white rounded-full animate-spin" />Processing…</>
                      : <><Crown size={11} /> Get Membership — ${sport.fee}</>}
                  </button>
                ) : (
                  <button
                    onClick={() => handleGetMembership(sport)}
                    disabled={buyingMembership === sport.key}
                    className="w-full py-2 rounded-xl text-xs font-semibold bg-[#f8faff] border border-[#dde8f8] hover:bg-[#f0f5ff] transition-all text-[#5a6a8a]">
                    {buyingMembership === sport.key ? 'Processing…' : '↻ Renew (+30 days)'}
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* CMS Page blocks */}
      {pages.length > 0 && (
        <div className="mb-6">
          {pages.map(item => (
            <CmsBlock key={item.id} item={item} onDismiss={dismiss} />
          ))}
        </div>
      )}

      {/* Recent bookings */}
      <div className="flex items-center justify-between mb-4">
        <div><div className="section-title">Recent Bookings</div><div className="section-sub">Last {Math.min(5, bookings.length)} sessions</div></div>
        <button className="text-xs text-accent font-semibold hover:underline" onClick={() => navigate('/bookings')}>View All →</button>
      </div>

      <div className="card overflow-hidden">
        <table className="data-table">
          <thead><tr><th>Sport</th><th>Court</th><th>Date</th><th>Time</th><th>Amount</th><th>Status</th></tr></thead>
          <tbody>
            {bookings.slice(0, 5).map(b => (
              <tr key={b.id}>
                <td>{b.bookingType}</td>
                <td className="font-semibold text-xs">{b.courtName || (b.laneNumber ? 'Lane ' + b.laneNumber : b.courtNumber ? 'Court ' + b.courtNumber : '—')}</td>
                <td className="text-xs">{b.bookingDate}</td>
                <td className="text-xs text-muted">{b.startTime} – {b.endTime}</td>
                <td className="font-bold">{formatCurrency(b.amountPaid)}</td>
                <td><Badge value={b.status} /></td>
              </tr>
            ))}
            {bookings.length === 0 && (
              <tr><td colSpan={6} className="text-center text-muted py-10">No bookings yet. Book your first session!</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
