import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../../context/AuthContext'
import BookingModal from '../../components/booking/BookingModal'
import { Zap, ChevronRight,ChevronDown, LayoutDashboard, MapPin, Phone, Mail, Clock, Send, CheckCircle, Loader, Star, Users, ShieldCheck, Sparkles, Menu, X } from 'lucide-react'
import { publicAPI, userAPI } from '../../api'
import toast from 'react-hot-toast'

/* ── Premium design tokens (scoped to this page only) ────────────────────── */
const T = {
  bg:      '#F6F8FF',
  ink:     '#0B1120',
  sub:     '#4B5875',
  faint:   '#8891AC',
  line:    'rgba(15,23,42,0.08)',
  glass:   'rgba(255,255,255,0.66)',
  glassBd: 'rgba(255,255,255,0.55)',
  p1:      '#3D5AFE',   // vivid blue
  p2:      '#6C5CE7',   // indigo
  grad:    'linear-gradient(135deg,#3D5AFE 0%,#6C5CE7 100%)',
  gradTxt: 'linear-gradient(135deg,#3D5AFE 0%,#8B5CF6 100%)',
  font:    "'Plus Jakarta Sans', 'Barlow', sans-serif",
}

const SPORT_IMAGES = {
  CRICKET_LANE: 'images/cricket-lane.jpeg',
  BOX_CRICKET:  'images/box-cricket.jpeg',
  PICKLEBALL:   'images/pickleball.jpeg',
}

const NAV_LINKS = [
  { label: 'Home', id: 'home' },
  { label: 'Sports', id: 'sports' },
  { label: 'Membership', id: 'membership' },
  { label: 'About', id: 'about' },
  { label: 'Contact', id: 'contact' },
]

/** Live pricing hasn't loaded yet — show a neutral placeholder instead of a stale/wrong number. */
const fmtPrice = v => v == null ? '···' : v

const makeSports = (counts, pricing = {}) => [
  {
    key: 'CRICKET_LANE', emoji: '🏏', name: 'Cricket Lane',
    desc: `${counts.CRICKET_LANE} individual lanes. Perfect for batting practice and net sessions.`,
    price: pricing.CRICKET_LANE ?? null, memberPrice: pricing.CRICKET_LANE_MEMBER ?? null, membershipFee: pricing.CRICKET_LANE_MEMBERSHIP ?? null,
    features: [`${counts.CRICKET_LANE} lanes`, '55-min sessions', 'Up to 6 players/lane'],
    badgeLabel: 'LIVE', badgeBg: T.p1,
  },
  {
    key: 'BOX_CRICKET', emoji: '📦', name: 'Box Cricket',
    desc: `${counts.BOX_CRICKET} independent courts for competitive box cricket matches and group play.`,
    price: pricing.BOX_CRICKET ?? null, memberPrice: pricing.BOX_CRICKET_MEMBER ?? null, membershipFee: pricing.BOX_CRICKET_MEMBERSHIP ?? null,
    features: [`${counts.BOX_CRICKET} courts`, '55-min sessions', 'Up to 12 players/court'],
    badgeLabel: 'POPULAR', badgeBg: '#16a34a',
  },
  {
    key: 'PICKLEBALL', emoji: '🏓', name: 'Pickleball',
    desc: `${counts.PICKLEBALL} full-size courts with premium surfaces. Open to all skill levels.`,
    price: pricing.PICKLEBALL ?? null, memberPrice: pricing.PICKLEBALL_MEMBER ?? null, membershipFee: pricing.PICKLEBALL_MEMBERSHIP ?? null,
    features: [`${counts.PICKLEBALL} courts`, '55-min sessions', 'Up to 4 players/court', 'All skill levels'],
    badgeLabel: 'OPEN NOW', badgeBg: '#d97706',
  },
]

const fadeUp = {
  hidden: { opacity: 0, y: 22 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } },
}
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.09 } } }

function Reveal({ children, className, delay = 0 }) {
  return (
    <motion.div className={className} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.2 }}
      variants={{ hidden: { opacity: 0, y: 22 }, show: { opacity: 1, y: 0, transition: { duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] } } }}>
      {children}
    </motion.div>
  )
}

/* ── Glass search / availability widget ──────────────────────────────────── */
function SearchWidget({ sports, onBook }) {
  const [sport, setSport]     = useState('CRICKET_LANE')
  const [date, setDate]       = useState('')
  const [time, setTime]       = useState('')
  const [players, setPlayers] = useState('2')

  return (
    <motion.div variants={fadeUp}
      className="w-full max-w-3xl mx-auto rounded-3xl p-3 sm:p-4 grid grid-cols-2 sm:grid-cols-12 gap-2.5 items-center"
      style={{ background: T.glass, backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', border: `1px solid ${T.glassBd}`, boxShadow: '0 20px 50px rgba(61,90,254,0.14)' }}>
      <div className="col-span-1 sm:col-span-3 px-3 py-2">
        <label className="block text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: T.faint }}>Sport</label>
        <div className="relative">
          <select value={sport} onChange={e => setSport(e.target.value)}
            className="w-full bg-transparent text-sm font-semibold outline-none appearance-none pr-5" style={{ color: T.ink }}>
            {sports.map(s => <option key={s.key} value={s.key}>{s.emoji} {s.name}</option>)}
          </select>
          <ChevronDown size={14} className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2" style={{ color: T.faint }} />
        </div>
      </div>
      <div className="col-span-1 sm:col-span-3 px-3 py-2 sm:border-l" style={{ borderColor: T.line }}>
        <label className="block text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: T.faint }}>Date</label>
        <input type="date" value={date} onChange={e => setDate(e.target.value)}
          className="w-full bg-transparent text-sm font-semibold outline-none" style={{ color: T.ink }} />
      </div>
      <div className="col-span-1 sm:col-span-2 px-3 py-2 sm:border-l" style={{ borderColor: T.line }}>
        <label className="block text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: T.faint }}>Time</label>
        <input type="time" value={time} onChange={e => setTime(e.target.value)}
          className="w-full bg-transparent text-sm font-semibold outline-none" style={{ color: T.ink }} />
      </div>
      <div className="col-span-1 sm:col-span-2 px-3 py-2 sm:border-l" style={{ borderColor: T.line }}>
      <label className="block text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: T.faint }}>Players</label>
        <div className="relative">
          <select value={players} onChange={e => setPlayers(e.target.value)}
            className="w-full bg-transparent text-sm font-semibold outline-none appearance-none pr-5" style={{ color: T.ink }}>
            {[1, 2, 3, 4, 5, 6].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
          <ChevronDown size={14} className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2" style={{ color: T.faint }} />
        </div>
      </div>
      <button onClick={() => onBook(sport, date)}
        className="col-span-2 sm:col-span-2 flex items-center justify-center gap-1.5 py-3 rounded-2xl text-sm font-bold text-white transition-transform hover:scale-[1.02] active:scale-[0.98]"
        style={{ background: T.grad, boxShadow: '0 10px 25px rgba(61,90,254,0.35)' }}>
        Check Availability <ChevronRight size={15} />
    </button>
    </motion.div>
  )
}

/* ── Hero ─────────────────────────────────────────────────────────────────── */
function Hero({ sports, courtCounts, onBook, user }) {
  const stats = [
    { icon: Star, val: '4.8/5', label: 'Member Rated', tint: '#F59E0B' },
    { icon: Users, val: '2,400+', label: 'Active Players', tint: '#3D5AFE' },
    { icon: ShieldCheck, val: `${(courtCounts.CRICKET_LANE ?? 0) + (courtCounts.BOX_CRICKET ?? 0) + (courtCounts.PICKLEBALL ?? 0) || 13}`, label: 'Live Courts', tint: '#16a34a' },
  ]
  return (
    <section id="home" className="relative pt-28 sm:pt-36 pb-20 sm:pb-28 px-5 sm:px-10 overflow-hidden">
      {/* ambient gradient glows */}
      <div className="pointer-events-none absolute -top-32 -right-24 w-[420px] h-[420px] rounded-full opacity-40 blur-3xl"
        style={{ background: 'radial-gradient(circle,#8B5CF6 0%,transparent 70%)' }} />
      <div className="pointer-events-none absolute top-40 -left-32 w-[360px] h-[360px] rounded-full opacity-30 blur-3xl"
        style={{ background: 'radial-gradient(circle,#3D5AFE 0%,transparent 70%)' }} />

      <motion.div className="relative max-w-6xl mx-auto text-center" initial="hidden" animate="show" variants={stagger}>
        <motion.div variants={fadeUp} className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold mb-6"
          style={{ background: T.glass, border: `1px solid ${T.glassBd}`, color: T.p1, backdropFilter: 'blur(12px)' }}>
          <Sparkles size={13} /> Open 7AM – 10PM · Every day
        </motion.div>

        <motion.h1 variants={fadeUp} className="font-extrabold tracking-tight leading-[1.05] mb-5"
          style={{ fontSize: 'clamp(2.4rem, 6vw, 4rem)', color: T.ink }}>
          Book <span style={{ background: T.gradTxt, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>Indoor Sports</span><br />
          in Seconds.
        </motion.h1>

        <motion.p variants={fadeUp} className="text-base sm:text-lg max-w-xl mx-auto mb-8" style={{ color: T.sub }}>
          Pick your sport and time — we'll assign the court and confirm instantly. No calls, no waiting.
        </motion.p>

        <motion.div variants={fadeUp} className="flex flex-wrap items-center justify-center gap-3 mb-6">
          <button onClick={() => onBook('CRICKET_LANE')}
            className="group inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl text-sm font-bold text-white transition-transform hover:scale-[1.03] active:scale-[0.98]"
            style={{ background: T.grad, boxShadow: '0 14px 32px rgba(61,90,254,0.38)' }}>
            Book a Slot
            <ChevronRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
          </button>
          <a href="#sports"
            className="inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl text-sm font-bold transition-all hover:shadow-md"
            style={{ background: T.glass, border: `1px solid ${T.glassBd}`, color: T.ink, backdropFilter: 'blur(12px)' }}>
            Explore Sports
          </a>
        </motion.div>

        {!user && (
          <motion.p variants={fadeUp} className="text-xs mb-10" style={{ color: T.faint }}>
            No sign-up needed to browse. Sign in only when you're ready to pay.
          </motion.p>
        )}

        <SearchWidget sports={sports} onBook={onBook} />

        {/* Floating stat cards */}
        <motion.div variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.4 }}
          className="mt-14 grid grid-cols-3 gap-3 sm:gap-5 max-w-2xl mx-auto">
          {stats.map(s => (
            <motion.div key={s.label} variants={fadeUp}
              className="rounded-2xl p-4 sm:p-5 text-left"
              style={{ background: T.glass, border: `1px solid ${T.glassBd}`, backdropFilter: 'blur(14px)', boxShadow: '0 12px 30px rgba(15,23,42,0.06)' }}>
              <div className="w-8 h-8 rounded-xl flex items-center justify-center mb-2.5" style={{ background: `${s.tint}1A` }}>
                <s.icon size={15} style={{ color: s.tint }} />
              </div>
              <div className="text-lg sm:text-xl font-extrabold leading-none" style={{ color: T.ink }}>{s.val}</div>
              <div className="text-[11px] mt-1" style={{ color: T.faint }}>{s.label}</div>
            </motion.div>
          ))}
        </motion.div>
      </motion.div>
    </section>
  )
}

/* ── Sports section ───────────────────────────────────────────────────────── */
function SportsSection({ sports, onBook }) {
  return (
    <section id="sports" className="px-5 sm:px-10 py-20 sm:py-24">
      <div className="max-w-6xl mx-auto">
        <Reveal className="text-center max-w-xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-bold mb-4"
            style={{ background: `${T.p1}14`, color: T.p1 }}>SPORTS &amp; PRICING</div>
          <h2 className="font-extrabold tracking-tight mb-3" style={{ fontSize: 'clamp(1.8rem,3.5vw,2.25rem)', color: T.ink }}>
            Choose your court
          </h2>
          <p className="text-sm sm:text-base" style={{ color: T.sub }}>Transparent, per-session pricing. Members always pay less.</p>
        </Reveal>

        <motion.div initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.15 }} variants={stagger}
          className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {sports.map(s => (
            <motion.div key={s.key} variants={fadeUp}
              className="group rounded-3xl overflow-hidden cursor-pointer transition-all hover:-translate-y-1"
              style={{ background: '#fff', border: `1px solid ${T.line}`, boxShadow: '0 10px 30px rgba(15,23,42,0.06)' }}
              onClick={() => onBook(s.key)}>
              <div className="relative overflow-hidden" style={{ height: '150px' }}>
                <img src={SPORT_IMAGES[s.key]} alt={s.name}
                  loading="lazy"
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.08]" />
                <div className="absolute inset-0" style={{ background: 'linear-gradient(to top,rgba(11,17,32,.75) 0%,transparent 60%)' }} />
                <span className="absolute top-3 right-3 text-white text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wide"
                  style={{ background: s.badgeBg }}>{s.badgeLabel}</span>
                <span className="absolute bottom-3 left-4 text-lg font-bold text-white drop-shadow">{s.emoji} {s.name}</span>
              </div>
              <div className="p-5">
                <p className="text-xs leading-relaxed mb-3" style={{ color: T.sub }}>{s.desc}</p>
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {s.features.map(f => (
                    <span key={f} className="text-[10px] font-medium px-2 py-1 rounded-full" style={{ background: '#F1F4FF', color: T.p1 }}>{f}</span>
                  ))}
                </div>
                <div className="flex items-center justify-between pt-3" style={{ borderTop: `1px solid ${T.line}` }}>
                  <div>
                    <div className="text-lg font-extrabold leading-none" style={{ color: T.ink }}>
                      ${fmtPrice(s.price)}<span className="text-[10px] font-normal" style={{ color: T.faint }}>/session</span>
                    </div>
                    <div className="text-[10px] mt-1" style={{ color: T.faint }}>Members <b style={{ color: T.p1 }}>${fmtPrice(s.memberPrice)}</b></div>
                  </div>
                  <button
                    className="text-xs font-bold px-4 py-2 rounded-xl text-white transition-transform group-hover:scale-105"
                    style={{ background: T.grad }}
                    onClick={e => { e.stopPropagation(); onBook(s.key) }}>
                    Book →
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}

/* ── Membership section ──────────────────────────────────────────────────── */
function MembershipSection({ sports, onMembershipClick, buyingMembership }) {
  return (
    <section id="membership" className="px-5 sm:px-10 py-20 sm:py-24">
      <div className="max-w-6xl mx-auto rounded-[2rem] overflow-hidden relative"
        style={{ background: 'linear-gradient(135deg,#0B1120 0%,#1B2450 60%,#3D2E7A 100%)' }}>
        <div className="pointer-events-none absolute -top-20 -right-20 w-80 h-80 rounded-full opacity-30 blur-3xl"
          style={{ background: 'radial-gradient(circle,#6C5CE7 0%,transparent 70%)' }} />
        <div className="relative px-6 sm:px-12 py-14">
          <Reveal className="text-center max-w-xl mx-auto mb-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-bold mb-4"
              style={{ background: 'rgba(255,255,255,0.12)', color: '#C9D4FF' }}>🎟 MEMBERSHIP PLANS</div>
            <h2 className="font-extrabold tracking-tight mb-3 text-white" style={{ fontSize: 'clamp(1.8rem,3.5vw,2.25rem)' }}>
              Play more, pay less
            </h2>
            <p className="text-sm sm:text-base" style={{ color: '#AEB8DC' }}>Monthly membership unlocks discounted rates on every session. Contact admin to activate.</p>
          </Reveal>

          <motion.div initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.2 }} variants={stagger}
            className="grid sm:grid-cols-3 gap-4">
            {sports.map(s => {
              const buying = buyingMembership === s.key
              return (
                <motion.button key={s.key} variants={fadeUp} disabled={buying}
                  onClick={() => onMembershipClick?.(s)}
                  className="relative overflow-hidden rounded-2xl text-left transition-transform hover:-translate-y-1 disabled:opacity-70 disabled:cursor-wait"
                  style={{ border: '1px solid rgba(255,255,255,0.14)' }}>
                  <div className="absolute inset-0">
                    <img src={SPORT_IMAGES[s.key]} alt={s.name} loading="lazy"
                      className="w-full h-full object-cover" style={{ filter: 'brightness(0.42)' }} />
                  </div>
                  <div className="relative p-5">
                    <div className="text-2xl mb-2">{s.emoji}</div>
                    <div className="text-sm font-bold text-white mb-1">{s.name}</div>
                    <div className="text-xl font-extrabold text-white">
                      ${fmtPrice(s.membershipFee)}<span className="text-xs font-normal text-white/60">/mo</span>
                    </div>
                    {s.price != null && s.memberPrice != null && (
                      <div className="text-[11px] mt-1 font-semibold" style={{ color: '#7CE0A8' }}>save ${s.price - s.memberPrice}/session</div>
                    )}
                    <div className="mt-3 inline-flex items-center gap-1 text-[11px] font-bold text-white/80">
                      {buying ? 'Processing…' : 'Get membership'} <ChevronRight size={12} />
                    </div>
                  </div>
                </motion.button>
              )
            })}
          </motion.div>
        </div>
      </div>
    </section>
  )
}

/* ── About section ────────────────────────────────────────────────────────── */
function AboutSection({ sports, courtCounts }) {
  const amenities = [
    { icon: '🏟️', title: 'World-Class Facility', desc: 'Premium indoor infrastructure built to international standards.' },
    { icon: '🌡️', title: 'Climate Controlled', desc: 'Fully air-conditioned courts for year-round comfortable play.' },
    { icon: '💡', title: 'Pro Lighting', desc: 'High-lumen LED rigs that eliminate shadows on every court.' },
    { icon: '🚿', title: 'Modern Amenities', desc: 'Clean changing rooms, lockers, and shower facilities on-site.' },
    { icon: '📱', title: 'Instant Booking', desc: 'Book in seconds — no calls, no waiting, instant confirmation.' },
    { icon: '🏆', title: 'For All Skill Levels', desc: 'Casual players to competitive teams — everyone is welcome.' },
  ]
  const values = [
    { label: 'Founded', value: '2026' },
    { label: 'Location', value: 'Hyderabad' },
    { label: 'Courts', value: `${(courtCounts.CRICKET_LANE ?? 0) + (courtCounts.BOX_CRICKET ?? 0) + (courtCounts.PICKLEBALL ?? 0) || 13} total` },
    { label: 'Open', value: '7AM–10PM' },
  ]
  return (
    <section id="about" className="px-5 sm:px-10 py-20 sm:py-24">
      <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
        <Reveal>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-bold mb-4"
            style={{ background: `${T.p1}14`, color: T.p1 }}>🏟️ OUR STORY</div>
          <h2 className="font-extrabold tracking-tight leading-tight mb-4" style={{ fontSize: 'clamp(1.8rem,3.5vw,2.25rem)', color: T.ink }}>
            Hyderabad's go-to<br /><span style={{ color: T.p1 }}>indoor sports hub</span>
          </h2>
          <p className="text-sm leading-relaxed mb-3" style={{ color: T.sub }}>
            SquareEdge Sports was built with one goal — make premium indoor sports accessible to everyone in Hyderabad.
            We started with a single box cricket arena and quickly expanded to Cricket Lanes and Pickleball courts.
          </p>
          <p className="text-sm leading-relaxed mb-6" style={{ color: T.faint }}>
            Every facility is designed for performance — from professional-grade surfaces and lighting to a seamless online booking system.
          </p>
          <div className="grid grid-cols-4 gap-2.5">
            {values.map(v => (
              <div key={v.label} className="rounded-2xl p-3 text-center" style={{ background: '#fff', border: `1px solid ${T.line}` }}>
                <div className="text-sm font-extrabold" style={{ color: T.p1 }}>{v.value}</div>
                <div className="text-[9px] mt-0.5" style={{ color: T.faint }}>{v.label}</div>
              </div>
            ))}
          </div>
        </Reveal>

        <div>
          <motion.div initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.15 }} variants={stagger}
            className="grid grid-cols-2 gap-3 mb-3">
            {amenities.map(a => (
              <motion.div key={a.title} variants={fadeUp} className="rounded-2xl p-4"
                style={{ background: '#fff', border: `1px solid ${T.line}` }}>
                <div className="text-lg mb-1.5">{a.icon}</div>
                <div className="text-xs font-bold mb-1" style={{ color: T.ink }}>{a.title}</div>
                <p className="text-[10px] leading-relaxed" style={{ color: T.sub }}>{a.desc}</p>
              </motion.div>
            ))}
          </motion.div>
          <div className="flex gap-2.5 h-20">
            {sports.map(s => (
              <div key={s.key} className="flex-1 relative rounded-xl overflow-hidden">
                <img src={SPORT_IMAGES[s.key]} alt={s.name} loading="lazy" className="absolute inset-0 w-full h-full object-cover" />
                <div className="absolute inset-0" style={{ background: 'linear-gradient(to top,rgba(11,17,32,.8) 0%,transparent 60%)' }} />
                <div className="absolute bottom-2 left-0 right-0 text-center">
                  <div className="text-[10px] font-bold text-white">{s.name}</div>
                  <div className="text-[9px] text-white/60">${fmtPrice(s.price)}/session</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

/* ── Contact section ─────────────────────────────────────────────────────── */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const isValidEmail = email => EMAIL_RE.test(email.trim())

function ContactSection() {
  const [form,    setForm]    = useState({ name: '', email: '', subject: '', message: '' })
  const [sent,    setSent]    = useState(false)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')
  const emailTouched = form.email.trim().length > 0
  const emailError = emailTouched && !isValidEmail(form.email) ? 'Enter a valid email address.' : ''
  const canSend = form.name.trim() && isValidEmail(form.email) && form.message.trim() && !loading

  const handleSubmit = async e => {
    e.preventDefault()
    const payload = {
      name: form.name.trim(),
      email: form.email.trim(),
      subject: form.subject.trim(),
      message: form.message.trim(),
    }
    if (!payload.name || !payload.email || !payload.message) return
    if (!isValidEmail(payload.email)) {
      setError('Please enter a valid email address.')
      return
    }
    setLoading(true); setError('')
    try {
      await publicAPI.contact(payload)
      setSent(true)
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to send message. Please try again.')
    } finally { setLoading(false) }
  }

  const details = [
    { icon: MapPin, label: 'Address', value: 'SquareEdge Sports Arena, Hyderabad, Telangana – 500001' },
    { icon: Phone,  label: 'Phone',   value: '+91 9908677056' },
    { icon: Mail,   label: 'Email',   value: 'deekshithalakshmi2@gmail.com' },
    { icon: Clock,  label: 'Hours',   value: 'Mon – Sun  ·  7:00 AM – 10:00 PM' },
  ]
  const inp = "w-full rounded-xl px-3.5 py-2.5 text-sm outline-none transition-all border"
  const ist = { background: '#fff', borderColor: T.line, color: T.ink }

  return (
    <section id="contact" className="px-5 sm:px-10 py-20 sm:py-24">
      <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-12">
        <Reveal>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-bold mb-4"
            style={{ background: `${T.p1}14`, color: T.p1 }}>📍 FIND US</div>
          <h2 className="font-extrabold tracking-tight mb-3" style={{ fontSize: 'clamp(1.8rem,3.5vw,2.25rem)', color: T.ink }}>
            Get in <span style={{ color: T.p1 }}>touch</span>
          </h2>
          <p className="text-sm leading-relaxed mb-6" style={{ color: T.sub }}>
            Questions about bookings, memberships, or events? We're open every day and happy to help.
          </p>
          <div className="space-y-2.5">
            {details.map(d => (
              <div key={d.label} className="flex items-start gap-3 rounded-2xl p-4" style={{ background: '#fff', border: `1px solid ${T.line}` }}>
                <div className="mt-0.5 flex-shrink-0" style={{ color: T.p1 }}><d.icon size={15} /></div>
                <div>
                  <div className="text-[9px] font-bold uppercase tracking-wider mb-0.5" style={{ color: T.faint }}>{d.label}</div>
                  <div className="text-xs font-semibold" style={{ color: T.ink }}>{d.value}</div>
                </div>
              </div>
            ))}
          </div>
        </Reveal>

        <Reveal delay={0.1}>
          <div className="rounded-3xl p-6 sm:p-8" style={{ background: '#fff', border: `1px solid ${T.line}`, boxShadow: '0 10px 30px rgba(15,23,42,0.06)' }}>
            {sent ? (
              <div className="flex flex-col items-center justify-center text-center py-12 gap-4">
                <CheckCircle size={44} style={{ color: '#16a34a' }} />
                <div className="text-xl font-bold" style={{ color: T.ink }}>Message Sent!</div>
                <p className="text-sm max-w-xs" style={{ color: T.sub }}>Thanks! Our team will get back to you within 24 hours.</p>
                <button onClick={() => { setSent(false); setError(''); setForm({ name: '', email: '', subject: '', message: '' }) }}
                  className="mt-1 px-6 py-2.5 rounded-xl text-sm font-bold border"
                  style={{ background: '#fff', borderColor: T.line, color: T.ink }}>Send Another</button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-3.5">
                <div className="text-base font-bold" style={{ color: T.ink }}>Send us a message</div>
                <p className="text-xs" style={{ color: T.sub }}>We respond within one business day.</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{ color: T.faint }}>Name *</label>
                    <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                      placeholder="John Smith" className={inp} style={ist} required />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{ color: T.faint }}>Email *</label>
                    <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                      placeholder="you@email.com" className={inp} style={ist} required aria-invalid={!!emailError} />
                    {emailError && <p className="text-[10px] mt-1" style={{ color: '#dc2626' }}>{emailError}</p>}
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{ color: T.faint }}>Subject</label>
                  <input value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
                    placeholder="Booking enquiry, membership…" className={inp} style={ist} />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{ color: T.faint }}>Message *</label>
                  <textarea rows={4} value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                    placeholder="Tell us how we can help…" className={`${inp} resize-none`} style={ist} maxLength={300} />
                  <p className="text-[10px] mt-1 text-right" style={{ color: T.faint }}>{form.message.length}/300</p>
                </div>
                {error && <div className="rounded-xl px-4 py-3 text-xs"
                  style={{ background: '#fee2e2', border: '1px solid #fca5a5', color: '#dc2626' }}>{error}</div>}
                <button type="submit"
                  className="group w-full flex items-center justify-center gap-2.5 py-3.5 rounded-2xl text-sm font-bold text-white transition-transform hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60 disabled:hover:scale-100"
                  style={{ background: T.grad }}
                  disabled={!canSend}>
                  {loading
                    ? <><Loader size={14} className="spin" /> Sending…</>
                    : <><span>Send Message</span><Send size={14} className="group-hover:translate-x-0.5 transition-transform" /></>}
                </button>
              </form>
            )}
          </div>
        </Reveal>
      </div>
    </section>
  )
}

/* ── Footer ───────────────────────────────────────────────────────────────── */
function Footer() {
  return (
    <footer className="px-5 sm:px-10 py-10" style={{ borderTop: `1px solid ${T.line}` }}>
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: T.grad }}>
            <Zap size={14} className="text-white" />
          </div>
          <span className="font-bold text-sm" style={{ color: T.ink }}>Square<b style={{ color: T.p1 }}>Edge</b>Sports</span>
        </div>
        <p className="text-xs" style={{ color: T.faint }}>© {new Date().getFullYear()} SquareEdgeSports. All rights reserved.</p>
      </div>
    </footer>
  )
}

/* ── Main LandingPage ────────────────────────────────────────────────────── */
export default function LandingPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [booking,  setBooking]  = useState(null)
  const [bookingDate, setBookingDate] = useState(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  const isAdmin = user && ['SUPER_ADMIN', 'ADMINISTRATOR', 'EMPLOYEE'].includes(user.role)

  const handleBookSlot = (type, date) => {
  if (isAdmin) { navigate('/admin/bookings/new'); return }
  setBooking(type)
  setBookingDate(date || null)
  }

  const goTo = id => {
    setMenuOpen(false)
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

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
    const loadLiveData = () => {
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
    }
    loadLiveData()
    // Picks up admin-side price/court changes without needing a manual refresh.
    const poll = setInterval(loadLiveData, 30000)
    return () => clearInterval(poll)
  }, [])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const SPORTS = makeSports(courtCounts, pricing)

  return (
    <div style={{ background: T.bg, color: T.ink, fontFamily: T.font }}>

      {/* ── Floating glass navbar ─────────────────────────────────────── */}
      <div className="fixed top-3 sm:top-5 left-0 right-0 z-50 px-3 sm:px-6">
        <nav className={`max-w-5xl mx-auto flex items-center justify-between px-4 sm:px-6 h-14 rounded-2xl transition-all duration-300 ${scrolled ? '' : ''}`}
          style={{
            background: T.glass, backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
            border: `1px solid ${T.glassBd}`,
            boxShadow: scrolled ? '0 10px 30px rgba(15,23,42,0.10)' : '0 4px 16px rgba(15,23,42,0.05)',
          }}>
          <button onClick={() => goTo('home')} className="flex items-center gap-2">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center" style={{ background: T.grad }}>
              <Zap size={14} className="text-white" />
            </div>
            <span className="font-bold text-sm sm:text-base tracking-tight" style={{ color: T.ink }}>
              Square<b style={{ color: T.p1 }}>Edge</b>Sports
            </span>
          </button>

          <div className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map(l => (
              <button key={l.id} onClick={() => goTo(l.id)}
                className="px-3.5 py-2 rounded-lg text-sm font-semibold transition-all hover:bg-black/[0.04]"
                style={{ color: T.sub }}>
                {l.label}
              </button>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-2">
            {user ? (
              <>
                <Link to={isAdmin ? '/admin' : '/dashboard'}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-semibold" style={{ color: T.p1 }}>
                  <LayoutDashboard size={14} /> Dashboard
                </Link>
                <button onClick={() => handleBookSlot('CRICKET_LANE')}
                  className="px-4 py-2 rounded-xl text-sm font-bold text-white transition-transform hover:scale-[1.03]"
                  style={{ background: T.grad }}>Book Slot →</button>
              </>
            ) : (
              <>
                <Link to="/login" className="px-3.5 py-2 text-sm font-semibold" style={{ color: T.sub }}>Sign In</Link>
                <Link to="/register" className="px-3.5 py-2 rounded-xl text-sm font-bold border hover:shadow-md"
                  style={{ background: '#fff', borderColor: T.line, color: T.p1 }}>Register</Link>
                <button onClick={() => handleBookSlot('CRICKET_LANE')}
                  className="px-4 py-2 rounded-xl text-sm font-bold text-white transition-transform hover:scale-[1.03]"
                  style={{ background: T.grad }}>Book Slot →</button>
              </>
            )}
          </div>

          <button className="md:hidden p-2" onClick={() => setMenuOpen(o => !o)} style={{ color: T.sub }}>
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </nav>

        {menuOpen && (
          <div className="md:hidden max-w-5xl mx-auto mt-2 rounded-2xl px-4 py-3 space-y-2"
            style={{ background: T.glass, backdropFilter: 'blur(20px)', border: `1px solid ${T.glassBd}`, boxShadow: '0 10px 30px rgba(15,23,42,0.10)' }}>
            {NAV_LINKS.map(l => (
              <button key={l.id} onClick={() => goTo(l.id)}
                className="block w-full text-left px-3 py-2 rounded-lg text-sm font-semibold" style={{ color: T.sub }}>
                {l.label}
              </button>
            ))}
            <button onClick={() => { handleBookSlot('CRICKET_LANE'); setMenuOpen(false) }}
              className="w-full py-2.5 rounded-xl text-sm font-bold text-white" style={{ background: T.grad }}>
              Book Slot →
            </button>
            {user
              ? <Link to={isAdmin ? '/admin' : '/dashboard'} onClick={() => setMenuOpen(false)}
                  className="block text-center py-2.5 rounded-xl text-sm border" style={{ borderColor: T.line, color: T.p1 }}>Dashboard</Link>
              : <div className="flex gap-2">
                  <Link to="/login" className="flex-1 text-center py-2.5 rounded-xl text-sm border" style={{ borderColor: T.line, color: T.sub }}>Sign In</Link>
                  <Link to="/register" className="flex-1 text-center py-2.5 rounded-xl text-sm font-bold text-white" style={{ background: T.grad }}>Register</Link>
                </div>
            }
          </div>
        )}
      </div>

      <Hero sports={SPORTS} courtCounts={courtCounts} onBook={handleBookSlot} user={user} />
      <SportsSection sports={SPORTS} onBook={handleBookSlot} />
      <MembershipSection sports={SPORTS} onMembershipClick={handleMembershipClick} buyingMembership={buyingMembership} />
      <AboutSection sports={SPORTS} courtCounts={courtCounts} />
      <ContactSection />
      <Footer />

      {booking && <BookingModal initialType={booking} initialDate={bookingDate} onClose={() => setBooking(null)} />}    

      </div>
  )
}
