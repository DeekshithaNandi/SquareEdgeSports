import { useState , useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import BookingModal from '../../components/booking/BookingModal'
import { Zap, Activity, ChevronRight, LayoutDashboard, MapPin, Phone, Mail, Clock, Send, CheckCircle, Loader } from 'lucide-react'
import { publicAPI, userAPI } from '../../api'
import toast from 'react-hot-toast'

/* ── Arctic White colour tokens ───────────────────────────────────────────── */
const AW = {
  bg:   '#f0f5ff',
  s:    '#ffffff',
  bd:   '#dde8f8',
  blue: '#1352c9',
  b2:   '#4a7ee8',
  dim:  'rgba(19,82,201,.08)',
  dbdr: 'rgba(19,82,201,.20)',
  t1:   '#0a1428',   /* headings & primary text — very dark navy */
  t2:   '#3a4d6b',   /* body text — dark blue-gray, clearly readable */
  t3:   '#5a6a8a',   /* secondary/meta text — medium (was too light before) */
}

const SPORT_IMAGES = {
  CRICKET_LANE: 'https://images.unsplash.com/photo-1531415074968-036ba1b575da?w=900&q=90',
  BOX_CRICKET:  'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?w=1100&q=90',
  PICKLEBALL:   'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=900&q=90',
}


const NAV_LINKS = ['Home', 'About', 'Contact']

const makeSports = (counts, pricing = {}) => [
  {
    key: 'CRICKET_LANE', emoji: '🏏', name: 'Cricket Lane',
    desc: `${counts.CRICKET_LANE} individual lanes. Perfect for batting practice and net sessions.`,
    price: pricing.CRICKET_LANE ?? 30, memberPrice: pricing.CRICKET_LANE_MEMBER ?? 25, membershipFee: pricing.CRICKET_LANE_MEMBERSHIP ?? 50,
    features: [`${counts.CRICKET_LANE} lanes`, '55-min sessions', 'Up to 6 players/lane'],
    badgeBg: '#1352c9', badgeLabel: 'LIVE',
  },
  {
    key: 'BOX_CRICKET', emoji: '📦', name: 'Box Cricket',
    desc: `${counts.BOX_CRICKET} independent courts for competitive box cricket matches and group play.`,
    price: pricing.BOX_CRICKET ?? 50, memberPrice: pricing.BOX_CRICKET_MEMBER ?? 40, membershipFee: pricing.BOX_CRICKET_MEMBERSHIP ?? 100,
    features: [`${counts.BOX_CRICKET} courts`, '55-min sessions', 'Up to 12 players/court'],
    badgeBg: '#15803d', badgeLabel: 'POPULAR',
  },
  {
    key: 'PICKLEBALL', emoji: '🏓', name: 'Pickleball',
    desc: `${counts.PICKLEBALL} full-size courts with premium surfaces. Open to all skill levels.`,
    price: pricing.PICKLEBALL ?? 30, memberPrice: pricing.PICKLEBALL_MEMBER ?? 25, membershipFee: pricing.PICKLEBALL_MEMBERSHIP ?? 50,
    features: [`${counts.PICKLEBALL} courts`, '55-min sessions', 'Up to 4 players/court', 'All skill levels'],
    badgeBg: '#d97706', badgeLabel: 'OPEN NOW',
  },
]

/* ── Home Section ─────────────────────────────────────────────────────────── */
function HomeSection({ setBooking, user, sports = [], courtCounts = {}, onMembershipClick, buyingMembership }) {
  const SPORTS = sports
  return (
    <div className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-hidden">

      {/* ── Left: Hero text — compact, always fits ── */}
      <div className="w-full lg:w-[42%] flex flex-col justify-center px-6 sm:px-10 lg:px-14 py-6 overflow-hidden">

        <h1 className="font-extrabold leading-tight tracking-tight mb-3"
          style={{ fontSize: 'clamp(1.9rem, 3.5vw, 2.9rem)', color: AW.t1 }}>
          Book Indoor<br />
          <span style={{ color: AW.blue }}>Sports Courts</span><br />
          Online.
        </h1>

        <p className="text-sm leading-relaxed mb-5 max-w-sm" style={{ color: AW.t2 }}>
          Select your sport, pick a time slot — we'll assign your court and notify you. No hassle, instant booking.
        </p>

        {/* Sport pills */}
        <div className="flex flex-wrap gap-2 mb-5">
          {SPORTS.map(s => (
            <button key={s.key} onClick={() => setBooking(s.key)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all hover:scale-105"
              style={{ background: AW.dim, borderColor: AW.dbdr, color: AW.blue }}>
              {s.emoji} {s.name}
            </button>
          ))}
        </div>

        {/* CTA */}
        <button onClick={() => setBooking('CRICKET_LANE')}
          className="group inline-flex items-center gap-2.5 px-7 py-3 rounded-2xl text-sm font-bold text-white transition-all hover:opacity-90 self-start mb-1"
          style={{ background: AW.blue }}>
          Book a Slot
          <ChevronRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
        </button>

        {!user && (
          <p className="text-[11px] mt-2 mb-5" style={{ color: AW.t3 }}>
            No sign-up needed to browse. Sign in only when you're ready to pay.
          </p>
        )}
        {user && <div className="mb-5" />}

        {/* Stats */}
        <div className="grid grid-cols-4 gap-2">
          {[
            { val: String(courtCounts.CRICKET_LANE ?? 8), label: 'Lanes',  emoji: '🏏' },
            { val: String(courtCounts.BOX_CRICKET ?? 2),  label: 'Boxes',  emoji: '📦' },
            { val: String(courtCounts.PICKLEBALL ?? 3),   label: 'Courts', emoji: '🏓' },
            { val: '15h', label: 'Daily',  emoji: '🕖' },
          ].map(s => (
            <div key={s.label} className="rounded-xl p-2 text-center border"
              style={{ background: AW.s, borderColor: AW.bd }}>
              <div className="text-sm">{s.emoji}</div>
              <div className="text-base font-extrabold leading-tight" style={{ color: AW.blue }}>{s.val}</div>
              <div className="text-[9px] mt-0.5" style={{ color: AW.t3 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Membership mini strip */}
        <div className="mt-4 rounded-xl overflow-hidden border" style={{ borderColor: AW.dbdr }}>
          <div className="flex items-center justify-between px-3 py-2 border-b"
            style={{ background: AW.dim, borderColor: AW.dbdr }}>
            <span className="text-[10px] font-black uppercase tracking-wider" style={{ color: AW.blue }}>🎟 Membership Plans</span>
            {/* <span className="px-1.5 py-0.5 rounded text-[9px] font-bold border"
              style={{ background: AW.dim, borderColor: AW.dbdr, color: AW.blue }}>SAVE MORE</span> */}
          </div>
          <div className="grid grid-cols-3" style={{ background: AW.s }}>
            {SPORTS.map(s => {
              const buying = buyingMembership === s.key
              return (
                <button key={s.key} disabled={buying}
                  className="relative overflow-hidden group cursor-pointer border-r last:border-r-0 disabled:opacity-70 disabled:cursor-wait"
                  style={{ borderColor: AW.bd }} onClick={() => onMembershipClick?.(s)}>
                  <div className="absolute inset-0">
                    <img src={SPORT_IMAGES[s.key]} alt={s.name}
                      className="w-full h-full object-cover opacity-[0.35] group-hover:opacity-[0.55] transition-opacity duration-300" />
                  </div>
                  <div className="relative px-2 py-2.5 text-center">
                    <div className="text-base mb-0.5">{s.emoji}</div>
                    <div className="text-[9px] font-bold mb-0.5 leading-tight" style={{ color: AW.t2 }}>{s.name}</div>
                    <div className="text-xs font-extrabold leading-tight" style={{ color: AW.blue }}>
                      ${s.membershipFee}<span className="text-[8px] font-normal" style={{ color: AW.t3 }}>/mo</span>
                    </div>
                    <div className="text-[8px] mt-0.5 text-green-600 font-semibold">save ${s.price - s.memberPrice}/session</div>
                  </div>
                </button>
              )
            })}
          </div>
          <div className="px-3 py-1.5 text-[9px] border-t" style={{ color: AW.t3, borderColor: AW.bd, background: AW.s }}>
            Contact admin to activate membership.
          </div>
        </div>
      </div>

      {/* ── Right: THREE sport cards — desktop only ── */}
      <div className="hidden lg:flex lg:w-[58%] items-center px-6 lg:px-8 py-6">
        <div className="w-full flex overflow-hidden rounded-2xl border shadow-lg"
          style={{ borderColor: AW.bd, boxShadow: '0 4px 24px rgba(19,82,201,.10)', height: 'min(480px, calc(100% - 0px))' }}>
          {SPORTS.map(s => (
            <div key={s.key}
              className="flex-1 flex flex-col group cursor-pointer border-r last:border-r-0 transition-all duration-300 hover:brightness-[0.97]"
              style={{ background: AW.s, borderColor: AW.bd }}
              onClick={() => setBooking(s.key)}>
              {/* Image — fills top portion */}
              <div className="relative overflow-hidden flex-shrink-0" style={{ height: '55%' }}>
                <img src={SPORT_IMAGES[s.key]} alt={s.name}
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.07]"
                  style={{ filter: 'brightness(.88)' }} />
                <div className="absolute inset-0"
                  style={{ background: 'linear-gradient(to top,rgba(10,20,40,.82) 0%,transparent 55%)' }} />
                <span className="absolute bottom-3 left-3 text-base font-bold text-white drop-shadow">{s.name}</span>
                <span className="absolute top-3 right-3 text-white text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-wide"
                  style={{ background: s.badgeBg }}>{s.badgeLabel}</span>
              </div>
              {/* Info */}
              <div className="flex flex-col flex-1 px-3 pt-2.5 pb-3 border-t" style={{ borderColor: AW.bd }}>
                <p className="text-[11px] leading-relaxed mb-2" style={{ color: AW.t2 }}>{s.desc}</p>
                <div className="flex-1 space-y-1 mb-2">
                  {s.features.map(f => (
                    <div key={f} className="flex items-center gap-1.5 text-[10px]" style={{ color: AW.t2 }}>
                      <span className="w-1 h-1 rounded-full flex-shrink-0" style={{ background: AW.blue }} />{f}
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between pt-2 border-t" style={{ borderColor: AW.bd }}>
                  <div>
                    <div className="text-base font-extrabold leading-none" style={{ color: AW.t1 }}>
                      ${s.price}<span className="text-[9px] font-normal" style={{ color: AW.t3 }}>/session</span>
                    </div>
                    <div className="text-[9px] mt-0.5" style={{ color: AW.t3 }}>
                      Members <b style={{ color: AW.blue }}>${s.memberPrice}</b>
                    </div>
                  </div>
                  <button
                    className="text-[11px] font-semibold px-3 py-1.5 rounded-lg border transition-all"
                    style={{ background: AW.dim, borderColor: AW.dbdr, color: AW.blue }}
                    onMouseEnter={e => { e.currentTarget.style.background = AW.blue; e.currentTarget.style.color = '#fff' }}
                    onMouseLeave={e => { e.currentTarget.style.background = AW.dim; e.currentTarget.style.color = AW.blue }}
                    onClick={e => { e.stopPropagation(); setBooking(s.key) }}>
                    Book →
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Mobile: sport card swipe strip ── */}
      <div className="lg:hidden px-4 pb-6 flex gap-3 overflow-x-auto snap-x snap-mandatory"
        style={{ scrollbarWidth: 'none' }}>
        {SPORTS.map(s => (
          <div key={s.key} className="snap-start flex-shrink-0 rounded-2xl overflow-hidden border cursor-pointer"
            style={{ width: '72vw', maxWidth: '280px', background: AW.s, borderColor: AW.bd, boxShadow: '0 2px 12px rgba(19,82,201,.08)' }}
            onClick={() => setBooking(s.key)}>
            <div className="relative overflow-hidden" style={{ height: '130px' }}>
              <img src={SPORT_IMAGES[s.key]} alt={s.name}
                className="absolute inset-0 w-full h-full object-cover" style={{ filter: 'brightness(.88)' }} />
              <div className="absolute inset-0" style={{ background: 'linear-gradient(to top,rgba(10,20,40,.8) 0%,transparent 50%)' }} />
              <span className="absolute bottom-2 left-3 font-bold text-white text-sm">{s.name}</span>
              <span className="absolute top-2 right-2 text-white text-[9px] font-bold px-2 py-0.5 rounded uppercase"
                style={{ background: s.badgeBg }}>{s.badgeLabel}</span>
            </div>
            <div className="px-3 py-2.5 flex items-center justify-between">
              <div>
                <div className="text-sm font-extrabold" style={{ color: AW.t1 }}>${s.price}<span className="text-[9px] font-normal" style={{ color: AW.t3 }}>/session</span></div>
                <div className="text-[9px]" style={{ color: AW.t3 }}>Members <b style={{ color: AW.blue }}>${s.memberPrice}</b></div>
              </div>
              <button className="text-[11px] font-semibold px-3 py-1.5 rounded-lg border"
                style={{ background: AW.dim, borderColor: AW.dbdr, color: AW.blue }}
                onClick={e => { e.stopPropagation(); setBooking(s.key) }}>Book →</button>
            </div>
          </div>
        ))}
      </div>

    </div>
  )
}

/* ── About Section ────────────────────────────────────────────────────────── */
function AboutSection({ setBooking, sports = [], courtCounts = {} }) {
  const SPORTS = sports
  const amenities = [
    { icon: '🏟️', title: 'World-Class Facility',  desc: 'Premium indoor infrastructure built to international standards.' },
    { icon: '🌡️', title: 'Climate Controlled',     desc: 'Fully air-conditioned courts for year-round comfortable play.' },
    { icon: '💡', title: 'Pro Lighting',            desc: 'High-lumen LED rigs that eliminate shadows on every court.' },
    { icon: '🚿', title: 'Modern Amenities',        desc: 'Clean changing rooms, lockers, and shower facilities on-site.' },
    { icon: '📱', title: 'Instant Booking',         desc: 'Book in seconds — no calls, no waiting, instant confirmation.' },
    { icon: '🏆', title: 'For All Skill Levels',    desc: 'Casual players to competitive teams — everyone is welcome.' },
  ]
  const values = [
    { label: 'Founded', value: '2026' },
    { label: 'Location', value: 'Hyderabad' },
    { label: 'Courts', value: `${(courtCounts.CRICKET_LANE ?? 0) + (courtCounts.BOX_CRICKET ?? 0) + (courtCounts.PICKLEBALL ?? 0) || 13} total` },
    { label: 'Open', value: '7AM–10PM' },
  ]
  return (
    <div className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-hidden">
      <div className="w-full lg:w-[45%] flex flex-col justify-center px-6 sm:px-10 lg:px-14 py-6 overflow-y-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-semibold mb-4 border self-start"
          style={{ background: AW.dim, borderColor: AW.dbdr, color: AW.blue }}>🏟️ Our Story</div>
        <h2 className="text-3xl font-extrabold leading-tight mb-4 tracking-tight" style={{ color: AW.t1 }}>
          Hyderabad's Go-To<br /><span style={{ color: AW.blue }}>Indoor Sports Hub</span>
        </h2>
        <p className="text-sm leading-relaxed mb-3" style={{ color: AW.t2 }}>
          SquareEdge Sports was built with one goal — make premium indoor sports accessible to everyone in Hyderabad.
          We started with a single box cricket arena and quickly expanded to Cricket Lanes and Pickleball courts.
        </p>
        <p className="text-sm leading-relaxed mb-5" style={{ color: AW.t3 }}>
          Every facility is designed for performance — from professional-grade surfaces and lighting to a seamless online booking system.
        </p>
        <div className="grid grid-cols-4 gap-2 mb-5">
          {values.map(v => (
            <div key={v.label} className="rounded-xl p-2.5 text-center border" style={{ background: AW.s, borderColor: AW.bd }}>
              <div className="text-xs font-extrabold leading-tight" style={{ color: AW.blue }}>{v.value}</div>
              <div className="text-[8px] mt-0.5" style={{ color: AW.t3 }}>{v.label}</div>
            </div>
          ))}
        </div>
        {/* <button onClick={() => setBooking('CRICKET_LANE')}
          className="group inline-flex items-center gap-2 px-6 py-2.5 rounded-2xl text-sm font-bold text-white transition-all hover:opacity-90 self-start"
          style={{ background: AW.blue }}>
          Book a Session <ChevronRight size={15} className="group-hover:translate-x-0.5 transition-transform" />
        </button> */}
      </div>
      <div className="w-full lg:w-[55%] flex items-center justify-center px-6 lg:px-10 py-6 overflow-y-auto">
        <div className="w-full">
          <div className="text-[10px] font-bold uppercase tracking-wider mb-3" style={{ color: AW.t3 }}>What We Offer</div>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            {amenities.map(a => (
              <div key={a.title} className="rounded-2xl p-3.5 border" style={{ background: AW.s, borderColor: AW.bd }}>
                <div className="text-xl mb-2">{a.icon}</div>
                <div className="text-xs font-bold mb-1" style={{ color: AW.t1 }}>{a.title}</div>
                <p className="text-[10px] leading-relaxed" style={{ color: AW.t2 }}>{a.desc}</p>
              </div>
            ))}
          </div>
          <div className="mt-3 flex gap-2 h-20">
            {SPORTS.map(s => (
              <div key={s.key} className="flex-1 relative rounded-xl overflow-hidden">
                <img src={SPORT_IMAGES[s.key]} alt={s.name}
                  className="absolute inset-0 w-full h-full object-cover" />
                <div className="absolute inset-0"
                  style={{ background: 'linear-gradient(to top,rgba(10,20,40,.80) 0%,transparent 60%)' }} />
                <div className="absolute bottom-2 left-0 right-0 text-center">
                  <div className="text-[10px] font-bold text-white">{s.name}</div>
                  <div className="text-[9px] text-white/60">${s.price}/session</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Contact Section ─────────────────────────────────────────────────────── */
function ContactSection() {
  const [form,    setForm]    = useState({ name: '', email: '', subject: '', message: '' })
  const [sent,    setSent]    = useState(false)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  const handleSubmit = async e => {
    e.preventDefault()
    if (!form.name || !form.email || !form.message) return
    setLoading(true); setError('')
    try {
      await publicAPI.contact(form)
      setSent(true)
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to send message. Please try again.')
    } finally { setLoading(false) }
  }

  const details = [
    { icon: MapPin, label: 'Address', value: 'SquareEdge Sports Arena, Hyderabad, Telangana – 500001', color: AW.blue },
    { icon: Phone,  label: 'Phone',   value: '+91 9908677056', color: '#16a34a' },
    { icon: Mail,   label: 'Email',   value: 'deekshithalakshmi2@gmail.com', color: AW.blue },
    { icon: Clock,  label: 'Hours',   value: 'Mon – Sun  ·  7:00 AM – 10:00 PM', color: AW.blue },
  ]
  const inp = "w-full rounded-xl px-3.5 py-2 text-sm outline-none transition-all border"
  const ist = { background: AW.s, borderColor: AW.bd, color: AW.t1 }

  return (
    <div className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-hidden">
      <div className="w-full lg:w-[42%] flex flex-col justify-center px-6 sm:px-10 lg:px-14 py-6 overflow-y-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-semibold mb-4 border self-start"
          style={{ background: AW.dim, borderColor: AW.dbdr, color: AW.blue }}>📍 Find Us</div>
        <h2 className="text-3xl font-extrabold leading-tight mb-3 tracking-tight" style={{ color: AW.t1 }}>
          Get In <span style={{ color: AW.blue }}>Touch</span>
        </h2>
        <p className="text-sm leading-relaxed mb-5" style={{ color: AW.t2 }}>
          Questions about bookings, memberships, or events? We're open every day and happy to help.
        </p>
        <div className="space-y-2.5">
          {details.map(d => (
            <div key={d.label} className="flex items-start gap-3 rounded-xl p-3.5 border"
              style={{ background: AW.s, borderColor: AW.bd }}>
              <div className="mt-0.5 flex-shrink-0" style={{ color: d.color }}><d.icon size={15} /></div>
              <div>
                <div className="text-[9px] font-bold uppercase tracking-wider mb-0.5" style={{ color: AW.t3 }}>{d.label}</div>
                <div className="text-xs font-semibold" style={{ color: AW.t1 }}>{d.value}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="w-full lg:w-[58%] flex items-center justify-center px-6 sm:px-10 lg:px-12 py-6 overflow-y-auto">
        <div className="w-full max-w-lg">
          {sent ? (
            <div className="flex flex-col items-center justify-center text-center py-12 gap-4">
              <CheckCircle size={44} style={{ color: '#16a34a' }} />
              <div className="text-xl font-bold" style={{ color: AW.t1 }}>Message Sent!</div>
              <p className="text-sm max-w-xs" style={{ color: AW.t2 }}>Thanks! Our team will get back to you within 24 hours.</p>
              <button onClick={() => { setSent(false); setError(''); setForm({ name: '', email: '', subject: '', message: '' }) }}
                className="mt-1 px-6 py-2.5 rounded-xl text-sm font-bold border"
                style={{ background: AW.s, borderColor: AW.bd, color: AW.t1 }}>Send Another</button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="text-base font-bold" style={{ color: AW.t1 }}>Send us a message</div>
              <p className="text-xs" style={{ color: AW.t2 }}>We respond within one business day.</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{ color: AW.t3 }}>Name *</label>
                  <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="John Smith" className={inp} style={ist} />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{ color: AW.t3 }}>Email *</label>
                  <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    placeholder="you@email.com" className={inp} style={ist} />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{ color: AW.t3 }}>Subject</label>
                <input value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
                  placeholder="Booking enquiry, membership…" className={inp} style={ist} />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{ color: AW.t3 }}>Message *</label>
                <textarea rows={4} value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                  placeholder="Tell us how we can help…" className={`${inp} resize-none`} style={ist} />
              </div>
              {error && <div className="rounded-xl px-4 py-3 text-xs"
                style={{ background: '#fee2e2', border: '1px solid #fca5a5', color: '#dc2626' }}>{error}</div>}
              <button type="submit"
                className="group w-full flex items-center justify-center gap-2.5 py-3 rounded-2xl text-sm font-bold text-white transition-all hover:opacity-90 disabled:opacity-60"
                style={{ background: AW.blue }}
                disabled={!form.name || !form.email || !form.message || loading}>
                {loading
                  ? <><Loader size={14} className="spin" /> Sending…</>
                  : <><span>Send Message</span><Send size={14} className="group-hover:translate-x-0.5 transition-transform" /></>}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

/* ── Main LandingPage ────────────────────────────────────────────────────── */
export default function LandingPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [booking,    setBooking]    = useState(null)
  const [menuOpen,   setMenuOpen]   = useState(false)
  const [activePage, setActivePage] = useState('Home')

  const isAdmin = user && ['SUPER_ADMIN', 'ADMINISTRATOR', 'EMPLOYEE'].includes(user.role)
  const navTo   = page => { setActivePage(page); setMenuOpen(false) }
  const [courtCounts, setCourtCounts] = useState({ CRICKET_LANE: 8, BOX_CRICKET: 2, PICKLEBALL: 3 })
  const [pricing, setPricing] = useState({})
  const [buyingMembership, setBuyingMembership] = useState(null)

  const handleMembershipClick = async (sport) => {
    if (!user) { navigate('/login'); return }
    setBuyingMembership(sport.key)
    try {
      const orderRes = await userAPI.membershipOrder({ sportType: sport.key })
      const { orderId, amount, currency, keyId } = orderRes.data
      if (!window.Razorpay) {
        toast.error('Payment system not available. Please refresh the page and try again.')
        return
      }
      await new Promise((resolve, reject) => {
        const options = {
          key: keyId, amount, currency, order_id: orderId,
          name: 'SquareEdgeSports',
          description: `${sport.name} Membership — 30 days`,
          handler: async (response) => {
            try {
              await userAPI.membershipConfirm({
                sportType:         sport.key,
                razorpayOrderId:   response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
              })
              toast.success(`${sport.emoji} ${sport.name} membership activated!`)
              resolve()
            } catch (e) { reject(e) }
          },
          prefill: { email: user?.email, name: user?.fullName },
          theme: { color: '#1352c9' },
          modal: { ondismiss: () => reject(new Error('dismissed')) },
        }
        new window.Razorpay(options).open()
      })
    } catch (e) {
      if (e.message !== 'dismissed') {
        toast.error(e.response?.data?.message || 'Could not start membership purchase.')
      }
    } finally {
      setBuyingMembership(null)
    }
  }

useEffect(() => {
  publicAPI.courts().then(r => {
    const counts = { CRICKET_LANE: 0, BOX_CRICKET: 0, PICKLEBALL: 0 }
    r.data.forEach(c => { if (counts[c.type] !== undefined) counts[c.type]++ })
    setCourtCounts(counts)
  }).catch(() => {})
  publicAPI.pricing().then(r => {
    const map = {}
    r.data.forEach(p => { map[p.ruleKey] = parseFloat(p.price) })
    setPricing(map)
  }).catch(() => {})
}, [])

  const SPORTS = makeSports(courtCounts, pricing)

  return (
    /* 100dvh = dynamic viewport height — correctly accounts for Chrome toolbar,
       Edge toolbar, mobile browser address bar, etc. No content clipping. */
    <div className="font-sans flex flex-col overflow-hidden"
      style={{ height: '100dvh', background: AW.bg, color: AW.t1 }}>

      {/* ── Navbar ──────────────────────────────────────────────────────── */}
      <nav className="flex-shrink-0 h-14 sm:h-16 flex items-center justify-between px-5 sm:px-10 border-b z-50"
        style={{ background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(18px)', borderColor: AW.bd }}>

        <button onClick={() => navTo('Home')} className="flex items-center gap-2">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center"
            style={{ background: AW.blue }}>
            <Zap size={14} className="text-white" />
          </div>
          <span className="font-bold text-base sm:text-lg tracking-tight" style={{ color: AW.t1 }}>
            Square<b style={{ color: AW.blue }}>Edge</b>Sports
          </span>
        </button>

        {/* Desktop nav */}
        <div className="hidden sm:flex items-center gap-1">
          {NAV_LINKS.map(page => (
            <button key={page} onClick={() => navTo(page)}
              className="px-4 py-2 rounded-lg text-sm font-semibold transition-all"
              style={{ color: activePage === page ? AW.blue : AW.t2, background: activePage === page ? AW.dim : 'transparent' }}>
              {page}
            </button>
          ))}
        </div>

        <div className="hidden sm:flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-green-700 text-[10px] font-bold">
            <Activity size={10} /> OPEN 7AM–10PM
          </div>
          {user ? (
            <>
              <Link to={isAdmin ? '/admin' : '/dashboard'}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold"
                style={{ color: AW.blue }}>
                <LayoutDashboard size={14} /> Dashboard
              </Link>
              <button onClick={() => setBooking('CRICKET_LANE')}
                className="px-5 py-2 rounded-xl text-sm font-bold text-white hover:opacity-90"
                style={{ background: AW.blue }}>Book Slot →</button>
            </>
          ) : (
            <>
              <Link to="/login" className="px-4 py-2 text-sm font-semibold" style={{ color: AW.t2 }}>Sign In</Link>
              <Link to="/register" className="px-4 py-2 rounded-xl text-sm font-bold border hover:shadow-md"
                style={{ background: AW.dim, borderColor: AW.dbdr, color: AW.blue }}>Register</Link>
              <button onClick={() => setBooking('CRICKET_LANE')}
                className="px-5 py-2 rounded-xl text-sm font-bold text-white hover:opacity-90"
                style={{ background: AW.blue }}>Book Slot →</button>
            </>
          )}
        </div>

        {/* Mobile hamburger */}
        <button className="sm:hidden p-2" onClick={() => setMenuOpen(o => !o)} style={{ color: AW.t2 }}>
          <div className="space-y-1.5">
            <span className="block w-5 h-0.5 bg-current" />
            <span className="block w-5 h-0.5 bg-current" />
            <span className="block w-5 h-0.5 bg-current" />
          </div>
        </button>
      </nav>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="sm:hidden flex-shrink-0 border-b px-5 py-3 space-y-2.5 z-40"
          style={{ background: AW.s, borderColor: AW.bd }}>
          <div className="flex gap-2">
            {NAV_LINKS.map(page => (
              <button key={page} onClick={() => navTo(page)}
                className="flex-1 py-2 rounded-lg text-xs font-bold"
                style={{ background: activePage === page ? AW.dim : 'transparent', color: activePage === page ? AW.blue : AW.t2, border: `1px solid ${activePage === page ? AW.dbdr : AW.bd}` }}>
                {page}
              </button>
            ))}
          </div>
          <button onClick={() => { setBooking('CRICKET_LANE'); setMenuOpen(false) }}
            className="w-full py-2.5 rounded-xl text-sm font-bold text-white" style={{ background: AW.blue }}>
            Book Slot →
          </button>
          {user
            ? <Link to={isAdmin ? '/admin' : '/dashboard'} onClick={() => setMenuOpen(false)}
                className="block text-center py-2.5 rounded-xl text-sm border"
                style={{ background: AW.dim, borderColor: AW.dbdr, color: AW.blue }}>Dashboard</Link>
            : <div className="flex gap-2">
                <Link to="/login" className="flex-1 text-center py-2.5 rounded-xl text-sm border"
                  style={{ background: AW.s, borderColor: AW.bd, color: AW.t2 }}>Sign In</Link>
                <Link to="/register" className="flex-1 text-center py-2.5 rounded-xl text-sm font-bold text-white"
                  style={{ background: AW.blue }}>Register</Link>
              </div>
          }
        </div>
      )}

      {/* ── Page sections — fills remaining height, no scroll ─────────── */}
      {activePage === 'Home'    && <HomeSection    setBooking={setBooking} user={user} sports={SPORTS} courtCounts={courtCounts} onMembershipClick={handleMembershipClick} buyingMembership={buyingMembership} />}
      {activePage === 'About'   && <AboutSection   setBooking={setBooking} sports={SPORTS} courtCounts={courtCounts} />}
      {activePage === 'Contact' && <ContactSection />}

      {booking && <BookingModal initialType={booking} onClose={() => setBooking(null)} />}
    </div>
  )
}
