import { useEffect, useRef, useState } from 'react'
import { Bell, CalendarCheck, MapPin, XCircle, Check } from 'lucide-react'
import { notificationAPI } from '../../api'

function iconFor(type) {
  if (type === 'BOOKING_CONFIRMED') return <CalendarCheck size={13} className="text-green-500" />
  if (type === 'COURT_ASSIGNED')    return <MapPin size={13} className="text-blue-500" />
  if (type === 'BOOKING_CANCELLED') return <XCircle size={13} className="text-red-500" />
  return <Bell size={13} className="text-[#9aaac8]" />
}

function timeAgo(dt) {
  if (!dt) return ''
  const diff = (Date.now() - new Date(dt).getTime()) / 1000
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState([])
  const [unread, setUnread] = useState(0)
  const ref = useRef()

  const loadCount = () => {
    notificationAPI.unreadCount().then(r => setUnread(r.data.count || 0)).catch(() => {})
  }
  const loadList = () => {
    notificationAPI.my().then(r => setItems(r.data || [])).catch(() => {})
  }

  useEffect(() => {
    loadCount()
    const interval = setInterval(loadCount, 15000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const handler = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  function toggle() {
    if (!open) loadList()
    setOpen(o => !o)
  }

  async function markRead(item) {
    if (item.read) return
    await notificationAPI.markRead(item.id)
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, read: true } : i))
    setUnread(c => Math.max(0, c - 1))
  }

  async function markAllRead() {
    await notificationAPI.markAllRead()
    setItems(prev => prev.map(i => ({ ...i, read: true })))
    setUnread(0)
  }

  return (
    <div className="relative" ref={ref}>
      <button onClick={toggle} className="relative p-2 rounded-xl hover:bg-[#f0f5ff] transition-colors">
        <Bell size={16} style={{ color: '#5a6a8a' }} />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 max-h-96 overflow-y-auto rounded-xl shadow-xl z-50 fade-in"
          style={{ background: '#ffffff', border: '1px solid #dde8f8' }}>
          <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid #dde8f8' }}>
            <span className="text-sm font-bold" style={{ color: '#0a1428' }}>Notifications</span>
            {unread > 0 && (
              <button onClick={markAllRead} className="flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-700">
                <Check size={11} /> Mark all read
              </button>
            )}
          </div>

          {items.length === 0 ? (
            <div className="px-4 py-8 text-center text-xs text-[#9aaac8]">No notifications yet</div>
          ) : items.map(item => (
            <div key={item.id} onClick={() => markRead(item)}
              className="flex items-start gap-2.5 px-4 py-3 cursor-pointer transition-colors hover:bg-[#f0f5ff]"
              style={{ borderBottom: '1px solid #dde8f8', background: item.read ? 'transparent' : '#f0f5ff' }}>
              <div className="mt-0.5 flex-shrink-0">{iconFor(item.type)}</div>
              <div className="flex-1 min-w-0">
                <div className={`text-xs leading-snug ${item.read ? 'text-[#5a6a8a]' : 'font-semibold'}`} style={{ color: item.read ? '#5a6a8a' : '#0a1428' }}>
                  {item.message}
                </div>
                <div className="text-[10px] text-[#9aaac8] mt-0.5">{timeAgo(item.createdAt)}</div>
              </div>
              {!item.read && <span className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-1.5 flex-shrink-0" />}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}