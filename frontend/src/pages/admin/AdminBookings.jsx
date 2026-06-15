import { useEffect, useState, useMemo } from 'react'
import { adminAPI } from '../../api'
import Badge from '../../components/common/Badge'
import Spinner from '../../components/common/Spinner'
import Modal from '../../components/common/Modal'
import toast from 'react-hot-toast'
import { MapPin, X, Check, RotateCcw, Clock, Search, ChevronDown, ArrowUpDown, SlidersHorizontal, Bell } from 'lucide-react'

function refundLabel(policy, amount) {
  if (!policy) return null
  if (policy === 'FULL') return { text: `Full Refund ₹${amount}`, cls: 'text-green-400' }
  if (policy === 'HALF') return { text: `50% Refund ₹${amount}`, cls: 'text-yellow-400' }
  return { text: 'No Refund (<1h)', cls: 'text-red-400' }
}

function isPast(bookingDate, startTime) {
  if (!bookingDate || !startTime) return false
  const [h, m] = startTime.toString().split(':').map(Number)
  const session = new Date(bookingDate)
  session.setHours(h, m, 0, 0)
  return session <= new Date()
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
            (value === s ? 'bg-accent text-white' : 'text-muted hover:text-white')}>
          {s === 'ALL' ? 'All Sports' : s.replace(/_/g, ' ')}
        </button>
      ))}
    </div>
  )
}

export default function AdminBookings() {
  const [tab,       setTab]       = useState('date')
  const [date,      setDate]      = useState(fmtLocal(new Date()))
  const [bookings,  setBookings]  = useState([])
  const [cancelled, setCancelled] = useState([])
  const [loading,   setLoading]   = useState(true)

  // -- Refund modal state -------------------------------------------------------
  const [refundTarget,   setRefundTarget]   = useState(null)   // booking for refund popup
  const [refunding,      setRefunding]      = useState(false)
  const [notifying,      setNotifying]      = useState(false)

  // -- Assign modal state -------------------------------------------------------
  const [assignTarget,   setAssignTarget]   = useState(null)
  const [assignValue,    setAssignValue]    = useState('')
  const [assignBoxGroup, setAssignBoxGroup] = useState('BOX_A')
  const [assigning,      setAssigning]      = useState(false)
  const [assignConflict, setAssignConflict] = useState(null)

  // -- Shared filters -----------------------------------------------------------
  const [search,       setSearch]       = useState('')
  const [sportFilter,  setSportFilter]  = useState('ALL')
  const [sortOrder,    setSortOrder]    = useState('newest')   // 'newest' | 'oldest'

  // -- Cancelled-only extra filters ---------------------------------------------
  const [cancelFromDate, setCancelFromDate] = useState('')
  const [cancelToDate,   setCancelToDate]   = useState('')
  const [showFilters,    setShowFilters]    = useState(false)

  // -- Data loading -------------------------------------------------------------
  const loadByDate = d => {
    setLoading(true)
    adminAPI.bookingsByDate(d).then(r => setBookings(r.data)).finally(() => setLoading(false))
  }
  const loadCancelled = () => {
    setLoading(true)
    adminAPI.cancelledBookings().then(r => setCancelled(r.data)).finally(() => setLoading(false))
  }

  useEffect(() => { loadByDate(date) }, [])

  const handleTab = t => {
    setTab(t)
    setSearch(''); setSportFilter('ALL'); setSortOrder('newest')
    if (t === 'date') loadByDate(date)
    else loadCancelled()
  }
  const handleDate = e => { setDate(e.target.value); loadByDate(e.target.value) }

  // -- Actions ------------------------------------------------------------------
  const cancel = async id => {
    if (!confirm('Cancel this booking?')) return
    try { await adminAPI.cancelBooking(id, 'Cancelled by admin'); toast.success('Booking cancelled'); loadByDate(date) }
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
  const openAssign = b => { setAssignTarget(b); setAssignValue(''); setAssignBoxGroup(b.boxGroup || 'BOX_A'); setAssignConflict(null) }

  const submitAssign = async () => {
    if (assignTarget.bookingType !== 'BOX_CRICKET') {
      if (!assignValue.trim()) { toast.error('Enter a lane/court number'); return }
      const num = parseInt(assignValue)
      if (isNaN(num) || num < 1) { toast.error('Enter a valid number'); return }
    }
    if (assignConflict) { toast.error(`Already taken by booking #${assignConflict.id}`); return }
    setAssigning(true)
    try {
      const num = parseInt(assignValue)
      const body = {}
      if (assignTarget.bookingType === 'CRICKET_LANE') {
        body.laneNumber = num; body.boxGroup = assignBoxGroup
      } else if (assignTarget.bookingType === 'PICKLEBALL') {
        body.courtNumber = num
      } else {
        body.boxGroup = assignTarget.boxGroup || 'BOX_A'
      }
      await adminAPI.assignCourt(assignTarget.id, body)
      toast.success('Court assigned & email sent!')
      setAssignTarget(null); loadByDate(date)
    } catch (e) {
      toast.error(e.response?.data?.message || 'Assignment failed')
    } finally { setAssigning(false) }
  }

  const assignLabel = b => {
    if (b.bookingType === 'CRICKET_LANE') return `Lane number (${assignBoxGroup === 'BOX_A' ? '1–4' : '5–8'})`
    if (b.bookingType === 'PICKLEBALL')   return 'Court number (1–3)'
    return 'Box group already set'
  }

  const checkConflictLocally = num => {
    if (!assignTarget || !num) { setAssignConflict(null); return }
    const n = parseInt(num)
    if (isNaN(n) || n < 1) { setAssignConflict(null); return }
    const overlaps = (aS, aE, bS, bE) => aS < bE && aE > bS
    const clash = bookings.find(other => {
      if (other.id === assignTarget.id || other.status === 'CANCELLED') return false
      if (!overlaps(assignTarget.startTime, assignTarget.endTime, other.startTime, other.endTime)) return false
      if (assignTarget.bookingType === 'PICKLEBALL')   return other.courtNumber === n
      if (assignTarget.bookingType === 'CRICKET_LANE') return other.laneNumber === n
      return false
    })
    setAssignConflict(clash
      ? { id: clash.id, name: clash.userName, time: `${clash.startTime?.slice(0,5)}–${clash.endTime?.slice(0,5)}` }
      : null)
  }

  const isExpiredPending = b =>
    b.paymentStatus === 'PENDING' &&
    b.createdAt && (Date.now() - new Date(b.createdAt).getTime()) > 10 * 60 * 1000

  // -- Filtered + sorted lists --------------------------------------------------
  const applyCommon = (arr) => arr
    .filter(b => !isExpiredPending(b))
    .filter(b => {
      if (!search) return true
      const q = search.toLowerCase()
      return b.userName?.toLowerCase().includes(q) || b.userEmail?.toLowerCase().includes(q)
    })
    .filter(b => sportFilter === 'ALL' || b.bookingType === sportFilter)
    .sort((a, b) => {
      const ad = new Date(a.bookingDate || 0).getTime()
      const bd = new Date(b.bookingDate || 0).getTime()
      return sortOrder === 'newest' ? bd - ad : ad - bd
    })

  const filteredBookings = useMemo(() => applyCommon(bookings),
    [bookings, search, sportFilter, sortOrder])

  const filteredCancelled = useMemo(() => {
    let arr = applyCommon(cancelled)
    if (cancelFromDate) arr = arr.filter(b => b.bookingDate >= cancelFromDate)
    if (cancelToDate)   arr = arr.filter(b => b.bookingDate <= cancelToDate)
    return arr
  }, [cancelled, search, sportFilter, sortOrder, cancelFromDate, cancelToDate])

  const list          = tab === 'date' ? filteredBookings : filteredCancelled
  const hasFilters    = search || sportFilter !== 'ALL' || sortOrder !== 'newest' ||
                        (tab === 'cancelled' && (cancelFromDate || cancelToDate))

  return (
    <div className="page-wrap">

      {/* -- Header -- */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div>
          <div className="section-title">Bookings Management</div>
          <div className="section-sub">
            {tab === 'date'
              ? `${list.length}${hasFilters && list.length !== bookings.length ? ` of ${bookings.length}` : ''} booking${bookings.length !== 1 ? 's' : ''} on selected date`
              : `${list.length}${hasFilters && list.length !== cancelled.length ? ` of ${cancelled.length}` : ''} cancelled booking${cancelled.length !== 1 ? 's' : ''}`}
            {hasFilters && <span className="ml-2 text-accent font-bold">· Filtered</span>}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Tabs */}
          <div className="flex gap-1 bg-[#f8faff] rounded-xl p-1">
            <button onClick={() => handleTab('date')}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${tab === 'date' ? 'bg-accent text-white' : 'text-muted hover:text-white'}`}>
              Bookings
            </button>
            <button onClick={() => handleTab('cancelled')}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${tab === 'cancelled' ? 'bg-red-500 text-white' : 'text-muted hover:text-white'}`}>
              Cancelled ({cancelled.length || '…'})
            </button>
          </div>

          {/* Date picker — By Date tab only */}
          {tab === 'date' && (
            <div className="flex items-center gap-2">
              <label className="text-xs text-muted font-bold">Date:</label>
              <input type="date" value={date} onChange={handleDate}
                className="bg-[#f8faff] border border-[#dde8f8] rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-accent transition-all [color-scheme:dark]" />
            </div>
          )}

          {/* Filter toggle */}
          <button onClick={() => setShowFilters(f => !f)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-all ${
              showFilters || hasFilters
                ? 'bg-accent/15 border-accent/40 text-accent'
                : 'bg-[#f8faff] border-[#dde8f8] text-muted hover:text-white'
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
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search by player name or email…"
                className="w-full bg-[#f8faff] border border-[#dde8f8] rounded-xl pl-9 pr-4 py-2 text-sm text-white outline-none focus:border-accent transition-all" />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-white">
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Sort */}
            <div className="flex items-center gap-2">
              <ArrowUpDown size={13} className="text-muted" />
              <div className="relative">
                <select value={sortOrder} onChange={e => setSortOrder(e.target.value)}
                  className="appearance-none bg-[#f8faff] border border-[#dde8f8] rounded-xl pl-3 pr-8 py-2 text-xs font-semibold text-white outline-none focus:border-accent [color-scheme:dark] cursor-pointer">
                  <option value="newest">↓ Newest First</option>
                  <option value="oldest">↑ Oldest First</option>
                </select>
                <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
              </div>
            </div>

            {hasFilters && (
              <button onClick={() => { setSearch(''); setSportFilter('ALL'); setSortOrder('newest'); setCancelFromDate(''); setCancelToDate('') }}
                className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all">
                <X size={11} /> Clear
              </button>
            )}
          </div>

          {/* Sport filter */}
          <SportPill value={sportFilter} onChange={setSportFilter} />

          {/* Cancelled date range */}
          {tab === 'cancelled' && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] text-muted font-bold">Slot Date From</span>
              <input type="date" value={cancelFromDate} onChange={e => setCancelFromDate(e.target.value)}
                className="bg-[#f8faff] border border-[#dde8f8] rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-accent [color-scheme:dark]" />
              <span className="text-[11px] text-muted font-bold">To</span>
              <input type="date" value={cancelToDate} onChange={e => setCancelToDate(e.target.value)}
                min={cancelFromDate || undefined}
                className="bg-[#f8faff] border border-[#dde8f8] rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-accent [color-scheme:dark]" />
              {(cancelFromDate || cancelToDate) && (
                <button onClick={() => { setCancelFromDate(''); setCancelToDate('') }}
                  className="text-[11px] text-muted hover:text-white px-2 py-1.5 rounded-lg bg-[#f8faff] border border-[#dde8f8]">
                  <X size={11} />
                </button>
              )}
            </div>
          )}

          {/* Active tags */}
          {hasFilters && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {search         && <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-accent/15 text-accent border border-accent/30">Search: "{search}"</span>}
              {sportFilter !== 'ALL' && <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-green-500/15 text-green-300 border border-green-500/30">Sport: {sportFilter.replace(/_/g, ' ')}</span>}
              {sortOrder !== 'newest' && <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#f0f5ff] text-[#5a6a8a] border border-[#dde8f8]">Sort: Oldest First</span>}
              {tab === 'cancelled' && (cancelFromDate || cancelToDate) && (
                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-purple-500/15 text-purple-300 border border-purple-500/30">
                  Slot: {cancelFromDate || '…'} → {cancelToDate || '…'}
                </span>
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
                <th>#</th>
                <th>User</th>
                <th>Sport</th>
                <th>Court / Lane</th>
                <th>Date · Time</th>
                <th>Amount</th>
                {tab === 'cancelled' && <th>Cancelled At</th>}
                {tab === 'cancelled' && <th>Refund</th>}
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {list.length === 0 ? (
                <tr>
                  <td colSpan={tab === 'cancelled' ? 10 : 8} className="text-center text-muted py-14">
                    {hasFilters
                      ? 'No bookings match your filters'
                      : tab === 'date' ? `No bookings on ${date}` : 'No cancelled bookings'}
                  </td>
                </tr>
              ) : list.map(b => {
                const label = courtLabel(b)
                const rl    = tab === 'cancelled' ? refundLabel(b.refundPolicy, b.refundAmount) : null
                return (
                  <tr key={b.id}>
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
                      {label ? (
                        <span className="flex items-center gap-1 text-xs text-green-400 font-semibold">
                          <Check size={11} /> {label}
                        </span>
                      ) : (
                        <span className="text-xs text-yellow-400/70 italic">Not assigned</span>
                      )}
                    </td>
                    <td className="text-xs text-muted">
                      <div>{b.bookingDate}</div>
                      <div>{b.startTime?.toString().slice(0, 5)} – {b.endTime?.toString().slice(0, 5)}</div>
                    </td>
                    <td>
                      <div className="font-bold">₹{b.amountPaid}</div>
                      <div className={`text-[10px] font-semibold ${
                        b.paymentStatus === 'PAID'           ? 'text-green-400' :
                        b.paymentStatus === 'REFUNDED'       ? 'text-blue-400'  :
                        b.paymentStatus === 'PARTIAL_REFUND' ? 'text-yellow-400': 'text-yellow-400'}`}>
                        {b.paymentStatus === 'PARTIAL_REFUND' && b.refundAmount
                          ? `50% Refunded ₹${b.refundAmount}`
                          : b.paymentStatus}
                      </div>
                    </td>
                    {tab === 'cancelled' && (
                      <td className="text-xs text-muted">
                        {b.cancelledAt ? (
                          <span className="flex items-center gap-1">
                            <Clock size={9} /> {fmtDateTime(b.cancelledAt)}
                          </span>
                        ) : <span className="italic opacity-50">—</span>}
                        {b.cancellationReason && (
                          <div className="text-[10px] text-[#5a6a8a] mt-0.5 max-w-[120px] truncate" title={b.cancellationReason}>
                            {b.cancellationReason}
                          </div>
                        )}
                      </td>
                    )}
                    {tab === 'cancelled' && (
                      <td>
                        {rl
                          ? <span className={`text-[11px] font-bold ${rl.cls}`}>{rl.text}</span>
                          : <span className="text-muted text-xs">—</span>}
                      </td>
                    )}
                    <td><Badge value={b.status} /></td>
                    <td>
                      <div className="flex gap-2 flex-wrap">
                        {b.status === 'CONFIRMED' && !label && (
                          <button onClick={() => openAssign(b)}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-bold bg-blue-600/10 border border-blue-600/25 text-blue-400 hover:bg-blue-600/20 transition-all">
                            <MapPin size={10} /> Assign
                          </button>
                        )}
                        {b.status === 'CONFIRMED' && label && (
                          <button onClick={() => openAssign(b)}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-bold bg-[#f8faff] border border-[#dde8f8] text-[#5a6a8a] hover:bg-[#f0f5ff] transition-all">
                            <MapPin size={10} /> Reassign
                          </button>
                        )}
                        {b.status === 'CONFIRMED' && !isPast(b.bookingDate, b.startTime) && (
                          <button onClick={() => cancel(b.id)}
                            className="px-3 py-1.5 rounded-lg text-[11px] font-bold bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all">
                            Cancel
                          </button>
                        )}
                        {b.status === 'CONFIRMED' && isPast(b.bookingDate, b.startTime) && (
                          <span className="text-[10px] text-muted italic">Session ended</span>
                        )}
                        {/* FULL or HALF refund — show Refund button only if session hasn't ended */}
                        {b.status === 'CANCELLED' && b.paymentStatus === 'PAID' &&
                          (b.refundPolicy === 'FULL' || b.refundPolicy === 'HALF') &&
                          !isPast(b.bookingDate, b.startTime) && (
                          <button onClick={() => setRefundTarget(b)}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-bold bg-yellow-500/10 border border-yellow-500/25 text-yellow-300 hover:bg-yellow-500/20 transition-all">
                            <RotateCcw size={10} /> {b.refundPolicy === 'FULL' ? 'Full Refund' : '50% Refund'}
                          </button>
                        )}
                        {/* NONE policy — show notify button only if session hasn't ended */}
                        {b.status === 'CANCELLED' && b.paymentStatus === 'PAID' &&
                          b.refundPolicy === 'NONE' && !isPast(b.bookingDate, b.startTime) && (
                          <button onClick={() => setRefundTarget(b)}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-bold bg-[#f8faff] border border-[#dde8f8] text-[#5a6a8a] hover:bg-[#f0f5ff] transition-all">
                            <Bell size={10} /> No Refund
                          </button>
                        )}
                        {/* Session already ended — lock all actions */}
                        {b.status === 'CANCELLED' && b.paymentStatus === 'PAID' &&
                          isPast(b.bookingDate, b.startTime) && (
                          <span className="text-[10px] text-muted italic">Session ended</span>
                        )}
                        {b.status === 'CANCELLED' && b.paymentStatus === 'REFUNDED' && (
                          <span className="text-[11px] text-blue-400 font-semibold">✓ Full Refunded</span>
                        )}
                        {b.status === 'CANCELLED' && b.paymentStatus === 'PARTIAL_REFUND' && (
                          <span className="text-[11px] text-yellow-400 font-semibold">
                            ✓ 50% Refunded{b.refundAmount ? ` ₹${b.refundAmount}` : ''}
                          </span>
                        )}
                      </div>
                    </td>
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
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-green-500/15 border border-green-500/30 text-green-300 hover:bg-green-500/25 disabled:opacity-60">
                {refunding ? <span className="w-4 h-4 border-2 border-green-300/30 border-t-green-300 rounded-full spin" /> : <RotateCcw size={14} />}
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
                <div className="flex justify-between"><span className="text-muted">Paid</span><span className="font-semibold">₹{refundTarget.amountPaid}</span></div>
              </div>
              {policy === 'FULL' && (
                <div className="bg-green-500/[0.08] border border-green-500/25 rounded-xl p-4">
                  <div className="text-sm font-bold text-green-400 mb-1">✅ Full Refund — Cancelled 24+ hrs in advance</div>
                  <div className="text-xs text-muted">Player will receive the full amount of <strong className="text-white">₹{amount}</strong> back.</div>
                </div>
              )}
              {policy === 'HALF' && (
                <div className="bg-yellow-500/[0.08] border border-yellow-500/25 rounded-xl p-4">
                  <div className="text-sm font-bold text-yellow-400 mb-1">⚠️ 50% Refund — Cancelled 1–24 hrs in advance</div>
                  <div className="text-xs text-muted">Player will receive <strong className="text-white">₹{amount}</strong> (50% of ₹{refundTarget.amountPaid}).</div>
                </div>
              )}
              {policy === 'NONE' && (
                <div className="bg-red-500/[0.08] border border-red-500/25 rounded-xl p-4">
                  <div className="text-sm font-bold text-red-400 mb-1">⛔ No Refund — Cancelled less than 1 hour before session</div>
                  <div className="text-xs text-muted mb-2">This booking is not eligible for a refund per our cancellation policy.</div>
                  <div className="text-xs text-blue-300">You can send a notification email to the player explaining the no-refund policy.</div>
                </div>
              )}
            </div>
          )
        })()}
      </Modal>

      {/* -- Assign modal -- */}
      {assignTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setAssignTarget(null)} />
          <div className="relative w-full max-w-sm bg-[#1a1a30] border border-[#dde8f8] rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <div>
                <div className="font-bold text-sm">Assign Court / Lane</div>
                <div className="text-[11px] text-muted mt-0.5">
                  #{assignTarget.id} · {assignTarget.userName} · {assignTarget.bookingType?.replace(/_/g, ' ')}
                </div>
              </div>
              <button onClick={() => setAssignTarget(null)} className="p-1.5 rounded-lg hover:bg-[#f0f5ff] text-[#5a6a8a]">
                <X size={15} />
              </button>
            </div>

            <div className="bg-[#f0f5ff] border border-[#dde8f8] rounded-xl p-3.5 mb-4 text-xs text-[#5a6a8a] space-y-1">
              <div className="flex justify-between"><span>Time</span><span className="font-semibold text-white">{assignTarget.startTime?.toString().slice(0,5)} – {assignTarget.endTime?.toString().slice(0,5)}</span></div>
              <div className="flex justify-between"><span>Date</span><span className="font-semibold text-white">{assignTarget.bookingDate}</span></div>
              {assignTarget.boxGroup && <div className="flex justify-between"><span>Box</span><span className="font-semibold text-white">{assignTarget.boxGroup.replace('_', ' ')}</span></div>}
            </div>

            {assignTarget.bookingType !== 'BOX_CRICKET' ? (
              <>
                {assignTarget.bookingType === 'CRICKET_LANE' && (
                  <div className="mb-3">
                    <label className="text-[10px] font-bold text-[#5a6a8a] uppercase tracking-wider block mb-2">Select Box</label>
                    <div className="grid grid-cols-2 gap-2">
                      {['BOX_A', 'BOX_B'].map(bg => (
                        <button key={bg} type="button"
                          onClick={() => { setAssignBoxGroup(bg); setAssignValue(''); setAssignConflict(null) }}
                          className={`p-2.5 rounded-xl border text-center text-xs font-bold transition-all ${
                            assignBoxGroup === bg
                              ? 'bg-blue-600/15 border-blue-600/40 text-blue-300'
                              : 'bg-[#f8faff] border-[#dde8f8] text-[#5a6a8a] hover:border-[#dde8f8]'
                          }`}>
                          {bg.replace('_', ' ')}
                          <div className="text-[10px] font-normal mt-0.5 text-[#9aaac8]">{bg === 'BOX_A' ? 'Lanes 1–4' : 'Lanes 5–8'}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <label className="text-[10px] font-bold text-[#5a6a8a] uppercase tracking-wider block mb-2">
                  {assignLabel(assignTarget)}
                </label>
                <input
                  type="number"
                  min={assignTarget.bookingType === 'CRICKET_LANE' ? (assignBoxGroup === 'BOX_A' ? 1 : 5) : 1}
                  max={assignTarget.bookingType === 'PICKLEBALL' ? 3 : (assignTarget.bookingType === 'CRICKET_LANE' ? (assignBoxGroup === 'BOX_A' ? 4 : 8) : 8)}
                  value={assignValue}
                  onChange={e => { setAssignValue(e.target.value); checkConflictLocally(e.target.value) }}
                  placeholder={assignTarget.bookingType === 'PICKLEBALL' ? '1, 2 or 3' : assignTarget.bookingType === 'CRICKET_LANE' ? (assignBoxGroup === 'BOX_A' ? '1–4' : '5–8') : '1–8'}
                  className={`w-full bg-[#f8faff] border rounded-xl px-4 py-3 text-sm text-white focus:outline-none mb-2 transition-all ${
                    assignConflict ? 'border-red-500/60 focus:border-red-500' : 'border-[#dde8f8] focus:border-blue-600/50'
                  }`}
                  onKeyDown={e => e.key === 'Enter' && submitAssign()}
                />
                {assignConflict ? (
                  <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/30 rounded-xl px-3 py-2.5 mb-4">
                    <span className="text-red-400 text-sm mt-0.5">⛔</span>
                    <div>
                      <div className="text-xs font-bold text-red-400">Already taken!</div>
                      <div className="text-[11px] text-red-300/70">
                        Booking #{assignConflict.id} · {assignConflict.name} · {assignConflict.time}
                      </div>
                      <div className="text-[10px] text-red-300/50 mt-0.5">Choose a different number</div>
                    </div>
                  </div>
                ) : assignValue && !isNaN(parseInt(assignValue)) ? (
                  <div className="flex items-center gap-1.5 text-[11px] text-green-400 mb-4">
                    <span>✓</span> Available — no conflicts found
                  </div>
                ) : <div className="mb-4" />}
              </>
            ) : (
              <div className="bg-blue-600/[0.07] border border-blue-600/20 rounded-xl p-3.5 text-xs text-blue-300 mb-4">
                Box group is already set to <strong>{assignTarget.boxGroup?.replace('_', ' ')}</strong>. Confirming will send the assignment email.
              </div>
            )}

            <button onClick={submitAssign} disabled={assigning || !!assignConflict}
              className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all ${
                assignConflict
                  ? 'bg-[#f8faff] border border-[#dde8f8] text-[#9aaac8] cursor-not-allowed'
                  : 'bg-gradient-to-r from-blue-700 to-blue-600 hover:from-blue-600 hover:to-blue-500'
              }`}>
              {assigning ? 'Assigning…' : assignConflict ? '⛔ Resolve conflict to continue' : '✅ Confirm Assignment & Notify User'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
