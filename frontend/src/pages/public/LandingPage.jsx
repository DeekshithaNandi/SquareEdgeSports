import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import BookingModal from '../../components/booking/BookingModal'
import { Zap, Activity, ChevronRight, LayoutDashboard, MapPin, Phone, Mail, Clock, Send, CheckCircle } from 'lucide-react'

/* ── Sport images (Unsplash) ──────────────────────────────────────────────── */
const SPORT_IMAGES = {
  CRICKET_LANE: 'https://images.unsplash.com/photo-1531415074968-036ba1b575da?w=900&q=85',
  BOX_CRICKET:  'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?w=1100&q=85',
  PICKLEBALL:   'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=900&q=85',
}

/* Background action photos */
const BG_CRICKET    = 'https://images.unsplash.com/photo-1531415074968-036ba1b575da?w=1600&q=75'
const BG_PICKLEBALL = 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=1600&q=75'

const SPORTS = [
  {
    key: 'CRICKET_LANE',
    emoji: '🏏',
    name: 'Cricket Lane',
    desc: '8 individual lanes across 2 boxes. Perfect for batting practice and net sessions.',
    price: 500, memberPrice: 400,
    membershipFee: 1500,
    features: ['8 lanes (4 per box)', '55-min sessions', 'BOX A & BOX B'],
    color: 'from-orange-500/20 to-amber-600/10',
    border: 'border-orange-500/25',
    accent: 'text-orange-400',
    pill: 'bg-orange-500/10 border-orange-500/20 text-orange-300',
    badge: 'bg-orange-500',
    badgeLabel: 'LIVE',
  },
  {
    key: 'BOX_CRICKET',
    emoji: '📦',
    name: 'Box Cricket',
    desc: 'Book all 4 lanes of a full box — ideal for team matches and group play.',
    price: 1500, memberPrice: 1200,
    membershipFee: 3000,
    features: ['2 full boxes', 'BOX A or BOX B', 'Up to 6 players'],
    color: 'from-purple-500/20 to-purple-600/10',
    border: 'border-purple-500/25',
    accent: 'text-purple-400',
    pill: 'bg-purple-500/10 border-purple-500/20 text-purple-300',
    badge: 'bg-purple-500',
    badgeLabel: 'POPULAR',
    popular: true,
  },
  {
    key: 'PICKLEBALL',
    emoji: '🏓',
    name: 'Pickleball',
    desc: '3 full-size courts with premium surfaces. Open to all skill levels.',
    price: 500, memberPrice: 400,
    membershipFee: 1500,
    features: ['3 courts', '55-min sessions', 'All skill levels'],
    color: 'from-green-500/20 to-emerald-600/10',
    border: 'border-green-500/25',
    accent: 'text-green-400',
    pill: 'bg-green-500/10 border-green-500/20 text-green-300',
    badge: 'bg-green-500',
    badgeLabel: 'OPEN',
  },
]

const NAV_LINKS = ['Home', 'About', 'Contact']

/* ── Home Section ─────────────────────────────────────────────────────────── */
function HomeSection({ setBooking, user }) {
  return (
    <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">

      {/* ── Left: Hero text ── */}
      <div className="relative lg:w-[42%] flex flex-col justify-center px-8 sm:px-12 lg:px-14 py-8 lg:py-0 overflow-hidden">
        {/* Soft glow blobs */}
        <div className="absolute top-1/3 -left-20 w-64 h-64 bg-orange-600/20 rounded-full blur-[80px] pointer-events-none" />
        <div className="absolute bottom-1/4 left-1/3 w-48 h-48 bg-orange-600/12 rounded-full blur-[60px] pointer-events-none" />

        <div className="relative">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-300 text-[11px] font-semibold mb-5">
            <Activity size={11} /> Hyderabad's Premier Indoor Sports Facility
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-[2.6rem] xl:text-5xl font-extrabold leading-tight mb-4 tracking-tight">
            Book Indoor<br />
            <span className="bg-gradient-to-r from-orange-300 via-amber-300 to-orange-400 bg-clip-text text-transparent">
              Sports Courts
            </span><br />
            Online
          </h1>

          <p className="text-white/55 text-sm sm:text-base leading-relaxed mb-7 max-w-sm">
            Select your sport, pick a time slot — we'll assign your court and notify you. No hassle, instant booking.
          </p>

          <div className="flex flex-wrap gap-2 mb-7">
            {SPORTS.map(s => (
              <button key={s.key} onClick={() => setBooking(s.key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all hover:scale-105 ${s.pill}`}>
                {s.emoji} {s.name}
              </button>
            ))}
          </div>

          <button onClick={() => setBooking('CRICKET_LANE')}
            className="group inline-flex items-center gap-2.5 px-8 py-3.5 rounded-2xl text-base font-bold bg-accent hover:opacity-90 transition-all shadow-2xl shadow-orange-500/25">
            Book a Slot
            <ChevronRight size={18} className="group-hover:translate-x-0.5 transition-transform" />
          </button>

          {!user && (
            <p className="text-white/30 text-xs mt-4">
              No sign-up needed to browse. Sign in only when you're ready to pay.
            </p>
          )}

          {/* Stats */}
          <div className="grid grid-cols-4 gap-3 mt-8">
            {[
              { val: '8',   label: 'Lanes',  emoji: '🏏' },
              { val: '2',   label: 'Boxes',  emoji: '📦' },
              { val: '3',   label: 'Courts', emoji: '🏓' },
              { val: '15h', label: 'Daily',  emoji: '🕖' },
            ].map(s => (
              <div key={s.label} className="bg-white/[0.05] border border-white/[0.09] rounded-xl p-2.5 text-center backdrop-blur-sm">
                <div className="text-base">{s.emoji}</div>
                <div className="text-lg font-extrabold text-orange-300 leading-tight">{s.val}</div>
                <div className="text-[9px] text-white/40 mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Membership plans */}
          <div className="mt-5 rounded-xl border border-orange-500/20 overflow-hidden backdrop-blur-sm">
            <div className="flex items-center justify-between bg-orange-500/[0.07] px-4 py-2.5 border-b border-orange-500/15">
              <span className="text-[10px] font-black uppercase tracking-wider text-orange-400">🎟 Membership Plans</span>
              <span className="px-1.5 py-0.5 rounded text-[9px] bg-orange-500/20 text-orange-300 font-bold border border-orange-500/20">SAVE MORE</span>
            </div>
            <div className="grid grid-cols-3 divide-x divide-white/[0.06]">
              {SPORTS.map(s => (
                <div
                  key={s.key}
                  className="relative overflow-hidden group cursor-pointer"
                  onClick={() => setBooking(s.key)}
                >
                  <div className="absolute inset-0">
                    <img
                      src={SPORT_IMAGES[s.key]}
                      alt={s.name}
                      className="w-full h-full object-cover opacity-[0.14] group-hover:opacity-[0.25] transition-opacity duration-300"
                    />
                  </div>
                  <div className="relative px-2.5 py-3 text-center">
                    <div className="text-lg mb-0.5">{s.emoji}</div>
                    <div className="text-[10px] font-bold text-white/70 mb-1 leading-tight">{s.name}</div>
                    <div className="text-sm font-extrabold text-orange-300 leading-tight">
                      ₹{s.membershipFee}<span className="text-[9px] text-white/30 font-normal">/mo</span>
                    </div>
                    <div className="text-[9px] text-green-400 mt-0.5">
                      Save ₹{s.price - s.memberPrice}/session
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="px-4 py-2 text-[10px] text-white/30 border-t border-white/[0.05]">
              Contact admin to activate membership.
            </div>
          </div>
        </div>
      </div>

      {/* ── Right: THREE sport cards ── */}
      <div className="lg:w-[58%] flex items-stretch px-4 sm:px-6 lg:px-8 py-6 lg:py-8 gap-3 overflow-hidden">
        {SPORTS.map(s => (
          <div
            key={s.key}
            className="flex-1 flex flex-col rounded-2xl overflow-hidden group cursor-pointer border border-white/[0.09] hover:border-orange-500/35 transition-all duration-300"
            style={{ background: 'rgba(21,24,32,0.72)', backdropFilter: 'blur(8px)', minHeight: '320px' }}
            onClick={() => setBooking(s.key)}
          >
            {/* Image section — top ~62% */}
            <div className="relative overflow-hidden flex-shrink-0" style={{ height: '62%' }}>
              <img
                src={SPORT_IMAGES[s.key]}
                alt={s.name}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-in-out group-hover:scale-[1.07]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-b from-black/30 to-transparent" />
              {/* Badge */}
              <span className={`absolute top-3 right-3 text-white text-[9px] font-bold px-2.5 py-1 rounded uppercase tracking-wide shadow ${s.badge}`}>
                {s.badgeLabel}
              </span>
            </div>

            {/* Info block — bottom ~38% — completely separate, no overlap */}
            <div className="flex flex-col flex-1 px-3.5 pt-3 pb-3.5 border-t border-white/[0.08]">
              {/* Sport name */}
              <div className="flex items-center gap-1.5 mb-2">
                <span className="text-lg leading-none">{s.emoji}</span>
                <span className="font-bold text-sm text-white leading-tight">{s.name}</span>
              </div>
              {/* Price — on its own line, clearly below sport name */}
              <div className="flex items-baseline gap-1 mb-1">
                <span className="text-[1.4rem] font-extrabold text-orange-300 leading-none">₹{s.price}</span>
                <span className="text-[11px] text-white/35 font-normal">/session</span>
              </div>
              {/* Member price */}
              <div className={`text-[10px] font-semibold mb-2.5 ${s.accent}`}>
                Members ₹{s.memberPrice}
              </div>
              {/* Features */}
              <div className="flex-1 space-y-1 mb-3">
                {s.features.map(f => (
                  <div key={f} className="flex items-center gap-1.5 text-[10px] text-white/45">
                    <span className="w-1 h-1 rounded-full bg-orange-400/60 flex-shrink-0" />
                    {f}
                  </div>
                ))}
              </div>
              {/* Book button */}
              <button
                className={`w-full py-2 rounded-lg text-xs font-bold border transition-all group-hover:bg-accent group-hover:border-accent group-hover:text-white ${s.pill}`}
                onClick={e => { e.stopPropagation(); setBooking(s.key) }}
              >
                Book Now →
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── About Section ─────────────────────────────────────────────────────────── */
function AboutSection({ setBooking }) {
  const amenities = [
    { icon: '🏟️', title: 'World-Class Facility',  desc: 'Premium indoor infrastructure built to international standards.' },
    { icon: '🌡️', title: 'Climate Controlled',     desc: 'Fully air-conditioned courts for year-round comfortable play.' },
    { icon: '💡', title: 'Pro Lighting',            desc: 'High-lumen LED rigs that eliminate shadows on every court.' },
    { icon: '🚿', title: 'Modern Amenities',        desc: 'Clean changing rooms, lockers, and shower facilities on-site.' },
    { icon: '📱', title: 'Instant Booking',         desc: 'Book in seconds online — no calls, no waiting, instant confirmation.' },
    { icon: '🏆', title: 'For All Skill Levels',    desc: 'Casual players to competitive teams — everyone is welcome.' },
  ]

  const values = [
    { label: 'Founded',  value: '2026' },
    { label: 'Location', value: 'Hyderabad' },
    { label: 'Courts',   value: '13 total' },
    { label: 'Open',     value: '7 AM – 10 PM' },
  ]

  return (
    <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
      {/* Left */}
      <div className="relative lg:w-[45%] flex flex-col justify-center px-8 sm:px-12 lg:px-14 py-8 lg:py-0 overflow-hidden">
        <div className="absolute top-1/4 -left-16 w-72 h-72 bg-orange-600/15 rounded-full blur-[90px] pointer-events-none" />
        <div className="relative">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-300 text-[11px] font-semibold mb-5">
            🏟️ Our Story
          </div>

          <h2 className="text-3xl sm:text-4xl font-extrabold leading-tight mb-5 tracking-tight">
            Hyderabad's Go-To<br />
            <span className="bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">
              Indoor Sports Hub
            </span>
          </h2>

          <p className="text-white/55 text-sm leading-relaxed mb-5">
            SquareEdge Sports was built with one goal — make premium indoor sports accessible to everyone in Hyderabad.
            We started with a single box cricket arena and quickly expanded to Cricket Lanes and Pickleball courts in response
            to the growing demand from our community.
          </p>
          <p className="text-white/40 text-sm leading-relaxed mb-7">
            Every facility is designed for performance — from professional-grade surfaces and lighting to a seamless
            online booking system that keeps hassle out of your game day.
          </p>

          <div className="grid grid-cols-4 gap-3 mb-7">
            {values.map(v => (
              <div key={v.label} className="bg-white/[0.04] border border-white/[0.07] rounded-xl p-3 text-center">
                <div className="text-sm font-extrabold text-orange-300 leading-tight">{v.value}</div>
                <div className="text-[9px] text-white/35 mt-0.5">{v.label}</div>
              </div>
            ))}
          </div>

          <button onClick={() => setBooking('CRICKET_LANE')}
            className="group inline-flex items-center gap-2.5 px-7 py-3 rounded-2xl text-sm font-bold bg-accent hover:opacity-90 transition-all shadow-xl shadow-orange-500/20">
            Book a Session
            <ChevronRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>
      </div>

      {/* Right: Amenities + sport image strip */}
      <div className="lg:w-[55%] flex items-center justify-center px-6 sm:px-10 lg:px-12 py-6 lg:py-8 overflow-hidden">
        <div className="w-full max-w-xl lg:max-w-none">
          <div className="text-[10px] font-bold text-muted uppercase tracking-wider mb-4">What We Offer</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-3">
            {amenities.map(a => (
              <div key={a.title}
                className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-4 hover:bg-white/[0.05] hover:border-white/[0.12] transition-all">
                <div className="text-2xl mb-2.5">{a.icon}</div>
                <div className="text-sm font-bold mb-1">{a.title}</div>
                <p className="text-white/40 text-[11px] leading-relaxed">{a.desc}</p>
              </div>
            ))}
          </div>

          {/* Sport image strip with prices */}
          <div className="mt-4 flex gap-2 h-24">
            {SPORTS.map(s => (
              <div
                key={s.key}
                className="flex-1 relative rounded-xl overflow-hidden group cursor-pointer"
                onClick={() => setBooking(s.key)}
              >
                <img
                  src={SPORT_IMAGES[s.key]}
                  alt={s.name}
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />
                <div className="absolute bottom-2 left-0 right-0 text-center">
                  <div className="text-[10px] font-bold text-white">{s.name}</div>
                  <div className="text-[9px] text-white/40">₹{s.price}/session</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Contact Section ─────────────────────────────────────────────────────────── */
function ContactSection() {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' })
  const [sent, setSent] = useState(false)

  const handleSubmit = e => {
    e.preventDefault()
    if (!form.name || !form.email || !form.message) return
    setSent(true)
  }

  const details = [
    { icon: MapPin, label: 'Address',  value: 'SquareEdge Sports Arena, Hyderabad, Telangana – 500001', color: 'text-orange-400' },
    { icon: Phone,  label: 'Phone',    value: '+91 9908677056',    color: 'text-green-400'  },
    { icon: Mail,   label: 'Email',    value: 'deekshithalakshmi2@gmail.com', color: 'text-blue-400' },
    { icon: Clock,  label: 'Hours',    value: 'Mon – Sun  ·  7:00 AM – 10:00 PM', color: 'text-orange-400' },
  ]

  return (
    <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
      {/* Left: Info */}
      <div className="relative lg:w-[42%] flex flex-col justify-center px-8 sm:px-12 lg:px-14 py-8 lg:py-0 overflow-hidden">
        <div className="absolute bottom-1/3 -left-16 w-64 h-64 bg-orange-600/15 rounded-full blur-[80px] pointer-events-none" />
        <div className="relative">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-300 text-[11px] font-semibold mb-5">
            📍 Find Us
          </div>

          <h2 className="text-3xl sm:text-4xl font-extrabold leading-tight mb-4 tracking-tight">
            Get In <span className="bg-gradient-to-r from-orange-400 to-orange-300 bg-clip-text text-transparent">Touch</span>
          </h2>
          <p className="text-white/45 text-sm leading-relaxed mb-8">
            Questions about bookings, memberships, or events? We're open every day and happy to help.
          </p>

          <div className="space-y-4">
            {details.map(d => (
              <div key={d.label} className="flex items-start gap-4 bg-white/[0.03] border border-white/[0.07] rounded-xl p-4">
                <div className={`mt-0.5 flex-shrink-0 ${d.color}`}>
                  <d.icon size={16} />
                </div>
                <div>
                  <div className="text-[10px] font-bold text-muted uppercase tracking-wider mb-0.5">{d.label}</div>
                  <div className="text-sm font-semibold">{d.value}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5 h-24 rounded-xl bg-white/[0.03] border border-white/[0.07] flex items-center justify-center">
            <span className="text-[11px] text-muted">📍 Hyderabad, Telangana</span>
          </div>
        </div>
      </div>

      {/* Right: Contact form */}
      <div className="lg:w-[58%] flex items-center justify-center px-6 sm:px-10 lg:px-12 py-6 lg:py-8 overflow-hidden">
        <div className="w-full max-w-lg">
          {sent ? (
            <div className="flex flex-col items-center justify-center text-center py-16 gap-4">
              <CheckCircle size={48} className="text-green-400" />
              <div className="text-xl font-bold">Message Sent!</div>
              <p className="text-white/45 text-sm max-w-xs">
                Thanks for reaching out. Our team will get back to you within 24 hours.
              </p>
              <button onClick={() => { setSent(false); setForm({ name: '', email: '', subject: '', message: '' }) }}
                className="mt-2 px-6 py-2.5 rounded-xl text-sm font-bold bg-white/5 border border-white/10 hover:bg-white/10 transition-all">
                Send Another
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="text-lg font-bold mb-1">Send us a message</div>
              <p className="text-white/40 text-xs mb-5">We read every message and respond within one business day.</p>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-muted uppercase tracking-wider block mb-1.5">Your Name *</label>
                  <input
                    value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="John Smith"
                    className="w-full bg-white/[0.05] border border-white/[0.10] rounded-xl px-3.5 py-2.5 text-sm text-white outline-none focus:border-orange-500/50 transition-all placeholder:text-white/20" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-muted uppercase tracking-wider block mb-1.5">Email Address *</label>
                  <input
                    type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    placeholder="you@email.com"
                    className="w-full bg-white/[0.05] border border-white/[0.10] rounded-xl px-3.5 py-2.5 text-sm text-white outline-none focus:border-orange-500/50 transition-all placeholder:text-white/20" />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-muted uppercase tracking-wider block mb-1.5">Subject</label>
                <input
                  value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
                  placeholder="Booking enquiry, membership, events…"
                  className="w-full bg-white/[0.05] border border-white/[0.10] rounded-xl px-3.5 py-2.5 text-sm text-white outline-none focus:border-orange-500/50 transition-all placeholder:text-white/20" />
              </div>

              <div>
                <label className="text-[10px] font-bold text-muted uppercase tracking-wider block mb-1.5">Message *</label>
                <textarea
                  rows={5} value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                  placeholder="Tell us how we can help…"
                  className="w-full bg-white/[0.05] border border-white/[0.10] rounded-xl px-3.5 py-2.5 text-sm text-white outline-none focus:border-orange-500/50 transition-all placeholder:text-white/20 resize-none" />
              </div>

              <button type="submit"
                className="group w-full flex items-center justify-center gap-2.5 py-3.5 rounded-2xl text-sm font-bold bg-accent hover:opacity-90 transition-all shadow-xl shadow-orange-500/20 disabled:opacity-50"
                disabled={!form.name || !form.email || !form.message}>
                Send Message
                <Send size={14} className="group-hover:translate-x-0.5 transition-transform" />
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

/* ── Main LandingPage ────────────────────────────────────────────────────────── */
export default function LandingPage() {
  const { user } = useAuth()
  const [booking,    setBooking]    = useState(null)
  const [menuOpen,   setMenuOpen]   = useState(false)
  const [activePage, setActivePage] = useState('Home')

  const isAdmin = user && ['SUPER_ADMIN', 'ADMINISTRATOR', 'EMPLOYEE'].includes(user.role)

  const navTo = page => { setActivePage(page); setMenuOpen(false) }

  return (
    <div className="h-screen overflow-hidden bg-bg text-white font-sans flex flex-col">

      {/* ── Navbar ─────────────────────────────────────────────────────────── */}
      <nav className="flex-shrink-0 h-16 flex items-center justify-between px-6 sm:px-10 border-b border-white/[0.07] bg-bg/95 backdrop-blur-xl z-50">

        {/* Logo */}
        <button onClick={() => navTo('Home')} className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-lg">
            <Zap size={16} className="text-white" />
          </div>
          <span className="font-bold text-lg tracking-tight">
            <span className="text-orange-400">Square</span>Edge<span className="text-orange-400">Sports</span>
          </span>
        </button>

        {/* Desktop nav */}
        <div className="hidden sm:flex items-center gap-1">
          {NAV_LINKS.map(page => (
            <button key={page} onClick={() => navTo(page)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                activePage === page
                  ? 'text-accent bg-accent/10'
                  : 'text-white/50 hover:text-white hover:bg-white/5'
              }`}>
              {page}
            </button>
          ))}
        </div>

        {/* Desktop auth */}
        <div className="hidden sm:flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 text-[10px] font-bold">
            <Activity size={10} /> OPEN 7AM–10PM
          </div>
          {user ? (
            <>
              <Link to={isAdmin ? '/admin' : '/dashboard'}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-orange-300 hover:text-orange-200 transition-colors">
                <LayoutDashboard size={14} /> Dashboard
              </Link>
              <button onClick={() => setBooking('CRICKET_LANE')}
                className="px-5 py-2 rounded-xl text-sm font-bold bg-accent hover:opacity-90 transition-all shadow-lg">
                Book Slot →
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="px-4 py-2 text-sm font-semibold text-white/60 hover:text-white transition-colors">Sign In</Link>
              <Link to="/register" className="px-4 py-2 rounded-xl text-sm font-bold bg-white/[0.07] border border-white/[0.12] hover:bg-white/[0.12] transition-all">Register</Link>
              <button onClick={() => setBooking('CRICKET_LANE')}
                className="px-5 py-2 rounded-xl text-sm font-bold bg-accent hover:opacity-90 transition-all shadow-lg">
                Book Slot →
              </button>
            </>
          )}
        </div>

        {/* Mobile hamburger */}
        <button className="sm:hidden p-2 text-white/60 hover:text-white" onClick={() => setMenuOpen(o => !o)}>
          <div className="space-y-1.5">
            <span className="block w-5 h-0.5 bg-current" />
            <span className="block w-5 h-0.5 bg-current" />
            <span className="block w-5 h-0.5 bg-current" />
          </div>
        </button>
      </nav>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="sm:hidden flex-shrink-0 bg-bg border-b border-white/[0.07] px-6 py-4 space-y-3 z-40">
          <div className="flex gap-2 pb-2 border-b border-white/[0.07]">
            {NAV_LINKS.map(page => (
              <button key={page} onClick={() => navTo(page)}
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                  activePage === page ? 'bg-orange-500/15 text-orange-300' : 'bg-white/5 text-muted'
                }`}>
                {page}
              </button>
            ))}
          </div>
          <button onClick={() => { setBooking('CRICKET_LANE'); setMenuOpen(false) }}
            className="w-full py-3 rounded-xl text-sm font-bold bg-accent text-white">
            Book Slot →
          </button>
          {user
            ? <Link to={isAdmin ? '/admin' : '/dashboard'} className="block text-center py-2.5 rounded-xl text-sm bg-white/5 border border-white/10">Dashboard</Link>
            : <div className="flex gap-3">
                <Link to="/login" className="flex-1 text-center py-2.5 rounded-xl text-sm bg-white/5 border border-white/10">Sign In</Link>
                <Link to="/register" className="flex-1 text-center py-2.5 rounded-xl text-sm bg-accent font-bold text-white">Register</Link>
              </div>
          }
        </div>
      )}

      {/* ── Page Sections ──────────────────────────────────────────────────── */}
      {activePage === 'Home'    && <HomeSection    setBooking={setBooking} user={user} />}
      {activePage === 'About'   && <AboutSection   setBooking={setBooking} />}
      {activePage === 'Contact' && <ContactSection />}

      {/* ── Booking Modal ──────────────────────────────────────────────────── */}
      {booking && <BookingModal initialType={booking} onClose={() => setBooking(null)} />}
    </div>
  )
}
