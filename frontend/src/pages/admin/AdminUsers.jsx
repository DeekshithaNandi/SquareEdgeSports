import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { adminAPI } from '../../api'
import { useAuth } from '../../context/AuthContext'
import Modal from '../../components/common/Modal'
import Badge from '../../components/common/Badge'
import Spinner from '../../components/common/Spinner'
import toast from 'react-hot-toast'
import { Search, Trash2, UserPlus, Shield, Mail, Send, Crown } from 'lucide-react'

const ROLES = ['PLAYER', 'EMPLOYEE', 'ADMINISTRATOR', 'SUPER_ADMIN']

const ROLE_COLORS = {
  PLAYER:        { bg: 'bg-green-100',  border: 'border-green-300',  text: 'text-green-700',  active: 'bg-green-200 border-green-500' },
  EMPLOYEE:      { bg: 'bg-blue-100',   border: 'border-blue-300',   text: 'text-blue-700',   active: 'bg-blue-200 border-blue-500'   },
  ADMINISTRATOR: { bg: 'bg-purple-100', border: 'border-purple-300', text: 'text-purple-700', active: 'bg-purple-200 border-purple-500'},
  SUPER_ADMIN:   { bg: 'bg-red-100',    border: 'border-red-300',    text: 'text-red-700',    active: 'bg-red-200 border-red-500'     },
}

const FILTER_TABS = [
  { label: 'All',          value: 'ALL'          },
  { label: 'Players',      value: 'PLAYER'       },
  { label: 'Employees',    value: 'EMPLOYEE'     },
  { label: 'Admins',       value: 'ADMINISTRATOR'},
  { label: 'Super Admins', value: 'SUPER_ADMIN'  },
]

const PERM_LABELS = [
  { key: 'canManageBookings', label: 'Bookings', desc: 'View & manage bookings'     },
  { key: 'canManagePayments', label: 'Payments', desc: 'View & manage payments'     },
  { key: 'canManageCourts',   label: 'Courts',   desc: 'Add & edit courts'          },
  { key: 'canViewReports',    label: 'Reports',  desc: 'Access revenue & analytics' },
  { key: 'canManageUsers',    label: 'Users',    desc: 'Create & edit users'        },
]

// Higher number = higher privilege
const ROLE_RANK = { PLAYER: 0, EMPLOYEE: 1, ADMINISTRATOR: 2, SUPER_ADMIN: 3 }
const VALID_ROLES = new Set(ROLES)

export default function AdminUsers() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { user: me } = useAuth()

  // Safe read of ?role= param — ignore if not a valid role string
  const paramRole = searchParams.get('role')
  const initialTab = paramRole && VALID_ROLES.has(paramRole) ? paramRole : 'ALL'

  const [users,        setUsers]        = useState([])
  const [loading,      setLoading]      = useState(true)
  const [search,       setSearch]       = useState('')
  const [roleFilter,   setRoleFilter]   = useState(initialTab)
  const [view,         setView]         = useState(null)
  const [edit,         setEdit]         = useState(null)
  const [ef,           setEf]           = useState({})
  const [invite,       setInvite]       = useState(false)
  const [invForm,      setInvForm]      = useState({ fullName: '', email: '', role: 'PLAYER', phone: '' })
  const [invLoading,   setInvLoading]   = useState(false)
  const [permUser,     setPermUser]     = useState(null)
  const [perms,        setPerms]        = useState({})
  const [permLoading,  setPermLoading]  = useState(false)
  const [deleteTarget,  setDeleteTarget]  = useState(null)
  const [deleting,      setDeleting]      = useState(false)
  const [memberUser,    setMemberUser]    = useState(null)
  const [memberForm,    setMemberForm]    = useState({ cricketLaneMember: false, boxCricketMember: false, pickleballMember: false })
  const [memberLoading, setMemberLoading] = useState(false)

  const load = () => {
    setLoading(true)
    adminAPI.allUsers().then(r => setUsers(r.data)).finally(() => setLoading(false))
  }
  useEffect(load, [])

  // When URL param changes (e.g. user clicks Quick Action again), sync the tab
  useEffect(() => {
    const p = searchParams.get('role')
    if (p && VALID_ROLES.has(p)) setRoleFilter(p)
    else if (!p) setRoleFilter('ALL')
  }, [searchParams])

  const switchTab = (value) => {
    setRoleFilter(value)
    if (value === 'ALL') setSearchParams({}, { replace: true })
    else setSearchParams({ role: value }, { replace: true })
  }

  // Filter: role tab first, then search text
  const filtered = users
    .filter(u => roleFilter === 'ALL' || u.role === roleFilter)
    .filter(u =>
      !search ||
      u.fullName?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase()) ||
      u.role?.toLowerCase().includes(search.toLowerCase())
    )

  // Delete permission: you can only delete users ranked strictly below you
  const myRank = ROLE_RANK[me?.role] ?? 0
  const canDelete = (targetUser) => {
    if (!me || targetUser.id === me.id) return false
    return myRank > (ROLE_RANK[targetUser.role] ?? 0)
  }

  const deleteTooltip = (targetUser) => {
    if (targetUser.id === me?.id) return 'Cannot delete your own account'
    if (me?.role === 'ADMINISTRATOR' && targetUser.role === 'SUPER_ADMIN')
      return 'Managers cannot delete Super Admin accounts'
    if (me?.role === 'EMPLOYEE' && (targetUser.role === 'SUPER_ADMIN' || targetUser.role === 'ADMINISTRATOR'))
      return 'Employees cannot delete Admin or Super Admin accounts'
    return null
  }

  const doDelete = async () => {
    setDeleting(true)
    try { await adminAPI.deleteUser(deleteTarget.id); toast.success('User deleted'); setDeleteTarget(null); load() }
    catch { toast.error('Failed to delete user') }
    finally { setDeleting(false) }
  }

  const saveEdit = async () => {
    try { await adminAPI.updateUser(edit.id, ef); toast.success('User updated'); setEdit(null); load() }
    catch { toast.error('Update failed') }
  }

  const sendInvite = async () => {
    if (!invForm.fullName || !invForm.email) { toast.error('Name and email are required'); return }
    setInvLoading(true)
    try {
      await adminAPI.inviteUser(invForm)
      toast.success(`Invitation sent to ${invForm.email}`)
      setInvite(false)
      setInvForm({ fullName: '', email: '', role: 'PLAYER', phone: '' })
      load()
    } catch (e) { toast.error(e.response?.data?.message || 'Failed to send invite') }
    finally { setInvLoading(false) }
  }

  const openPermissions = async (user) => {
    setPermUser(user)
    try { const r = await adminAPI.getPermissions(user.id); setPerms(r.data) }
    catch { setPerms({}) }
  }

  const savePermissions = async () => {
    setPermLoading(true)
    try {
      await adminAPI.updatePermissions(permUser.id, perms)
      toast.success('Permissions updated — employee access refreshed immediately')
      setPermUser(null); load()
    } catch { toast.error('Failed to update permissions') }
    finally { setPermLoading(false) }
  }

  const togglePerm = key => setPerms(p => ({ ...p, [key]: !p[key] }))

  const openMembership = (user) => {
    setMemberUser(user)
    setMemberForm({
      cricketLaneMember: !!user.cricketLaneMember,
      boxCricketMember:  !!user.boxCricketMember,
      pickleballMember:  !!user.pickleballMember,
    })
  }

  const saveMembership = async () => {
    setMemberLoading(true)
    try {
      await adminAPI.updateMembership(memberUser.id, memberForm)
      toast.success('Membership updated — email sent to player')
      setMemberUser(null); load()
    } catch { toast.error('Failed to update membership') }
    finally { setMemberLoading(false) }
  }

  const toggleMember = key => setMemberForm(m => ({ ...m, [key]: !m[key] }))

  const roleGradient = role => ({
    SUPER_ADMIN:   'from-red-500 to-red-700',
    ADMINISTRATOR: 'from-purple-500 to-accent',
    EMPLOYEE:      'from-blue-500 to-cyan-500',
    PLAYER:        'from-green-500 to-emerald-500',
  }[role] || 'from-gray-500 to-gray-600')

  const RolePicker = ({ value, onChange }) => (
    <div className="grid grid-cols-2 gap-2">
      {ROLES.map(r => {
        const c = ROLE_COLORS[r]
        const selected = value === r
        return (
          <button key={r} type="button" onClick={() => onChange(r)}
            className={`py-2.5 rounded-xl text-xs font-bold border transition-all ${
              selected ? `${c.active} ${c.text}` : `${c.bg} ${c.border} ${c.text} opacity-50 hover:opacity-90`
            }`}>
            {r.replace('_', ' ')}
          </button>
        )
      })}
    </div>
  )

  const countFor = role => role === 'ALL' ? users.length : users.filter(u => u.role === role).length

  return (
    <div className="page-wrap">
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div>
          <div className="section-title">User Management</div>
          <div className="section-sub">{filtered.length} of {users.length} users · {users.filter(u => u.active).length} active</div>
        </div>
        <div className="flex gap-3 flex-wrap">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              className="bg-[#f8faff] border border-[#dde8f8] rounded-xl pl-9 pr-4 py-2 text-sm text-[#0a1428] outline-none focus:border-accent transition-all w-56"
              placeholder="Search users…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <button onClick={() => setInvite(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold bg-gradient-to-r from-accent to-a2 text-white hover:opacity-90 transition-all">
            <UserPlus size={14} /> Invite User
          </button>
        </div>
      </div>

      {/* Role filter tabs */}
      <div className="flex gap-1.5 bg-[#f8faff] rounded-xl p-1 w-fit mb-5 flex-wrap">
        {FILTER_TABS.map(tab => (
          <button key={tab.value} onClick={() => switchTab(tab.value)}
            className={'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ' +
              (roleFilter === tab.value ? 'bg-accent text-white' : 'text-muted hover:text-[#0a1428]')}>
            {tab.label}
            <span className={'px-1.5 py-0.5 rounded-full text-[10px] font-bold ' +
              (roleFilter === tab.value ? 'bg-white text-accent' : 'bg-[#dde8f8] text-muted')}>
              {countFor(tab.value)}
            </span>
          </button>
        ))}
      </div>

      {loading ? <div className="flex justify-center py-20"><Spinner size={28} /></div> : (
        <div className="card overflow-hidden">
          <table className="data-table">
            <thead>
              <tr><th>User</th><th>Email</th><th>Phone</th><th>Role</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {filtered.map(u => {
                const allowed  = canDelete(u)
                const tip      = deleteTooltip(u)
                return (
                  <tr key={u.id}>
                    <td>
                      <div className="flex items-center gap-2.5">
                        {u.profilePicture
                          ? <img src={u.profilePicture} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                          : <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${roleGradient(u.role)} flex items-center justify-center text-xs font-bold text-white flex-shrink-0`}>
                              {u.fullName?.split(' ').map(w => w[0]).join('').slice(0, 2)}
                            </div>
                        }
                        <div>
                          <div className="font-semibold text-sm">{u.fullName}</div>
                          {!u.emailVerified && <span className="text-[10px] text-yellow-700">⚠ Pending setup</span>}
                        </div>
                      </div>
                    </td>
                    <td className="text-xs text-muted">{u.email}</td>
                    <td className="text-xs">{u.phone || '—'}</td>
                    <td><Badge value={u.role} /></td>
                    <td><Badge value={u.active ? 'active' : 'inactive'} /></td>
                    <td>
                      <div className="flex gap-1.5 flex-wrap items-center">
                        <button className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#f8faff] border border-[#dde8f8] hover:bg-[#f0f5ff] transition-all"
                          onClick={() => setView(u)}>View</button>
                        <button className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#f8faff] border border-[#dde8f8] hover:bg-[#f0f5ff] transition-all"
                          onClick={() => { setEdit(u); setEf({ fullName: u.fullName, phone: u.phone || '', addressLine1: u.addressLine1 || '', city: u.city || '', state: u.state || '', country: u.country || '', zipCode: u.zipCode || '', active: u.active, role: u.role }) }}>
                          Edit
                        </button>
                        {u.role === 'EMPLOYEE' && (
                          <button className="px-3 py-1.5 rounded-lg text-xs font-bold bg-purple-100 border border-purple-300 text-purple-700 hover:bg-purple-200 transition-all"
                            onClick={() => openPermissions(u)}>
                            <Shield size={11} className="inline mr-1" />Perms
                          </button>
                        )}
                        {u.role === 'PLAYER' && (
                          <button className="px-3 py-1.5 rounded-lg text-xs font-bold bg-yellow-100 border border-yellow-300 text-yellow-700 hover:bg-yellow-200 transition-all"
                            onClick={() => openMembership(u)}>
                            <Crown size={11} className="inline mr-1" />Member
                          </button>
                        )}
                        {/* Delete — disabled with tooltip when not permitted */}
                        <div className="relative group/del inline-block">
                          <button
                            disabled={!allowed}
                            onClick={() => allowed && setDeleteTarget(u)}
                            title={tip || ''}
                            className={`p-1.5 rounded-lg text-xs border transition-all ${
                              allowed
                                ? 'bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20 cursor-pointer'
                                : 'bg-[#f8faff] border-[#dde8f8] text-[#9aaac8] cursor-not-allowed'
                            }`}>
                            <Trash2 size={12} />
                          </button>
                          {!allowed && tip && (
                            <div className="absolute bottom-8 right-0 z-50 hidden group-hover/del:block whitespace-nowrap bg-s2 border border-[#dde8f8] rounded-xl px-3 py-2 text-[11px] text-muted shadow-xl pointer-events-none">
                              {tip}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="text-center py-10 text-muted text-sm">
                  {roleFilter !== 'ALL' ? `No ${roleFilter.replace('_', ' ').toLowerCase()}s found` : 'No users found'}
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* View / Profile Modal */}
      <Modal open={!!view} onClose={() => setView(null)} title="Profile"
        footer={
          <div className="flex gap-2">
            <button className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-[#f8faff] border border-[#dde8f8] hover:bg-[#f0f5ff]"
              onClick={() => setView(null)}>Close</button>
            {view && me && ROLE_RANK[me.role] > ROLE_RANK[view.role] && (
              <button className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-accent to-a2 text-white hover:opacity-90"
                onClick={() => { setView(null); setEdit(view); setEf({ fullName: view.fullName, phone: view.phone || '', addressLine1: view.addressLine1 || '', city: view.city || '', state: view.state || '', country: view.country || '', zipCode: view.zipCode || '', active: view.active, role: view.role }) }}>
                Edit Profile
              </button>
            )}
          </div>
        }>
        {view && (() => {
          const isStaff = view.role !== 'PLAYER'
          const fullAddress = [view.addressLine1, view.addressLine2, view.city, view.state, view.zipCode, view.country].filter(Boolean).join(', ')
          const accessLabel = {
            SUPER_ADMIN:   { text: 'Complete system access — all modules & settings', color: 'text-red-700',    bg: 'bg-red-50 border-red-200'     },
            ADMINISTRATOR: { text: 'Full admin access — all modules & settings',       color: 'text-purple-700', bg: 'bg-purple-50 border-purple-200'},
            EMPLOYEE:      { text: 'Restricted access — permissions set individually', color: 'text-blue-700',   bg: 'bg-blue-50 border-blue-200'   },
          }[view.role]
          return (
            <div className="space-y-5">
              {/* ── Header ── */}
              <div className="flex items-center gap-4 pb-5 border-b border-[#dde8f8]">
                {view.profilePicture
                  ? <img src={view.profilePicture} alt="" className="w-16 h-16 rounded-2xl object-cover flex-shrink-0 ring-2 ring-white/10" />
                  : <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${roleGradient(view.role)} flex items-center justify-center text-xl font-bold text-white flex-shrink-0`}>
                      {view.fullName?.split(' ').map(w => w[0]).join('').slice(0, 2)}
                    </div>
                }
                <div className="min-w-0">
                  <div className="text-lg font-bold truncate">{view.fullName}</div>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <Badge value={view.role} />
                    <Badge value={view.active ? 'active' : 'inactive'} />
                    {!view.emailVerified && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-yellow-100  text-yellow-700 border border-yellow-300">
                        ⚠ Setup Pending
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-muted mt-1">
                    Joined {view.createdAt?.slice(0, 10) || '—'}
                  </div>
                </div>
              </div>

              {/* ── Contact Info ── */}
              <div>
                <div className="text-[10px] font-bold text-muted uppercase tracking-wider mb-2.5">Contact Information</div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-[#f8faff] border border-[#dde8f8] rounded-xl p-3">
                    <div className="text-[10px] text-muted font-semibold mb-1">Email</div>
                    <div className="text-xs font-semibold break-all">{view.email}</div>
                    <div className={`text-[10px] mt-1 font-semibold ${view.emailVerified ? 'text-green-700' : 'text-yellow-600'}`}>
                      {view.emailVerified ? '✓ Verified' : '⚠ Not verified'}
                    </div>
                  </div>
                  <div className="bg-[#f8faff] border border-[#dde8f8] rounded-xl p-3">
                    <div className="text-[10px] text-muted font-semibold mb-1">Phone</div>
                    <div className="text-xs font-semibold">{view.phone || <span className="text-muted italic">Not set</span>}</div>
                  </div>
                </div>
              </div>

              {/* ── Address ── */}
              <div>
                <div className="text-[10px] font-bold text-muted uppercase tracking-wider mb-2.5">Address</div>
                <div className="bg-[#f8faff] border border-[#dde8f8] rounded-xl p-3 text-xs">
                  {fullAddress
                    ? <div className="space-y-0.5">
                        {view.addressLine1 && <div className="font-semibold">{view.addressLine1}</div>}
                        {view.addressLine2 && <div className="text-muted">{view.addressLine2}</div>}
                        <div className="text-muted">
                          {[view.city, view.state, view.zipCode].filter(Boolean).join(', ')}
                        </div>
                        {view.country && <div className="text-muted">{view.country}</div>}
                      </div>
                    : <span className="text-muted italic">No address on file</span>
                  }
                </div>
              </div>

              {/* ── Access / Permissions (staff only) ── */}
              {isStaff && (
                <div>
                  <div className="text-[10px] font-bold text-muted uppercase tracking-wider mb-2.5">Access Level</div>
                  <div className={`rounded-xl p-3 border ${accessLabel.bg} mb-3`}>
                    <div className={`text-xs font-semibold ${accessLabel.color}`}>{accessLabel.text}</div>
                  </div>
                  {view.role === 'EMPLOYEE' && view.permissions && (
                    <div className="grid grid-cols-5 gap-1.5">
                      {PERM_LABELS.map(p => (
                        <div key={p.key}
                          className={`rounded-xl p-2.5 border text-center transition-all ${
                            view.permissions[p.key]
                              ? 'bg-green-500/10 border-green-500/25'
                              : 'bg-[#f8faff] border-[#dde8f8]'
                          }`}>
                          <div className={`text-[10px] font-bold mb-1 ${view.permissions[p.key] ? 'text-green-700' : 'text-muted'}`}>
                            {view.permissions[p.key] ? '✓' : '✗'}
                          </div>
                          <div className={`text-[9px] font-semibold leading-tight ${view.permissions[p.key] ? 'text-green-700' : 'text-[#9aaac8]'}`}>
                            {p.label}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {(view.role === 'ADMINISTRATOR' || view.role === 'SUPER_ADMIN') && (
                    <div className="grid grid-cols-5 gap-1.5">
                      {PERM_LABELS.map(p => (
                        <div key={p.key} className="rounded-xl p-2.5 border bg-green-500/10 border-green-500/25 text-center">
                          <div className="text-[10px] font-bold text-green-700 mb-1">✓</div>
                          <div className="text-[9px] font-semibold text-green-700 leading-tight">{p.label}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ── Player membership (players only) ── */}
              {!isStaff && (
                <div>
                  <div className="text-[10px] font-bold text-muted uppercase tracking-wider mb-2.5">Memberships</div>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { key: 'cricketLaneMember', label: 'Cricket Lane', emoji: '🏏' },
                      { key: 'boxCricketMember',  label: 'Box Cricket',  emoji: '🏟️' },
                      { key: 'pickleballMember',  label: 'Pickleball',   emoji: '🏓' },
                    ].map(s => (
                      <div key={s.key} className={`rounded-xl p-3 border text-center ${view[s.key] ? 'bg-yellow-100 border-yellow-300' : 'bg-[#f8faff] border-[#dde8f8]'}`}>
                        <div className="text-lg mb-1">{s.emoji}</div>
                        <div className={`text-[10px] font-bold ${view[s.key] ? 'text-yellow-700' : 'text-muted'}`}>{s.label}</div>
                        <div className={`text-[9px] mt-0.5 ${view[s.key] ? 'text-green-700' : 'text-[#9aaac8]'}`}>{view[s.key] ? '✓ Active' : 'Inactive'}</div>
                      </div>
                    ))}
                  </div>
                  {view.membershipExpiry && (() => {
                    const expired = new Date(view.membershipExpiry + 'Z') < new Date()
                    return (
                      <div className="mt-2 text-[11px] text-center">
                        <span style={{ color: expired ? '#dc2626' : '#5a6a8a' }}>
                          {expired ? 'Expired: ' : 'Expires: '}{view.membershipExpiry?.slice(0, 10)}
                        </span>
                      </div>
                    )
                  })()}
                </div>
              )}
            </div>
          )
        })()}
      </Modal>

      {/* Edit Modal */}
      <Modal open={!!edit} onClose={() => setEdit(null)} title="✏️ Edit User"
        footer={<>
          <button className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-[#f8faff] border border-[#dde8f8] hover:bg-[#f0f5ff]" onClick={() => setEdit(null)}>Cancel</button>
          <button className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-accent to-a2 text-white hover:opacity-90" onClick={saveEdit}>Save Changes</button>
        </>}>
        {edit && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-muted uppercase tracking-wider block mb-1.5">Full Name</label>
                <input className="inp" value={ef.fullName || ''} onChange={e => setEf(f => ({ ...f, fullName: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-bold text-muted uppercase tracking-wider block mb-1.5">Phone</label>
                <input className="inp" value={ef.phone || ''} onChange={e => setEf(f => ({ ...f, phone: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-muted uppercase tracking-wider block mb-1.5">Address</label>
              <input className="inp" placeholder="Address line 1" value={ef.addressLine1 || ''} onChange={e => setEf(f => ({ ...f, addressLine1: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-bold text-muted uppercase tracking-wider block mb-2">Role</label>
              <RolePicker value={ef.role || 'PLAYER'} onChange={v => setEf(f => ({ ...f, role: v }))} />
            </div>
            <div>
              <label className="text-xs font-bold text-muted uppercase tracking-wider block mb-1.5">Status</label>
              <div className="flex gap-2">
                {['active', 'inactive'].map(s => (
                  <button key={s} type="button" onClick={() => setEf(f => ({ ...f, active: s === 'active' }))}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${
                      ef.active === (s === 'active')
                        ? s === 'active' ? 'bg-green-200 border-green-500 text-green-700' : 'bg-red-200 border-red-500 text-red-700'
                        : 'bg-[#f8faff] border-[#dde8f8] text-muted opacity-60 hover:opacity-90'
                    }`}>
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-muted uppercase tracking-wider block mb-1.5">New Password (leave blank to keep)</label>
              <input className="inp" type="password" placeholder="••••••••" onChange={e => setEf(f => ({ ...f, password: e.target.value }))} />
            </div>
          </div>
        )}
      </Modal>

      {/* Invite Modal */}
      <Modal open={invite} onClose={() => setInvite(false)} title="✉️ Invite New User"
        footer={<>
          <button className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-[#f8faff] border border-[#dde8f8] hover:bg-[#f0f5ff]" onClick={() => setInvite(false)}>Cancel</button>
          <button disabled={invLoading} onClick={sendInvite}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-accent to-a2 text-white hover:opacity-90 disabled:opacity-60">
            {invLoading ? <span className="w-4 h-4 border-2 border-[#dde8f8] border-t-white rounded-full spin" /> : <Send size={13} />}
            Send Invitation
          </button>
        </>}>
        <div className="space-y-4">
          <div className="bg-accent/5 border border-accent/20 rounded-xl px-4 py-3 flex items-start gap-2.5">
            <Mail size={14} className="text-accent mt-0.5 flex-shrink-0" />
            <p className="text-xs text-muted leading-relaxed">
              An invitation email will be sent with a secure link to set up their password. Link expires in 24 hours.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-muted uppercase tracking-wider block mb-1.5">Full Name *</label>
              <input className="inp" placeholder="John Smith" value={invForm.fullName} onChange={e => setInvForm(f => ({ ...f, fullName: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-bold text-muted uppercase tracking-wider block mb-1.5">Phone</label>
              <input className="inp" placeholder="+91 XXXXX XXXXX" value={invForm.phone} onChange={e => setInvForm(f => ({ ...f, phone: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-muted uppercase tracking-wider block mb-1.5">Email Address *</label>
            <input className="inp" type="email" placeholder="user@example.com" value={invForm.email} onChange={e => setInvForm(f => ({ ...f, email: e.target.value }))} />
          </div>
          <div>
            <label className="text-xs font-bold text-muted uppercase tracking-wider block mb-2">Role</label>
            <RolePicker value={invForm.role} onChange={v => setInvForm(f => ({ ...f, role: v }))} />
          </div>
        </div>
      </Modal>

      {/* Permissions Modal */}
      <Modal open={!!permUser} onClose={() => setPermUser(null)} title={`🔐 Permissions — ${permUser?.fullName || ''}`}
        footer={<>
          <button className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-[#f8faff] border border-[#dde8f8] hover:bg-[#f0f5ff]" onClick={() => setPermUser(null)}>Cancel</button>
          <button disabled={permLoading} onClick={savePermissions}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-accent to-a2 text-white hover:opacity-90 disabled:opacity-60">
            {permLoading ? <span className="w-4 h-4 border-2 border-[#dde8f8] border-t-white rounded-full spin" /> : 'Save Permissions'}
          </button>
        </>}>
        <div className="space-y-2">
          <p className="text-xs text-muted mb-3">Toggle module access for this employee. Changes take effect immediately.</p>
          {PERM_LABELS.map(p => (
            <button key={p.key} onClick={() => togglePerm(p.key)}
              className={`w-full flex items-center justify-between p-3.5 rounded-xl border transition-all ${perms[p.key] ? 'bg-accent/10 border-accent/30' : 'bg-[#f8faff] border-[#dde8f8] hover:bg-[#f8faff]'}`}>
              <div className="text-left">
                <div className={`text-sm font-bold ${perms[p.key] ? 'text-accent' : 'text-[#0a1428]'}`}>{p.label}</div>
                <div className="text-xs text-muted">{p.desc}</div>
              </div>
              <div className={`w-10 h-5 rounded-full transition-all relative flex-shrink-0 ${perms[p.key] ? 'bg-accent' : 'bg-[#f0f5ff]'}`}>
                <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${perms[p.key] ? 'left-5' : 'left-0.5'}`} />
              </div>
            </button>
          ))}
        </div>
      </Modal>

      {/* Membership Modal */}
      <Modal open={!!memberUser} onClose={() => setMemberUser(null)} title={`👑 Membership — ${memberUser?.fullName || ''}`}
        footer={<>
          <button className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-[#f8faff] border border-[#dde8f8] hover:bg-[#f0f5ff]" onClick={() => setMemberUser(null)}>Cancel</button>
          <button disabled={memberLoading} onClick={saveMembership}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-blue-700 to-blue-600 text-white hover:opacity-90 disabled:opacity-60 flex items-center gap-2">
            {memberLoading ? <span className="w-4 h-4 border-2 border-[#dde8f8] border-t-white rounded-full spin" /> : <Crown size={13} />}
            Save Membership
          </button>
        </>}>
        <div className="space-y-3">
          <p className="text-xs text-muted mb-1">Toggle sport memberships for this player. An email notification will be sent for each newly activated sport.</p>
          {[
            { key: 'cricketLaneMember', label: 'Cricket Lane',  emoji: '🏏', desc: 'Access to cricket lane at member rates' },
            { key: 'boxCricketMember',  label: 'Box Cricket',   emoji: '🏟️', desc: 'Access to box cricket at member rates'  },
            { key: 'pickleballMember',  label: 'Pickleball',    emoji: '🏓', desc: 'Access to pickleball at member rates'  },
          ].map(sport => (
            <button key={sport.key} onClick={() => toggleMember(sport.key)}
              className={`w-full flex items-center justify-between p-3.5 rounded-xl border transition-all ${
                memberForm[sport.key]
                  ? 'bg-yellow-100 border-yellow-300'
                  : 'bg-[#f8faff] border-[#dde8f8] hover:bg-[#f8faff]'
              }`}>
              <div className="flex items-center gap-3">
                <span className="text-xl">{sport.emoji}</span>
                <div className="text-left">
                  <div className={`text-sm font-bold ${memberForm[sport.key] ? 'text-yellow-700' : 'text-[#0a1428]'}`}>{sport.label}</div>
                  <div className="text-xs text-muted">{sport.desc}</div>
                </div>
              </div>
              <div className={`w-10 h-5 rounded-full transition-all relative flex-shrink-0 ${memberForm[sport.key] ? 'bg-yellow-500' : 'bg-[#f0f5ff]'}`}>
                <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${memberForm[sport.key] ? 'left-5' : 'left-0.5'}`} />
              </div>
            </button>
          ))}
          {memberUser && (
            <div className="mt-3 p-3 rounded-xl bg-[#f8faff] border border-[#dde8f8]">
              <div className="text-xs text-muted font-semibold mb-1.5">Current Membership Status</div>
              <div className="flex gap-2 flex-wrap">
                {[
                  { key: 'cricketLaneMember', label: 'Cricket Lane' },
                  { key: 'boxCricketMember',  label: 'Box Cricket'  },
                  { key: 'pickleballMember',  label: 'Pickleball'   },
                ].map(s => (
                  <span key={s.key} className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    memberUser[s.key] ? 'bg-yellow-100 text-yellow-700' : 'bg-[#f8faff] text-muted'
                  }`}>
                    {s.label}: {memberUser[s.key] ? '✓ Active' : '✗ None'}
                  </span>
                ))}
                {memberUser.membershipExpiry && (
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    new Date(memberUser.membershipExpiry + 'Z') < new Date()
                      ? 'bg-red-100 text-red-700'
                      : 'bg-blue-100 text-blue-700'
                  }`}>
                    {new Date(memberUser.membershipExpiry + 'Z') < new Date() ? 'Expired: ' : 'Expires: '}
                    {memberUser.membershipExpiry?.slice(0, 10)}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* Delete confirmation modal */}
      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="🗑️ Delete User"
        footer={<>
          <button className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-[#f8faff] border border-[#dde8f8] hover:bg-[#f0f5ff] transition-all"
            onClick={() => setDeleteTarget(null)}>Cancel</button>
          <button disabled={deleting} onClick={doDelete}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all flex items-center gap-2">
            {deleting && <span className="w-3.5 h-3.5 border-2 border-red-400/30 border-t-red-400 rounded-full spin" />}
            Delete User
          </button>
        </>}>
        {deleteTarget && (
          <p className="text-sm text-muted leading-relaxed">
            Are you sure you want to delete <strong className="text-[#0a1428]">{deleteTarget.fullName}</strong> ({deleteTarget.email})?
            This action cannot be undone.
          </p>
        )}
      </Modal>
    </div>
  )
}
