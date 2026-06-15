import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authAPI } from '../../api'
import { useAuth } from '../../context/AuthContext'
import toast from 'react-hot-toast'
import { Eye, EyeOff, Zap, UserX } from 'lucide-react'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate  = useNavigate()
  const [form, setForm]           = useState({ email: '', password: '' })
  const [showPw, setShowPw]       = useState(false)
  const [loading, setLoading]     = useState(false)
  const [err, setErr]             = useState('')
  const [notRegistered, setNotRegistered] = useState(false)

  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setErr(''); setNotRegistered(false) }

  const handleSubmit = async e => {
    e.preventDefault(); setLoading(true); setErr(''); setNotRegistered(false)
    try {
      const r = await authAPI.login(form)
      login(r.data.token, r.data.user)
      toast.success('Welcome back, ' + r.data.user.fullName + '!')
      const isAdmin = ['SUPER_ADMIN', 'ADMINISTRATOR', 'EMPLOYEE'].includes(r.data.user.role)
      navigate(isAdmin ? '/admin' : '/dashboard', { replace: true })
    } catch (e) {
      const msg = e.response?.data?.message || ''
      if (msg === 'USER_NOT_REGISTERED') {
        setNotRegistered(true)
      } else {
        setErr(msg || 'Invalid credentials.')
      }
    } finally { setLoading(false) }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-5"
      style={{ background: '#f0f5ff' }}
    >
      <div className="w-full max-w-[420px]">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-accent to-a2 flex items-center justify-center">
              <Zap size={18} className="text-white" fill="white" />
            </div>
            <div className="font-display text-2xl font-bold bg-gradient-to-r from-accent to-a2 bg-clip-text text-transparent">
              SquareEdgeSports
            </div>
          </div>
          <div className="text-xs text-muted uppercase tracking-widest">Indoor Sports Booking Platform</div>
        </div>

        <div className="rounded-2xl p-8 shadow-lg" style={{ background: '#ffffff', border: '1px solid #dde8f8' }}>
          <h2 className="font-display text-2xl font-bold mb-1">Welcome back</h2>
          <p className="text-sm text-muted mb-7">Sign in to your account</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-muted uppercase tracking-wider block mb-1.5">Email Address</label>
              <input className="inp" type="email" placeholder="you@example.com"
                value={form.email} onChange={e => set('email', e.target.value)} required />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-muted uppercase tracking-wider">Password</label>
                <Link to="/forgot-password" className="text-xs text-accent hover:underline">Forgot password?</Link>
              </div>
              <div className="relative">
                <input className="inp pr-10" type={showPw ? 'text' : 'password'}
                  placeholder="Enter password" value={form.password}
                  onChange={e => set('password', e.target.value)} required />
                <button type="button" onClick={() => setShowPw(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-m2 transition-colors">
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Not registered — banner */}
            {notRegistered && (
              <div className="bg-amber-500/10 border border-amber-500/25 rounded-xl px-4 py-3">
                <div className="flex items-center gap-2 mb-1">
                  <UserX size={15} className="text-amber-400 flex-shrink-0" />
                  <span className="text-xs font-bold text-amber-300">Account not found</span>
                </div>
                <p className="text-[11px] text-amber-200/70 leading-relaxed">
                  No account exists for <strong className="text-amber-200">{form.email}</strong>.
                  Please register below before signing in.
                </p>
              </div>
            )}

            {/* Generic error */}
            {err && <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-xs text-red-400">{err}</div>}

            <button type="submit" disabled={loading} className="btn-primary flex items-center justify-center gap-2 mt-2">
              {loading
                ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full spin" />Signing in…</>
                : 'Sign In →'}
            </button>
          </form>

          <p className="text-center text-sm text-muted mt-6">
            Don't have an account? <Link to="/register" className="text-accent font-semibold hover:underline">Register</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
