import { useState, useEffect, useRef } from 'react'
import { userAPI } from '../../api'
import { useAuth } from '../../context/AuthContext'
import AddressAutocomplete from '../../components/common/AddressAutocomplete'
import { formatFullAddress } from '../../utils/helpers'
import toast from 'react-hot-toast'
import { Camera, User, Phone, Loader, Trash2, MapPin, Building2, Globe, Hash, Map, CheckCircle } from 'lucide-react'

export default function EditProfile() {
  const { user, refreshUser } = useAuth()
  const fileRef = useRef()

  const [basicForm, setBasicForm] = useState({ fullName: '', phone: '' })

  // All address fields including lat/lng from Google
  const [address, setAddress] = useState({
    addressLine1: '',
    addressLine2: '',
    city:         '',
    state:        '',
    zipCode:      '',
    country:      '',
    lat:          null,
    lng:          null,
  })

  const [addressSelected, setAddressSelected] = useState(false) // true after Google suggestion picked
  const [saving,    setSaving]    = useState(false)
  const [uploading, setUploading] = useState(false)
  const [removing,  setRemoving]  = useState(false)

  const photoUrl = user?.profilePicture || null
  const initials = (user?.fullName || 'U').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

  // Load saved user data
  useEffect(() => {
    if (user) {
      setBasicForm({ fullName: user.fullName || '', phone: user.phone || '' })
      setAddress({
        addressLine1: user.addressLine1 || '',
        addressLine2: user.addressLine2 || '',
        city:         user.city         || '',
        state:        user.state        || '',
        zipCode:      user.zipCode      || '',
        country:      user.country      || '',
        lat:          null,
        lng:          null,
      })
      // Show filled state if address already exists
      if (user.addressLine1) setAddressSelected(true)
    }
  }, [user])

  // Called when Google Places Autocomplete returns a selection
  const handleAddressSelect = (parsed) => {
    setAddress(prev => ({ ...prev, ...parsed }))
    setAddressSelected(true)
  }

  // Called on every keystroke in address line 1
  const handleAddressChange = (val) => {
    setAddress(prev => ({ ...prev, addressLine1: val }))
    if (!val) {
      setAddressSelected(false)
      setAddress({ addressLine1: '', addressLine2: '', city: '', state: '', zipCode: '', country: '', lat: null, lng: null })
    }
  }

  const handleSave = async e => {
    e.preventDefault()
    setSaving(true)
    try {
      await userAPI.updateProfile({
        ...basicForm,
        addressLine1: address.addressLine1,
        addressLine2: address.addressLine2,
        city:         address.city,
        state:        address.state,
        zipCode:      address.zipCode,
        country:      address.country,
        // lat/lng stored if needed for future map features
      })
      await refreshUser()
      toast.success('Profile updated!')
    } catch {
      toast.error('Failed to update profile.')
    } finally {
      setSaving(false)
    }
  }

  const handleAvatarChange = async e => {
    const file = e.target.files[0]
    if (!file) return
    e.target.value = ''
    if (!file.type.startsWith('image/')) { toast.error('Only image files allowed.'); return }
    if (file.size > 5 * 1024 * 1024)    { toast.error('Max file size is 5MB.'); return }
    setUploading(true)
    try {
      const fd = new FormData(); fd.append('file', file)
      await userAPI.uploadPicture(fd)
      await refreshUser()
      toast.success('Profile photo updated!')
    } catch (err) {
      toast.error('Upload failed: ' + (err.response?.data?.message || err.message))
    } finally { setUploading(false) }
  }

  const handleRemovePhoto = async () => {
    setRemoving(true)
    try {
      await userAPI.removePhoto()
      await refreshUser()
      toast.success('Profile photo removed.')
    } catch { toast.error('Failed to remove photo.') }
    finally { setRemoving(false) }
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">My Profile</h1>
        <p className="text-sm text-muted mt-1">View and update your personal information.</p>
      </div>

      {/* ── Profile Photo ──────────────────────────────────────────────── */}
      <div className="bg-surface border border-[#dde8f8] rounded-2xl p-6">
        <h2 className="font-semibold text-xs uppercase tracking-wider text-muted mb-4">Profile Photo</h2>
        <div className="flex items-center gap-5">
          <div className="relative flex-shrink-0">
            {photoUrl
              ? <img src={photoUrl} alt="avatar" className="w-20 h-20 rounded-full object-cover border-2 border-accent/30" />
              : <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-500 to-accent flex items-center justify-center text-2xl font-bold text-white">{initials}</div>
            }
            {(uploading || removing) && (
              <div className="absolute inset-0 rounded-full bg-black/70 flex items-center justify-center">
                <Loader size={18} className="text-white spin" />
              </div>
            )}
          </div>
          <div>
            <p className="text-sm font-semibold mb-0.5">{user?.fullName}</p>
            <p className="text-xs text-muted capitalize mb-3">{user?.role?.replace('_', ' ')}</p>
            <div className="flex gap-2 flex-wrap">
              <button onClick={() => fileRef.current?.click()} disabled={uploading || removing}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-accent/10 border border-accent/20 text-accent hover:bg-accent/20 transition-all disabled:opacity-40">
                <Camera size={12} /> Change Photo
              </button>
              {photoUrl && (
                <button onClick={handleRemovePhoto} disabled={uploading || removing}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all disabled:opacity-40">
                  <Trash2 size={12} /> Remove Photo
                </button>
              )}
            </div>
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
        </div>
      </div>

      {/* ── Basic Info + Address ───────────────────────────────────────── */}
      <div className="bg-surface border border-[#dde8f8] rounded-2xl p-6">
        <h2 className="font-semibold text-xs uppercase tracking-wider text-muted mb-4">Basic Information</h2>

        {/* Read-only email */}
        <div className="mb-4 p-3 bg-[#f8faff] rounded-xl border border-[#dde8f8]">
          <div className="text-xs text-muted mb-0.5">Email Address</div>
          <div className="text-sm font-medium">{user?.email}</div>
        </div>

        <form onSubmit={handleSave} className="space-y-4">

          {/* Name + Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-muted uppercase tracking-wider block mb-1.5">Full Name</label>
              <div className="relative">
                <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                <input className="inp pl-8" value={basicForm.fullName}
                  onChange={e => setBasicForm(f => ({ ...f, fullName: e.target.value }))}
                  required placeholder="Your full name" />
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-muted uppercase tracking-wider block mb-1.5">Phone</label>
              <div className="relative">
                <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                <input className="inp pl-8" value={basicForm.phone}
                  onChange={e => setBasicForm(f => ({ ...f, phone: e.target.value }))}
                  placeholder="+91 XXXXX XXXXX" />
              </div>
            </div>
          </div>

          {/* ── Address ─────────────────────────────────────────────────── */}
          <div className="border-t border-[#dde8f8] pt-5 space-y-4">
            <div className="flex items-center gap-2">
              <MapPin size={14} className="text-accent" />
              <span className="text-xs font-bold text-white uppercase tracking-wider">Address</span>
              <span className="ml-1 px-1.5 py-0.5 rounded text-[9px] bg-blue-500/10 text-blue-400 font-normal tracking-normal normal-case">
                Google Maps
              </span>
            </div>

            {/* Address Line 1 — Google Autocomplete */}
            <div>
              <label className="text-xs font-bold text-muted uppercase tracking-wider block mb-1.5">
                Address Line 1
              </label>
              <AddressAutocomplete
                value={address.addressLine1}
                onChange={handleAddressChange}
                onSelect={handleAddressSelect}
                placeholder="Search building, street, landmark…"
              />
            </div>

            {/* Address Line 2 — manual, no API */}
            <div>
              <label className="text-xs font-bold text-muted uppercase tracking-wider block mb-1.5">
                Address Line 2
                <span className="ml-1.5 text-[9px] text-muted normal-case font-normal tracking-normal">(optional)</span>
              </label>
              <div className="relative">
                <Building2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                <input className="inp pl-8" value={address.addressLine2}
                  onChange={e => setAddress(a => ({ ...a, addressLine2: e.target.value }))}
                  placeholder="Flat no., floor, landmark, colony" />
              </div>
            </div>

            {/* Auto-filled fields — always visible, editable */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-muted uppercase tracking-wider block mb-1.5">City</label>
                <div className="relative">
                  <Map size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                  <input className={`inp pl-8 ${addressSelected && address.city ? 'border-green-500/30' : ''}`}
                    value={address.city}
                    onChange={e => setAddress(a => ({ ...a, city: e.target.value }))}
                    placeholder="City" />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-muted uppercase tracking-wider block mb-1.5">State</label>
                <div className="relative">
                  <Map size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                  <input className={`inp pl-8 ${addressSelected && address.state ? 'border-green-500/30' : ''}`}
                    value={address.state}
                    onChange={e => setAddress(a => ({ ...a, state: e.target.value }))}
                    placeholder="State" />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-muted uppercase tracking-wider block mb-1.5">Country</label>
                <div className="relative">
                  <Globe size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                  <input className={`inp pl-8 ${addressSelected && address.country ? 'border-green-500/30' : ''}`}
                    value={address.country}
                    onChange={e => setAddress(a => ({ ...a, country: e.target.value }))}
                    placeholder="Country" />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-muted uppercase tracking-wider block mb-1.5">Zip / Pincode</label>
                <div className="relative">
                  <Hash size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                  <input className={`inp pl-8 font-mono ${addressSelected && address.zipCode ? 'border-green-500/30' : ''}`}
                    value={address.zipCode}
                    onChange={e => setAddress(a => ({ ...a, zipCode: e.target.value }))}
                    placeholder="Postal code" />
                </div>
              </div>
            </div>

            {/* Summary preview — shown after address selected */}
            {addressSelected && address.addressLine1 && (
              <div className="flex items-start gap-2.5 px-3.5 py-3 bg-green-500/[0.06] border border-green-500/20 rounded-xl">
                <CheckCircle size={13} className="text-green-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-green-400 font-semibold mb-0.5">Address confirmed</p>
                  <p className="text-xs text-muted leading-relaxed">
                    {formatFullAddress(address)}
                  </p>
                  {address.lat && address.lng && (
                    <p className="text-[10px] text-muted mt-1">
                      📍 {address.lat.toFixed(5)}, {address.lng.toFixed(5)}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          <button type="submit" disabled={saving}
            className="btn-primary flex items-center gap-2 mt-2">
            {saving
              ? <><span className="w-4 h-4 border-2 border-[#dde8f8] border-t-white rounded-full spin" />Saving…</>
              : 'Save Changes'}
          </button>
        </form>
      </div>
    </div>
  )
}
