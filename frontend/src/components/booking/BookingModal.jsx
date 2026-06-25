import { useState, useEffect } from 'react'
import { publicAPI, bookingAPI, authAPI } from '../../api'
import { useAuth } from '../../context/AuthContext'
import { X, ChevronLeft, ChevronRight, CheckCircle, Clock, Loader, Calendar, Eye, EyeOff } from 'lucide-react'
import toast from 'react-hot-toast'

const TYPES = {
  CRICKET_LANE: { label: 'Cricket Lane',  emoji: '🏏', prices: [500, 400], memberKey: 'cricketLaneMember',  color: 'green',  bg: 'bg-blue-600/10', border: 'border-blue-600/30', text: 'text-blue-400' },
  BOX_CRICKET:  { label: 'Box Cricket',   emoji: '📦', prices: [1500, 1200], memberKey: 'boxCricketMember', color: 'violet', bg: 'bg-blue-600/10', border: 'border-blue-600/30', text: 'text-blue-400' },
  PICKLEBALL:   { label: 'Pickleball',    emoji: '🏓', prices: [500, 400], memberKey: 'pickleballMember',   color: 'orange', bg: 'bg-blue-600/10', border: 'border-blue-600/30', text: 'text-blue-400' },
}

function today() { return new Date().toISOString().split('T')[0] }
function maxDate() { const d = new Date(); d.setDate(d.getDate() + 30); return d.toISOString().split('T')[0] }

/** Returns true if the slot's start time has already passed (only for today) */
function isSlotPast(slotStartTime, selectedDate) {
  if (selectedDate !== today()) return false
  const now = new Date()
  const [h, m] = slotStartTime.toString().split(':').map(Number)
  const slotTime = new Date()
  slotTime.setHours(h, m, 0, 0)
  return slotTime <= now
}

function fmtTime(t) {
  if (!t) return ''
  const [h, m] = t.toString().split(':')
  const hour = parseInt(h)
  return `${hour % 12 || 12}:${m} ${hour >= 12 ? 'PM' : 'AM'}`
}

/**
 * Dynamically loads the Razorpay checkout script if not already present.
 * Returns a promise that resolves to true when ready.
 */
function loadRazorpayScript() {
  return new Promise((resolve, reject) => {
    if (window.Razorpay) { resolve(true); return }
    const existing = document.querySelector('script[src*="checkout.razorpay.com"]')
    if (existing) {
      // Script tag exists — wait a moment for it to finish loading
      let tries = 0
      const check = setInterval(() => {
        tries++
        if (window.Razorpay) { clearInterval(check); resolve(true) }
        else if (tries > 30) { clearInterval(check); reject(new Error('Razorpay checkout could not be loaded. Check your internet connection and try again.')) }
      }, 200)
      return
    }
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.async = true
    script.onload = () => resolve(true)
    script.onerror = () => reject(new Error('Failed to load the payment gateway. Check your internet connection and try again.'))
    document.head.appendChild(script)
  })
}

// Steps: 1=sport 2=date 3=slots 'auth'=sign-in 4=payment 5=done
export default function BookingModal({ initialType, onClose }) {
  const { user, login: authLogin } = useAuth()

  const [step,      setStep]      = useState(1)
  const [type,      setType]      = useState(initialType || 'CRICKET_LANE')
  const [boxGroup,  setBoxGroup]  = useState('BOX_A')
  const [date,      setDate]      = useState(today())
  const [slots,     setSlots]     = useState([])
  const [loadSlots, setLoadSlots] = useState(false)
  const [selSlots,  setSelSlots]  = useState([])
  const [createdBookings, setCreatedBookings] = useState([])
  const [creating,  setCreating]  = useState(false)
  const [paying,    setPaying]    = useState(false)
  const [cmsItems,  setCmsItems]  = useState([])

  // Guest sign-in state
  const [signInEmail,    setSignInEmail]    = useState('')
  const [signInPassword, setSignInPassword] = useState('')
  const [showPw,         setShowPw]         = useState(false)
  const [signInLoading,  setSignInLoading]  = useState(false)
  const [signInErr,      setSignInErr]      = useState('')

  const typeInfo = TYPES[type]

  // Fetch active CMS items on mount
  useEffect(() => {
    publicAPI.cms().then(r => {
      setCmsItems(r.data || [])
    }).catch(() => {})
  }, [])

  // Fetch slots when entering step 3
  useEffect(() => {
    if (step !== 3) return
    setLoadSlots(true)
    setSlots([])
    const bg = type === 'BOX_CRICKET' ? boxGroup : undefined
    publicAPI.availability(date, type, bg)
      .then(r => setSlots(r.data.slots || []))
      .catch(() => toast.error('Could not load availability'))
      .finally(() => setLoadSlots(false))
  }, [step, date, type, boxGroup])

  function changeType(t) {
    setType(t)
    setSelSlots([])
  }

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
        const toTime = item.discountTimeTo?.trim()
        if (!fromTime && !toTime) return true
        if (fromTime && toTime) {
          if (fromTime <= toTime) return slotTime >= fromTime && slotTime <= toTime
          return slotTime >= fromTime || slotTime <= toTime
        }
        if (fromTime) return slotTime >= fromTime
        if (toTime) return slotTime <= toTime
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

  // Create one booking per selected slot
  async function createBookings() {
    setCreating(true)
    try {
      const created = []
      for (const slot of selSlots) {
        const payload = {
          bookingDate: date,
          startTime:   slot.startTime,
          bookingType: type,
          ...(type === 'BOX_CRICKET' ? { boxGroup } : {}),
        }
        const res = await bookingAPI.create(payload)
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

  // ONE Razorpay payment for all slots combined
  async function confirmAllPayments() {
    setPaying(true)
    try {
      // 1. Ensure the Razorpay script is loaded
      try {
        await loadRazorpayScript()
      } catch (scriptErr) {
        toast.error(scriptErr.message)
        return
      }

      if (!window.Razorpay) {
        toast.error('Payment system not available. Please refresh the page and try again.')
        return
      }

      const bookingIds = createdBookings.map(b => b.id)

      // 2. Create ONE combined Razorpay order
      let orderData
      try {
        const orderRes = await bookingAPI.createBatchRazorpayOrder({ bookingIds })
        orderData = orderRes.data
      } catch (orderErr) {
        const msg = orderErr.response?.data?.message || orderErr.message || 'Could not create payment order.'
        toast.error('Payment error: ' + msg)
        return
      }

      const { orderId, amount, currency, keyId } = orderData

      // 3. Open ONE Razorpay checkout for the total
      await new Promise((resolve, reject) => {
        // paymentHandled = true once Razorpay calls our handler (payment captured).
        // This prevents ondismiss (which fires when the modal closes — even after
        // a successful payment) from incorrectly rejecting the promise.
        let paymentHandled = false

        const options = {
          key:      keyId,
          amount,
          currency,
          order_id: orderId,
          name:        'SquareEdgeSports',
          description: `${typeInfo.label} · ${createdBookings.length} slot${createdBookings.length > 1 ? 's' : ''} · ${createdBookings[0]?.bookingDate}`,
          image:       '/ses-favicon.svg',
          handler: async (response) => {
            // Mark immediately — before the async API call — so ondismiss can't
            // reject while we are in the middle of confirming with our server.
            paymentHandled = true
            try {
              // 4. Verify & confirm all bookings on our server
              await bookingAPI.confirmBatchPayment({
                bookingIds,
                razorpayOrderId:   response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
              })
              resolve()
            } catch (confirmErr) {
              reject(confirmErr)
            }
          },
          prefill: { email: user?.email, name: user?.fullName },
          theme:   { color: '#1352c9' },
          modal:   {
            // ondismiss fires when the user closes the modal WITHOUT paying.
            // It also fires after a successful payment when the modal closes —
            // the paymentHandled flag stops it from rejecting in that case.
            ondismiss: () => {
              if (!paymentHandled) {
                reject(new Error('dismissed'))
              }
            },
          },
        }

        // NOTE: We intentionally do NOT add a payment.failed listener.
        // When a payment attempt fails, Razorpay shows the error inside the
        // modal and lets the user retry a different method. Attaching
        // payment.failed and calling reject() there prevents a subsequent
        // successful retry from ever reaching our handler, leaving the user
        // on step 4 even though their money was taken.
        const rzp = new window.Razorpay(options)
        rzp.open()
      })

      setStep(5)
      toast.success('Booking confirmed! 🎉')
    } catch (e) {
      if (e.message === 'dismissed') {
        toast.error('Payment cancelled.')
      } else {
        const msg = e.response?.data?.message || e.message || 'Payment failed. Please try again.'
        toast.error(msg)
      }
    } finally {
      setPaying(false)
    }
  }

  // Guest sign-in then create bookings
  async function handleGuestSignIn() {
    setSignInLoading(true)
    setSignInErr('')
    try {
      const res = await authAPI.login({ email: signInEmail, password: signInPassword })
      authLogin(res.data.token, res.data.user)
      await createBookings()
    } catch (e) {
      setSignInErr(e.response?.data?.message || 'Sign in failed.')
    } finally {
      setSignInLoading(false)
    }
  }

  function canGoNext() {
    if (step === 1) return !!type
    if (step === 2) return !!date
    if (step === 3) return selSlots.length > 0
    return true
  }

  function goNext() {
    if (step === 3) {
      if (!user) { setStep('auth'); return }
      createBookings()
      return
    }
    if (typeof step === 'number') setStep(s => s + 1)
  }

  function goBack() {
    if (step === 1 || step === 'auth') { onClose(); return }
    if (step === 2) { setStep(1); return }
    if (step === 3) { setStep(2); return }
  }

  const numericStep = typeof step === 'number' ? Math.min(step, 4) : 3
  const stepLabels = ['Sport', 'Date', 'Slots', 'Pay']

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={step < 4 ? onClose : undefined} />

      <div className="relative w-full max-w-lg bg-bg border border-[#dde8f8] rounded-3xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#dde8f8] flex-shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{typeInfo.emoji}</span>
            <div>
              <div className="font-bold text-sm">
                {step === 5 ? 'Booking Confirmed!' : step === 'auth' ? 'Sign In to Book' : 'Book ' + typeInfo.label}
              </div>
              <div className="text-[10px] text-[#9aaac8]">
                {step === 5 ? 'All done!' : `Step ${numericStep} of 4`}
              </div>
            </div>
          </div>
          {step !== 5 && (
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[#f0f5ff] text-[#5a6a8a] hover:text-[#0a1428] transition-all">
              <X size={15} />
            </button>
          )}
        </div>

        {/* Step indicator */}
        {step !== 5 && (
          <div className="px-6 pt-4 pb-1 flex-shrink-0">
            <div className="flex items-center gap-1">
              {stepLabels.map((label, i) => (
                <div key={label} className="flex items-center gap-1 flex-1">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold transition-all ${
                    numericStep > i + 1 ? 'bg-blue-600 text-white' :
                    numericStep === i + 1 ? 'bg-blue-600/20 border border-blue-600 text-blue-300' :
                    'bg-[#f8faff] border border-[#dde8f8] text-[#9aaac8]'
                  }`}>{numericStep > i + 1 ? '✓' : i + 1}</div>
                  {i < 3 && <div className={`flex-1 h-px ${numericStep > i + 1 ? 'bg-blue-600' : 'bg-[#f0f5ff]'}`} />}
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-1">
              {stepLabels.map(l => <span key={l} className="text-[9px] text-[#9aaac8] flex-1 text-center">{l}</span>)}
            </div>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">

          {/* ── Step 1: Sport ── */}
          {step === 1 && (
            <div className="space-y-2.5">
              <p className="text-xs text-[#5a6a8a] mb-3">Select one sport per booking. You can book multiple slots of the same sport.</p>
              {Object.entries(TYPES).map(([key, info]) => (
                <button key={key} onClick={() => changeType(key)}
                  className={`w-full flex items-center gap-4 p-4 rounded-2xl border transition-all text-left ${
                    type === key
                      ? `${info.bg} ${info.border}`
                      : 'bg-[#f8faff] border-[#dde8f8] hover:border-[#dde8f8]'
                  }`}>
                  <span className="text-3xl">{info.emoji}</span>
                  <div className="flex-1">
                    <div className="font-semibold text-sm">{info.label}</div>
                    <div className="text-[11px] text-[#5a6a8a] mt-0.5">
                      {key === 'CRICKET_LANE' ? `8 individual lanes · $${info.prices[0]}/session` :
                       key === 'BOX_CRICKET'  ? `Full box (4 lanes) · $${info.prices[0]}/session` :
                       `3 courts · $${info.prices[0]}/session`}
                      {' · '}
                      <span className={info.text}>Members ${info.prices[1]}</span>
                    </div>
                  </div>
                  {type === key && <CheckCircle size={16} className={info.text} />}
                </button>
              ))}
            </div>
          )}

          {/* ── Step 2: Date & box ── */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-[#5a6a8a] uppercase tracking-wider block mb-2">
                  <Calendar size={10} className="inline mr-1" /> Booking Date
                </label>
                <input type="date" value={date} min={today()} max={maxDate()}
                  onChange={e => { setDate(e.target.value); setSelSlots([]) }}
                  className="w-full bg-white border border-[#dde8f8] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-600/50 [color-scheme:light] cursor-pointer"
                  style={{ color: '#0a1428' }} />
              </div>

              {type === 'BOX_CRICKET' && (
                <div>
                  <label className="text-[10px] font-bold text-[#5a6a8a] uppercase tracking-wider block mb-2">Select Box</label>
                  <div className="grid grid-cols-2 gap-3">
                    {['BOX_A', 'BOX_B'].map(b => (
                      <button key={b} onClick={() => { setBoxGroup(b); setSelSlots([]) }}
                        className={`p-3.5 rounded-xl border text-center transition-all ${
                          boxGroup === b
                            ? 'bg-blue-600/15 border-blue-600/40 text-blue-300'
                            : 'bg-[#f8faff] border-[#dde8f8] text-[#5a6a8a] hover:border-[#dde8f8]'
                        }`}>
                        <div className="font-bold text-sm">{b.replace('_', ' ')}</div>
                        <div className="text-[10px] mt-0.5 text-[#9aaac8]">{b === 'BOX_A' ? 'Lanes 1–4' : 'Lanes 5–8'}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {type === 'CRICKET_LANE' && (
                <div className="bg-blue-600/[0.05] border border-blue-600/15 rounded-xl p-3.5 text-xs text-[#5a6a8a] leading-relaxed">
                  <strong className="text-blue-400">Lane Assignment:</strong> Your specific lane and box will be assigned by our team and confirmed via email.
                </div>
              )}

              <div className="bg-blue-600/[0.05] border border-blue-600/15 rounded-xl p-3.5 text-xs text-[#5a6a8a] leading-relaxed">
                <strong className="text-blue-400">Note:</strong> Sessions are 55 minutes. Your exact lane/court will be assigned by our team and sent to your email.
              </div>
            </div>
          )}

          {/* ── Step 3: Time slot multi-select ── */}
          {step === 3 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="text-sm font-semibold">{date}</div>
                  <div className="text-[10px] text-[#9aaac8]">{typeInfo.label}{type === 'BOX_CRICKET' ? ` · ${boxGroup.replace('_', ' ')}` : ''}</div>
                </div>
                <button onClick={() => setStep(2)} className="text-[11px] text-blue-400 hover:text-blue-300 flex items-center gap-1">
                  <ChevronLeft size={11} /> Change
                </button>
              </div>

              <div className="text-[10px] text-[#9aaac8] mb-2.5 flex items-center gap-1.5">
                <CheckCircle size={10} className="text-blue-400" /> Tap to select multiple slots (same sport only)
              </div>

              {loadSlots ? (
                <div className="flex justify-center py-10"><Loader size={22} className="text-blue-400 spin" /></div>
              ) : (
                <>
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    {slots.map(slot => {
                      const selected  = selSlots.find(s => s.startTime === slot.startTime)
                      const slotPast  = isSlotPast(slot.startTime, date)
                      const disabled  = !slot.available || slotPast
                      return (
                        <button key={slot.startTime}
                          disabled={disabled}
                          onClick={() => toggleSlot(slot)}
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
                            {slotPast       ? 'Past'
                              : !slot.available ? 'Full'
                              : selected ? '✓ Selected'
                              : slot.remaining != null ? `${slot.remaining} left` : 'Available'}
                          </div>
                        </button>
                      )
                    })}
                  </div>

                  {selSlots.length > 0 && (
                    <div className={`p-3.5 rounded-xl border ${typeInfo.bg} ${typeInfo.border}`}>
                      <div className={`text-[10px] font-bold ${typeInfo.text} mb-1.5`}>
                        {selSlots.length} slot{selSlots.length > 1 ? 's' : ''} selected
                      </div>
                      <div className="space-y-1">
                        {selSlots.map(s => (
                          <div key={s.startTime} className="text-xs font-semibold text-m2">
                            {fmtTime(s.startTime)} – {fmtTime(s.endTime)}
                          </div>
                        ))}
                      </div>
                      <div className="border-t border-[#dde8f8] mt-2 pt-2 space-y-1">
                        {discountedTotal < totalAmount && (
                          <>
                            <div className="flex justify-between items-center">
                              <span className="text-[10px] text-[#5a6a8a]">Original</span>
                              <span className="text-xs text-[#5a6a8a] line-through">${totalAmount}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-[10px] text-green-400 font-bold">
                                {sameDiscount ? `🎉 ${selectedDiscount}% Discount` : '🎉 Discount applied'}
                              </span>
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
                </>
              )}
            </div>
          )}

          {/* ── Auth step: guest sign-in ── */}
          {step === 'auth' && (
            <div>
              <div className="text-center mb-5">
                <div className="w-12 h-12 rounded-2xl bg-blue-600/15 border border-blue-600/25 flex items-center justify-center mx-auto mb-3">
                  🔐
                </div>
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
                    className="w-full bg-white border border-[#dde8f8] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-600/50"
                  style={{ color: '#0a1428' }} />
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

                {signInErr && (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2.5 text-xs text-red-400">{signInErr}</div>
                )}

                <button onClick={handleGuestSignIn} disabled={signInLoading || !signInEmail || !signInPassword}
                  className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all ${
                    !signInLoading && signInEmail && signInPassword
                      ? 'bg-accent hover:opacity-90 shadow-lg'
                      : 'bg-[#f8faff] text-[#9aaac8] cursor-not-allowed'
                  }`}>
                  {signInLoading ? <><Loader size={13} className="spin" /> Signing in…</> : 'Sign In & Confirm Booking'}
                </button>

                <p className="text-center text-[11px] text-[#9aaac8]">
                  No account?{' '}
                  <a href="/register" className="text-blue-400 hover:text-blue-300" target="_blank" rel="noreferrer">Register here</a>
                </p>
              </div>
            </div>
          )}

          {/* ── Step 4: Payment confirmation ── */}
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
                    const unitBase = memberApplied ? typeInfo.prices[1] : typeInfo.prices[0]
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
                            <div className="flex justify-between items-center">
                              <span className="text-[10px] text-[#5a6a8a]">Original</span>
                              <span className="text-xs text-[#5a6a8a] line-through">${baseTotal}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-[10px] text-green-400 font-bold">🎉 CMS Discount</span>
                              <span className="text-xs text-green-400 font-bold">−${savings}</span>
                            </div>
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

              {/* ── Test Mode Credentials ── */}
              <div className="bg-amber-50 border border-amber-300 rounded-xl p-3.5 text-xs space-y-2">
                <div className="flex items-center gap-1.5 font-bold text-amber-700 mb-2">
                  🧪 Test Mode — Use these credentials
                </div>

                {/* UPI — easiest */}
                <div className="bg-green-500/10 border border-green-500/20 rounded-lg px-3 py-2">
                  <div className="text-[10px] text-green-400 font-bold mb-0.5">✅ Easiest — UPI</div>
                  <div className="font-mono font-bold text-m2">success@razorpay</div>
                </div>

                {/* Domestic card */}
                <div className="bg-[#f0f5ff] border border-[#dde8f8] rounded-lg px-3 py-2 space-y-1.5">
                  <div className="text-[10px] text-[#5a6a8a] font-bold">💳 Domestic Mastercard</div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
                    <div>
                      <div className="text-[#9aaac8] mb-0.5">Card Number</div>
                      <div className="font-mono font-bold text-m2">5267 3181 8797 5449</div>
                    </div>
                    <div>
                      <div className="text-[#9aaac8] mb-0.5">Expiry / CVV</div>
                      <div className="font-mono font-bold text-m2">12/29 · 123</div>
                    </div>
                    <div>
                      <div className="text-[#9aaac8] mb-0.5">Name</div>
                      <div className="font-mono font-bold text-m2">Any name</div>
                    </div>
                    <div>
                      <div className="text-[#9aaac8] mb-0.5">OTP</div>
                      <div className="font-mono font-bold text-m2">Any 6 digits</div>
                    </div>
                  </div>
                </div>

                <div className="text-[10px] text-[#9aaac8] pt-0.5">
                  Net banking: select any bank → proceed → success
                </div>
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

        {/* Footer navigation */}
        {step !== 5 && step !== 'auth' && step !== 4 && (
          <div className="px-6 py-4 border-t border-[#dde8f8] flex items-center justify-between gap-3 flex-shrink-0">
            <button onClick={goBack}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold bg-[#f8faff] border border-[#dde8f8] hover:bg-[#f0f5ff] transition-all">
              <ChevronLeft size={13} /> {step === 1 ? 'Cancel' : 'Back'}
            </button>
            <button onClick={goNext} disabled={!canGoNext() || creating}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
                canGoNext() && !creating
                  ? 'bg-accent hover:opacity-90 text-white shadow-lg'
                  : 'bg-[#f8faff] text-[#9aaac8] cursor-not-allowed'
              }`}>
              {creating && <Loader size={12} className="spin" />}
              {step === 3 ? (user ? 'Review Booking' : 'Continue to Sign In') : 'Continue'}
              {!creating && <ChevronRight size={13} />}
            </button>
          </div>
        )}

        {step === 'auth' && (
          <div className="px-6 py-3 border-t border-[#dde8f8] flex-shrink-0">
            <button onClick={() => setStep(3)}
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
                : <>🔐 Pay ${createdBookings.reduce((s, b) => s + parseFloat(b.amountPaid || 0), 0).toFixed(0)} via Razorpay</>
              }
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
