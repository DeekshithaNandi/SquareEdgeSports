import { useEffect, useState } from 'react'
import { adminAPI } from '../../api'
import Spinner from '../../components/common/Spinner'
import toast from 'react-hot-toast'

export default function AdminPricing() {
  const [rules,   setRules]   = useState([])
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState({})

  useEffect(() => { adminAPI.allPricing().then(r=>setRules(r.data)).finally(()=>setLoading(false)) }, [])

  const update = (id,k,v) => setRules(rs=>rs.map(r=>r.id===id?{...r,[k]:v}:r))

  const save = async id => {
    const rule = rules.find(r=>r.id===id)
    setSaving(s=>({...s,[id]:true}))
    try { await adminAPI.updatePrice(id,{price:rule.price,description:rule.description}); toast.success("Price updated ✓") }
    catch { toast.error("Update failed") }
    finally { setSaving(s=>({...s,[id]:false})) }
  }

  if (loading) return <div className="flex justify-center py-32"><Spinner size={32}/></div>

  return (
    <div className="page-wrap">
      <div className="section-title mb-1">Price Management</div>
      <div className="section-sub mb-6">Update slot prices and membership fees — changes reflect immediately</div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {rules.map(r => (
          <div key={r.id} className="card p-5">
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="font-display font-bold text-sm mb-1">{r.description}</div>
                <div className="font-mono text-xs text-muted">{r.ruleKey}</div>
              </div>
            </div>
            <div className="mb-4">
              <label className="text-xs font-bold text-muted uppercase tracking-wider block mb-1.5">Price (₹)</label>
              <input className="inp text-xl font-bold text-center" type="number" min="0" step="0.01"
                value={r.price} onChange={e=>update(r.id,"price",e.target.value)}/>
            </div>
            <button onClick={()=>save(r.id)} disabled={saving[r.id]}
              className="w-full py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-accent to-a2 text-white hover:opacity-90 transition-all flex items-center justify-center gap-2">
              {saving[r.id] ? <><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full spin"/>Saving…</> : "Save Price"}
            </button>
          </div>
        ))}
      </div>

      <div className="card overflow-hidden mt-6">
        <div className="p-5 border-b border-white/[0.07] font-display font-bold text-sm">Pricing Summary</div>
        <table className="data-table">
          <thead><tr><th>Rule Key</th><th>Description</th><th>Price</th><th>Last Updated</th></tr></thead>
          <tbody>
            {rules.map(r=>(
              <tr key={r.id}>
                <td className="font-mono text-xs text-muted">{r.ruleKey}</td>
                <td className="text-sm">{r.description}</td>
                <td className="font-bold">₹{parseFloat(r.price).toFixed(2)}</td>
                <td className="text-xs text-muted">{r.updatedAt?.slice(0,10)||"—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
