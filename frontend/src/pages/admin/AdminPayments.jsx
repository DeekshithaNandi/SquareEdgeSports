import { useEffect, useState, useMemo } from 'react'
import { adminAPI } from '../../api'
import Badge from '../../components/common/Badge'
import StatCard from '../../components/common/StatCard'
import Spinner from '../../components/common/Spinner'
import toast from 'react-hot-toast'
import { Search, ChevronDown, ArrowUpDown, X } from 'lucide-react'
import { fmtTime } from '../../utils/helpers'

function isSessionPast(bookingDate, bookingStart) {
  if (!bookingDate) return false
  const [h, m] = (bookingStart?.toString() ?? '00:00').split(':').map(Number)
  const session = new Date(bookingDate)
  session.setHours(h, m, 0, 0)
  return session <= new Date()
}

function fmtLocal(d) {
  const dt = d instanceof Date ? d : new Date()
  return dt.getFullYear() + '-' +
    String(dt.getMonth() + 1).padStart(2, '0') + '-' +
    String(dt.getDate()).padStart(2, '0')
}

const SPORTS   = ['ALL', 'PICKLEBALL', 'CRICKET_LANE', 'BOX_CRICKET']
const METHODS  = ['ALL', 'RAZORPAY', 'CASH', 'TEST_MODE', 'PENDING']
const STATUSES = ['ALL', 'PAID', 'PENDING', 'REFUNDED', 'PARTIAL_REFUND', 'FAILED']

function Select({ value, onChange, options, label }) {
  return (
    <div className="relative">
      <select value={value} onChange={e => onChange(e.target.value)}
        className="appearance-none bg-[#f8faff] border border-[#dde8f8] rounded-xl pl-3 pr-8 py-2 text-xs font-semibold text-[#0a1428] outline-none focus:border-accent transition-all cursor-pointer [color-scheme:light]">
        {options.map(o => (
          <option key={o.value ?? o} value={o.value ?? o}>
            {o.label ?? (o === 'ALL' ? `All ${label}` : o.replace(/_/g, ' '))}
          </option>
        ))}
      </select>
      <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
    </div>
  )
}

export default function AdminPayments() {
  const [payments,     setPayments]     = useState([])
  const [loading,      setLoading]      = useState(true)

  // ── Filters ────────────────────────────────────────────────────────────────
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [search,       setSearch]       = useState('')
  const [sportFilter,  setSportFilter]  = useState('ALL')
  const [methodFilter, setMethodFilter] = useState('ALL')
  const [dateType,     setDateType]     = useState('slot')     // 'slot' | 'booking'
  const [fromDate,     setFromDate]     = useState('')
  const [toDate,       setToDate]       = useState('')
  const [sortOrder,    setSortOrder]    = useState('newest')   // 'newest' | 'oldest'

  const todayStr = fmtLocal(new Date())

  const load = () => {
    setLoading(true)
    adminAPI.allPayments().then(r => setPayments(r.data)).finally(() => setLoading(false))
  }
  useEffect(load, [])

  const clearFilters = () => {
    setSearch(''); setSportFilter('ALL'); setMethodFilter('ALL')
    setFromDate(''); setToDate(''); setStatusFilter('ALL'); setSortOrder('newest')
  }

  const hasActiveFilters = search || sportFilter !== 'ALL' || methodFilter !== 'ALL' ||
    fromDate || toDate || statusFilter !== 'ALL' || sortOrder !== 'newest'

  // ── Derived stats (always on full set) ────────────────────────────────────
  const totalCollected = payments.filter(p => p.status === 'PAID').reduce((s, p) => s + (parseFloat(p.amount) || 0), 0)
  const totalRefunded  = payments
    .filter(p => p.status === 'REFUNDED' || p.status === 'PARTIAL_REFUND')
    .reduce((s, p) => s + (p.status === 'PARTIAL_REFUND'
      ? (parseFloat(p.refundAmount) || 0)
      : (parseFloat(p.amount) || 0)), 0)
  const sessionsTodayCount = payments.filter(p => p.bookingDate?.toString().slice(0, 10) === todayStr).length

  // ── Filtered + sorted list ─────────────────────────────────────────────────
  const list = useMemo(() => {
    return payments
      .filter(p => statusFilter === 'ALL' || p.status === statusFilter)
      .filter(p => {
        if (!search) return true
        const q = search.toLowerCase()
        return p.userName?.toLowerCase().includes(q) || p.userEmail?.toLowerCase().includes(q)
      })
      .filter(p => sportFilter === 'ALL' || p.bookingType === sportFilter)
      .filter(p => {
        if (methodFilter === 'ALL') return true
        if (methodFilter === 'PENDING') return !p.method || p.method === 'PENDING'
        return p.method === methodFilter
      })
      .filter(p => {
        const d = dateType === 'slot'
          ? p.bookingDate?.toString().slice(0, 10)
          : p.createdAt?.slice(0, 10)
        if (fromDate && (!d || d < fromDate)) return false
        if (toDate   && (!d || d > toDate))   return false
        return true
      })
      .sort((a, b) => {
        const ad = new Date(a.bookingDate || a.createdAt || 0).getTime()
        const bd = new Date(b.bookingDate || b.createdAt || 0).getTime()
        return sortOrder === 'newest' ? bd - ad : ad - bd
      })
  }, [payments, statusFilter, search, sportFilter, methodFilter, dateType, fromDate, toDate, sortOrder])

  const refund = async id => {
    if (!confirm('Mark this payment as refunded?')) return
    try { await adminAPI.refundPayment(id); toast.success('Marked as refunded'); load() }
    catch { toast.error('Failed') }
  }

  return (
    <div className="page-wrap">

      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div>
          <div className="section-title">Payments</div>
          <div className="section-sub">
            {list.length} of {payments.length} transactions
            {hasActiveFilters && <span className="ml-2 text-accent font-bold">· Filtered</span>}
          </div>
        </div>
        {hasActiveFilters && (
          <button onClick={clearFilters}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all">
            <X size={12} /> Clear Filters
          </button>
        )}
      </div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Collected"  value={'$' + totalCollected.toFixed(2)} icon="💰" color="#22c55e" />
        <StatCard label="Total Refunded"   value={'$' + totalRefunded.toFixed(2)}  icon="↩️" color="#ef4444" />
        <StatCard label="All Transactions" value={payments.length}                 icon="📋" color="#7c5cfc" />
        <StatCard label="Sessions Today"   value={sessionsTodayCount}              icon="📅" color="#f5c842" sub={todayStr} />
      </div>

      {/* ── Filter panel ── */}
      <div className="card p-4 mb-5 space-y-3">
        {/* Row 1: Search + Status tabs */}
        <div className="flex flex-wrap gap-3 items-center">
          {/* Search */}
          <div className="relative flex-1 min-w-[180px]">
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

          {/* Status pills */}
          <div className="flex gap-1 bg-[#f8faff] rounded-xl p-1 flex-wrap">
            {STATUSES.map(s => (
              <button key={s} onClick={() => setStatusFilter(s)}
                className={'px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ' +
                  (statusFilter === s ? 'bg-accent text-white' : 'text-muted hover:text-[#0a1428]')}>
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Row 2: Sport, Method, Date type, From/To, Sort */}
        <div className="flex flex-wrap gap-3 items-center">
          {/* Sport type */}
          <Select value={sportFilter} onChange={setSportFilter} label="Sports"
            options={SPORTS.map(s => ({ value: s, label: s === 'ALL' ? 'All Sports' : s.replace(/_/g, ' ') }))} />

          {/* Payment method */}
          <Select value={methodFilter} onChange={setMethodFilter} label="Methods"
            options={METHODS.map(m => ({ value: m, label: m === 'ALL' ? 'All Methods' : m.replace(/_/g, ' ') }))} />

          <div className="w-px h-5 bg-[#f0f5ff]" />

          {/* Date type toggle */}
          <div className="flex gap-1 bg-[#f8faff] rounded-xl p-1">
            <button onClick={() => setDateType('slot')}
              className={'px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ' +
                (dateType === 'slot' ? 'bg-accent text-white' : 'text-muted hover:text-[#0a1428]')}>
              📅 Slot Date
            </button>
            <button onClick={() => setDateType('booking')}
              className={'px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ' +
                (dateType === 'booking' ? 'bg-accent text-white' : 'text-muted hover:text-[#0a1428]')}>
              🕐 Booked On
            </button>
          </div>

          {/* From → To date range */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-muted font-bold">From</span>
            <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
              className="bg-[#f8faff] border border-[#dde8f8] rounded-xl px-3 py-2 text-xs text-[#0a1428] outline-none focus:border-accent transition-all [color-scheme:light]" />
            <span className="text-[11px] text-muted font-bold">To</span>
            <input type="date" value={toDate} onChange={e => setToDate(e.target.value)}
              min={fromDate || undefined}
              className="bg-[#f8faff] border border-[#dde8f8] rounded-xl px-3 py-2 text-xs text-[#0a1428] outline-none focus:border-accent transition-all [color-scheme:light]" />
            {(fromDate || toDate) && (
              <button onClick={() => { setFromDate(''); setToDate('') }}
                className="text-[11px] text-muted hover:text-[#0a1428] px-2 py-1.5 rounded-lg bg-[#f8faff] border border-[#dde8f8] transition-all">
                <X size={11} />
              </button>
            )}
          </div>

          <div className="w-px h-5 bg-[#f0f5ff]" />

          {/* Sort */}
          <div className="flex items-center gap-2">
            <ArrowUpDown size={13} className="text-muted" />
            <Select value={sortOrder} onChange={setSortOrder} label=""
              options={[
                { value: 'newest', label: '⬇ Newest First' },
                { value: 'oldest', label: '⬆ Oldest First' },
              ]} />
          </div>
        </div>

        {/* Active filter summary */}
        {hasActiveFilters && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {search       && <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-accent/15 text-accent border border-accent/30">Search: "{search}"</span>}
            {statusFilter !== 'ALL' && <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700 border border-blue-300">Status: {statusFilter}</span>}
            {sportFilter  !== 'ALL' && <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-green-100 text-green-700 border border-green-300">Sport: {sportFilter.replace(/_/g, ' ')}</span>}
            {methodFilter !== 'ALL' && <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-yellow-100 text-yellow-700 border border-yellow-300">Method: {methodFilter}</span>}
            {(fromDate || toDate)   && <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-purple-500/15 text-purple-300 border border-purple-500/30">{dateType === 'slot' ? 'Slot' : 'Booked'}: {fromDate || '…'} → {toDate || '…'}</span>}
            {sortOrder !== 'newest' && <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#f0f5ff] text-[#5a6a8a] border border-[#dde8f8]">Sort: Oldest First</span>}
          </div>
        )}
      </div>

      {/* ── Table ── */}
      {loading ? <div className="flex justify-center py-20"><Spinner size={28} /></div> : (
        <div className="card overflow-hidden">
          <table className="data-table">
            <thead>
              <tr>
                <th>Reference</th>
                <th>Player</th>
                <th>Sport</th>
                <th>Amount</th>
                <th>Method</th>
                <th>Slot Date</th>
                <th>Booked On</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {list.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center text-muted py-14">
                    {hasActiveFilters ? 'No payments match your filters' : 'No payments found'}
                  </td>
                </tr>
              ) : list.map(p => (
                <tr key={p.id}>
                  <td className="font-mono text-[10px] text-muted">{p.reference?.slice(0, 16)}</td>
                  <td>
                    <div className="font-semibold text-xs">{p.userName}</div>
                    <div className="text-[10px] text-muted">{p.userEmail}</div>
                  </td>
                  <td className="text-xs">
                    {p.bookingType ? (
                      <div>
                        <div className="font-semibold">{p.bookingType.replace(/_/g, ' ')}</div>
                        {p.bookingStart && (
                          <div className="text-[10px] text-muted">{fmtTime(p.bookingStart?.toString())}</div>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted whitespace-normal break-words max-w-[180px] block">{p.description || '—'}</span>
                    )}
                  </td>
                  <td>
                    <div className="font-bold text-sm">${parseFloat(p.amount || 0).toFixed(2)}</div>
                  </td>
                  <td>
                    <span className="badge-blue text-[10px]">{p.method || 'PENDING'}</span>
                  </td>
                  <td className="text-xs">
                    {p.bookingDate
                      ? <span className="font-semibold text-[#0a1428]">{p.bookingDate?.toString().slice(0, 10)}</span>
                      : <span className="text-muted">—</span>}
                  </td>
                  <td className="text-xs text-muted">
                    {p.createdAt?.slice(0, 10) || '—'}
                  </td>
                  <td><Badge value={p.status} /></td>
                  <td>
                    {p.status === 'PAID' && !isSessionPast(p.bookingDate, p.bookingStart) && (
                      <button onClick={() => refund(p.id)}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold bg-yellow-100 border border-yellow-300 text-yellow-700 hover:bg-yellow-200 transition-all">
                        Refund
                      </button>
                    )}
                    {p.status === 'PAID' && isSessionPast(p.bookingDate, p.bookingStart) && (
                      <span className="text-[10px] text-muted italic">Session ended</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
