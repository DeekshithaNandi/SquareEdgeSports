import { useEffect, useState } from 'react'
import { adminAPI } from '../../api'
import Modal from '../../components/common/Modal'
import Badge from '../../components/common/Badge'
import Spinner from '../../components/common/Spinner'
import toast from 'react-hot-toast'
import { Plus, Pencil, Trash2 } from 'lucide-react'

const TYPES = ["CRICKET_LANE","BOX_CRICKET","PICKLEBALL"]
const STATUSES = ["ACTIVE","MAINTENANCE","INACTIVE"]
const ICONS = { CRICKET_LANE:"🏏", BOX_CRICKET:"🏟️", PICKLEBALL:"🏓" }
const empty = { name:"", type:"PICKLEBALL", location:"", description:"", pricePerSlot:"", memberPricePerSlot:"", capacity:"", status:"ACTIVE" }

export default function AdminCourts() {
  const [courts,  setCourts]  = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [editItem,setEditItem]= useState(null)
  const [form,    setForm]    = useState(empty)

  const load = () => { setLoading(true); adminAPI.allCourts().then(r=>setCourts(r.data)).finally(()=>setLoading(false)) }
  useEffect(load,[])

  const sf = (k,v) => setForm(f=>({...f,[k]:v}))

  const save = async () => {
    try {
      if (editItem) { await adminAPI.updateCourt(editItem.id, form); toast.success("Court updated") }
      else          { await adminAPI.createCourt(form); toast.success("Court created") }
      setShowAdd(false); setEditItem(null); setForm(empty); load()
    } catch(e) { toast.error(e.response?.data?.message||"Failed") }
  }

  const del = async id => {
    if (!confirm("Delete this court?")) return
    try { await adminAPI.deleteCourt(id); toast.success("Court deleted"); load() } catch { toast.error("Failed") }
  }

  const openEdit = c => { setEditItem(c); setForm({...c, pricePerSlot:c.pricePerSlot||"", memberPricePerSlot:c.memberPricePerSlot||"", capacity:c.capacity||""}); }

  return (
    <div className="page-wrap">
      <div className="flex items-center justify-between mb-5">
        <div><div className="section-title">Court Management</div><div className="section-sub">{courts.length} courts registered</div></div>
        <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-accent to-a2 text-white hover:opacity-90 transition-all" onClick={()=>{setForm(empty);setShowAdd(true)}}>
          <Plus size={15}/> Add Court
        </button>
      </div>

      {loading ? <div className="flex justify-center py-20"><Spinner size={28}/></div> : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {courts.map(c=>(
            <div key={c.id} className="card p-5">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center text-2xl mb-4" style={{background:"rgba(124,92,252,0.1)"}}>{ICONS[c.type]||"🏟️"}</div>
              <h4 className="font-display font-bold text-sm mb-1">{c.name}</h4>
              <div className="text-xs text-muted mb-1">📍 {c.location||"—"}</div>
              <div className="text-xs text-muted mb-3">₹{c.pricePerSlot}/slot · Member: ₹{c.memberPricePerSlot||"—"}</div>
              <div className="flex items-center justify-between mb-4">
                <Badge value={c.status||"ACTIVE"}/>
                <span className="text-xs text-muted">Cap: {c.capacity||"—"}</span>
              </div>
              <div className="flex gap-2">
                <button className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold bg-white/5 border border-white/10 hover:bg-white/10 transition-all" onClick={()=>openEdit(c)}><Pencil size={11}/>Edit</button>
                <button className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all" onClick={()=>del(c.id)}><Trash2 size={11}/>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={showAdd||!!editItem} onClose={()=>{setShowAdd(false);setEditItem(null)}} title={(editItem?"Edit — ":"+  Add ")+(editItem?.name||"Court")} size="md"
        footer={<>
          <button className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-white/5 border border-white/10 hover:bg-white/10 transition-all" onClick={()=>{setShowAdd(false);setEditItem(null)}}>Cancel</button>
          <button className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-accent to-a2 text-white hover:opacity-90 transition-all" onClick={save}>{editItem?"Save Changes":"Add Court"}</button>
        </>}>
        <div className="space-y-4">
          {[["Court Name","name","text"],["Location","location","text"],["Description","description","text"]].map(([l,k,t])=>(
            <div key={k}><label className="text-xs font-bold text-muted uppercase tracking-wider block mb-1.5">{l}</label><input className="inp" type={t} value={form[k]||""} onChange={e=>sf(k,e.target.value)}/></div>
          ))}
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs font-bold text-muted uppercase tracking-wider block mb-1.5">Type</label>
              <select className="inp" value={form.type} onChange={e=>sf("type",e.target.value)}>{TYPES.map(t=><option key={t}>{t}</option>)}</select></div>
            <div><label className="text-xs font-bold text-muted uppercase tracking-wider block mb-1.5">Status</label>
              <select className="inp" value={form.status} onChange={e=>sf("status",e.target.value)}>{STATUSES.map(s=><option key={s}>{s}</option>)}</select></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs font-bold text-muted uppercase tracking-wider block mb-1.5">Price/Slot (₹)</label>
              <input className="inp" type="number" value={form.pricePerSlot||""} onChange={e=>sf("pricePerSlot",e.target.value)}/></div>
            <div><label className="text-xs font-bold text-muted uppercase tracking-wider block mb-1.5">Member Price (₹)</label>
              <input className="inp" type="number" value={form.memberPricePerSlot||""} onChange={e=>sf("memberPricePerSlot",e.target.value)}/></div>
          </div>
          <div><label className="text-xs font-bold text-muted uppercase tracking-wider block mb-1.5">Capacity</label>
            <input className="inp" type="number" value={form.capacity||""} onChange={e=>sf("capacity",e.target.value)}/></div>
        </div>
      </Modal>
    </div>
  )
}
