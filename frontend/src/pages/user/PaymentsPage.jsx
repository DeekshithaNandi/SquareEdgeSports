import { useEffect, useState } from 'react'
import { userAPI } from '../../api'
import Badge from '../../components/common/Badge'
import Spinner from '../../components/common/Spinner'
import { TrendingUp, Undo2, ReceiptText } from 'lucide-react'

export default function PaymentsPage() {
  const [payments, setPayments] = useState([])
  const [loading, setLoading]   = useState(true)

  useEffect(() => { userAPI.myPayments().then(r=>setPayments(r.data)).finally(()=>setLoading(false)) }, [])

  const visible  = payments.filter(p => p.status !== 'PENDING')
  const total    = visible.filter(p => p.status === 'PAID').reduce((s,p) => s + (parseFloat(p.amount)||0), 0)
  const refunded = visible
    .filter(p => p.status === 'REFUNDED' || p.status === 'PARTIAL_REFUND')
    .reduce((s,p) => s + (parseFloat(p.status === 'PARTIAL_REFUND' ? p.refundAmount : p.amount) || 0), 0)

  return (
    <div className="page-wrap">
      <div className="section-title mb-1">Payment History</div>
      <div className="section-sub mb-6">All your transactions in one place</div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { l: 'Total Paid',   v: '$'+total.toFixed(2),    c: '#22c55e', Icon: TrendingUp  },
          { l: 'Refunded',     v: '$'+refunded.toFixed(2), c: '#f5c842', Icon: Undo2       },
          { l: 'Transactions', v: visible.length,           c: '#7c5cfc', Icon: ReceiptText },
        ].map(s => (
          <div key={s.l} className="card p-5 relative overflow-hidden">
            <div className="absolute top-4 right-4 w-9 h-9 rounded-xl flex items-center justify-center" style={{background:s.c+'22', color:s.c}}>
              <s.Icon size={18} />
            </div>
            <div className="text-xs text-muted uppercase tracking-widest font-semibold mb-2">{s.l}</div>
            <div className="font-display text-2xl font-bold">{s.v}</div>
          </div>
        ))}
      </div>

      {loading ? <div className="flex justify-center py-20"><Spinner size={28}/></div> : (
        <div className="card overflow-hidden">
          <table className="data-table">
            <thead><tr><th>Description</th><th>Amount</th><th>Method</th><th>Reference</th><th>Date</th><th>Status</th></tr></thead>
            <tbody>
              {visible.length === 0 ? (
                <tr><td colSpan={6} className="text-center text-muted py-14">No payments yet</td></tr>
              ) : visible.map(p => (
                <tr key={p.id}>
                  <td className="text-sm">{p.description || '—'}</td>
                  <td>
                    <div className="font-bold">${parseFloat(p.amount).toFixed(2)}</div>
                    {p.status === 'PARTIAL_REFUND' && p.refundAmount && (
                      <div className="text-[10px] text-yellow-700 font-semibold mt-0.5">
                        50% Refunded · ${parseFloat(p.refundAmount).toFixed(2)}
                      </div>
                    )}
                    {p.status === 'REFUNDED' && (
                      <div className="text-[10px] text-blue-400 font-semibold mt-0.5">Full Refunded · ${parseFloat(p.amount).toFixed(2)}</div>
                    )}
                  </td>
                  <td><span className="badge-blue text-[10px]">{p.method||'—'}</span></td>
                  <td className="font-mono text-[10px] text-muted">{p.reference?.slice(0,16)}</td>
                  <td className="text-xs text-muted">{(p.paidAt || p.createdAt)?.slice(0,10)}</td>
                  <td><Badge value={p.status}/></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
