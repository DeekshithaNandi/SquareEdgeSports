import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { publicAPI } from '../../api'
import { Crown, CheckCircle, XCircle, Clock, Info } from 'lucide-react'

const SPORTS = [
  { key: 'CRICKET_LANE', label: 'Cricket Lane', emoji: '🏏',
    memberKey: 'cricketLaneMember', expiryKey: 'cricketLaneExpiry', grantedKey: 'cricketLaneGrantedAt',
    ruleKey: 'CRICKET_LANE_MEMBERSHIP',
    activeStyle: { background: '#f0fdf4', borderColor: '#86efac' },
    dayColor: 'text-green-600', expiredStyle: { background: '#fef2f2', borderColor: '#fca5a5' } },
  { key: 'BOX_CRICKET', label: 'Box Cricket', emoji: '📦',
    memberKey: 'boxCricketMember', expiryKey: 'boxCricketExpiry', grantedKey: 'boxCricketGrantedAt',
    ruleKey: 'BOX_CRICKET_MEMBERSHIP',
    activeStyle: { background: '#faf5ff', borderColor: '#c4b5fd' },
    dayColor: 'text-violet-600', expiredStyle: { background: '#fef2f2', borderColor: '#fca5a5' } },
  { key: 'PICKLEBALL', label: 'Pickleball', emoji: '🏓',
    memberKey: 'pickleballMember', expiryKey: 'pickleballExpiry', grantedKey: 'pickleballGrantedAt',
    ruleKey: 'PICKLEBALL_MEMBERSHIP',
    activeStyle: { background: '#fff7ed', borderColor: '#fdba74' },
    dayColor: 'text-orange-600', expiredStyle: { background: '#fef2f2', borderColor: '#fca5a5' } },
]

function fmtDate(d) {
  if (!d) return null
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function daysLeft(expiry) {
  if (!expiry) return null
  const exp = new Date(expiry); exp.setHours(0, 0, 0, 0)
  const now = new Date();      now.setHours(0, 0, 0, 0)
  return Math.round((exp - now) / 86400000)
}

function DaysRing({ days, total, warning }) {
  const max    = total > 0 ? total : 30
  const capped = Math.min(Math.max(days, 0), max)
  const pct    = capped / max
  const r = 22, circ = 2 * Math.PI * r
  return (
    <svg width="56" height="56" className="flex-shrink-0">
      <circle cx="28" cy="28" r={r} fill="none" stroke="#e2e8f0" strokeWidth="4" />
      <circle cx="28" cy="28" r={r} fill="none"
        stroke={warning ? '#f97316' : '#22c55e'} strokeWidth="4"
        strokeDasharray={circ} strokeDashoffset={circ * (1 - pct)}
        strokeLinecap="round" transform="rotate(-90 28 28)" />
      <text x="28" y="32" textAnchor="middle" fontSize="12" fontWeight="800"
        fill={warning ? '#ea580c' : '#16a34a'}>{days}</text>
    </svg>
  )
}

export default function UserMemberships() {
  const { user, refreshUser } = useAuth()
  const [pricing, setPricing] = useState({})

  useEffect(() => {
    refreshUser()
    publicAPI.pricing()
      .then(r => {
        const map = {}
        r.data.forEach(p => { map[p.ruleKey] = parseFloat(p.price) })
        setPricing(map)
      })
      .catch(() => {})
  }, [])

  const activeSports = SPORTS.filter(s => {
    const days = daysLeft(user?.[s.expiryKey])
    return user?.[s.memberKey] && (days === null || days >= 0)
  })

  return (
    <div className="page-wrap max-w-2xl">

      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <Crown size={22} className="text-yellow-500" />
        <h1 className="font-display text-xl font-bold text-[#0a1428]">My Memberships</h1>
      </div>
      <p className="text-sm text-muted mb-6">
        Your sport membership status and expiry dates. Visit the front desk to get or extend a membership.
      </p>

      {/* Active summary */}
      {activeSports.length > 0 ? (
        <div className="mb-5 px-4 py-3 rounded-xl border border-green-200 bg-green-50 flex items-center gap-3">
          <CheckCircle size={16} className="text-green-600 flex-shrink-0" />
          <span className="text-sm font-semibold text-green-800">
            Active in {activeSports.length} sport{activeSports.length > 1 ? 's' : ''}:&nbsp;
          </span>
          <span className="text-sm text-green-700">{activeSports.map(s => `${s.emoji} ${s.label}`).join(' · ')}</span>
        </div>
      ) : (
        <div className="mb-5 px-4 py-3 rounded-xl border border-[#dde8f8] bg-[#f8faff] flex items-center gap-3">
          <Info size={15} className="text-muted flex-shrink-0" />
          <span className="text-sm text-muted">You don't have any active memberships. Visit the front desk to get started.</span>
        </div>
      )}

      {/* Sport cards */}
      <div className="space-y-3 mb-6">
        {SPORTS.map(sport => {
          const expiry   = user?.[sport.expiryKey]
          const granted  = user?.[sport.grantedKey]
          const days     = daysLeft(expiry)
          const expired  = days !== null && days < 0
          const isMember = user?.[sport.memberKey] && !expired
          const warning  = isMember && days !== null && days <= 7
          const fee      = pricing[sport.ruleKey] ?? '—'

          return (
            <div key={sport.key} className="card border p-5 flex items-center gap-5 transition-all"
              style={isMember ? sport.activeStyle : expired ? sport.expiredStyle : {}}>

              {/* Emoji icon */}
              <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
                style={{ background: isMember ? 'rgba(255,255,255,0.7)' : '#f0f5ff' }}>
                {sport.emoji}
              </div>

              {/* Details */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="font-bold text-sm text-[#0a1428]">{sport.label}</span>
                  {isMember && (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-700 border border-green-300">
                      <CheckCircle size={8} /> MEMBER
                    </span>
                  )}
                  {expired && (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-600 border border-red-200">
                      <XCircle size={8} /> EXPIRED
                    </span>
                  )}
                  {!isMember && !expired && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#f0f5ff] text-muted border border-[#dde8f8]">
                      NOT A MEMBER
                    </span>
                  )}
                </div>

                {isMember && (
                  <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs">
                    {granted && (
                      <span className="text-muted">
                        Since <span className="font-semibold text-[#0a1428]">{fmtDate(granted)}</span>
                      </span>
                    )}
                    {expiry && (
                      <span className="text-muted">
                        Expires <span className="font-semibold text-[#0a1428]">{fmtDate(expiry)}</span>
                      </span>
                    )}
                    {warning && (
                      <span className="text-orange-600 font-semibold flex items-center gap-1">
                        <Clock size={10} /> Expiring soon
                      </span>
                    )}
                  </div>
                )}

                {expired && (
                  <div className="text-xs text-red-500">
                    Expired on {fmtDate(expiry)} · {Math.abs(days)} days ago · Visit the front desk to renew
                  </div>
                )}

                {!isMember && !expired && (
                  <div className="text-xs text-muted">
                    ${fee}/month · Save on every session as a member
                  </div>
                )}
              </div>

              {/* Days ring (active only) */}
              {isMember && days !== null && (
                <div className="flex-shrink-0 flex flex-col items-center">
                  <DaysRing days={days} warning={warning}
                    total={granted && expiry
                      ? Math.max(Math.ceil((new Date(expiry) - new Date(granted)) / 86400000), 1)
                      : 30} />
                  <div className="text-[9px] text-muted font-semibold mt-0.5">days left</div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Info footer */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-[#f8faff] border border-[#dde8f8] text-xs text-muted">
        <Info size={13} className="text-accent flex-shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-[#0a1428]">How memberships work — </span>
          Each sport has its own independent membership and expiry. Memberships are granted by the front desk
          (cash or complimentary). They expire automatically — no cancellation needed.
        </div>
      </div>
    </div>
  )
}
