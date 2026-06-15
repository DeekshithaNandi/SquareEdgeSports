import { useEffect, useState } from 'react'
import { adminAPI } from '../../api'
import Modal from '../../components/common/Modal'
import Spinner from '../../components/common/Spinner'
import toast from 'react-hot-toast'
import { Plus, Pencil, Trash2 } from 'lucide-react'

const empty = { contentKey: '', title: '', body: '', imageUrl: '', contentType: 'ANNOUNCEMENT', active: true, sortOrder: 0, discountPercent: 0, dayRestriction: 'ALL_DAYS', discountTimeFrom: '', discountTimeTo: '' }
const TYPES  = ['BANNER', 'ANNOUNCEMENT', 'PAGE']

export default function AdminCMS() {
  const [items,        setItems]        = useState([])
  const [loading,      setLoading]      = useState(true)
  const [showAdd,      setShowAdd]      = useState(false)
  const [editItem,     setEditItem]     = useState(null)
  const [form,         setForm]         = useState(empty)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting,     setDeleting]     = useState(false)

  const load = () => { setLoading(true); adminAPI.allCms().then(r => setItems(r.data)).finally(() => setLoading(false)) }
  useEffect(load, [])

  const sf = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const save = async () => {
    if (!form.contentKey?.trim()) { toast.error('Content Key is required'); return }
    try {
      if (editItem) await adminAPI.updateCms(editItem.id, form)
      else          await adminAPI.createCms(form)
      toast.success(editItem ? 'Content updated' : 'Content created')
      setShowAdd(false); setEditItem(null); setForm(empty); load()
    } catch { toast.error('Failed to save') }
  }

  const doDelete = async () => {
    setDeleting(true)
    try { await adminAPI.deleteCms(deleteTarget.id); toast.success('Deleted'); setDeleteTarget(null); load() }
    catch { toast.error('Failed to delete') }
    finally { setDeleting(false) }
  }

  return (
    <div className="page-wrap">
      <div className="flex items-center justify-between mb-5">
        <div><div className="section-title">CMS Content</div><div className="section-sub">{items.length} content items</div></div>
        <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-accent to-a2 text-white hover:opacity-90 transition-all"
          onClick={() => { setForm(empty); setShowAdd(true) }}>
          <Plus size={15} /> Add Content
        </button>
      </div>

      {loading ? <div className="flex justify-center py-20"><Spinner size={28} /></div> : (
        <div className="card overflow-hidden">
          <table className="data-table">
            <thead><tr><th>Key</th><th>Title</th><th>Type</th><th>Discount</th><th>Active</th><th>Sort</th><th>Updated</th><th>Actions</th></tr></thead>
            <tbody>
              {items.length === 0
                ? <tr><td colSpan={8} className="text-center text-muted py-14">No content yet. Add banners, announcements and pages.</td></tr>
                : items.map(c => (
                  <tr key={c.id}>
                    <td className="font-mono text-xs text-muted">{c.contentKey}</td>
                    <td className="font-semibold text-sm">{c.title || '—'}</td>
                    <td><span className="badge-blue text-[10px]">{c.contentType}</span></td>
                    <td>{c.discountPercent > 0 ? <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-500/20 text-green-300">{c.discountPercent}% OFF</span> : <span className="text-xs text-muted">—</span>}</td>
                    <td>{c.active ? <span className="badge-green">Active</span> : <span className="badge-red">Inactive</span>}</td>
                    <td className="text-xs text-muted">{c.sortOrder}</td>
                    <td className="text-xs text-muted">{c.updatedAt?.slice(0, 10) || '—'}</td>
                    <td>
                      <div className="flex gap-2">
                        <button className="p-1.5 rounded-lg bg-[#f8faff] border border-[#dde8f8] hover:bg-[#f0f5ff] transition-all"
                          onClick={() => { setEditItem(c); setForm({ ...c }) }}><Pencil size={12} /></button>
                        <button className="p-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all"
                          onClick={() => setDeleteTarget(c)}><Trash2 size={12} /></button>
                      </div>
                    </td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>
      )}

      {/* Add / Edit modal */}
      <Modal open={showAdd || !!editItem} onClose={() => { setShowAdd(false); setEditItem(null) }}
        title={(editItem ? 'Edit: ' : '+ New ') + (editItem?.title || 'Content')} size="lg"
        footer={<>
          <button className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-[#f8faff] border border-[#dde8f8] hover:bg-[#f0f5ff] transition-all"
            onClick={() => { setShowAdd(false); setEditItem(null) }}>Cancel</button>
          <button className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-accent to-a2 text-white hover:opacity-90 transition-all"
            onClick={save}>{editItem ? 'Save Changes' : 'Create'}</button>
        </>}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-muted uppercase tracking-wider block mb-1.5">Content Key *</label>
              <input className="inp" value={form.contentKey || ''} onChange={e => sf('contentKey', e.target.value)} placeholder="e.g. hero_banner" />
            </div>
            <div>
              <label className="text-xs font-bold text-muted uppercase tracking-wider block mb-1.5">Type</label>
              <select className="inp" value={form.contentType} onChange={e => sf('contentType', e.target.value)}>
                {TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-muted uppercase tracking-wider block mb-1.5">Title</label>
            <input className="inp" value={form.title || ''} onChange={e => sf('title', e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-bold text-muted uppercase tracking-wider block mb-1.5">Body / Content</label>
            <textarea className="inp" rows={4} value={form.body || ''} onChange={e => sf('body', e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-bold text-muted uppercase tracking-wider block mb-1.5">Image URL (optional)</label>
            <input className="inp" type="url" value={form.imageUrl || ''} onChange={e => sf('imageUrl', e.target.value)} placeholder="https://…" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-bold text-muted uppercase tracking-wider block mb-1.5">Sort Order</label>
              <input className="inp" type="number" value={form.sortOrder ?? 0} onChange={e => sf('sortOrder', parseInt(e.target.value) || 0)} />
            </div>
            <div>
              <label className="text-xs font-bold text-muted uppercase tracking-wider block mb-1.5">Discount % (0–100)</label>
              <input className="inp" type="number" min={0} max={100} value={form.discountPercent ?? 0}
                onChange={e => sf('discountPercent', Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
                placeholder="0" />
            </div>
            <div>
              <label className="text-xs font-bold text-muted uppercase tracking-wider block mb-1.5">Status</label>
              <select className="inp" value={form.active ? 'active' : 'inactive'} onChange={e => sf('active', e.target.value === 'active')}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          {/* Discount conditions — only shown when discount > 0 */}
          {(form.discountPercent ?? 0) > 0 && (
            <div className="bg-green-500/5 border border-green-500/20 rounded-xl p-4 space-y-3">
              <div className="text-xs font-bold text-green-400 mb-1">🎯 Discount Conditions</div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-muted uppercase tracking-wider block mb-1.5">Apply On</label>
                  <select className="inp text-xs" value={form.dayRestriction || 'ALL_DAYS'} onChange={e => sf('dayRestriction', e.target.value)}>
                    <option value="ALL_DAYS">All Days</option>
                    <option value="WEEKDAYS">Weekdays Only (Mon–Fri)</option>
                    <option value="WEEKENDS">Weekends Only (Sat–Sun)</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-muted uppercase tracking-wider block mb-1.5">Time From (optional)</label>
                  <input className="inp text-xs" type="time" value={form.discountTimeFrom || ''} onChange={e => sf('discountTimeFrom', e.target.value)} />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-muted uppercase tracking-wider block mb-1.5">Time To (optional)</label>
                  <input className="inp text-xs" type="time" value={form.discountTimeTo || ''} onChange={e => sf('discountTimeTo', e.target.value)} />
                </div>
              </div>
              <p className="text-[10px] text-muted">Leave time blank to apply discount all day. Discount applies only when the booked slot falls within these conditions.</p>
            </div>
          )}
        </div>
      </Modal>

      {/* Delete confirmation modal */}
      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="🗑️ Delete Content"
        footer={<>
          <button className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-[#f8faff] border border-[#dde8f8] hover:bg-[#f0f5ff] transition-all"
            onClick={() => setDeleteTarget(null)}>Cancel</button>
          <button disabled={deleting} onClick={doDelete}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all flex items-center gap-2">
            {deleting && <span className="w-3.5 h-3.5 border-2 border-red-400/30 border-t-red-400 rounded-full spin" />}
            Delete
          </button>
        </>}>
        {deleteTarget && (
          <p className="text-sm text-muted leading-relaxed">
            Delete content block <strong className="text-white">"{deleteTarget.title || deleteTarget.contentKey}"</strong>? This cannot be undone.
          </p>
        )}
      </Modal>
    </div>
  )
}
