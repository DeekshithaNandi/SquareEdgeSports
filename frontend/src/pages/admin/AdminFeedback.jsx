import { useEffect, useState } from 'react'
import { adminAPI } from '../../api'
import Spinner from '../../components/common/Spinner'
import toast from 'react-hot-toast'
import { Trash2, CheckCircle } from 'lucide-react'

const STARS = n => Array.from({length:5},(_,i)=><span key={i} style={{color:i<n?"#f5c842":"rgba(200,200,200,0.4)"}}>★</span>)

export default function AdminFeedback() {
  const [feedback, setFeedback] = useState([])
  const [loading,  setLoading]  = useState(true)

  const load = () => { setLoading(true); adminAPI.allFeedback().then(r=>setFeedback(r.data)).finally(()=>setLoading(false)) }
  useEffect(load, [])

  const markReviewed = async id => {
    try { await adminAPI.markReviewed(id); toast.success('Marked as reviewed'); load() } catch { toast.error('Failed') }
  }

  const deleteFb = async (id, name) => {
    if (!window.confirm(`Delete feedback from ${name}? This cannot be undone.`)) return
    try { await adminAPI.deleteFeedback(id); toast.success('Feedback deleted'); load() } catch { toast.error('Failed to delete') }
  }

  const avg = feedback.length ? (feedback.reduce((s,f)=>s+f.rating,0)/feedback.length).toFixed(1) : '—'

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
                  <td><span className="badge-blue text-[10px]">{f.category||'General'}</span></td>
                  <td className="text-xs text-muted whitespace-normal break-words max-w-[300px]">{f.comment}</td>
                  <td className="text-xs text-muted">{f.createdAt?.slice(0,10)}</td>
                  <td>{f.reviewed ? <span className="badge-green">Reviewed</span> : <span className="badge-yellow">Pending</span>}</td>
                  <td>
                    <div className="flex items-center gap-2">
                      {!f.reviewed && (
                        <button onClick={()=>markReviewed(f.id)}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-green-50 border border-green-200 text-green-700 hover:bg-green-100 transition-all">
                          <CheckCircle size={11}/> Review
                        </button>
                      )}
                      <button onClick={()=>deleteFb(f.id, f.userName)}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-red-50 border border-red-200 text-red-500 hover:bg-red-100 transition-all">
                        <Trash2 size={11}/> Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
