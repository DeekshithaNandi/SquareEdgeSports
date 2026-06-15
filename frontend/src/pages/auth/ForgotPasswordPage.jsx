import { useState } from 'react'
import { Link } from 'react-router-dom'
import { authAPI } from '../../api'
import { Zap, Mail, CheckCircle, ArrowLeft, UserX } from 'lucide-react'

const cardStyle = { background: '#ffffff', border: '1px solid #dde8f8' }

export default function ForgotPasswordPage() {
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
          {!sent ? (
            <>
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4"
                style={{ background: 'rgba(19,82,201,.10)', border: '1px solid rgba(19,82,201,.20)' }}>
                <Mail size={22} style={{ color: '#1352c9' }} />
              </div>
              <h2 className="font-display text-2xl font-bold mb-1" style={{ color: '#0a1428' }}>Forgot password?</h2>
              <p className="text-sm mb-7" style={{ color: '#5a6a8a' }}>
                Enter your registered email address and we'll send you a link to reset your password.
              </p>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider block mb-1.5" style={{ color: '#5a6a8a' }}>Email Address</label>
                  <input className="inp" type="email" placeholder="you@example.com"
                    value={email} onChange={e => { setEmail(e.target.value); setErr(''); setNotRegistered(false) }} required />
                </div>

                {notRegistered && (
                  <div className="rounded-xl px-4 py-3" style={{ background: '#fef9c3', border: '1px solid #fde047' }}>
                    <div className="flex items-center gap-2 mb-1">
                      <UserX size={15} className="text-yellow-600 flex-shrink-0" />
                      <span className="text-xs font-bold text-yellow-700">Account not found</span>
                    </div>
                    <p className="text-[11px] text-yellow-600 leading-relaxed">
                      <strong>{email}</strong> is not registered. Please register first.
                    </p>
                  </div>
                )}

                {err && <div className="rounded-xl px-4 py-3 text-xs" style={{ background: '#fee2e2', border: '1px solid #fca5a5', color: '#dc2626' }}>{err}</div>}

                <button type="submit" disabled={loading} className="btn-primary flex items-center justify-center gap-2">
                  {loading
                    ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full spin" />Sending…</>
                    : 'Send Reset Link →'}
                </button>
              </form>
            </>
          ) : (
            <div className="text-center py-4">
              <div className="w-14 h-14 rounded-full bg-green-100 border border-green-300 flex items-center justify-center mx-auto mb-4">
                <CheckCircle size={28} className="text-green-600" />
              </div>
              <h2 className="font-display text-xl font-bold mb-2" style={{ color: '#0a1428' }}>Check your inbox</h2>
              <p className="text-sm mb-1" style={{ color: '#5a6a8a' }}>If <strong style={{ color: '#0a1428' }}>{email}</strong> is registered,</p>
              <p className="text-sm mb-6" style={{ color: '#5a6a8a' }}>you'll receive a reset link shortly. It expires in 30 minutes.</p>
              <p className="text-xs" style={{ color: '#5a6a8a' }}>Didn't get it? Check your spam folder or
                <button onClick={() => setSent(false)} className="text-accent hover:underline ml-1">try again</button>.
              </p>
            </div>
          )}

          <div className="mt-6 pt-5" style={{ borderTop: '1px solid #dde8f8' }}>
            <Link to="/login" className="flex items-center justify-center gap-1.5 text-sm hover:text-accent transition-colors" style={{ color: '#5a6a8a' }}>
              <ArrowLeft size={14} /> Back to Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
