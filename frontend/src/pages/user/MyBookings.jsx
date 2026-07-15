import { useEffect, useState } from 'react'
import { bookingAPI, publicAPI } from '../../api'
import { useAuth } from '../../context/AuthContext'
import Modal from '../../components/common/Modal'
import Badge from '../../components/common/Badge'
import Spinner from '../../components/common/Spinner'
import BookingModal from '../../components/booking/BookingModal'
import toast from 'react-hot-toast'
import { MapPin, Clock, Activity, Plus, Filter, CreditCard, AlertTriangle } from 'lucide-react'

function fmtTime(t) {
  if (!t) return '—'
  const [h, m] = t.toString().split(':')
  const hour = parseInt(h)
  return `${hour % 12 || 12}:${m} ${hour >= 12 ? 'PM' : 'AM'}`
}

function isWithinOneHour(bookingDate, startTime) {
  if (!bookingDate || !startTime) return false
  const [h, m] = startTime.toString().split(':').map(Number)
  const session = new Date(bookingDate)
  session.setHours(h, m, 0, 0)
  const diff = (session - new Date()) / 60000
  return diff >= 0 && diff <= 60
}

/** Returns true if the booking session has already started/passed */
function isPast(bookingDate, startTime) {
  if (!bookingDate || !startTime) return false
  const [h, m] = startTime.toString().split(':').map(Number)
  const session = new Date(bookingDate)
  session.setHours(h, m, 0, 0)
  return session <= new Date()
}

/** Returns true if the booking session has already ended */
function hasEnded(bookingDate, endTime) {
  if (!bookingDate || !endTime) return false
  const [h, m] = endTime.toString().split(':').map(Number)
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

function RefundBadge({ policy, amount }) {
  if (!policy) return null
  if (policy === 'FULL') return <span className="text-[11px] font-bold text-green-700">✓ Full Refund ${amount}</span>
  if (policy === 'HALF') return <span className="text-[11px] font-bold text-yellow-700">50% Refund ${amount}</span>
  return <span className="text-[11px] font-bold text-red-400">No Refund</span>
}

function typeEmoji(t) {
  if (t === 'CRICKET_LANE') return '🏏'
  if (t === 'BOX_CRICKET')  return '📦'
  return '🏓'
}

export default function MyBookings() {
  const { user } = useAuth()
  const [bookings, setBookings] = useState([])
  const [tab,      setTab]      = useState('active')
  const [loading,  setLoading]  = useState(true)
  const [target,   setTarget]   = useState(null)
  const [reason,   setReason]   = useState('')
  const [cancelling, setCancelling] = useState(false)
  const [showBook,   setShowBook]   = useState(false)
  const [bookType,   setBookType]   = useState('CRICKET_LANE')
  const [paying,     setPaying]     = useState(false)

  // Filters
  const [filterSport, setFilterSport] = useState('ALL')
  const [filterFrom,  setFilterFrom]  = useState('')
  const [filterTo,    setFilterTo]    = useState('')
  const [sortDir,     setSortDir]     = useState('desc') // desc = newest first

  const load = () => {
    setLoading(true)
    bookingAPI.myBookings().then(r => setBookings(r.data)).finally(() => setLoading(false))
  }
  useEffect(load, [])

  // Returns true if a PENDING booking is older than 10 minutes
  function isPendingExpired(createdAt) {
    if (!createdAt) return true
    return (Date.now() - new Date(createdAt).getTime()) > 10 * 60 * 1000
  }

  const active    = bookings.filter(b =>
    ['CONFIRMED', 'IN_PROGRESS', 'AWAITING_PAYMENT'].includes(b.status) &&
    !(b.paymentStatus === 'PENDING' && isPendingExpired(b.createdAt)) &&
    !hasEnded(b.bookingDate, b.endTime?.toString())
  )
  const history   = bookings.filter(b =>
    ['COMPLETED', 'NO_SHOW'].includes(b.status) ||
    (['CONFIRMED', 'IN_PROGRESS', 'AWAITING_PAYMENT'].includes(b.status) && hasEnded(b.bookingDate, b.endTime?.toString()))
  )
  const cancelled = bookings.filter(b => b.status === 'CANCELLED')

  const baseList = tab === 'active' ? active : tab === 'history' ? history : cancelled
  const list = baseList
    .filter(b => filterSport === 'ALL' || b.bookingType === filterSport)
    .filter(b => !filterFrom || b.bookingDate >= filterFrom)
    .filter(b => !filterTo   || b.bookingDate <= filterTo)
    .sort((a, b) => sortDir === 'desc'
      ? b.bookingDate.localeCompare(a.bookingDate) || b.startTime.toString().localeCompare(a.startTime.toString())
      : a.bookingDate.localeCompare(b.bookingDate) || a.startTime.toString().localeCompare(b.startTime.toString())
    )

  const doCancel = async () => {
    setCancelling(true)
    try {
      await bookingAPI.cancel(target.id, reason)
      toast.success('Booking cancelled')
      setTarget(null); setReason(''); load()
    } catch (e) {
      toast.error(e.response?.data?.message || 'Cancel failed')
    } finally { setCancelling(false) }
  }

  async function continuePendingPayment(booking) {
    if (!window.Razorpay) { toast.error('Payment system not loaded. Please refresh.'); return }
    setPaying(true)
    try {
      const orderRes = await bookingAPI.createBatchRazorpayOrder({ bookingIds: [booking.id] })
      const { orderId, amount, currency, keyId } = orderRes.data
      await new Promise((resolve, reject) => {
        const options = {
          key: keyId, amount, currency, order_id: orderId,
          name: 'SquareEdgeSports',
          description: `${booking.bookingType?.replace(/_/g, ' ')} · ${booking.bookingDate}`,
          image: `${window.location.origin}/ses-favicon.svg`,
          handler: async (response) => {
            try {
              await bookingAPI.confirmBatchPayment({
                bookingIds: [booking.id],
                razorpayOrderId:   response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
              })
              resolve()
            } catch (e) { reject(e) }
          },
          prefill:  { email: user?.email, name: user?.fullName },
          theme:    { color: '#1352c9' },
          modal:    { ondismiss: () => reject(new Error('dismissed')) },
        }
        const rzp = new window.Razorpay(options)
        rzp.on('payment.failed', r => reject(new Error(r.error?.description || 'Payment failed')))
        rzp.open()
      })
      toast.success('Payment confirmed! 🎉')
      load()
    } catch (e) {
      if (e.message === 'dismissed') toast.error('Payment cancelled.')
      else toast.error(e.response?.data?.message || e.message || 'Payment failed.')
    } finally { setPaying(false) }
  }

  // Lane-assignment card for bookings within the next hour
  const soonBookings = active.filter(b => isWithinOneHour(b.bookingDate, b.startTime?.toString()))

  return (
    <div className="page-wrap">
      <div className="flex items-center justify-between mb-1">
        <div className="section-title">My Bookings</div>
        <div className="flex gap-2 flex-wrap">
          {[
            { type: 'CRICKET_LANE', label: '🏏 Book Cricket Lane' },
            { type: 'BOX_CRICKET',  label: '📦 Book Box Cricket'  },
            { type: 'PICKLEBALL',   label: '🏓 Book Pickleball'   },
          ].map(({ type, label }) => (
            <button key={type} onClick={() => { setBookType(type); setShowBook(true) }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-accent/10 border border-accent/20 text-accent hover:bg-accent/20 transition-all">
              <Plus size={12} /> {label}
            </button>
          ))}
        </div>
      </div>
      <div className="section-sub mb-5">Manage and track your sessions</div>

      {/* -- Starting soon alert ----------------------------------------------- */}
      {soonBookings.length > 0 && (
        <div className="mb-5 space-y-2">
          {soonBookings.map(b => (
            <div key={b.id} className={`flex items-start gap-3 p-4 border rounded-2xl ${
              b.courtAssigned
                ? 'bg-green-500/[0.07] border-green-500/25'
                : 'bg-yellow-500/[0.07] border-yellow-500/25'
            }`}>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                b.courtAssigned ? 'bg-green-500/20' : 'bg-yellow-500/20'
              }`}>
                <MapPin size={14} className={b.courtAssigned ? 'text-green-700' : 'text-yellow-600'} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className={`text-xs font-bold ${b.courtAssigned ? 'text-green-700' : 'text-yellow-600'}`}>
                    {b.courtAssigned ? 'Court Assigned' : 'Assignment Pending'}
                  </span>
                  <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-red-500/15 text-red-400 text-[9px] font-bold border border-red-500/20">
                    <Activity size={8} /> STARTING SOON
                  </span>
                </div>
                <div className="text-sm font-semibold">
                  {typeEmoji(b.bookingType)} {
                    b.courtAssigned
                      ? (b.bookingType === 'CRICKET_LANE' ? `Lane ${b.laneNumber}` :
                         b.bookingType === 'BOX_CRICKET' ? (b.courtNumber ? `Court ${b.courtNumber}` : 'Check your email') :
                         `Court ${b.courtNumber}`)
                      : 'Check your email for assignment'
                  }
                  <span className="text-[#5a6a8a] font-normal ml-2">· {fmtTime(b.startTime?.toString())}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* -- Tabs --------------------------------------------------------------- */}
      <div className="flex gap-1.5 bg-[#f8faff] rounded-xl p-1 w-fit mb-5">
        {[
          ['active',    `Active (${active.length})`],
          ['history',   `History (${history.length})`],
          ['cancelled', `Cancelled (${cancelled.length})`],
        ].map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${tab === k ? 'bg-accent text-white' : 'text-muted hover:text-[#0a1428]'}`}>
            {l}
          </button>
        ))}
      </div>

      {/* -- Filters ------------------------------------------------------------ */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <Filter size={13} className="text-muted flex-shrink-0" />
        <select className="inp !py-1.5 !px-3 text-xs w-auto" value={filterSport} onChange={e => setFilterSport(e.target.value)}>
          <option value="ALL">All Sports</option>
          <option value="CRICKET_LANE">Cricket Lane</option>
          <option value="BOX_CRICKET">Box Cricket</option>
          <option value="PICKLEBALL">Pickleball</option>
        </select>
        <input type="date" className="inp !py-1.5 !px-3 text-xs w-auto [color-scheme:light]"
          value={filterFrom} onChange={e => setFilterFrom(e.target.value)} placeholder="From" title="From date" />
        <input type="date" className="inp !py-1.5 !px-3 text-xs w-auto [color-scheme:light]"
          value={filterTo}   onChange={e => setFilterTo(e.target.value)}   placeholder="To"   title="To date" />
        <select className="inp !py-1.5 !px-3 text-xs w-auto" value={sortDir} onChange={e => setSortDir(e.target.value)}>
          <option value="desc">Newest First</option>
          <option value="asc">Oldest First</option>
        </select>
        {(filterSport !== 'ALL' || filterFrom || filterTo) && (
          <button className="text-xs text-accent hover:underline"
            onClick={() => { setFilterSport('ALL'); setFilterFrom(''); setFilterTo('') }}>
            Clear filters
          </button>
        )}
      </div>

      {/* -- Pending payment alert ---------------------------------------------- */}
      {tab === 'active' && !loading && active.filter(b => b.paymentStatus === 'PENDING' && !isPendingExpired(b.createdAt)).length > 0 && (
        <div className="mb-3 p-3.5 rounded-xl bg-yellow-50 border border-yellow-300 flex items-start gap-3">
          <AlertTriangle size={15} className="text-yellow-600 flex-shrink-0 mt-0.5" />
          <div>
            <div className="text-xs font-bold text-yellow-700">Payment Pending</div>
            <div className="text-[11px] text-yellow-600 mt-0.5">
              You have {active.filter(b => b.paymentStatus === 'PENDING' && !isPendingExpired(b.createdAt)).length} booking(s) awaiting payment.
              Complete within 10 minutes or the slot will be released.
            </div>
          </div>
        </div>
      )}

      {loading ? <div className="flex justify-center py-20"><Spinner size={28} /></div> : (
        <div className="space-y-3">
          {list.length === 0 ? (
            <div className="card p-14 text-center text-muted">
              <div className="text-4xl mb-3">📋</div>
              <div>No {tab} bookings</div>
              {tab === 'active' && (
                <button onClick={() => { setBookType('CRICKET_LANE'); setShowBook(true) }}
                  className="mt-4 px-5 py-2.5 rounded-xl text-sm font-bold bg-accent/10 border border-accent/20 text-accent hover:bg-accent/20 transition-all">
                  Book Your Session
                </button>
              )}
            </div>
          ) : list.map(b => (
            // <div key={b.id} className={`card p-4 flex flex-col sm:flex-row sm:items-center gap-4 ${
            //   b.paymentStatus === 'PENDING' && !isPendingExpired(b.createdAt)
            //     ? 'border-yellow-500/30 bg-yellow-500/[0.03]'
            //     : ''
            // }`}>
            <div key={b.id} className={`card p-4 flex flex-col sm:flex-row sm:items-center gap-4 ${
              b.paymentStatus === 'PENDING' && !isPendingExpired(b.createdAt)
                ? 'border-yellow-500/30 bg-yellow-500/[0.03]'
                : b.paymentStatus === 'DUE'
                  ? 'border-blue-500/30 bg-blue-500/[0.03]'
                  : ''
            }`}>
              {/* Sport icon */}
              <div className="text-3xl flex-shrink-0">{typeEmoji(b.bookingType)}</div>

              {/* Main info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="font-bold text-sm">
                    {b.bookingType === 'CRICKET_LANE' ? 'Cricket Lane' :
                     b.bookingType === 'BOX_CRICKET'  ? 'Box Cricket' :
                     'Pickleball'}
                  </span>
                  <Badge value={b.status} />
                  {b.memberDiscountApplied && (
                    <span className="px-1.5 py-0.5 rounded text-[9px] bg-blue-600/10 border border-blue-600/20 text-blue-400 font-bold">MEMBER</span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs text-muted">
                  <span className="flex items-center gap-1"><Clock size={10} /> {fmtTime(b.startTime?.toString())} – {fmtTime(b.endTime?.toString())}</span>
                  <span>📅 {b.bookingDate}</span>
                  <span className="font-mono">{b.paymentReference?.slice(0, 18)}</span> 
                </div>

                {/* Court/Lane assignment status */}
                <div className="mt-2">
                  {b.courtAssigned ? (
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-green-100 border border-green-300 text-green-700 text-[11px] font-semibold">
                      <MapPin size={10} />
                      {b.bookingType === 'CRICKET_LANE' ? `Lane ${b.laneNumber} Assigned` :
                       b.bookingType === 'BOX_CRICKET'  ? `Court ${b.courtNumber} Assigned` :
                       `Court ${b.courtNumber} Assigned`}
                    </div>
                  ) : b.status === 'CONFIRMED' ? (
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-yellow-100 border border-yellow-300 text-yellow-700 text-[11px]">
                      <Clock size={10} /> Court / Lane — Pending assignment
                    </div>
                  ) : null}
                </div>
              </div>

              {/* Amount + action */}
              <div className="flex sm:flex-col items-center sm:items-end gap-3 flex-shrink-0">
                <div className="text-right">
                  <div className="text-lg font-extrabold">${b.amountPaid}</div>
                  <div className={`text-[10px] font-bold ${
                    b.paymentStatus === 'PAID' ? 'text-green-700' :
                    b.paymentStatus === 'REFUNDED' ? 'text-blue-400' :
                    b.paymentStatus === 'DUE' ? 'text-blue-600' : 'text-yellow-700'
                  }`}>{b.paymentStatus === 'DUE' ? 'Pay at Venue' : b.paymentStatus}</div>
                </div>
                {/* Cancelled — show refund info */}
                {b.status === 'CANCELLED' && (
                  <div className="text-right">
                    <RefundBadge policy={b.refundPolicy} amount={b.refundAmount} />
                    {b.cancelledAt && (
                      <div className="text-[9px] text-muted mt-0.5">Cancelled {fmtDateTime(b.cancelledAt)}</div>
                    )}
                  </div>
                )}
                {/* PENDING payment — show Pay Now or Expired */}
                {b.status === 'AWAITING_PAYMENT' && b.paymentStatus === 'PENDING' && (
                  isPendingExpired(b.createdAt)
                    ? <span className="flex items-center gap-1 text-[10px] text-red-400/70 italic"><AlertTriangle size={10} /> Slot expired</span>
                    : <button disabled={paying}
                        onClick={() => continuePendingPayment(b)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-yellow-100 border border-yellow-300 text-yellow-700 hover:bg-yellow-200 transition-all disabled:opacity-50">
                        <CreditCard size={11} /> Pay Now
                      </button>
                )}
                {/* DUE — booked by staff; customer pays at the venue (card/QR), not through the app */}
                {b.status === 'CONFIRMED' && b.paymentStatus === 'DUE' && (
                  <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-500/10 border border-blue-500/20 text-blue-300">
                    <CreditCard size={11} /> Pay at Venue
                  </span>
                )}
                {/* Only show Cancel if CONFIRMED+(PAID or DUE) and session hasn't started yet */}
                {b.status === 'CONFIRMED' && (b.paymentStatus === 'PAID' || b.paymentStatus === 'DUE') && !isPast(b.bookingDate, b.startTime?.toString()) && (
                  <button className="px-3 py-1.5 rounded-lg text-xs font-bold bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all"
                    onClick={() => setTarget(b)}>Cancel</button>
                )}
                {b.status === 'CONFIRMED' && (b.paymentStatus === 'PAID' || b.paymentStatus === 'DUE') && isPast(b.bookingDate, b.startTime?.toString()) && (
                  <span className="text-[10px] text-muted italic">Session ended</span>
                )}

              </div>
            </div>
          ))}
        </div>
      )}

      {/* -- Cancel modal ------------------------------------------------------- */}
      <Modal open={!!target} onClose={() => setTarget(null)} title="⚠️ Cancel Booking"
        footer={<>
          <button className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-[#f8faff] border border-[#dde8f8] hover:bg-[#f0f5ff] transition-all"
            onClick={() => setTarget(null)}>Keep Booking</button>
          <button className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all flex items-center gap-2"
            onClick={doCancel} disabled={cancelling}>
            {cancelling && <span className="w-3 h-3 border-2 border-red-400/30 border-t-red-400 rounded-full spin" />}
            Confirm Cancel
          </button>
        </>}>
        {target && <>
          <p className="text-sm text-muted leading-relaxed mb-4">
            Cancel <strong className="text-[#0a1428]">{typeEmoji(target.bookingType)} {target.bookingType?.replace('_', ' ')}</strong> on <strong className="text-white">{target.bookingDate}</strong> at <strong className="text-white">{fmtTime(target.startTime?.toString())}</strong>?
          </p>
          <div className="bg-red-500/5 border border-red-500/15 rounded-xl p-4 text-xs text-red-600 leading-relaxed mb-4">
            <strong>Refund Policy:</strong><br />
            · 24+ hrs before → Full refund<br />
            · 1–24 hrs before → 50% refund<br />
            · &lt;1 hr before → No refund<br />
            Processed within 1 hour.
          </div>
          <div>
            <label className="text-xs font-bold text-muted uppercase tracking-wider block mb-1.5">Reason (optional)</label>
            <textarea className="inp text-sm" rows={3} placeholder="Let us know why…"
              value={reason} onChange={e => setReason(e.target.value)} />
          </div>
        </>}
      </Modal>

      {/* -- Booking modal ------------------------------------------------------ */}
      {showBook && <BookingModal initialType={bookType} onClose={() => { setShowBook(false); load() }} />}
    </div>
  )
}
