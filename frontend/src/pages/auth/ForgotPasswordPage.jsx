import { useState } from 'react'
import { Link } from 'react-router-dom'
import { authAPI } from '../../api'
import { Zap, Mail, CheckCircle, ArrowLeft, UserX } from 'lucide-react'

export default function ForgotPasswordPage() {
  const navigate  = useNavigate()
  const [email,         setEmail]         = useState('')
  const [loading,       setLoading]       = useState(false)
  const [sent,          setSent]          = useState(false)
  const [err,           setErr]           = useState('')
  const [notRegistered, setNotRegistered] = useState(false)

  const handleSubmit = async e => {
    e.preventDefault(); setLoading(true); setErr(''); setNotRegistered(false)
    try {
      await authAPI.forgotPassword(email)
      setSent(true)
    } catch (e) {
      const msg = e.response?.data?.message || ''
      if (msg === 'USER_NOT_REGISTERED') {
        setNotRegistered(true)
      } else {
        setErr(msg || 'Something went wrong. Please try again.')
      }
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-5"
      className="min-h-screen" style={{ background: 'radial-gradient(ellipse at 30% 50%, rgba(255,107,53,0.08) 0%, #0d0f14 55%)' }}>
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
        </div>

        <div className="bg-surface/90 backdrop-blur border border-white/10 rounded-2xl p-8 shadow-2xl">
          {!sent ? (
            <>
              <div className="w-12 h-12 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center mb-4">
                <Mail size={22} className="text-accent" />
              </div>
              <h2 className="font-display text-2xl font-bold mb-1">Forgot password?</h2>
              <p className="text-sm text-muted mb-7">
                Enter your registered email address and we'll send you a link to reset your password.
              </p>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-muted uppercase tracking-wider block mb-1.5">Email Address</label>
                  <input className="inp" type="email" placeholder="you@example.com"
                    value={email} onChange={e => { setEmail(e.target.value); setErr(''); setNotRegistered(false) }} required />
                </div>

                {/* Not registered — banner */}
                {notRegistered && (
                  <div className="bg-amber-500/10 border border-amber-500/25 rounded-xl px-4 py-3">
                    <div className="flex items-center gap-2 mb-1">
                      <UserX size={15} className="text-amber-400 flex-shrink-0" />
                      <span className="text-xs font-bold text-amber-300">Account not found</span>
                    </div>
                    <p className="text-[11px] text-amber-200/70 leading-relaxed">
                      <strong className="text-amber-200">{email}</strong> is not registered.
                      Please register first before trying to reset a password.
                    </p>
                  </div>
                )}

                {/* Generic error */}
                {err && <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-xs text-red-400">{err}</div>}

                <button type="submit" disabled={loading} className="btn-primary flex items-center justify-center gap-2">
                  {loading
                    ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full spin" />Sending…</>
                    : 'Send Reset Link →'}
                </button>
              </form>
            </>
          ) : (
            <div className="text-center py-4">
              <div className="w-14 h-14 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center mx-auto mb-4">
                <CheckCircle size={28} className="text-green-400" />
              </div>
              <h2 className="font-display text-xl font-bold mb-2">Check your inbox</h2>
              <p className="text-sm text-muted mb-1">If <strong className="text-white">{email}</strong> is registered,</p>
              <p className="text-sm text-muted mb-6">you'll receive a reset link shortly. It expires in 30 minutes.</p>
              <p className="text-xs text-muted">Didn't get it? Check your spam folder or
                <button onClick={() => setSent(false)} className="text-accent hover:underline ml-1">try again</button>.
              </p>
            </div>
          )}

          <div className="mt-6 pt-5 border-t border-white/[0.06]">
            <Link to="/login" className="flex items-center justify-center gap-1.5 text-sm text-muted hover:text-white transition-colors">
              <ArrowLeft size={14} /> Back to Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
