import { useState, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authAPI } from '../../api'
import toast from 'react-hot-toast'
import { Eye, EyeOff, Mail, CheckCircle2, Zap} from 'lucide-react'

const pwStrength = p => { let s=0; if(p.length>=8)s++; if(/[A-Z]/.test(p))s++; if(/[0-9]/.test(p))s++; if(/[^A-Za-z0-9]/.test(p))s++; return s }
const SW = ['','#ef4444','#f97316','#f5c842','#22c55e']
const SL = ['','Weak','Fair','Good','Strong']

export default function RegisterPage() {
  const navigate  = useNavigate()
  const [step, setStep] = useState('form')
  const [form, setForm] = useState({ fullName:'', email:'', password:'', confirm:'', phone:'' })
  const [showPw, setShowPw] = useState(false)
  const [otp,   setOtp]    = useState(['','','','','',''])
  const [loading, setLoading] = useState(false)
  const [err,    setErr]    = useState('')
  const otpRefs = useRef([])
  const strength = pwStrength(form.password)
  const set = (k,v) => { setForm(f=>({...f,[k]:v})); setErr('') }

  const sendOtp = async e => {
    e.preventDefault(); setErr('')
    if (form.password !== form.confirm) { setErr('Passwords do not match.'); return }
    if (strength < 2) { setErr('Password too weak. Add uppercase, numbers or symbols.'); return }
    setLoading(true)
    try { await authAPI.sendOtp(form.email, form.fullName); setStep('verify'); toast.success('Code sent to '+form.email) }
    catch(e) { setErr(!e.response ? 'Cannot reach server. Make sure the backend is running.' : (e.response?.data?.message||'Failed to send verification code.')) }
    finally { setLoading(false) }
  }

  const verifyOtp = async () => {
    const code = otp.join('')
    if (code.length < 6) { setErr('Enter the complete 6-digit code.'); return }
    setLoading(true); setErr('')
    try {
      await authAPI.verifyOtp(form.email, code)
      await authAPI.register({ fullName:form.fullName, email:form.email, password:form.password, phone:form.phone })
      setStep('done')
    } catch(e) { setErr(e.response?.data?.message||'Incorrect or expired code.') }
    finally { setLoading(false) }
  }

  const handleOtpChange = (i,v) => {
    if(!/^[0-9]?$/.test(v)) return
    const n=[...otp]; n[i]=v; setOtp(n); setErr('')
    if(v && i<5) otpRefs.current[i+1]?.focus()
  }
  const handleOtpKey = (i,e) => {
    if(e.key==='Backspace'&&!otp[i]&&i>0) otpRefs.current[i-1]?.focus()
    if(e.key==='Enter') verifyOtp()
  }

  const bg = {background:'radial-gradient(ellipse at 30% 50%, rgba(255,107,53,0.08) 0%, #0d0f14 55%)'}

  if (step==='done') return (
    <div className="min-h-screen flex items-center justify-center p-5" style={bg}>
      <div className="w-full max-w-[420px] bg-surface/90 backdrop-blur border border-white/10 rounded-2xl p-10 shadow-2xl text-center">
        <div className="w-16 h-16 rounded-full bg-green-500/15 border border-green-500/25 flex items-center justify-center mx-auto mb-5"><CheckCircle2 size={32} className="text-green-400"/></div>
        <h2 className="font-display text-2xl font-bold mb-2">All set!</h2>
        <p className="text-sm text-muted mb-8 leading-relaxed">Welcome to SquareEdgeSports, <strong className="text-white">{form.fullName}</strong>!<br/>Your account is verified and ready.</p>
        <button className="btn-primary" onClick={()=>navigate('/login')}>Sign In Now →</button>
      </div>
    </div>
  )

  if (step==='verify') return (
    <div className="min-h-screen flex items-center justify-center p-5" style={bg}>
      <div className="w-full max-w-[420px] bg-surface/90 backdrop-blur border border-white/10 rounded-2xl p-8 shadow-2xl">
        <div className="text-center mb-7">
          <div className="w-14 h-14 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center mx-auto mb-4"><Mail size={26} className="text-accent"/></div>
          <h2 className="font-display text-2xl font-bold mb-2">Verify your email</h2>
          <p className="text-sm text-muted leading-relaxed">We sent a 6-digit code to<br/><strong className="text-white">{form.email}</strong></p>
        </div>
        <div className="flex gap-2.5 justify-center my-6">
          {otp.map((v,i)=>(
            <input key={i} ref={el=>otpRefs.current[i]=el} className="otp-input" maxLength={1} value={v}
              onChange={e=>handleOtpChange(i,e.target.value)} onKeyDown={e=>handleOtpKey(i,e)} onFocus={e=>e.target.select()}/>
          ))}
        </div>
        {err && <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-xs text-red-400 mb-4 text-center">{err}</div>}
        <button disabled={loading} className="btn-primary flex items-center justify-center gap-2" onClick={verifyOtp}>
          {loading ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full spin"/>Verifying…</> : 'Verify Email →'}
        </button>
        <div className="flex items-center justify-between mt-5 text-xs text-muted">
          <button className="hover:text-white transition-colors" onClick={()=>{setStep('form');setOtp(['','','','','','']);setErr('')}}>← Go back</button>
          <button className="hover:text-accent transition-colors" onClick={()=>{authAPI.sendOtp(form.email,form.fullName);toast.success('New code sent!')}}>Resend code</button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen flex items-center justify-center p-5" style={bg}>
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
          <div className="text-xs text-muted uppercase tracking-widest">Create your account</div>
        </div>
        <div className="bg-surface/90 backdrop-blur border border-white/10 rounded-2xl p-8 shadow-2xl">
          <h2 className="font-display text-2xl font-bold mb-1">Create account</h2>
          <p className="text-sm text-muted mb-7">Join SquareEdgeSports and start booking courts</p>
          <form onSubmit={sendOtp} className="space-y-4">
            <div><label className="text-xs font-bold text-muted uppercase tracking-wider block mb-1.5">Full Name</label><input className="inp" placeholder="Your full name" value={form.fullName} onChange={e=>set('fullName',e.target.value)} required/></div>
            <div><label className="text-xs font-bold text-muted uppercase tracking-wider block mb-1.5">Email Address</label><input className="inp" type="email" placeholder="you@example.com" value={form.email} onChange={e=>set('email',e.target.value)} required/></div>
            <div><label className="text-xs font-bold text-muted uppercase tracking-wider block mb-1.5">Phone (optional)</label><input className="inp" type="tel" placeholder="+91 98765 43210" value={form.phone} onChange={e=>set('phone',e.target.value)}/></div>
            <div>
              <label className="text-xs font-bold text-muted uppercase tracking-wider block mb-1.5">Password</label>
              <div className="relative">
                <input className="inp pr-10" type={showPw?'text':'password'} placeholder="Min. 8 characters" value={form.password} onChange={e=>set('password',e.target.value)} required/>
                <button type="button" onClick={()=>setShowPw(s=>!s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-white transition-colors">{showPw?<EyeOff size={16}/>:<Eye size={16}/>}</button>
              </div>
              {form.password && <div className="flex items-center gap-2 mt-2"><div className="flex-1 h-1 rounded-full bg-white/5 overflow-hidden"><div className="h-full rounded-full transition-all" style={{width:(strength/4*100)+'%',background:SW[strength]}}/></div><span className="text-xs font-bold" style={{color:SW[strength]}}>{SL[strength]}</span></div>}
            </div>
            <div><label className="text-xs font-bold text-muted uppercase tracking-wider block mb-1.5">Confirm Password</label><input className="inp" type="password" placeholder="Re-enter password" value={form.confirm} onChange={e=>set('confirm',e.target.value)} required/></div>
            {err && <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-xs text-red-400">{err}</div>}
            <button type="submit" disabled={loading} className="btn-primary flex items-center justify-center gap-2 mt-2">
              {loading?<><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full spin"/>Sending code…</>:'Continue →'}
            </button>
          </form>
          <p className="text-center text-sm text-muted mt-6">Already have an account? <Link to="/login" className="text-accent font-semibold hover:underline">Sign In</Link></p>
        </div>
      </div>
    </div>
  )
}