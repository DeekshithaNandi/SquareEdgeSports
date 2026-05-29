import { useEffect, useState } from 'react'
import { adminAPI } from '../../api'
import Spinner from '../../components/common/Spinner'
import toast from 'react-hot-toast'

const STARS = n => Array.from({length:5},(_,i)=><span key={i} style={{color:i<n?"#f5c842":"rgba(255,255,255,0.15)"}}>★</span>)

export default function AdminFeedback() {
  const [feedback, setFeedback] = useState([])
  const [loading,  setLoading]  = useState(true)

  const load = () => { setLoading(true); adminAPI.allFeedback().then(r=>setFeedback(r.data)).finally(()=>setLoading(false)) }
  useEffect(load,[])

  const markReviewed = async id => {
    try { await adminAPI.markReviewed(id); toast.success("Marked as reviewed"); load() } catch { toast.error("Failed") }
  }

  const avg = feedback.length ? (feedback.reduce((s,f)=>s+f.rating,0)/feedback.length).toFixed(1) : "—"

  return (
    <div className="page-wrap">
      <div className="flex items-center justify-between mb-5">
        <div>
          <div className="section-title">Feedback</div>
          <div className="section-sub">{feedback.length} reviews · Avg rating: {avg} ⭐</div>
        </div>
      </div>

      {loading ? <div className="flex justify-center py-20"><Spinner size={28}/></div> : (
        <div className="card overflow-hidden">
          <table className="data-table">
            <thead><tr><th>User</th><th>Rating</th><th>Category</th><th>Comment</th><th>Date</th><th>Status</th><th>Action</th></tr></thead>
            <tbody>
              {feedback.length===0 ? <tr><td colSpan={7} className="text-center text-muted py-14">No feedback yet</td></tr>
              : feedback.map(f=>(
                <tr key={f.id}>
                  <td className="font-semibold text-xs">{f.userName}</td>
                  <td><div className="flex text-sm">{STARS(f.rating)}</div></td>
                  <td><span className="badge-blue text-[10px]">{f.category||"General"}</span></td>
                  <td className="text-xs text-muted max-w-[220px] truncate">{f.comment}</td>
                  <td className="text-xs text-muted">{f.createdAt?.slice(0,10)}</td>
                  <td>{f.reviewed ? <span className="badge-green">Reviewed</span> : <span className="badge-yellow">Pending</span>}</td>
                  <td>{!f.reviewed && <button className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white/5 border border-white/10 hover:bg-white/10 transition-all" onClick={()=>markReviewed(f.id)}>Mark Reviewed</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
