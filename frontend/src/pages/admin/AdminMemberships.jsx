import { useEffect, useState, useMemo } from 'react'
import { adminAPI, publicAPI } from '../../api'
import Spinner from '../../components/common/Spinner'
import toast from 'react-hot-toast'
import { Crown, Search, X, CheckCircle, Clock } from 'lucide-react'

const SPORTS = [
  { key: 'CRICKET_LANE', memberKey: 'cricketLaneMember', expiryKey: 'cricketLaneExpiry', grantedKey: 'cricketLaneGrantedAt', label: 'Cricket Lane', emoji: '🏏' },
  { key: 'BOX_CRICKET',  memberKey: 'boxCricketMember',  expiryKey: 'boxCricketExpiry',  grantedKey: 'boxCricketGrantedAt',  label: 'Box Cricket',  emoji: '📦' },
  { key: 'PICKLEBALL',   memberKey: 'pickleballMember',  expiryKey: 'pickleballExpiry',  grantedKey: 'pickleballGrantedAt',  label: 'Pickleball',   emoji: '🏓' },
]

const DURATIONS = [
  { months: 1, label: '1 Mo' }, { months: 3, label: '3 Mo' },
  { months: 6, label: '6 Mo' }, { months: 12, label: '1 Yr' },
]

function daysLeft(expiry) {
  if (!expiry) return null
  const exp = new Date(expiry); exp.setHours(0, 0, 0, 0)
  const now = new Date();      now.setHours(0, 0, 0, 0)
  return Math.round((exp - now) / 86400000)
}

function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function sportStatus(u, sport) {
  if (!u[sport.memberKey]) return 'none'
  const days = daysLeft(u[sport.expiryKey])
  if (days === null) return 'active'
  if (days < 0)  return 'expired'
  if (days <= 7) return 'expiring'
  return 'active'
}

function overallStatus(u) {
  const ss = SPORTS.map(s => sportStatus(u, s))
  if (ss.some(s => s === 'active' || s === 'expiring')) return ss.some(s => s === 'expiring') ? 'expiring' : 'active'
  if (ss.some(s => s === 'expired')) return 'expired'
  return 'none'
}

// ── Compact sport badge row shown in the table ─────────────────────────────
function SportBadges({ u }) {
  return (
    <div className="flex gap-1.5 flex-wrap">
      {SPORTS.map(s => {
        const st   = sportStatus(u, s)
        const days = daysLeft(u[s.expiryKey])
        if (st === 'none') return (
          <span key={s.key} className="text-xs text-[#c0c8d8]" title={s.label}>{s.emoji}</span>
        )
        return (
          <span key={s.key} title={`${s.label}: ${days !== null ? days + 'd left' : 'active'}`}
            className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold border ${
              st === 'active'   ? 'bg-yellow-50 text-yellow-700 border-yellow-300' :
              st === 'expiring' ? 'bg-orange-50 text-orange-600 border-orange-300' :
                                  'bg-red-50 text-red-500 border-red-200'
            }`}>
            {s.emoji}
            {days !== null && <span>{days < 0 ? `${Math.abs(days)}d ago` : `${days}d`}</span>}
          </span>
        )
      })}
    </div>
  )
}

// ── Right-side panel ───────────────────────────────────────────────────────
function PlayerPanel({ player, onClose, onGranted }) {
  const [form,    setForm]    = useState({ sport: 'CRICKET_LANE', months: 1, paymentType: 'CASH' })
  const [loading, setLoading] = useState(false)
  const [pricing, setPricing] = useState({})

  useEffect(() => {
    publicAPI.pricing()
      .then(r => {
        const m = {}
        r.data.forEach(p => { m[p.ruleKey] = parseFloat(p.price) })
        setPricing(m)
      })
      .catch(() => {})
  }, [])

  // Reset form when a different player is selected
  useEffect(() => {
    setForm({ sport: 'CRICKET_LANE', months: 1, paymentType: 'CASH' })
  }, [player?.id])

  if (!player) return null

  const handleGrant = async () => {
    setLoading(true)
    try {
      await adminAPI.grantMembership(player.id, form)
      const sport = SPORTS.find(s => s.key === form.sport)
      toast.success(`${sport.emoji} ${sport.label} granted to ${player.fullName}`)
      onGranted()
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to grant membership')
    } finally { setLoading(false) }
  }

  const initials = player.fullName?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose} />

      {/* Panel */}
      <div className="fixed right-0 top-0 h-full w-[360px] z-50 flex flex-col shadow-2xl"
        style={{ background: '#ffffff', borderLeft: '1px solid #dde8f8' }}>

        {/* Panel header */}
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid #dde8f8' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-sm font-bold text-white flex-shrink-0">
              {initials}
            </div>
            <div>
              <div className="font-bold text-sm text-[#0a1428]">{player.fullName}</div>
              <div className="text-[11px] text-muted">{player.email}</div>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[#f0f5ff] text-muted transition-all">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">

          {/* Current memberships */}
          <div>
            <div className="text-[10px] font-bold text-muted uppercase tracking-wider mb-2">Current Memberships</div>
            <div className="space-y-2">
              {SPORTS.map(sport => {
                const st      = sportStatus(player, sport)
                const expiry  = player[sport.expiryKey]
                const granted = player[sport.grantedKey]
                const days    = daysLeft(expiry)
                const isActive = st === 'active' || st === 'expiring'

                return (
                  <div key={sport.key} className={`p-3 rounded-xl border ${
                    isActive  ? 'bg-yellow-50 border-yellow-200' :
                    st === 'expired' ? 'bg-red-50 border-red-200' : 'bg-[#f8faff] border-[#dde8f8]'
                  }`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-xs text-[#0a1428] flex items-center gap-1.5">
                        <span>{sport.emoji}</span> {sport.label}
                      </span>
                      {st === 'none' && <span className="text-[10px] text-muted">No membership</span>}
                      {st === 'active' && <span className="flex items-center gap-1 text-[10px] font-bold text-green-700"><CheckCircle size={9} /> Active</span>}
                      {st === 'expiring' && <span className="flex items-center gap-1 text-[10px] font-bold text-orange-600"><Clock size={9} /> Expiring</span>}
                      {st === 'expired' && <span className="text-[10px] font-bold text-red-500">Expired</span>}
                    </div>
                    {st !== 'none' && (
                      <div className="grid grid-cols-2 gap-1 mt-1.5">
                        <div>
                          <div className="text-[9px] text-muted uppercase tracking-wider">Granted</div>
                          <div className="text-[11px] font-semibold text-[#0a1428]">{fmtDate(granted)}</div>
                        </div>
                        <div>
                          <div className="text-[9px] text-muted uppercase tracking-wider">Expires</div>
                          <div className="text-[11px] font-semibold text-[#0a1428]">{fmtDate(expiry)}</div>
                        </div>
                        {days !== null && (
                          <div className="col-span-2 mt-0.5">
                            <span className={`text-[11px] font-bold ${
                              days < 0 ? 'text-red-500' : days <= 7 ? 'text-orange-600' : 'text-green-600'
                            }`}>
                              {days < 0 ? `${Math.abs(days)} days ago` : days === 0 ? 'Expires today' : `${days} days remaining`}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Grant form */}
          <div>
            <div className="text-[10px] font-bold text-muted uppercase tracking-wider mb-2">Grant New Membership</div>

            {/* Sport */}
            <div className="mb-3">
              <div className="text-[10px] text-muted mb-1">Sport</div>
              <div className="grid grid-cols-3 gap-1.5">
                {SPORTS.map(s => (
                  <button key={s.key} type="button" onClick={() => setForm(f => ({ ...f, sport: s.key }))}
                    className={`py-2 rounded-xl text-[11px] font-bold border transition-all flex flex-col items-center gap-0.5 ${
                      form.sport === s.key ? 'bg-yellow-100 border-yellow-400 text-yellow-700' : 'bg-[#f8faff] border-[#dde8f8] text-muted hover:border-yellow-300'
                    }`}>
                    <span className="text-base">{s.emoji}</span>{s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Duration */}
            <div className="mb-3">
              <div className="text-[10px] text-muted mb-1">Duration</div>
              <div className="grid grid-cols-4 gap-1.5">
                {DURATIONS.map(d => (
                  <button key={d.months} type="button" onClick={() => setForm(f => ({ ...f, months: d.months }))}
                    className={`py-2 rounded-xl text-[11px] font-bold border transition-all ${
                      form.months === d.months ? 'bg-accent text-white border-accent' : 'bg-[#f8faff] border-[#dde8f8] text-muted hover:border-accent/40'
                    }`}>
                    {d.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Payment */}
            <div className="mb-4">
              <div className="text-[10px] text-muted mb-1">Payment</div>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { value: 'CASH', icon: '💵', label: 'Cash', desc: 'Paid at desk' },
                  { value: 'COMPLIMENTARY', icon: '🎁', label: 'Comp', desc: 'No charge' },
                ].map(pt => (
                  <button key={pt.value} type="button" onClick={() => setForm(f => ({ ...f, paymentType: pt.value }))}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      form.paymentType === pt.value ? 'bg-accent/10 border-accent/40' : 'bg-[#f8faff] border-[#dde8f8] hover:border-accent/30'
                    }`}>
                    <div className="text-sm mb-0.5">{pt.icon}</div>
                    <div className={`text-[11px] font-bold ${form.paymentType === pt.value ? 'text-accent' : 'text-[#0a1428]'}`}>{pt.label}</div>
                    <div className="text-[10px] text-muted">{pt.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Summary line */}
            <div className="text-[11px] text-muted bg-[#f8faff] rounded-xl px-3 py-2 border border-[#dde8f8] mb-3">
              {SPORTS.find(s => s.key === form.sport)?.emoji}{' '}
              <strong className="text-[#0a1428]">{SPORTS.find(s => s.key === form.sport)?.label}</strong> ·{' '}
              <strong className="text-[#0a1428]">{DURATIONS.find(d => d.months === form.months)?.label}</strong> ·{' '}
              {form.paymentType === 'CASH' ? '💵 Cash' : '🎁 Complimentary'}
              {form.paymentType === 'CASH' && (() => {
                const monthly = pricing[form.sport + '_MEMBERSHIP']
                if (!monthly) return null
                const total = (monthly * form.months).toFixed(2)
                return (
                  <strong className="text-green-700">
                    {' '}· {form.months > 1 ? `$${monthly}/mo = $${total}` : `$${total}`}
                  </strong>
                )
              })()}
              {(() => {
                const sp = SPORTS.find(s => s.key === form.sport)
                const currentExpiry = player[sp?.expiryKey]
                return currentExpiry && new Date(currentExpiry) > new Date()
                  ? ' · Extends current expiry' : ' · Starts from today'
              })()}
            </div>

            <button onClick={handleGrant} disabled={loading}
              className="w-full py-2.5 rounded-xl text-sm font-bold bg-gradient-to-r from-yellow-600 to-yellow-500 text-white hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2 transition-all">
              {loading
                ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : <Crown size={13} />}
              Grant Membership
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────
export default function AdminMemberships() {
  const [users,       setUsers]       = useState([])
  const [loading,     setLoading]     = useState(true)
  const [search,      setSearch]      = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [selected,    setSelected]    = useState(null)

  const load = () => {
    setLoading(true)
    adminAPI.allUsers()
      .then(r => setUsers(r.data))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const players = useMemo(() => users.filter(u => u.role === 'PLAYER'), [users])

  const totalActive   = players.filter(u => overallStatus(u) === 'active').length
  const totalExpiring = players.filter(u => overallStatus(u) === 'expiring').length
  const totalExpired  = players.filter(u => overallStatus(u) === 'expired').length
  const totalNone     = players.filter(u => overallStatus(u) === 'none').length

  const filtered = players
    .filter(u => {
      const s = overallStatus(u)
      if (statusFilter === 'ACTIVE')   return s === 'active'
      if (statusFilter === 'EXPIRING') return s === 'expiring'
      if (statusFilter === 'EXPIRED')  return s === 'expired'
      if (statusFilter === 'NONE')     return s === 'none'
      return true
    })
    .filter(u => !search ||
      u.fullName?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase()))

  const handleGranted = () => {
    // refresh and update selected player with fresh data
    adminAPI.allUsers().then(r => {
      setUsers(r.data)
      if (selected) {
        const updated = r.data.find(u => u.id === selected.id)
        if (updated) setSelected(updated)
      }
    })
  }

  return (
    <div className="page-wrap">

      {/* Header */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div>
          <div className="section-title flex items-center gap-2">
            <Crown size={18} className="text-yellow-600" /> Memberships
          </div>
          <div className="section-sub">Click any player to view details and grant membership</div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 mb-5">
        {[
          { label: 'Active',        value: totalActive,   color: 'text-green-700',  bg: 'bg-green-50 border-green-200',   filter: 'ACTIVE'   },
          { label: 'Expiring Soon', value: totalExpiring, color: 'text-orange-600', bg: 'bg-orange-50 border-orange-200', filter: 'EXPIRING' },
          { label: 'Expired',       value: totalExpired,  color: 'text-red-600',    bg: 'bg-red-50 border-red-200',       filter: 'EXPIRED'  },
          { label: 'No Membership', value: totalNone,     color: 'text-muted',      bg: 'bg-[#f8faff] border-[#dde8f8]', filter: 'NONE'     },
        ].map(s => (
          <button key={s.label} onClick={() => setStatusFilter(f => f === s.filter ? 'ALL' : s.filter)}
            className={`card p-4 border text-left transition-all hover:shadow-md ${s.bg} ${statusFilter === s.filter ? 'ring-2 ring-accent/30' : ''}`}>
            <div className={`text-2xl font-extrabold ${s.color}`}>{s.value}</div>
            <div className="text-xs text-muted mt-1">{s.label}</div>
          </button>
        ))}
      </div>

      {/* Search + filter bar */}
      <div className="flex gap-3 mb-4 flex-wrap items-center">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            className="bg-[#f8faff] border border-[#dde8f8] rounded-xl pl-9 pr-4 py-2 text-sm outline-none focus:border-accent w-52"
            placeholder="Search player…"
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-1 bg-[#f8faff] rounded-xl p-1 border border-[#dde8f8]">
          {[['ALL','All players'],['ACTIVE','Active'],['EXPIRING','Expiring'],['EXPIRED','Expired'],['NONE','No membership']].map(([v,l]) => (
            <button key={v} onClick={() => setStatusFilter(v)}
              className={'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ' +
                (statusFilter === v ? 'bg-accent text-white shadow-sm' : 'text-muted hover:text-[#0a1428]')}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-20"><Spinner size={28} /></div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Player</th>
                <th>Sport Memberships</th>
                <th>Overall Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(u => {
                const st = overallStatus(u)
                return (
                  <tr key={u.id}
                    className={`cursor-pointer transition-colors ${selected?.id === u.id ? 'bg-accent/5' : 'hover:bg-[#f8faff]'}`}
                    onClick={() => setSelected(u)}>
                    <td>
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0">
                          {u.fullName?.split(' ').map(w => w[0]).join('').slice(0, 2)}
                        </div>
                        <div>
                          <div className="font-semibold text-sm">{u.fullName}</div>
                          <div className="text-xs text-muted">{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td><SportBadges u={u} /></td>
                    <td>
                      {st === 'active'   && <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-700 border border-green-300">Active</span>}
                      {st === 'expiring' && <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-100 text-orange-600 border border-orange-300">Expiring Soon</span>}
                      {st === 'expired'  && <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-600 border border-red-200">Expired</span>}
                      {st === 'none'     && <span className="text-xs text-muted">—</span>}
                    </td>
                    <td>
                      <span className="text-xs text-accent font-semibold">
                        {selected?.id === u.id ? 'Selected ✓' : 'Manage →'}
                      </span>
                    </td>
                  </tr>
                )
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={4} className="text-center py-12 text-muted text-sm">
                    No players match your filters
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Side panel */}
      {selected && (
        <PlayerPanel
          player={selected}
          onClose={() => setSelected(null)}
          onGranted={handleGranted}
        />
      )}
    </div>
  )
}
