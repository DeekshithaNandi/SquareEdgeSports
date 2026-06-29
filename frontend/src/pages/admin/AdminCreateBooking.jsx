import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { adminAPI, publicAPI } from '../../api'
import toast from 'react-hot-toast'
import { Search, ChevronLeft, Clock, Loader, CheckCircle, X } from 'lucide-react'

const TYPES = {
  CRICKET_LANE: { label: 'Cricket Lane', emoji: '🏏' },
  BOX_CRICKET:  { label: 'Box Cricket',  emoji: '📦' },
  PICKLEBALL:   { label: 'Pickleball',   emoji: '🏓' },
}

function today() { return new Date().toISOString().split('T')[0] }
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

export default function AdminCreateBooking() {
  const navigate = useNavigate()

  // Customer search
  const [users,         setUsers]         = useState([])
  const [customerQuery, setCustomerQuery] = useState('')
  const [customer,      setCustomer]      = useState(null)

  // New-customer mini form
  const [showNewCustomer,  setShowNewCustomer]  = useState(false)
  const [newCustomer,      setNewCustomer]      = useState({ fullName: '', email: '', phone: '' })
  const [creatingCustomer, setCreatingCustomer]  = useState(false)

  // Booking details
  const [type,      setType]      = useState('CRICKET_LANE')
  const [date,      setDate]      = useState(today())
  const [slots,     setSlots]     = useState([])
  const [loadSlots, setLoadSlots] = useState(false)
  const [selSlots,  setSelSlots]  = useState([])
  const [markAsPaid, setMarkAsPaid] = useState(true)
  const [creating,  setCreating]  = useState(false)

  useEffect(() => {
    adminAPI.allUsers()
      .then(r => setUsers((r.data || []).filter(u => u.role === 'PLAYER')))
      .catch(() => toast.error('Could not load customers'))
  }, [])

  useEffect(() => {
    setSlots([])
    setSelSlots([])
    setLoadSlots(true)
    publicAPI.availability(date, type)
      .then(r => setSlots(r.data.slots || []))
      .catch(() => toast.error('Could not load availability'))
      .finally(() => setLoadSlots(false))
    }, [date, type])
  const filteredUsers = customerQuery.trim()
    ? users.filter(u =>
        u.fullName?.toLowerCase().includes(customerQuery.toLowerCase()) ||
        u.email?.toLowerCase().includes(customerQuery.toLowerCase()) ||
        u.phone?.includes(customerQuery))
    : users

  function toggleSlot(slot) {
    if (!slot.available || isSlotPast(slot.startTime, date)) return
    setSelSlots(prev => {
      const exists = prev.find(s => s.startTime === slot.startTime)
      return exists
        ? prev.filter(s => s.startTime !== slot.startTime)
        : [...prev, slot].sort((a, b) => a.startTime.localeCompare(b.startTime))
    })
  }

  async function createNewCustomer() {
    if (!newCustomer.fullName.trim() || !newCustomer.email.trim()) {
      toast.error('Name and email are required')
      return
    }
    setCreatingCustomer(true)
    try {
      const res = await adminAPI.inviteUser({ ...newCustomer, role: 'PLAYER' })
      const created = res.data.data
      toast.success(`Customer added — setup link emailed to ${newCustomer.email}`)
      setUsers(prev => [...prev, created])
      setCustomer(created)
      setShowNewCustomer(false)
      setNewCustomer({ fullName: '', email: '', phone: '' })
    } catch (e) {
      toast.error(e.response?.data?.message || 'Could not create customer')
    } finally {
      setCreatingCustomer(false)
    }
  }

  async function handleSubmit() {
    if (!customer) { toast.error('Select a customer first'); return }
    if (selSlots.length === 0) { toast.error('Select at least one slot'); return }

    // Guard against the clock moving past a slot while this tab was left open —
    // applies to existing AND newly-added customers alike, same isSlotPast() check
    // used for the visual slot grid.
    const stillValid = selSlots.filter(s => !isSlotPast(s.startTime, date))
    if (stillValid.length !== selSlots.length) {
      setSelSlots(stillValid)
      toast.error('One or more selected slots have just passed — please reselect.')
      return
    }

    setCreating(true)
    try {
      for (const slot of selSlots) {
        await adminAPI.createBookingForCustomer({
          userId:      customer.id,
          bookingDate: date,
          startTime:   slot.startTime,
          bookingType: type,
          markAsPaid,
        })
      }
      toast.success(`Booking${selSlots.length > 1 ? 's' : ''} created for ${customer.fullName}`)
      navigate('/admin/bookings')
    } catch (e) {
      toast.error(e.response?.data?.message || 'Could not create booking')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-5">
      <button onClick={() => navigate('/admin/bookings')}
        className="flex items-center gap-1.5 text-xs text-[#5a6a8a] hover:text-[#0a1428]">
        <ChevronLeft size={13} /> Back to Bookings
      </button>

      <div className="font-display text-lg font-bold" style={{ color: '#0a1428' }}>
        Book a Court for a Customer
      </div>

      {/* Customer search */}
      <div className="bg-white border border-[#dde8f8] rounded-2xl p-5">
        <label className="text-[10px] font-bold text-[#5a6a8a] uppercase tracking-wider block mb-2">
          Customer
        </label>
        {customer ? (
          <div className="flex items-center justify-between bg-[#f0f5ff] rounded-xl px-4 py-3">
            <div>
              <div className="font-bold text-sm">{customer.fullName}</div>
              <div className="text-[11px] text-[#5a6a8a]">{customer.email} · {customer.phone}</div>
            </div>
            <button onClick={() => setCustomer(null)} className="text-[#5a6a8a] hover:text-[#0a1428]">
              <X size={15} />
            </button>
          </div>
        ) : (
          <div>
            <div className="relative mb-2">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9aaac8]" />
              <input value={customerQuery} onChange={e => setCustomerQuery(e.target.value)}
                placeholder="Search by name, email or phone"
                className="w-full bg-white border border-[#dde8f8] rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:border-blue-600/50"
                style={{ color: '#0a1428' }} />
            </div>
            <div className="max-h-48 overflow-y-auto border border-[#dde8f8] rounded-xl divide-y divide-[#dde8f8]">
              {filteredUsers.slice(0, 30).map(u => (
                <div key={u.id} onClick={() => setCustomer(u)}
                  className="px-4 py-2.5 text-sm cursor-pointer hover:bg-[#f0f5ff]">
                  <div className="font-semibold">{u.fullName}</div>
                  <div className="text-[11px] text-[#5a6a8a]">{u.email} · {u.phone}</div>
                </div>
              ))}
              {filteredUsers.length === 0 && (
                <div className="px-4 py-3 text-xs text-[#9aaac8]">No customers found</div>
              )}
            </div>

            {!showNewCustomer ? (
              <button onClick={() => setShowNewCustomer(true)}
                className="mt-2 text-[12px] font-bold text-blue-600 hover:text-blue-700">
                + Add New Customer (not registered yet)
              </button>
            ) : (
              <div className="mt-3 bg-[#f8faff] border border-[#dde8f8] rounded-xl p-4 space-y-2.5">
                <div className="text-[11px] font-bold text-[#5a6a8a] uppercase tracking-wider">New Customer</div>
                <input value={newCustomer.fullName}
                  onChange={e => setNewCustomer(c => ({ ...c, fullName: e.target.value }))}
                  placeholder="Full name"
                  className="w-full bg-white border border-[#dde8f8] rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-600/50"
                  style={{ color: '#0a1428' }} />
                <input value={newCustomer.email}
                  onChange={e => setNewCustomer(c => ({ ...c, email: e.target.value }))}
                  placeholder="Email"
                  className="w-full bg-white border border-[#dde8f8] rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-600/50"
                  style={{ color: '#0a1428' }} />
                <input value={newCustomer.phone}
                  onChange={e => setNewCustomer(c => ({ ...c, phone: e.target.value }))}
                  placeholder="Phone (optional)"
                  className="w-full bg-white border border-[#dde8f8] rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-600/50"
                  style={{ color: '#0a1428' }} />
                <div className="flex gap-2 pt-1">
                  <button onClick={() => setShowNewCustomer(false)}
                    className="flex-1 px-3 py-2 rounded-xl text-xs font-bold bg-white border border-[#dde8f8]">
                    Cancel
                  </button>
                  <button onClick={createNewCustomer} disabled={creatingCustomer}
                    className="flex-1 px-3 py-2 rounded-xl text-xs font-bold bg-accent text-white hover:opacity-90 disabled:opacity-60">
                    {creatingCustomer ? 'Adding…' : 'Add & Select'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Sport + date */}
      <div className="bg-white border border-[#dde8f8] rounded-2xl p-5 space-y-4">
        <div>
          <label className="text-[10px] font-bold text-[#5a6a8a] uppercase tracking-wider block mb-2">Sport</label>
          <div className="flex gap-2">
            {Object.entries(TYPES).map(([key, info]) => (
              <button key={key} onClick={() => setType(key)}
                className={`flex-1 px-3 py-2.5 rounded-xl border text-sm font-semibold ${
                  type === key ? 'bg-accent text-white border-transparent' : 'bg-[#f8faff] border-[#dde8f8]'
                }`}>
                {info.emoji} {info.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-[10px] font-bold text-[#5a6a8a] uppercase tracking-wider block mb-2">Date</label>
          <input type="date" value={date} min={today()}
            onChange={e => setDate(e.target.value)}
            className="w-full bg-white border border-[#dde8f8] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-600/50 [color-scheme:light]"
            style={{ color: '#0a1428' }} />
        </div>
      </div>

      {/* Slots */}
      <div className="bg-white border border-[#dde8f8] rounded-2xl p-5">
        <label className="text-[10px] font-bold text-[#5a6a8a] uppercase tracking-wider block mb-3">
          Time Slot(s)
        </label>
        {loadSlots ? (
          <div className="flex justify-center py-8"><Loader size={20} className="spin text-blue-400" /></div>
        ) : (
          <div className="grid grid-cols-4 gap-2">
            {slots.map(slot => {
              const selected = selSlots.find(s => s.startTime === slot.startTime)
              const slotPast = isSlotPast(slot.startTime, date)
              const disabled = !slot.available || slotPast
              return (
                <button key={slot.startTime} disabled={disabled}
                  onClick={() => toggleSlot(slot)}
                  className={`p-2.5 rounded-xl border text-center text-xs ${
                    slotPast
                      ? 'bg-[#f8faff] border-[#dde8f8] text-[#9aaac8] cursor-not-allowed'
                      : !slot.available
                        ? 'bg-red-500/[0.05] border-red-500/15 text-red-400/40 cursor-not-allowed'
                        : selected
                          ? 'bg-blue-600/15 border-blue-600/40 text-blue-700 font-bold ring-1 ring-blue-600/40'
                          : 'bg-green-50 border-green-400 text-green-700 hover:bg-green-100'
                  }`}>
                  <Clock size={9} className="mx-auto mb-0.5" />
                  <div className="font-semibold">{fmtTime(slot.startTime)}</div>
                  <div className="text-[8px] opacity-55">
                    {slotPast ? 'Past' : !slot.available ? 'Full' : selected ? '✓ Selected' : 'Available'}
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Payment + submit */}
      <div className="bg-white border border-[#dde8f8] rounded-2xl p-5 flex items-center justify-between">
        <div>
          <label className="flex items-center gap-2 text-sm font-semibold cursor-pointer">
            <input type="checkbox" checked={markAsPaid} onChange={e => setMarkAsPaid(e.target.checked)} />
            Mark as paid (cash at desk)
          </label>
          {!markAsPaid && (
            <div className="text-[10px] text-[#5a6a8a] mt-1">
              Booking is confirmed now — customer pays later by card or QR at the venue.
            </div>
          )}
        </div>
        <button onClick={handleSubmit} disabled={creating}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold bg-accent text-white hover:opacity-90 disabled:opacity-60">
          {creating ? <Loader size={13} className="spin" /> : <CheckCircle size={14} />}
          Create Booking{selSlots.length > 1 ? `s (${selSlots.length})` : ''}
        </button>
      </div>
    </div>
  )
}
