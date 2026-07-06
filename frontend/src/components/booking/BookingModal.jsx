import { useState, useEffect, useRef } from 'react'
import { publicAPI, bookingAPI, authAPI } from '../../api'
import { useAuth } from '../../context/AuthContext'
import { X, ChevronLeft, ChevronRight, CheckCircle, Clock, Loader, Calendar, Eye, EyeOff } from 'lucide-react'
import toast from 'react-hot-toast'

const TYPES = {
  CRICKET_LANE: { label: 'Cricket Lane',  emoji: '🏏', memberKey: 'cricketLaneMember',  bg: 'bg-blue-600/10', border: 'border-blue-600/30', text: 'text-blue-400' },
  BOX_CRICKET:  { label: 'Box Cricket',   emoji: '📦', memberKey: 'boxCricketMember',   bg: 'bg-blue-600/10', border: 'border-blue-600/30', text: 'text-blue-400' },
  PICKLEBALL:   { label: 'Pickleball',    emoji: '🏓', memberKey: 'pickleballMember',   bg: 'bg-blue-600/10', border: 'border-blue-600/30', text: 'text-blue-400' },
}

// PricingRule keys + fallback [full, member] prices if the API hasn't responded yet
const PRICE_KEYS = {
  CRICKET_LANE: ['CRICKET_LANE', 'CRICKET_LANE_MEMBER'],
  BOX_CRICKET:  ['BOX_CRICKET', 'BOX_CRICKET_MEMBER'],
  PICKLEBALL:   ['PICKLEBALL', 'PICKLEBALL_MEMBER'],
}
const DEFAULT_PRICES = { CRICKET_LANE: [30, 25], BOX_CRICKET: [50, 40], PICKLEBALL: [30, 25] }

function today() { return new Date().toISOString().split('T')[0] }
function maxDate() { const d = new Date(); d.setDate(d.getDate() + 30); return d.toISOString().split('T')[0] }

function isSlotPast(slotStartTime, selectedDate) {
  if (selectedDate !== today()) return false
  const now = new Date()
  const [h, m] = slotStartTime.toString().split(':').map(Number)
  const slotTime = new Date(); slotTime.setHours(h, m, 0, 0)
  return slotTime <= now
}

function fmtTime(t) {
  if (!t) return ''
  const [h, m] = t.toString().split(':')
  const hour = parseInt(h)
  return `${hour % 12 || 12}:${m} ${hour >= 12 ? 'PM' : 'AM'}`
}

function loadRazorpayScript() {
  return new Promise((resolve, reject) => {
    if (window.Razorpay) { resolve(true); return }
    const existing = document.querySelector('script[src*="checkout.razorpay.com"]')
    if (existing) {
      let tries = 0
      const check = setInterval(() => {
        tries++
        if (window.Razorpay) { clearInterval(check); resolve(true) }
        else if (tries > 30) { clearInterval(check); reject(new Error('Razorpay checkout could not be loaded.')) }
      }, 200)
      return
    }
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.async = true
    script.onload = () => resolve(true)
    script.onerror = () => reject(new Error('Failed to load the payment gateway.'))
    document.head.appendChild(script)
  })
}

// Steps: 'select' | 'auth' | 4 (payment review) | 5 (done)
export default function BookingModal({ initialType, onClose }) {
  const { user, login: authLogin } = useAuth()

  const [step,           setStep]           = useState('select')
  const [type,           setType]           = useState(initialType || 'CRICKET_LANE')
  const [date,           setDate]           = useState(today())
  const [slots,          setSlots]          = useState([])
  const [loadSlots,      setLoadSlots]      = useState(false)
  const [selSlots,       setSelSlots]       = useState([])
  const [createdBookings, setCreatedBookings] = useState([])
  const [creating,       setCreating]       = useState(false)
  const [paying,         setPaying]         = useState(false)
  const [cmsItems,       setCmsItems]       = useState([])

  // Guest sign-in state
  const [signInEmail,    setSignInEmail]    = useState('')
  const [signInPassword, setSignInPassword] = useState('')
  const [showPw,         setShowPw]         = useState(false)
  const [signInLoading,  setSignInLoading]  = useState(false)
  const [signInErr,      setSignInErr]      = useState('')

  // Registration + OTP state
  const [authView,     setAuthView]     = useState('signin')  // 'signin' | 'register' | 'verify-otp' | 'forgot'
  const [regName,      setRegName]      = useState('')
  const [regEmail,     setRegEmail]     = useState('')
  const [regPassword,  setRegPassword]  = useState('')
  const [regConfirm,   setRegConfirm]   = useState('')
  const [showRegPw,    setShowRegPw]    = useState(false)
  const [regLoading,   setRegLoading]   = useState(false)
  const [regErr,       setRegErr]       = useState('')
  const [regOtp,       setRegOtp]       = useState(['', '', '', '', '', ''])

  // Forgot password state
  const [forgotEmail,         setForgotEmail]         = useState('')
  const [forgotLoading,       setForgotLoading]       = useState(false)
  const [forgotSent,          setForgotSent]          = useState(false)
  const [forgotErr,           setForgotErr]           = useState('')
  const [forgotNotRegistered, setForgotNotRegistered] = useState(false)
  const regOtpRefs = useRef([])

  const [pricing, setPricing] = useState({})

  const typeInfo = {
    ...TYPES[type],
    prices: [
      pricing[PRICE_KEYS[type][0]] ?? DEFAULT_PRICES[type][0],
      pricing[PRICE_KEYS[type][1]] ?? DEFAULT_PRICES[type][1],
    ],
  }

  useEffect(() => {
    publicAPI.cms().then(r => setCmsItems(r.data || [])).catch(() => {})
    publicAPI.pricing().then(r => {
      const map = {}
      r.data.forEach(p => { map[p.ruleKey] = parseFloat(p.price) })
      setPricing(map)
    }).catch(() => {})
  }, [])

  // Load slots whenever date or type changes (no step gate needed)
  useEffect(() => {
    if (step !== 'select') return
    setLoadSlots(true)
    setSlots([])
    publicAPI.availability(date, type)
      .then(r => setSlots(r.data.slots || []))
      .catch(() => toast.error('Could not load availability'))
      .finally(() => setLoadSlots(false))
  }, [date, type, step])

  function changeType(t) { setType(t); setSelSlots([]) }

  function toggleSlot(slot) {
    if (!slot.available) return
    setSelSlots(prev => {
      const exists = prev.find(s => s.startTime === slot.startTime)
      return exists
        ? prev.filter(s => s.startTime !== slot.startTime)
        : [...prev, slot].sort((a, b) => a.startTime.localeCompare(b.startTime))
    })
  }

  function getUnitPrice() {
    const isExpired = user?.membershipExpiry && new Date(user.membershipExpiry + 'Z') < new Date()
    const isMember  = user?.[typeInfo.memberKey] && !isExpired
    const [full, member] = typeInfo.prices
    return { amount: isMember ? member : full, isMember: !!isMember }
  }

  function getCmsDiscountForSlot(slotTime) {
    if (!slotTime) return 0
    const dayIndex = new Date(date).getDay()
    return cmsItems
      .filter(item => item.active && item.discountPercent > 0)
      .filter(item => {
        const dr = item.dayRestriction || 'ALL_DAYS'
        if (dr === 'WEEKDAYS' && (dayIndex === 0 || dayIndex === 6)) return false
        if (dr === 'WEEKENDS' && !(dayIndex === 0 || dayIndex === 6)) return false
        const fromTime = item.discountTimeFrom?.trim()
        const toTime   = item.discountTimeTo?.trim()
        if (!fromTime && !toTime) return true
        if (fromTime && toTime) {
          if (fromTime <= toTime) return slotTime >= fromTime && slotTime <= toTime
          return slotTime >= fromTime || slotTime <= toTime
        }
        if (fromTime) return slotTime >= fromTime
        if (toTime)   return slotTime <= toTime
        return true
      })
      .reduce((max, item) => Math.max(max, item.discountPercent || 0), 0)
  }

  function getSlotPrice(slot) {
    const base = getUnitPrice().amount
    const discount = getCmsDiscountForSlot(slot.startTime)
    return discount > 0 ? Math.round(base * (100 - discount) / 100) : base
  }

  const totalAmount      = selSlots.length * getUnitPrice().amount
  const discountedTotal  = selSlots.reduce((sum, slot) => sum + getSlotPrice(slot), 0)
  const selectedDiscounts = selSlots.map(slot => getCmsDiscountForSlot(slot.startTime))
  const selectedDiscount  = selectedDiscounts.length > 0 ? Math.max(...selectedDiscounts) : 0
  const sameDiscount      = selectedDiscounts.length > 0 && selectedDiscounts.every(d => d === selectedDiscounts[0])

  async function createBookings() {
    setCreating(true)
    try {
      const created = []
      for (const slot of selSlots) {
        const res = await bookingAPI.create({ bookingDate: date, startTime: slot.startTime, bookingType: type })
        created.push(res.data)
      }
      setCreatedBookings(created)
      setStep(4)
    } catch (e) {
      toast.error(e.response?.data?.message || 'Booking failed. Please try again.')
    } finally {
      setCreating(false)
    }
  }

  async function confirmAllPayments() {
    setPaying(true)
    try {
      try { await loadRazorpayScript() } catch (scriptErr) { toast.error(scriptErr.message); return }
      if (!window.Razorpay) { toast.error('Payment system not available.'); return }

      const bookingIds = createdBookings.map(b => b.id)
      let orderData
      try {
        const orderRes = await bookingAPI.createBatchRazorpayOrder({ bookingIds })
        orderData = orderRes.data
      } catch (orderErr) {
        toast.error('Payment error: ' + (orderErr.response?.data?.message || orderErr.message))
        return
      }

      const { orderId, amount, currency, keyId } = orderData
      await new Promise((resolve, reject) => {
        let paymentHandled = false
        const options = {
          key: keyId, amount, currency, order_id: orderId,
          name: 'SquareEdgeSports',
          description: `${typeInfo.label} · ${createdBookings.length} slot${createdBookings.length > 1 ? 's' : ''} · ${createdBookings[0]?.bookingDate}`,
          image: '/ses-favicon.svg',
          handler: async (response) => {
            paymentHandled = true
            try {
              await bookingAPI.confirmBatchPayment({
                bookingIds,
                razorpayOrderId:   response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
              })
              resolve()
            } catch (confirmErr) { reject(confirmErr) }
          },
          prefill: { email: user?.email, name: user?.fullName },
          theme: { color: '#1352c9' },
          modal: { ondismiss: () => { if (!paymentHandled) reject(new Error('dismissed')) } },
        }
        const rzp = new window.Razorpay(options)
        rzp.open()
      })

      setStep(5)
      toast.success('Booking confirmed! 🎉')
    } catch (e) {
      if (e.message === 'dismissed') toast.error('Payment cancelled.')
      else toast.error(e.response?.data?.message || e.message || 'Payment failed.')
    } finally { setPaying(false) }
  }

  async function handleGuestSignIn() {
    setSignInLoading(true); setSignInErr('')
    try {
      const res = await authAPI.login({ email: signInEmail, password: signInPassword })
      authLogin(res.data.token, res.data.user)
      await createBookings()
    } catch (e) {
      setSignInErr(e.response?.data?.message || 'Sign in failed.')
    } finally { setSignInLoading(false) }
  }

  async function handleForgotPassword() {
    if (!forgotEmail.trim()) { setForgotErr('Enter your email address.'); return }
    setForgotLoading(true); setForgotErr(''); setForgotNotRegistered(false)
    try {
      await authAPI.forgotPassword(forgotEmail.trim())
      setForgotSent(true)
    } catch (e) {
      const msg = e.response?.data?.message || ''
      if (msg === 'USER_NOT_REGISTERED') setForgotNotRegistered(true)
      else setForgotErr(msg || 'Something went wrong. Please try again.')
    } finally { setForgotLoading(false) }
  }

  async function sendRegisterOtp() {
    if (!regName.trim() || !regEmail.trim() || !regPassword) {
      setRegErr('Please fill in all fields.'); return
    }
    if (regPassword !== regConfirm) {
      setRegErr('Passwords do not match.'); return
    }
    if (regPassword.length < 6) {
      setRegErr('Password must be at least 6 characters.'); return
    }
    setRegLoading(true); setRegErr('')
    try {
      await authAPI.sendOtp(regEmail.trim(), regName.trim())
      setAuthView('verify-otp')
      toast.success('Code sent to ' + regEmail)
    } catch (e) {
      setRegErr(e.response?.data?.message || 'Failed to send verification code.')
    } finally { setRegLoading(false) }
  }

  async function verifyRegisterOtp() {
    const code = regOtp.join('')
    if (code.length < 6) { setRegErr('Enter the complete 6-digit code.'); return }
    setRegLoading(true); setRegErr('')
    try {
      await authAPI.verifyOtp(regEmail.trim(), code)
      await authAPI.register({ fullName: regName.trim(), email: regEmail.trim(), password: regPassword })
      const loginRes = await authAPI.login({ email: regEmail.trim(), password: regPassword })
      authLogin(loginRes.data.token, loginRes.data.user)
      await createBookings()
    } catch (e) {
      setRegErr(e.response?.data?.message || 'Incorrect or expired code.')
    } finally { setRegLoading(false) }
  }

  function handleRegOtpChange(i, v) {
    if (!/^[0-9]?$/.test(v)) return
    const n = [...regOtp]; n[i] = v; setRegOtp(n); setRegErr('')
    if (v && i < 5) regOtpRefs.current[i + 1]?.focus()
  }
  function handleRegOtpKey(i, e) {
    if (e.key === 'Backspace' && !regOtp[i] && i > 0) regOtpRefs.current[i - 1]?.focus()
    if (e.key === 'Enter') verifyRegisterOtp()
  }

  function reviewBooking() {
    if (selSlots.length === 0) return
    if (!user) { setStep('auth'); return }
    createBookings()
  }

  function resetAuth() {
    setStep('select')
    setAuthView('signin')
    setRegErr('')
    setSignInErr('')
    setRegOtp(['', '', '', '', '', ''])
    setForgotEmail('')
    setForgotSent(false)
    setForgotErr('')
    setForgotNotRegistered(false)
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={step < 4 ? onClose : undefined} />

      <div className="relative w-full max-w-lg bg-bg border border-[#dde8f8] rounded-3xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#dde8f8] flex-shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{typeInfo.emoji}</span>
            <div>
              <div className="font-bold text-sm">
                {step === 5 ? 'Booking Confirmed!' : step === 'auth' ? 'Sign In to Book' : step === 4 ? 'Review & Pay' : `Book ${typeInfo.label}`}
              </div>
              <div className="text-[10px] text-[#9aaac8]">
                {step === 5 ? 'All done!' : step === 4 ? 'Confirm your booking below' : step === 'auth' ? 'One last step' : 'Select date & time slot'}
              </div>
            </div>
          </div>
          {step !== 5 && (
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[#f0f5ff] text-[#5a6a8a] hover:text-[#0a1428] transition-all">
              <X size={15} />
            </button>
          )}
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">

          {/* ── Main selection page ── */}
          {step === 'select' && (
            <div className="space-y-4">

              {/* Sport selector */}
              <div>
                <div className="text-[10px] font-bold text-[#5a6a8a] uppercase tracking-wider mb-2">Sport</div>
                <div className="flex gap-2">
                  {Object.entries(TYPES).map(([key, info]) => {
                    const keyPrice = pricing[PRICE_KEYS[key][0]] ?? DEFAULT_PRICES[key][0]
                    return (
                      <button key={key} onClick={() => changeType(key)}
                        className={`flex-1 flex flex-col items-center gap-1 py-2.5 px-2 rounded-xl border text-center transition-all ${
                          type === key
                            ? `${info.bg} ${info.border} ring-1 ring-blue-600/30`
                            : 'bg-[#f8faff] border-[#dde8f8] hover:border-blue-600/30'
                        }`}>
                        <span className="text-xl">{info.emoji}</span>
                        <span className={`text-[10px] font-bold leading-tight ${type === key ? info.text : 'text-[#5a6a8a]'}`}>
                          {info.label}
                        </span>
                        <span className={`text-[9px] ${type === key ? 'text-blue-400' : 'text-[#9aaac8]'}`}>
                          ${keyPrice}/session
                        </span>
                      </button>
                    )
                  })}
                </div>
                {getUnitPrice().isMember && (
                  <div className="text-[10px] text-blue-400 mt-1.5 font-semibold">✓ Member price applied — ${typeInfo.prices[1]}/session</div>
                )}
              </div>

              {/* Date picker */}
              <div>
                <div className="text-[10px] font-bold text-[#5a6a8a] uppercase tracking-wider mb-2">
                  <Calendar size={10} className="inline mr-1" /> Date
                </div>
                <input type="date" value={date} min={today()} max={maxDate()}
                  onChange={e => { setDate(e.target.value); setSelSlots([]) }}
                  onBlur={e => {
                    const val = e.target.value
                    if (!val || val < today()) { setDate(today()); setSelSlots([]) }
                    else if (val > maxDate()) { setDate(maxDate()); setSelSlots([]) }
                  }}
                  className="w-full bg-white border border-[#dde8f8] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-600/50 [color-scheme:light] cursor-pointer"
                  style={{ color: '#0a1428' }} />
              </div>

              {/* Slots */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="text-[10px] font-bold text-[#5a6a8a] uppercase tracking-wider flex items-center gap-1">
                    <Clock size={10} /> Available Slots
                  </div>
                  {selSlots.length > 0 && (
                    <button onClick={() => setSelSlots([])} className="text-[10px] text-red-400 hover:text-red-500">✕ Clear</button>
                  )}
                </div>

                {loadSlots ? (
                  <div className="flex justify-center py-10"><Loader size={22} className="text-blue-400 spin" /></div>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    {slots.map(slot => {
                      const selected = selSlots.find(s => s.startTime === slot.startTime)
                      const slotPast = isSlotPast(slot.startTime, date)
                      const disabled = !slot.available || slotPast
                      return (
                        <button key={slot.startTime} disabled={disabled} onClick={() => toggleSlot(slot)}
                          className={`p-2.5 rounded-xl border text-center transition-all text-xs ${
                            slotPast
                              ? 'bg-[#f8faff] border-[#dde8f8] text-[#9aaac8] cursor-not-allowed'
                              : !slot.available
                                ? 'bg-red-500/[0.05] border-red-500/15 text-red-400/40 cursor-not-allowed'
                                : selected
                                  ? `${typeInfo.bg} ${typeInfo.border} ${typeInfo.text} font-bold ring-1 ring-blue-600/40`
                                  : 'bg-green-50 border-green-400 text-green-700 hover:bg-green-100'
                          }`}>
                          <Clock size={9} className="mx-auto mb-0.5" />
                          <div className="font-semibold">{fmtTime(slot.startTime)}</div>
                          <div className="text-[8px] opacity-55">
                            {slotPast ? 'Past'
                              : !slot.available ? 'Full'
                              : selected ? '✓ Selected'
                              : slot.remaining != null ? `${slot.remaining} left` : 'Available'}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )}

                {/* Selected summary */}
                {selSlots.length > 0 && (
                  <div className={`mt-3 p-3.5 rounded-xl border ${typeInfo.bg} ${typeInfo.border}`}>
                    <div className={`text-[10px] font-bold ${typeInfo.text} mb-1.5`}>
                      {selSlots.length} slot{selSlots.length > 1 ? 's' : ''} selected
                    </div>
                    <div className="space-y-0.5 mb-2">
                      {selSlots.map(s => (
                        <div key={s.startTime} className="text-xs font-semibold text-[#0a1428]">
                          {fmtTime(s.startTime)} – {fmtTime(s.endTime)}
                        </div>
                      ))}
                    </div>
                    <div className="border-t border-[#dde8f8] pt-2 space-y-1">
                      {discountedTotal < totalAmount && (
                        <>
                          <div className="flex justify-between"><span className="text-[10px] text-[#5a6a8a]">Original</span><span className="text-xs text-[#5a6a8a] line-through">${totalAmount}</span></div>
                          <div className="flex justify-between">
                            <span className="text-[10px] text-green-400 font-bold">{sameDiscount ? `🎉 ${selectedDiscount}% Discount` : '🎉 Discount applied'}</span>
                            <span className="text-xs text-green-400 font-bold">−${totalAmount - discountedTotal}</span>
                          </div>
                        </>
                      )}
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] text-[#5a6a8a]">Total to Pay</span>
                        <span className="font-extrabold text-sm" style={{ color: '#0a1428' }}>${discountedTotal}</span>
                      </div>
                    </div>
                    {getUnitPrice().isMember && (
                      <div className="text-[9px] text-blue-400 mt-0.5">✓ Member discount applied</div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Auth step ── */}
          {step === 'auth' && (
            <div>
              {authView === 'signin' && (
                /* ── Sign In ── */
                <div>
                  <div className="text-center mb-5">
                    <div className="w-12 h-12 rounded-2xl bg-blue-600/15 border border-blue-600/25 flex items-center justify-center mx-auto mb-3">🔐</div>
                    <div className="font-bold text-base mb-1">Sign in to complete booking</div>
                    <p className="text-xs text-[#5a6a8a] leading-relaxed">
                      You've selected {selSlots.length} slot{selSlots.length > 1 ? 's' : ''} — sign in to confirm.
                    </p>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="text-[10px] font-bold text-[#5a6a8a] uppercase tracking-wider block mb-1.5">Email</label>
                      <input type="email" value={signInEmail} onChange={e => setSignInEmail(e.target.value)}
                        placeholder="you@example.com"
                        className="w-full bg-white border border-[#dde8f8] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-600/50" style={{ color: '#0a1428' }} />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-[#5a6a8a] uppercase tracking-wider block mb-1.5">Password</label>
                      <div className="relative">
                        <input type={showPw ? 'text' : 'password'} value={signInPassword}
                          onChange={e => setSignInPassword(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && handleGuestSignIn()}
                          placeholder="Your password"
                          className="w-full bg-[#f8faff] border border-[#dde8f8] rounded-xl px-4 py-3 pr-10 text-sm text-[#0a1428] placeholder-[#8a9ab8] focus:outline-none focus:border-blue-600/50" />
                        <button type="button" onClick={() => setShowPw(p => !p)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9aaac8] hover:text-[#5a6a8a]">
                          {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      </div>
                    </div>
                    <div className="flex justify-end -mt-1">
                      <button onClick={() => { setAuthView('forgot'); setForgotEmail(signInEmail); setForgotErr(''); setForgotSent(false); setForgotNotRegistered(false) }}
                        className="text-[11px] text-blue-400 hover:text-blue-300 font-semibold">
                        Forgot password?
                      </button>
                    </div>
                    {signInErr && (
                      <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2.5 text-xs text-red-400">{signInErr}</div>
                    )}
                    <button onClick={handleGuestSignIn} disabled={signInLoading || !signInEmail || !signInPassword}
                      className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all ${
                        !signInLoading && signInEmail && signInPassword ? 'bg-accent hover:opacity-90 shadow-lg' : 'bg-[#f8faff] text-[#9aaac8] cursor-not-allowed'
                      }`}>
                      {signInLoading ? <><Loader size={13} className="spin" /> Signing in…</> : 'Sign In & Confirm Booking'}
                    </button>
                    <p className="text-center text-[11px] text-[#9aaac8]">
                      No account?{' '}
                      <button onClick={() => { setAuthView('register'); setSignInErr('') }}
                        className="text-blue-400 hover:text-blue-300 font-semibold underline">
                        Register here
                      </button>
                    </p>
                  </div>
                </div>
              )}

              {authView === 'register' && (
                /* ── Register ── */
                <div>
                  <div className="text-center mb-5">
                    <div className="w-12 h-12 rounded-2xl bg-blue-600/15 border border-blue-600/25 flex items-center justify-center mx-auto mb-3">✏️</div>
                    <div className="font-bold text-base mb-1">Create your account</div>
                    <p className="text-xs text-[#5a6a8a] leading-relaxed">
                      Register to confirm your {selSlots.length} slot{selSlots.length > 1 ? 's' : ''}.
                    </p>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="text-[10px] font-bold text-[#5a6a8a] uppercase tracking-wider block mb-1.5">Full Name</label>
                      <input type="text" value={regName} onChange={e => setRegName(e.target.value)}
                        placeholder="John Doe"
                        className="w-full bg-white border border-[#dde8f8] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-600/50" style={{ color: '#0a1428' }} />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-[#5a6a8a] uppercase tracking-wider block mb-1.5">Email</label>
                      <input type="email" value={regEmail} onChange={e => setRegEmail(e.target.value)}
                        placeholder="you@example.com"
                        className="w-full bg-white border border-[#dde8f8] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-600/50" style={{ color: '#0a1428' }} />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-[#5a6a8a] uppercase tracking-wider block mb-1.5">Password</label>
                      <div className="relative">
                        <input type={showRegPw ? 'text' : 'password'} value={regPassword}
                          onChange={e => setRegPassword(e.target.value)}
                          placeholder="Min. 6 characters"
                          className="w-full bg-[#f8faff] border border-[#dde8f8] rounded-xl px-4 py-3 pr-10 text-sm text-[#0a1428] placeholder-[#8a9ab8] focus:outline-none focus:border-blue-600/50" />
                        <button type="button" onClick={() => setShowRegPw(p => !p)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9aaac8] hover:text-[#5a6a8a]">
                          {showRegPw ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-[#5a6a8a] uppercase tracking-wider block mb-1.5">Confirm Password</label>
                      <input type={showRegPw ? 'text' : 'password'} value={regConfirm}
                        onChange={e => setRegConfirm(e.target.value)}
                        placeholder="Re-enter password"
                        className="w-full bg-[#f8faff] border border-[#dde8f8] rounded-xl px-4 py-3 text-sm text-[#0a1428] placeholder-[#8a9ab8] focus:outline-none focus:border-blue-600/50" />
                    </div>
                    {regErr && (
                      <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2.5 text-xs text-red-400">{regErr}</div>
                    )}
                    <button onClick={sendRegisterOtp} disabled={regLoading || !regName || !regEmail || !regPassword || !regConfirm}
                      className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all ${
                        !regLoading && regName && regEmail && regPassword && regConfirm
                          ? 'bg-accent hover:opacity-90 shadow-lg'
                          : 'bg-[#f8faff] text-[#9aaac8] cursor-not-allowed'
                      }`}>
                      {regLoading ? <><Loader size={13} className="spin" /> Sending code…</> : 'Continue →'}
                    </button>
                    <p className="text-center text-[11px] text-[#9aaac8]">
                      Already have an account?{' '}
                      <button onClick={() => { setAuthView('signin'); setRegErr('') }}
                        className="text-blue-400 hover:text-blue-300 font-semibold underline">
                        Sign in
                      </button>
                    </p>
                  </div>
                </div>
              )}

              {authView === 'verify-otp' && (
                /* ── Verify OTP ── */
                <div>
                  <div className="text-center mb-5">
                    <div className="w-12 h-12 rounded-2xl bg-blue-600/15 border border-blue-600/25 flex items-center justify-center mx-auto mb-3">📧</div>
                    <div className="font-bold text-base mb-1">Verify your email</div>
                    <p className="text-xs text-[#5a6a8a] leading-relaxed">
                      We sent a 6-digit code to<br /><strong className="text-[#0a1428]">{regEmail}</strong>
                    </p>
                  </div>

                  <div className="flex gap-2 justify-center my-5">
                    {regOtp.map((v, i) => (
                      <input key={i} ref={el => regOtpRefs.current[i] = el}
                        maxLength={1} value={v}
                        onChange={e => handleRegOtpChange(i, e.target.value)}
                        onKeyDown={e => handleRegOtpKey(i, e)}
                        onFocus={e => e.target.select()}
                        className="w-10 h-12 text-center text-lg font-bold bg-white border border-[#dde8f8] rounded-xl focus:outline-none focus:border-blue-600/50"
                        style={{ color: '#0a1428' }} />
                    ))}
                  </div>
                  
                  {regErr && (
                    <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2.5 text-xs text-red-400 mb-3 text-center">{regErr}</div>
                  )}

                  <button onClick={verifyRegisterOtp} disabled={regLoading}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold bg-accent hover:opacity-90 shadow-lg transition-all disabled:opacity-60">
                    {regLoading ? <><Loader size={13} className="spin" /> Verifying…</> : 'Verify & Confirm Booking'}
                  </button>

                  <div className="flex items-center justify-between mt-4 text-[11px] text-[#9aaac8]">
                    <button onClick={() => { setAuthView('register'); setRegOtp(['', '', '', '', '', '']); setRegErr('') }}
                      className="hover:text-[#5a6a8a] transition-colors">← Go back</button>
                    <button onClick={() => { authAPI.sendOtp(regEmail, regName); toast.success('New code sent!') }}
                      className="hover:text-[#5a6a8a] transition-colors">Resend code</button>
                  </div>
                </div>
              )}

              {authView === 'forgot' && (
                /* ── Forgot Password ── */
                <div>
                  {!forgotSent ? (
                    <>
                      <div className="text-center mb-5">
                        <div className="w-12 h-12 rounded-2xl bg-blue-600/15 border border-blue-600/25 flex items-center justify-center mx-auto mb-3">🔑</div>
                        <div className="font-bold text-base mb-1">Forgot password?</div>
                        <p className="text-xs text-[#5a6a8a] leading-relaxed">
                          Enter your registered email and we'll send you a link to reset your password.
                        </p>
                      </div>

                      <div className="space-y-3">
                        <div>
                          <label className="text-[10px] font-bold text-[#5a6a8a] uppercase tracking-wider block mb-1.5">Email</label>
                          <input type="email" value={forgotEmail}
                            onChange={e => { setForgotEmail(e.target.value); setForgotErr(''); setForgotNotRegistered(false) }}
                            onKeyDown={e => e.key === 'Enter' && handleForgotPassword()}
                            placeholder="you@example.com"
                            className="w-full bg-white border border-[#dde8f8] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-600/50" style={{ color: '#0a1428' }} />
                        </div>

                        {forgotNotRegistered && (
                          <div className="bg-yellow-50 border border-yellow-300 rounded-xl px-4 py-3">
                            <div className="text-xs font-bold text-yellow-700 mb-1">⚠️ Account not found</div>
                            <p className="text-[11px] text-yellow-600 leading-relaxed">
                              <strong>{forgotEmail}</strong> is not registered.{' '}
                              <button onClick={() => { setAuthView('register'); setRegEmail(forgotEmail) }}
                                className="underline font-semibold">Register here</button> instead.
                            </p>
                          </div>
                        )}

                        {forgotErr && (
                          <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2.5 text-xs text-red-400">{forgotErr}</div>
                        )}

                        <button onClick={handleForgotPassword} disabled={forgotLoading || !forgotEmail}
                          className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all ${
                            !forgotLoading && forgotEmail ? 'bg-accent hover:opacity-90 shadow-lg' : 'bg-[#f8faff] text-[#9aaac8] cursor-not-allowed'
                          }`}>
                          {forgotLoading ? <><Loader size={13} className="spin" /> Sending…</> : 'Send Reset Link →'}
                        </button>

                        <p className="text-center text-[11px] text-[#9aaac8]">
                          <button onClick={() => { setAuthView('signin'); setForgotErr('') }}
                            className="text-blue-400 hover:text-blue-300 font-semibold underline">
                            ← Back to Sign In
                          </button>
                        </p>
                      </div>
                    </>
                  ) : (
                    /* ── Sent confirmation ── */
                    <div className="text-center py-4">
                      <div className="w-14 h-14 rounded-full bg-green-100 border border-green-300 flex items-center justify-center mx-auto mb-4">
                        <CheckCircle size={28} className="text-green-600" />
                      </div>
                      <div className="font-bold text-base mb-2">Check your inbox</div>
                      <p className="text-xs text-[#5a6a8a] mb-1">If <strong className="text-[#0a1428]">{forgotEmail}</strong> is registered,</p>
                      <p className="text-xs text-[#5a6a8a] mb-5 leading-relaxed">you'll receive a reset link shortly. It expires in 30 minutes.</p>
                      <p className="text-[11px] text-[#9aaac8] mb-4">
                        Didn't get it?{' '}
                        <button onClick={() => setForgotSent(false)} className="text-blue-400 hover:text-blue-300 underline">try again</button>.
                      </p>
                      <p className="text-[11px] text-[#9aaac8]">
                        Once reset, come back and{' '}
                        <button onClick={() => { setAuthView('signin'); setForgotSent(false) }}
                          className="text-blue-400 hover:text-blue-300 font-semibold underline">
                          sign in
                        </button>{' '}to confirm your booking.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── Step 4: Payment review ── */}
          {step === 4 && createdBookings.length > 0 && (
            <div className="space-y-4">
              <div className={`p-4 rounded-2xl border ${typeInfo.bg} ${typeInfo.border}`}>
                <div className={`text-[10px] font-bold ${typeInfo.text} uppercase tracking-wider mb-3`}>Booking Summary</div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-[#5a6a8a]">Sport</span><span className="font-semibold">{typeInfo.emoji} {typeInfo.label}</span></div>
                  <div className="flex justify-between"><span className="text-[#5a6a8a]">Date</span><span className="font-semibold">{createdBookings[0]?.bookingDate}</span></div>
                  {createdBookings.map((b, i) => (
                    <div key={b.id} className="flex justify-between">
                      <span className="text-[#5a6a8a]">Slot {i + 1}</span>
                      <span className="font-semibold">{fmtTime(b.startTime?.toString())} – {fmtTime(b.endTime?.toString())}</span>
                    </div>
                  ))}
                  <div className="flex justify-between">
                    <span className="text-[#5a6a8a]">Court / Lane</span>
                    <span className="text-yellow-700 font-semibold text-xs">Assigned by admin via email</span>
                  </div>
                  {(() => {
                    const memberApplied = createdBookings[0]?.memberDiscountApplied
                    const unitBase  = memberApplied ? typeInfo.prices[1] : typeInfo.prices[0]
                    const baseTotal = unitBase * createdBookings.length
                    const actualTotal = createdBookings.reduce((s, b) => s + parseFloat(b.amountPaid || 0), 0)
                    const savings = Math.round(baseTotal - actualTotal)
                    return (
                      <div className="border-t border-[#dde8f8] pt-2 mt-1 space-y-1.5">
                        {memberApplied && (
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] text-blue-400 font-bold">✓ Member price</span>
                            <span className="text-xs text-blue-400">${unitBase}/slot</span>
                          </div>
                        )}
                        {savings > 0 && (
                          <>
                            <div className="flex justify-between items-center"><span className="text-[10px] text-[#5a6a8a]">Original</span><span className="text-xs text-[#5a6a8a] line-through">${baseTotal}</span></div>
                            <div className="flex justify-between items-center"><span className="text-[10px] text-green-400 font-bold">🎉 Discount</span><span className="text-xs text-green-400 font-bold">−${savings}</span></div>
                          </>
                        )}
                        <div className="flex justify-between items-center">
                          <span className="text-[#5a6a8a] font-semibold">Total Due</span>
                          <span className="text-xl font-extrabold">${Math.round(actualTotal)}</span>
                        </div>
                      </div>
                    )
                  })()}
                </div>
              </div>

              <div className="bg-blue-600/[0.05] border border-blue-600/15 rounded-xl p-3.5 text-xs text-blue-300 leading-relaxed">
                <strong>Secure Payment:</strong> You'll be redirected to Razorpay's secure checkout. UPI, cards, net banking accepted.
              </div>
              <div className="bg-yellow-50 border border-yellow-300 rounded-xl p-3.5 text-xs text-yellow-700 leading-relaxed">
                <strong>Lane/Court Assignment:</strong> Our team will assign your specific lane or court and notify you by email.
              </div>
              <div className="bg-[#f8faff] border border-[#dde8f8] rounded-xl p-3.5 text-xs text-[#9aaac8] leading-relaxed">
                <strong className="text-[#5a6a8a]">Cancellation:</strong> · 24+ hrs → Full refund · 1–24 hrs → 50% refund · &lt;1 hr → No refund
              </div>
            </div>
          )}

          {/* ── Step 5: Done ── */}
          {step === 5 && (
            <div className="text-center py-4">
              <div className="w-16 h-16 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center mx-auto mb-4">
                <CheckCircle size={30} className="text-green-400" />
              </div>
              <h3 className="text-xl font-extrabold mb-2">Booking Confirmed!</h3>
              <p className="text-[#5a6a8a] text-sm mb-5 leading-relaxed">
                Your {selSlots.length} slot{selSlots.length > 1 ? 's are' : ' is'} booked. We'll assign your lane/court and email you shortly.
              </p>
              <div className="bg-[#f8faff] border border-[#dde8f8] rounded-xl p-4 text-xs text-left space-y-2 mb-5">
                <div className="flex justify-between"><span className="text-[#5a6a8a]">Sport</span><span>{typeInfo.emoji} {typeInfo.label}</span></div>
                <div className="flex justify-between"><span className="text-[#5a6a8a]">Date</span><span>{createdBookings[0]?.bookingDate}</span></div>
                {createdBookings.map((b, i) => (
                  <div key={b.id} className="flex justify-between">
                    <span className="text-[#5a6a8a]">Slot {i + 1}</span>
                    <span className="font-mono text-[10px]">{fmtTime(b.startTime?.toString())} · Ref: {b.paymentReference?.slice(0, 12)}</span>
                  </div>
                ))}
              </div>
              <button onClick={onClose} className="w-full py-3 rounded-xl font-bold text-sm bg-accent hover:opacity-90 transition-all">Done</button>
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        {step === 'select' && (
          <div className="px-6 py-4 border-t border-[#dde8f8] flex items-center justify-between gap-3 flex-shrink-0">
            <button onClick={onClose}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold bg-[#f8faff] border border-[#dde8f8] hover:bg-[#f0f5ff] transition-all">
              <ChevronLeft size={13} /> Cancel
            </button>
            <button onClick={reviewBooking} disabled={selSlots.length === 0 || creating}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
                selSlots.length > 0 && !creating
                  ? 'bg-accent hover:opacity-90 text-white shadow-lg'
                  : 'bg-[#f8faff] text-[#9aaac8] cursor-not-allowed border border-[#dde8f8]'
              }`}>
              {creating && <Loader size={12} className="spin" />}
              Review Booking
              {!creating && <ChevronRight size={13} />}
            </button>
          </div>
        )}

        {step === 'auth' && (
          <div className="px-6 py-3 border-t border-[#dde8f8] flex-shrink-0">
            <button onClick={resetAuth}
              className="flex items-center gap-1.5 text-xs text-[#9aaac8] hover:text-[#5a6a8a] transition-colors">
              <ChevronLeft size={11} /> Back to slot selection
            </button>
          </div>
        )}

        {step === 4 && (
          <div className="px-6 py-4 border-t border-[#dde8f8] flex-shrink-0">
            <button onClick={confirmAllPayments} disabled={paying}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-sm bg-accent hover:opacity-90 transition-all shadow-2xl shadow-blue-600/20 disabled:opacity-60">
              {paying
                ? <><Loader size={14} className="spin" /> Processing…</>
                : <>🔐 Pay ${createdBookings.reduce((s, b) => s + parseFloat(b.amountPaid || 0), 0).toFixed(0)} via Razorpay</>}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
