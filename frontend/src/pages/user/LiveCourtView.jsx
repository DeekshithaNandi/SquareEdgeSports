import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { publicAPI } from '../../api'
import { Activity, RefreshCw, Clock, Users, Zap, ArrowLeft } from 'lucide-react'
import Spinner from '../../components/common/Spinner'

function nowIST() {
  return new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' })
}

function isActive(b) {
  const now  = new Date()
  const date = new Date().toLocaleDateString('en-CA')
  if (b.bookingDate !== date) return false
  const [sh, sm] = (b.startTime || '').split(':').map(Number)
  const [eh, em] = (b.endTime   || '').split(':').map(Number)
  const start = new Date(); start.setHours(sh, sm, 0, 0)
  const end   = new Date(); end.setHours(eh, em, 0, 0)
  return now >= start && now <= end
}

function isUpcoming(b) {
  const now  = new Date()
  const date = new Date().toLocaleDateString('en-CA')
  if (b.bookingDate !== date) return false
  const [sh, sm] = (b.startTime || '').split(':').map(Number)
  const start = new Date(); start.setHours(sh, sm, 0, 0)
  const diff = (start - now) / 60000
  return diff > 0 && diff <= 120
}

function fmtTime(t) {
  if (!t) return ''
  const [h, m] = t.toString().split(':')
  const hour = parseInt(h)
  return `${hour % 12 || 12}:${m} ${hour >= 12 ? 'PM' : 'AM'}`
}

function typeColor(t) {
  if (t === 'CRICKET_LANE') return { badge: 'bg-green-100 text-green-300 border-green-500', dot: 'bg-green-500' }
  if (t === 'BOX_CRICKET')  return { badge: 'bg-blue-600/15 text-blue-300 border-blue-600/25', dot: 'bg-blue-400' }
  return { badge: 'bg-blue-600/15 text-blue-300 border-blue-600/25', dot: 'bg-blue-400' }
}

function typeLabel(t) {
  if (t === 'CRICKET_LANE') return '🏏 Cricket Lane'
  if (t === 'BOX_CRICKET')  return '📦 Box Cricket'
  return '🏓 Pickleball'
}

export default function LiveCourtView() {
  const [bookings, setBookings] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [time,     setTime]     = useState(nowIST())
  const [lastSync, setLastSync] = useState(null)

  async function load() {
    setLoading(true)
    try {
      const r = await publicAPI.liveView()
      setBookings(r.data || [])
      setLastSync(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }))
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }

  useEffect(() => {
    load()
    const syncInt  = setInterval(load, 30000)
    const clockInt = setInterval(() => setTime(nowIST()), 1000)
    return () => { clearInterval(syncInt); clearInterval(clockInt) }
  }, [])

  const active   = bookings.filter(isActive)
  const upcoming = bookings.filter(isUpcoming)

  // Build lane grid: Cricket Lanes 1-8
  const laneGrid = Array.from({ length: 8 }, (_, i) => {
    const lane = i + 1
    const activeLane = active.find(b => b.bookingType === 'CRICKET_LANE' && b.laneNumber === lane)
    return { lane, booking: activeLane, box: lane <= 4 ? 'BOX_A' : 'BOX_B' }
  })

  const boxCricketGrid = Array.from({ length: 2 }, (_, i) => {
    const court = i + 1
    const activeC = active.find(b => b.bookingType === 'BOX_CRICKET' && b.courtNumber === court)
    return { court, booking: activeC }
  })

  const pickleGrid = Array.from({ length: 3 }, (_, i) => {
    const court = i + 1
    const activeC = active.find(b => b.bookingType === 'PICKLEBALL' && b.courtNumber === court)
    return { court, booking: activeC }
  })

  return (
    <div className="min-h-screen bg-bg">

      {/* Header */}
      <div className="sticky top-0 z-10 bg-bg/95 backdrop-blur-xl border-b border-[#dde8f8] px-4 sm:px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="p-2 rounded-lg hover:bg-[#f0f5ff] text-[#5a6a8a] hover:text-[#0a1428] transition-all">
              <ArrowLeft size={16} />
            </Link>
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-700 to-blue-600 flex items-center justify-center">
              <Zap size={14} className="text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm">Live Court View</span>
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 border border-green-300 text-green-700 text-[10px] font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  LIVE
                </span>
              </div>
              <div className="text-[11px] text-[#5a6a8a]">SquareEdgeSports · Updates every 30s</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <div className="text-sm font-bold font-mono">{time}</div>
              {lastSync && <div className="text-[10px] text-[#9aaac8]">Synced {lastSync}</div>}
            </div>
            <button onClick={load} disabled={loading}
              className="p-2 rounded-lg hover:bg-[#f0f5ff] text-[#5a6a8a] hover:text-[#0a1428] transition-all">
              <RefreshCw size={15} className={loading ? 'spin' : ''} />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8">

        {/* Summary row */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Active Now', val: active.length, icon: <Activity size={16} />, color: 'text-green-700', bg: 'bg-green-100 border-green-300' },
            { label: 'Upcoming',   val: upcoming.length, icon: <Clock size={16} />,    color: 'text-blue-400',  bg: 'bg-blue-500/10 border-blue-500/20' },
            { label: "Today's Total", val: bookings.length, icon: <Users size={16} />, color: 'text-blue-400', bg: 'bg-blue-600/10 border-blue-600/20' },
          ].map(s => (
            <div key={s.label} className={`border rounded-2xl p-4 text-center ${s.bg}`}>
              <div className={`${s.color} flex justify-center mb-1`}>{s.icon}</div>
              <div className={`text-2xl font-extrabold ${s.color}`}>{s.val}</div>
              <div className="text-xs text-[#5a6a8a] mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        {loading && <div className="flex justify-center py-8"><Spinner size={28} /></div>}

        {!loading && (
          <>
            {/* -- Cricket Lane Grid -------------------------------------------- */}
            <div>
              <h2 className="text-sm font-bold text-[#5a6a8a] uppercase tracking-wider mb-4 flex items-center gap-2">
                🏏 Cricket Courts
                <span className="text-[10px] font-normal text-[#9aaac8] normal-case">8 lanes across 2 boxes</span>
              </h2>

              {['BOX_A', 'BOX_B'].map(box => (
                <div key={box} className="mb-5">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="text-xs font-bold text-[#5a6a8a] uppercase">{box.replace('_', ' ')}</div>
                    <div className="flex-1 h-px bg-[#f8faff]" />
                    <div className="text-[10px] text-[#9aaac8]">{box === 'BOX_A' ? 'Lanes 1–4' : 'Lanes 5–8'}</div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {laneGrid.filter(l => l.box === box).map(({ lane, booking: b }) => (
                      <div key={lane} className={`rounded-2xl border p-4 transition-all ${
                        b
                          ? 'bg-green-500/[0.08] border-green-500/25'
                          : 'bg-[#f8faff] border-[#dde8f8]'
                      }`}>
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-xs font-bold text-[#5a6a8a]">Lane {lane}</span>
                          <span className={`w-2.5 h-2.5 rounded-full ${b ? 'bg-green-500 animate-pulse' : 'bg-[#f0f5ff]'}`} />
                        </div>
                        {b ? (
                          <>
                            <div className="text-xs font-semibold truncate">{b.userName}</div>
                            <div className="text-[10px] text-[#5a6a8a] mt-0.5">
                              {fmtTime(b.startTime?.toString())} – {fmtTime(b.endTime?.toString())}
                            </div>
                            <div className="text-[10px] text-green-700 mt-1 font-semibold">● Playing</div>
                          </>
                        ) : (
                          <div className="text-xs text-[#9aaac8] mt-1">Available</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* -- Box Cricket Courts --------------------------------------------- */}
            <div>
              <h2 className="text-sm font-bold text-[#5a6a8a] uppercase tracking-wider mb-4 flex items-center gap-2">
                📦 Box Cricket Courts
                <span className="text-[10px] font-normal text-[#9aaac8] normal-case">2 courts</span>
              </h2>
              <div className="grid grid-cols-2 gap-3">
                {boxCricketGrid.map(({ court, booking: b }) => (
                  <div key={court} className={`rounded-2xl border p-4 transition-all ${
                    b
                      ? 'bg-amber-500/[0.08] border-amber-500/25'
                      : 'bg-[#f8faff] border-[#dde8f8]'
                  }`}>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold text-[#5a6a8a]">Court {court}</span>
                      <span className={`w-2.5 h-2.5 rounded-full ${b ? 'bg-amber-500 animate-pulse' : 'bg-[#f0f5ff]'}`} />
                    </div>
                    {b ? (
                      <>
                        <div className="text-xs font-semibold truncate">{b.userName}</div>
                        <div className="text-[10px] text-[#5a6a8a] mt-0.5">
                          {fmtTime(b.startTime?.toString())} – {fmtTime(b.endTime?.toString())}
                        </div>
                        <div className="text-[10px] text-amber-600 mt-1 font-semibold">● Playing</div>
                      </>
                    ) : (
                      <div className="text-xs text-[#9aaac8] mt-1">Available</div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* -- Pickleball Courts -------------------------------------------- */}
            <div>
              <h2 className="text-sm font-bold text-[#5a6a8a] uppercase tracking-wider mb-4 flex items-center gap-2">
                🏓 Pickleball Courts
                <span className="text-[10px] font-normal text-[#9aaac8] normal-case">3 courts</span>
              </h2>
              <div className="grid grid-cols-3 gap-3">
                {pickleGrid.map(({ court, booking: b }) => (
                  <div key={court} className={`rounded-2xl border p-4 transition-all ${
                    b
                      ? 'bg-blue-600/[0.08] border-blue-600/25'
                      : 'bg-[#f8faff] border-[#dde8f8]'
                  }`}>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold text-[#5a6a8a]">Court {court}</span>
                      <span className={`w-2.5 h-2.5 rounded-full ${b ? 'bg-blue-400 animate-pulse' : 'bg-[#f0f5ff]'}`} />
                    </div>
                    {b ? (
                      <>
                        <div className="text-xs font-semibold truncate">{b.userName}</div>
                        <div className="text-[10px] text-[#5a6a8a] mt-0.5">
                          {fmtTime(b.startTime?.toString())} – {fmtTime(b.endTime?.toString())}
                        </div>
                        <div className="text-[10px] text-blue-400 mt-1 font-semibold">● Playing</div>
                      </>
                    ) : (
                      <div className="text-xs text-[#9aaac8] mt-1">Available</div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* -- Upcoming next 2 hrs ------------------------------------------ */}
            {upcoming.length > 0 && (
              <div>
                <h2 className="text-sm font-bold text-[#5a6a8a] uppercase tracking-wider mb-4">
                  🕐 Upcoming (Next 2 Hours)
                </h2>
                <div className="space-y-2">
                  {upcoming.map(b => {
                    const c = typeColor(b.bookingType)
                    return (
                      <div key={b.id} className={`flex items-center gap-3 p-3.5 rounded-xl border ${c.badge}`}>
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${c.dot}`} />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold truncate">{b.userName}</div>
                          <div className="text-[11px] text-[#5a6a8a]">{typeLabel(b.bookingType)}
                            {b.laneNumber ? ` · Lane ${b.laneNumber}` : ''}
                            {b.boxGroup   ? ` · ${b.boxGroup.replace('_',' ')}` : ''}
                            {b.courtNumber ? ` · Court ${b.courtNumber}` : ''}
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className="text-xs font-bold">{fmtTime(b.startTime?.toString())}</div>
                          <div className="text-[10px] text-[#5a6a8a]">{fmtTime(b.endTime?.toString())}</div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {active.length === 0 && upcoming.length === 0 && (
              <div className="text-center py-14 text-[#9aaac8]">
                <Activity size={32} className="mx-auto mb-3 opacity-30" />
                <div className="text-sm">No active or upcoming sessions right now</div>
                <Link to="/" className="mt-4 inline-flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300">
                  Book a session →
                </Link>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
