import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { adminAPI } from '../../api'
import Badge from '../../components/common/Badge'
import Spinner from '../../components/common/Spinner'
import Modal from '../../components/common/Modal'
import toast from 'react-hot-toast'
import { MapPin, X, Check, RotateCcw, Clock, Search, ChevronDown, ArrowUpDown, SlidersHorizontal, Bell } from 'lucide-react'

function refundLabel(policy, amount) {
  if (!policy) return null
  if (policy === 'FULL') return { text: `Full Refund $${amount}`, cls: 'text-green-700' }
  if (policy === 'HALF') return { text: `50% Refund $${amount}`, cls: 'text-yellow-700' }
  return { text: 'No Refund (<1h)', cls: 'text-red-400' }
}

function isPast(bookingDate, startTime) {
  if (!bookingDate || !startTime) return false
  const [h, m] = startTime.toString().split(':').map(Number)
  const session = new Date(bookingDate)
  session.setHours(h, m, 0, 0)
  return session <= new Date()
}

function sessionStatus(bookingDate, startTime, endTime) {
  if (!bookingDate || !startTime || !endTime) return 'upcoming'
  const now = new Date()
  const [sh, sm] = startTime.toString().split(':').map(Number)
  const [eh, em] = endTime.toString().split(':').map(Number)
  const start = new Date(bookingDate); start.setHours(sh, sm, 0, 0)
  const end   = new Date(bookingDate); end.setHours(eh, em, 0, 0)
  if (now < start) return 'upcoming'
  if (now < end)   return 'ongoing'
  return 'completed'
}

function fmtDateTime(dt) {
  if (!dt) return '—'
  const d = new Date(dt)
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) +
    ' ' + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
}

const fmtLocal = d => {
  const dt = d instanceof Date ? d : new Date()
  return dt.getFullYear() + '-' + String(dt.getMonth() + 1).padStart(2, '0') + '-' + String(dt.getDate()).padStart(2, '0')
}

function courtLabel(b) {
  if (b.laneNumber)  return `Lane ${b.laneNumber}${b.boxGroup ? ' (' + b.boxGroup.replace('_', ' ') + ')' : ''}`
  if (b.courtNumber) return `Court ${b.courtNumber}`
  if (b.boxGroup)    return b.boxGroup.replace('_', ' ')
  return null
}

const SPORTS = ['ALL', 'PICKLEBALL', 'CRICKET_LANE', 'BOX_CRICKET']

function SportPill({ value, onChange }) {
  return (
    <div className="flex gap-1 bg-[#f8faff] rounded-xl p-1 flex-wrap">
      {SPORTS.map(s => (
        <button key={s} onClick={() => onChange(s)}
          className={'px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ' +
            (value === s ? 'bg-accent text-white' : 'text-muted hover:text-[#0a1428]')}>
          {s === 'ALL' ? 'All Sports' : s.replace(/_/g, ' ')}
        </button>
      ))}
    </div>
  )
}

export default function AdminBookings() {
  const navigate = useNavigate()
  const [tab,       setTab]       = useState('upcoming')
  const [date,      setDate]      = useState('')
  const [bookings,  setBookings]  = useState([])
  const [cancelled, setCancelled] = useState([])
  const [loading,   setLoading]   = useState(true)

  // -- Refund modal state -------------------------------------------------------
  const [refundTarget,   setRefundTarget]   = useState(null)
  const [refunding,      setRefunding]      = useState(false)
  const [notifying,      setNotifying]      = useState(false)

  // -- Assign modal state -------------------------------------------------------
  const [assignTarget,   setAssignTarget]   = useState(null)
  const [assignValue,    setAssignValue]    = useState('')
  const [assigning,      setAssigning]      = useState(false)
  const [availableCourts, setAvailableCourts] = useState([])
  const [courtsLoading,   setCourtsLoading]   = useState(false)
  

  // -- Shared filters -----------------------------------------------------------
  const [search,       setSearch]       = useState('')
  const [sportFilter,  setSportFilter]  = useState('ALL')
  const [sortOrder,    setSortOrder]    = useState('oldest')

  // -- Cancelled-only extra filters ---------------------------------------------
  const [cancelFromDate, setCancelFromDate] = useState('')
  const [cancelToDate,   setCancelToDate]   = useState('')
  const [showFilters,    setShowFilters]    = useState(false)

  // -- Data loading -------------------------------------------------------------
 const loadBookings = d => {
  setLoading(true)
  if (d) {
    adminAPI.bookingsByDate(d).then(r => setBookings(r.data)).finally(() => setLoading(false))
  } else {
    const today = new Date()
    const dates = [0, 1, 2].map(n => { const x = new Date(today); x.setDate(today.getDate() + n); return fmtLocal(x) })
    Promise.all(dates.map(dt => adminAPI.bookingsByDate(dt)))
      .then(results => setBookings(results.flatMap(r => r.data)))
      .finally(() => setLoading(false))
  }
}
  const loadCancelled = () => {
    setLoading(true)
    adminAPI.cancelledBookings().then(r => setCancelled(r.data)).finally(() => setLoading(false))
  }

 useEffect(() => { loadBookings(''); loadCancelled() }, [])

const handleDate = e => { setDate(e.target.value); loadBookings(e.target.value) }

  // -- Actions ------------------------------------------------------------------
  const cancel = async id => {
    if (!confirm('Cancel this booking?')) return
    try { await adminAPI.cancelBooking(id, 'Cancelled by admin'); toast.success('Booking cancelled'); loadBookings(date) }
    catch { toast.error('Failed to cancel') }
  }

  const doRefund = async () => {
    setRefunding(true)
    try { await adminAPI.refundBooking(refundTarget.id); toast.success('Refund processed'); setRefundTarget(null); loadCancelled() }
    catch { toast.error('Refund failed') }
    finally { setRefunding(false) }
  }

  const doNotifyNoRefund = async () => {
    setNotifying(true)
    try { await adminAPI.notifyNoRefund(refundTarget.id); toast.success('Notification sent to player'); setRefundTarget(null) }
    catch { toast.error('Failed to send notification') }
    finally { setNotifying(false) }
  }

  // -- Assign helpers -----------------------------------------------------------
const openAssign = async b => {
  setAssignTarget(b)
  setAssignValue('')
  setCourtsLoading(true)
  try {
    const r = await adminAPI.allCourts()
    const overlaps = (aS, aE, bS, bE) => aS < bE && aE > bS
    const courts = r.data
      .filter(c => c.type === b.bookingType && c.status === 'ACTIVE')
      .sort((x, y) => (x.laneNumber || 0) - (y.laneNumber || 0))
      .map(c => {
        const takenBy = bookings.find(other => {
          if (other.id === b.id || other.status === 'CANCELLED') return false
          if (other.bookingDate !== b.bookingDate) return false
          if (!overlaps(b.startTime, b.endTime, other.startTime, other.endTime)) return false
          const assignedNum = b.bookingType === 'CRICKET_LANE' ? other.laneNumber : other.courtNumber
          return assignedNum === c.laneNumber
        })
        return { ...c, available: !takenBy, takenBy: takenBy || null }
      })
    setAvailableCourts(courts)
  } catch {
    toast.error('Failed to load courts')
    setAvailableCourts([])
  } finally {
    setCourtsLoading(false)
  }
}
  const submitAssign = async () => {
  if (!assignValue) { toast.error('Select a court/lane first'); return }
  const selectedCourt = availableCourts.find(c => c.id === parseInt(assignValue))
  if (!selectedCourt) { toast.error('Invalid selection'); return }
  if (!selectedCourt.available) { toast.error('That court is already taken'); return }
  setAssigning(true)
  try {
    const body = {}
    if (assignTarget.bookingType === 'CRICKET_LANE') {
      body.laneNumber = selectedCourt.laneNumber
    } else {
      body.courtNumber = selectedCourt.laneNumber
    }
    await adminAPI.assignCourt(assignTarget.id, body)
    toast.success('Court assigned & email sent!')
    setAssignTarget(null); loadBookings(date)
  } catch (e) {
    toast.error(e.response?.data?.message || 'Assignment failed')
  } finally { setAssigning(false) }
}

  const isExpiredPending = b =>
    b.paymentStatus === 'PENDING' &&
    b.createdAt && (Date.now() - new Date(b.createdAt).getTime()) > 10 * 60 * 1000

  // -- Filtered + sorted lists --------------------------------------------------
 const applySearch = arr => arr
  .filter(b => !isExpiredPending(b))
  .filter(b => {
    if (!search) return true
    const q = search.toLowerCase()
    return b.userName?.toLowerCase().includes(q) || b.userEmail?.toLowerCase().includes(q)
  })
  .filter(b => sportFilter === 'ALL' || b.bookingType === sportFilter)

const upcoming = useMemo(() =>
  applySearch(bookings.filter(b => b.status !== 'CANCELLED' && sessionStatus(b.bookingDate, b.startTime, b.endTime) === 'upcoming'))
    .sort((a, b) => a.bookingDate.localeCompare(b.bookingDate) || a.startTime.toString().localeCompare(b.startTime.toString())),
  [bookings, search, sportFilter])

const ongoing = useMemo(() =>
  applySearch(bookings.filter(b => b.status !== 'CANCELLED' && sessionStatus(b.bookingDate, b.startTime, b.endTime) === 'ongoing'))
    .sort((a, b) => a.startTime.toString().localeCompare(b.startTime.toString())),
  [bookings, search, sportFilter])

const completed = useMemo(() =>
  applySearch(bookings.filter(b => b.status !== 'CANCELLED' && sessionStatus(b.bookingDate, b.startTime, b.endTime) === 'completed'))
    .sort((a, b) => b.bookingDate.localeCompare(a.bookingDate) || b.startTime.toString().localeCompare(a.startTime.toString())),
  [bookings, search, sportFilter])

const filteredCancelled = useMemo(() => {
  let arr = cancelled
    .filter(b => {
      if (!search) return true
      const q = search.toLowerCase()
      return b.userName?.toLowerCase().includes(q) || b.userEmail?.toLowerCase().includes(q)
    })
    .filter(b => sportFilter === 'ALL' || b.bookingType === sportFilter)
  if (cancelFromDate) arr = arr.filter(b => b.bookingDate >= cancelFromDate)
  if (cancelToDate)   arr = arr.filter(b => b.bookingDate <= cancelToDate)
  return arr.sort((a, b) => new Date(b.cancelledAt || 0) - new Date(a.cancelledAt || 0))
}, [cancelled, search, sportFilter, cancelFromDate, cancelToDate])

const counts = { upcoming: upcoming.length, ongoing: ongoing.length, completed: completed.length, cancelled: filteredCancelled.length }
const list = tab === 'upcoming' ? upcoming : tab === 'ongoing' ? ongoing : tab === 'completed' ? completed : filteredCancelled
const hasFilters = search || sportFilter !== 'ALL'
  return (
    <div className="page-wrap">

      {/* -- Header -- */}
     <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
  <div>
    <div className="section-title">Bookings Management</div>
    <div className="section-sub">
      {tab === 'upcoming'  && `${upcoming.length} upcoming session${upcoming.length !== 1 ? 's' : ''}${date ? ` on ${date}` : ''}`}
      {tab === 'ongoing'   && `${ongoing.length} session${ongoing.length !== 1 ? 's' : ''} in progress right now`}
      {tab === 'completed' && `${completed.length} completed session${completed.length !== 1 ? 's' : ''}${date ? ` on ${date}` : ''}`}
      {tab === 'cancelled' && `${filteredCancelled.length} of ${cancelled.length} cancelled booking${cancelled.length !== 1 ? 's' : ''}`}
      {hasFilters && <span className="ml-2 text-accent font-bold">· Filtered</span>}
    </div>
  </div>

  <div className="flex items-center gap-2 flex-wrap">
    <button onClick={() => navigate('/admin/bookings/new')}
      className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold bg-accent text-white hover:opacity-90">
      + New Booking
    </button>

    {/* 4 Tabs */}
    <div className="flex gap-1 bg-[#f8faff] rounded-xl p-1">
      {[
        { key: 'upcoming',  label: 'Upcoming',  color: 'bg-accent'    },
        { key: 'ongoing',   label: 'Ongoing',   color: 'bg-green-500' },
        { key: 'completed', label: 'Completed', color: 'bg-[#5a6a8a]' },
        { key: 'cancelled', label: 'Cancelled', color: 'bg-red-500'   },
      ].map(t => (
        <button key={t.key}
          onClick={() => { setTab(t.key); setSearch(''); setSportFilter('ALL') }}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
            tab === t.key ? t.color + ' text-white' : 'text-muted hover:text-[#0a1428]'
          }`}>
          {t.label}
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
            tab === t.key ? 'bg-white/20' : 'bg-[#dde8f8] text-[#5a6a8a]'
          }`}>
            {counts[t.key]}
          </span>
        </button>
      ))}
    </div>

    {/* Date picker — not for Cancelled tab */}
    {tab !== 'cancelled' && (
      <div className="flex items-center gap-2">
        <label className="text-xs text-muted font-bold">Date:</label>
        <input type="date" value={date} onChange={handleDate}
          className="bg-[#f8faff] border border-[#dde8f8] rounded-xl px-3 py-2 text-sm text-[#0a1428] outline-none focus:border-accent transition-all [color-scheme:light]" />
        {date && (
          <button onClick={() => { setDate(''); loadBookings('') }}
            className="text-xs text-[#5a6a8a] hover:text-red-500 font-bold px-2">✕ All</button>
        )}
      </div>
    )}

    {/* Filter toggle */}
    <button onClick={() => setShowFilters(f => !f)}
      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-all ${
        showFilters || hasFilters
          ? 'bg-accent/15 border-accent/40 text-accent'
          : 'bg-[#f8faff] border-[#dde8f8] text-muted hover:text-[#0a1428]'
      }`}>
      <SlidersHorizontal size={13} />
      Filters
      {hasFilters && <span className="w-1.5 h-1.5 rounded-full bg-accent" />}
    </button>
  </div>
</div>

      {/* -- Filter panel -- */}
      {showFilters && (
  <div className="card p-4 mb-5 space-y-3">
    <div className="flex flex-wrap gap-3 items-center">
      <div className="relative flex-1 min-w-[200px]">
        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search by player name or email…"
          className="w-full bg-[#f8faff] border border-[#dde8f8] rounded-xl pl-9 pr-4 py-2 text-sm text-[#0a1428] outline-none focus:border-accent transition-all" />
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-[#0a1428]">
            <X size={12} />
          </button>
        )}
      </div>
      {hasFilters && (
        <button onClick={() => { setSearch(''); setSportFilter('ALL'); setCancelFromDate(''); setCancelToDate('') }}
          className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all">
          <X size={11} /> Clear
        </button>
      )}
    </div>
    <SportPill value={sportFilter} onChange={setSportFilter} />

    {/* Cancelled date range */}
    {tab === 'cancelled' && (
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[11px] text-muted font-bold">Slot Date From</span>
        <input type="date" value={cancelFromDate} onChange={e => setCancelFromDate(e.target.value)}
          className="bg-[#f8faff] border border-[#dde8f8] rounded-xl px-3 py-2 text-xs text-[#0a1428] outline-none focus:border-accent [color-scheme:light]" />
        <span className="text-[11px] text-muted font-bold">To</span>
        <input type="date" value={cancelToDate} onChange={e => setCancelToDate(e.target.value)}
          min={cancelFromDate || undefined}
          className="bg-[#f8faff] border border-[#dde8f8] rounded-xl px-3 py-2 text-xs text-[#0a1428] outline-none focus:border-accent [color-scheme:light]" />
        {(cancelFromDate || cancelToDate) && (
          <button onClick={() => { setCancelFromDate(''); setCancelToDate('') }}
            className="text-[11px] text-muted hover:text-[#0a1428] px-2 py-1.5 rounded-lg bg-[#f8faff] border border-[#dde8f8]">
            <X size={11} />
          </button>
        )}
      </div>
    )}
  </div>
)}
      {/* -- Table -- */}
      {loading ? <div className="flex justify-center py-20"><Spinner size={28} /></div> : (
  <div className="card overflow-hidden">
    <table className="data-table">
      <thead>
        <tr>
          <th>#</th><th>User</th><th>Sport</th><th>Court / Lane</th>
          <th>Date · Time</th><th>Amount</th>
          {tab === 'ongoing'   && <th>Status</th>}
          {tab === 'cancelled' && <th>Cancelled At</th>}
          {tab === 'cancelled' && <th>Refund</th>}
          {tab !== 'ongoing'   && <th>Status</th>}
          {tab !== 'completed' && <th>Actions</th>}
        </tr>
      </thead>
      <tbody>
        {list.length === 0 ? (
          <tr>
            <td colSpan={tab === 'cancelled' ? 9 : tab === 'completed' ? 7 : 8}
              className="text-center text-muted py-14">
              {tab === 'upcoming'  ? (hasFilters ? 'No upcoming bookings match filters' : date ? `No upcoming bookings on ${date}` : 'No upcoming bookings') :
               tab === 'ongoing'   ? 'No sessions currently in progress' :
               tab === 'completed' ? (date ? `No completed sessions on ${date}` : 'No completed sessions') :
               'No cancelled bookings'}
            </td>
          </tr>
        ) : list.map(b => {
          const label = courtLabel(b)
          const rl = tab === 'cancelled' ? refundLabel(b.refundPolicy, b.refundAmount) : null
          return (
            <tr key={b.id} className={tab === 'ongoing' ? 'bg-green-500/[0.02]' : ''}>
              <td className="font-mono text-xs text-muted">#{b.id}</td>
              <td>
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-accent to-a2 flex items-center justify-center text-[10px] font-bold text-white shrink-0">
                    {b.userName?.split(' ').map(w => w[0]).join('').slice(0, 2)}
                  </div>
                  <div>
                    <div className="text-xs font-semibold">{b.userName}</div>
                    <div className="text-[10px] text-muted">{b.userEmail}</div>
                  </div>
                </div>
              </td>
              <td className="text-xs font-semibold">{b.bookingType?.replace(/_/g, ' ')}</td>
              <td>
                {label
                  ? <span className="flex items-center gap-1 text-xs text-green-700 font-semibold"><Check size={11} /> {label}</span>
                  : <span className="text-xs text-yellow-600 italic">Not assigned</span>}
              </td>
              <td className="text-xs text-muted">
                <div>{b.bookingDate}</div>
                <div>{b.startTime?.toString().slice(0, 5)} – {b.endTime?.toString().slice(0, 5)}</div>
              </td>
              <td>
                <div className="font-bold">${b.amountPaid}</div>
                <div className={`text-[10px] font-semibold ${
                  b.paymentStatus === 'PAID' ? 'text-green-700' :
                  b.paymentStatus === 'REFUNDED' ? 'text-blue-400' :
                  b.paymentStatus === 'PARTIAL_REFUND' ? 'text-yellow-700' : 'text-yellow-700'}`}>
                  {b.paymentStatus === 'PARTIAL_REFUND' && b.refundAmount ? `50% Refunded $${b.refundAmount}` : b.paymentStatus}
                </div>
              </td>

              {tab === 'ongoing' && (
                <td>
                  <span className="flex items-center gap-1 text-[10px] font-bold text-green-700 bg-green-100 border border-green-300 px-2 py-0.5 rounded-full w-fit">
                    🟢 LIVE
                  </span>
                </td>
              )}
              {tab === 'cancelled' && (
                <td className="text-xs text-muted">
                  {b.cancelledAt
                    ? <span className="flex items-center gap-1"><Clock size={9} /> {fmtDateTime(b.cancelledAt)}</span>
                    : <span className="italic opacity-50">—</span>}
                  {b.cancellationReason && (
                    <div className="text-[10px] text-[#5a6a8a] mt-0.5 max-w-[120px] truncate" title={b.cancellationReason}>
                      {b.cancellationReason}
                    </div>
                  )}
                </td>
              )}
              {tab === 'cancelled' && (
                <td>
                  {rl ? <span className={`text-[11px] font-bold ${rl.cls}`}>{rl.text}</span>
                      : <span className="text-muted text-xs">—</span>}
                </td>
              )}
              {tab !== 'ongoing' && <td><Badge value={b.status} /></td>}

              {tab !== 'completed' && (
                <td>
                  <div className="flex gap-2 flex-wrap">
                    {(tab === 'upcoming' || tab === 'ongoing') && b.status === 'CONFIRMED' && !label && (
                      <button onClick={() => openAssign(b)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-bold bg-blue-600/10 border border-blue-600/25 text-blue-400 hover:bg-blue-600/20 transition-all">
                        <MapPin size={10} /> Assign
                      </button>
                    )}
                    {(tab === 'upcoming' || tab === 'ongoing') && b.status === 'CONFIRMED' && label && (
                      <button onClick={() => openAssign(b)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-bold bg-[#f8faff] border border-[#dde8f8] text-[#5a6a8a] hover:bg-[#f0f5ff] transition-all">
                        <MapPin size={10} /> Reassign
                      </button>
                    )}
                    {tab === 'upcoming' && b.status === 'CONFIRMED' && (
                      <button onClick={() => cancel(b.id)}
                        className="px-3 py-1.5 rounded-lg text-[11px] font-bold bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all">
                        Cancel
                      </button>
                    )}
                    {tab === 'cancelled' && b.paymentStatus === 'PAID' &&
                      (b.refundPolicy === 'FULL' || b.refundPolicy === 'HALF') &&
                      !isPast(b.bookingDate, b.startTime) && (
                      <button onClick={() => setRefundTarget(b)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-bold bg-yellow-100 border border-yellow-300 text-yellow-700 hover:bg-yellow-200 transition-all">
                        <RotateCcw size={10} /> {b.refundPolicy === 'FULL' ? 'Full Refund' : '50% Refund'}
                      </button>
                    )}
                    {tab === 'cancelled' && b.paymentStatus === 'PAID' &&
                      b.refundPolicy === 'NONE' && !isPast(b.bookingDate, b.startTime) && (
                      <button onClick={() => setRefundTarget(b)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-bold bg-[#f8faff] border border-[#dde8f8] text-[#5a6a8a] hover:bg-[#f0f5ff] transition-all">
                        <Bell size={10} /> No Refund
                      </button>
                    )}
                    {tab === 'cancelled' && b.paymentStatus === 'REFUNDED' && (
                      <span className="text-[11px] text-blue-400 font-semibold">✓ Full Refunded</span>
                    )}
                    {tab === 'cancelled' && b.paymentStatus === 'PARTIAL_REFUND' && (
                      <span className="text-[11px] text-yellow-700 font-semibold">
                        ✓ 50% Refunded{b.refundAmount ? ` $${b.refundAmount}` : ''}
                      </span>
                    )}
                  </div>
                </td>
              )}
            </tr>
          )
        })}
      </tbody>
    </table>
  </div>
)}

      {/* -- Policy-aware Refund Modal -- */}
      <Modal open={!!refundTarget} onClose={() => setRefundTarget(null)}
        title={
          refundTarget?.refundPolicy === 'FULL' ? '✅ Full Refund' :
          refundTarget?.refundPolicy === 'HALF' ? '⚠️ 50% Refund' : '⛔ No Refund Applicable'
        }
        footer={
          refundTarget?.refundPolicy === 'NONE' ? (
            <>
              <button className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-[#f8faff] border border-[#dde8f8] hover:bg-[#f0f5ff]"
                onClick={() => setRefundTarget(null)}>Close</button>
              <button disabled={notifying} onClick={doNotifyNoRefund}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-blue-500/15 border border-blue-500/30 text-blue-300 hover:bg-blue-500/25 disabled:opacity-60">
                {notifying ? <span className="w-4 h-4 border-2 border-blue-300/30 border-t-blue-300 rounded-full spin" /> : <Bell size={14} />}
                Send Notification Email
              </button>
            </>
          ) : (
            <>
              <button className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-[#f8faff] border border-[#dde8f8] hover:bg-[#f0f5ff]"
                onClick={() => setRefundTarget(null)}>Cancel</button>
              <button disabled={refunding} onClick={doRefund}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-green-100 border border-green-300 text-green-700 hover:bg-green-200 disabled:opacity-60">
                {refunding ? <span className="w-4 h-4 border-2 border-green-700/30 border-t-green-700 rounded-full spin" /> : <RotateCcw size={14} />}
                Confirm Refund
              </button>
            </>
          )
        }>
        {refundTarget && (() => {
          const policy = refundTarget.refundPolicy
          const amount = refundTarget.refundAmount
          return (
            <div className="space-y-4">
              <div className="bg-[#f8faff] border border-[#dde8f8] rounded-xl p-4 text-xs space-y-2">
                <div className="flex justify-between"><span className="text-muted">Player</span><span className="font-semibold">{refundTarget.userName}</span></div>
                <div className="flex justify-between"><span className="text-muted">Sport</span><span className="font-semibold">{refundTarget.bookingType?.replace(/_/g,' ')}</span></div>
                <div className="flex justify-between"><span className="text-muted">Session</span><span className="font-semibold">{refundTarget.bookingDate} · {refundTarget.startTime?.toString().slice(0,5)}</span></div>
                <div className="flex justify-between"><span className="text-muted">Paid</span><span className="font-semibold">${refundTarget.amountPaid}</span></div>
              </div>
              {policy === 'FULL' && (
                <div className="bg-green-50 border border-green-300 rounded-xl p-4">
                  <div className="text-sm font-bold text-green-700 mb-1">✅ Full Refund — Cancelled 24+ hrs in advance</div>
                  <div className="text-xs text-muted">Player will receive the full amount of <strong className="text-green-700">${amount}</strong> back.</div>
                </div>
              )}
              {policy === 'HALF' && (
                <div className="bg-yellow-50 border border-yellow-300 rounded-xl p-4">
                  <div className="text-sm font-bold text-yellow-700 mb-1">⚠️ 50% Refund — Cancelled 1–24 hrs in advance</div>
                  <div className="text-xs text-muted">Player will receive <strong className="text-yellow-700">${amount}</strong> (50% of ${refundTarget.amountPaid}).</div>
                </div>
              )}
              {policy === 'NONE' && (
                <div className="bg-red-50 border border-red-300 rounded-xl p-4">
                  <div className="text-sm font-bold text-red-700 mb-1">⛔ No Refund — Cancelled less than 1 hour before session</div>
                  <div className="text-xs text-muted mb-2">This booking is not eligible for a refund per our cancellation policy.</div>
                  <div className="text-xs text-blue-700">You can send a notification email to the player explaining the no-refund policy.</div>
                </div>
              )}
            </div>
          )
        })()}
      </Modal>

      {/* -- Assign modal -- */}
{/* -- Assign modal -- */}
{assignTarget && (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
    <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setAssignTarget(null)} />
    <div className="relative w-full max-w-sm bg-white border border-[#dde8f8] rounded-2xl p-6 shadow-2xl">

      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <div className="font-bold text-sm text-[#0a1428]">Assign Court / Lane</div>
          <div className="text-[11px] text-muted mt-0.5">
            #{assignTarget.id} · {assignTarget.userName} · {assignTarget.bookingType?.replace(/_/g, ' ')}
          </div>
        </div>
        <button onClick={() => setAssignTarget(null)} className="p-1.5 rounded-lg hover:bg-[#f0f5ff] text-[#5a6a8a]">
          <X size={15} />
        </button>
      </div>

      {/* Booking info */}
      <div className="bg-[#f0f5ff] border border-[#dde8f8] rounded-xl p-3.5 mb-4 text-xs text-[#5a6a8a] space-y-1">
        <div className="flex justify-between"><span>Date</span><span className="font-semibold text-[#0a1428]">{assignTarget.bookingDate}</span></div>
        <div className="flex justify-between"><span>Time</span><span className="font-semibold text-[#0a1428]">{assignTarget.startTime?.toString().slice(0,5)} – {assignTarget.endTime?.toString().slice(0,5)}</span></div>
      </div>

      {/* Dropdown */}
      <div className="mb-5">
        <label className="text-[10px] font-bold text-[#5a6a8a] uppercase tracking-wider block mb-2">
          {assignTarget.bookingType === 'CRICKET_LANE' ? 'Select Lane' : 'Select Court'}
        </label>

        {courtsLoading ? (
          <div className="flex items-center gap-2 py-3 text-xs text-muted">
            <span className="w-4 h-4 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
            Loading available courts…
          </div>
        ) : availableCourts.length === 0 ? (
          <div className="text-xs text-red-400 py-2">No active courts found for this sport.</div>
        ) : (
          <>
            <select
              value={assignValue}
              onChange={e => setAssignValue(e.target.value)}
              className="w-full bg-[#f8faff] border border-[#dde8f8] rounded-xl px-3 py-2.5 text-sm text-[#0a1428] outline-none focus:border-accent transition-all cursor-pointer [color-scheme:light]">
              <option value="">— Choose a {assignTarget.bookingType === 'CRICKET_LANE' ? 'lane' : 'court'} —</option>
              {availableCourts.map(c => (
                <option key={c.id} value={c.id} disabled={!c.available}>
                  {c.name}
                  {c.available
                    ? ' ✓ Available'
                    : ` ✗ Taken — ${c.takenBy?.userName?.split(' ')[0] || 'occupied'} (${c.takenBy?.startTime?.toString().slice(0,5)}–${c.takenBy?.endTime?.toString().slice(0,5)})`}
                </option>
              ))}
            </select>

            {/* Availability summary */}
            <div className="flex gap-3 mt-2.5 text-[10px]">
              <span className="text-green-700 font-semibold">
                ✓ {availableCourts.filter(c => c.available).length} available
              </span>
              {availableCourts.filter(c => !c.available).length > 0 && (
                <span className="text-red-400 font-semibold">
                  ✗ {availableCourts.filter(c => !c.available).length} taken
                </span>
              )}
            </div>

            {/* Selected court info */}
            {assignValue && (() => {
              const sel = availableCourts.find(c => c.id === parseInt(assignValue))
              return sel ? (
                <div className="mt-3 bg-green-50 border border-green-300 rounded-xl px-3 py-2 text-xs text-green-700 font-semibold flex items-center gap-1.5">
                  <Check size={12} /> {sel.name} selected
                  {sel.location && <span className="font-normal text-green-600 ml-1">· {sel.location}</span>}
                </div>
              ) : null
            })()}
          </>
        )}
      </div>

      <button onClick={submitAssign} disabled={assigning || !assignValue || courtsLoading}
        className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all ${
          !assignValue || courtsLoading
            ? 'bg-[#f8faff] border border-[#dde8f8] text-[#9aaac8] cursor-not-allowed'
            : 'bg-gradient-to-r from-blue-700 to-blue-600 hover:from-blue-600 hover:to-blue-500 text-white'
        }`}>
        {assigning
          ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Assigning…</>
          : '✅ Confirm Assignment & Notify User'}
      </button>
    </div>
  </div>
)}
    </div>
  )
}
