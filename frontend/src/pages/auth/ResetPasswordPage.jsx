import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import { authAPI } from '../../api'
import toast from 'react-hot-toast'
import { Zap, Lock, Eye, EyeOff, CheckCircle, XCircle } from 'lucide-react'

const cardStyle = { background: '#ffffff', border: '1px solid #dde8f8' }

export default function ResetPasswordPage() {
  const [params]         = useSearchParams()
  const navigate         = useNavigate()
  const token            = params.get('token')
  const isInvite         = params.get('invite') === 'true'

  const [form, setForm]       = useState({ newPassword: '', confirm: '' })
  const [showPw, setShowPw]   = useState(false)
  const [loading, setLoading] = useState(false)
  const [done, setDone]       = useState(false)
  const [err, setErr]         = useState('')

  const checks = [
    { label: 'At least 8 characters', ok: form.newPassword.length >= 8 },
    { label: 'Passwords match',        ok: form.newPassword === form.confirm && form.confirm.length > 0 },
  ]

  useEffect(() => {
    if (!token) navigate('/login', { replace: true })
  }, [token])

  const handleSubmit = async e => {
    e.preventDefault()
    if (!checks.every(c => c.ok)) { setErr('Please meet all password requirements.'); return }
    setLoading(true); setErr('')
    try {
      await authAPI.resetPassword(token, form.newPassword)
      setDone(true)
      toast.success(isInvite ? 'Account set up successfully!' : 'Password reset successfully!')
      setTimeout(() => navigate('/login', { replace: true }), 2500)
    } catch (e) {
      setErr(e.response?.data?.message || 'This link is invalid or has expired.')
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-5" style={{ background: '#f0f5ff' }}>
      <div className="w-full max-w-[420px]">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: '#1352c9' }}>
              <Zap size={18} className="text-white" fill="white" />
            </div>
            <div className="font-display text-2xl font-bold" style={{ color: '#1352c9' }}>
              SquareEdgeSports
            </div>
          </div>
        </div>

        <div className="rounded-2xl p-8 shadow-lg" style={cardStyle}>
          {!done ? (
            <>
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4"
                style={{ background: 'rgba(19,82,201,.10)', border: '1px solid rgba(19,82,201,.20)' }}>
                <Lock size={22} style={{ color: '#1352c9' }} />
              </div>
              <h2 className="font-display text-2xl font-bold mb-1" style={{ color: '#0a1428' }}>
                {isInvite ? 'Set up your account' : 'Reset password'}
              </h2>
              <p className="text-sm mb-7" style={{ color: '#5a6a8a' }}>
                {isInvite
                  ? 'Welcome! Create a secure password to activate your account.'
                  : 'Enter a new password for your account.'}
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider block mb-1.5" style={{ color: '#5a6a8a' }}>New Password</label>
                  <div className="relative">
                    <input className="inp pr-10" type={showPw ? 'text' : 'password'}
                      placeholder="Min. 8 characters" value={form.newPassword}
                      onChange={e => { setForm(f => ({ ...f, newPassword: e.target.value })); setErr('') }} required />
                    <button type="button" onClick={() => setShowPw(s => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors" style={{ color: '#5a6a8a' }}>
                      {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wider block mb-1.5" style={{ color: '#5a6a8a' }}>Confirm Password</label>
                  <input className="inp" type="password" placeholder="Repeat new password"
                    value={form.confirm} onChange={e => { setForm(f => ({ ...f, confirm: e.target.value })); setErr('') }} required />
                </div>

                {(form.newPassword || form.confirm) && (
                  <div className="space-y-1.5 rounded-xl p-3" style={{ background: '#f8faff', border: '1px solid #dde8f8' }}>
                    {checks.map(c => (
                      <div key={c.label} className={`flex items-center gap-2 text-xs ${c.ok ? 'text-green-600' : 'text-[#9aaac8]'}`}>
                        {c.ok ? <CheckCircle size={12} /> : <XCircle size={12} />}
                        {c.label}
                      </div>
                    ))}
                  </div>
                )}

                {err && <div className="rounded-xl px-4 py-3 text-xs" style={{ background: '#fee2e2', border: '1px solid #fca5a5', color: '#dc2626' }}>{err}</div>}

                <button type="submit" disabled={loading} className="btn-primary flex items-center justify-center gap-2">
                  {loading
                    ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full spin" />Processing…</>
                    : isInvite ? 'Activate Account →' : 'Reset Password →'}
                </button>
              </form>
            </>
          ) : (
            <div className="text-center py-4">
              <div className="w-14 h-14 rounded-full bg-green-100 border border-green-300 flex items-center justify-center mx-auto mb-4">
                <CheckCircle size={28} className="text-green-600" />
              </div>
              <h2 className="font-display text-xl font-bold mb-2" style={{ color: '#0a1428' }}>
                {isInvite ? 'Account activated!' : 'Password updated!'}
              </h2>
              <p className="text-sm" style={{ color: '#5a6a8a' }}>Redirecting you to sign in…</p>
            </div>
          )}

          <div className="mt-6 pt-5 text-center" style={{ borderTop: '1px solid #dde8f8' }}>
            <Link to="/login" className="text-sm hover:text-accent transition-colors" style={{ color: '#5a6a8a' }}>
              Back to Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
