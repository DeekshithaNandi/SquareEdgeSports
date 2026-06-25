import { useEffect, useState } from 'react'
import { adminAPI } from '../../api'
import StatCard from '../../components/common/StatCard'
import Spinner from '../../components/common/Spinner'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-s2 border border-[#dde8f8] rounded-xl px-4 py-3 text-xs">
      <div className="font-bold mb-1 text-white">{label}</div>
      {payload.map(p => (
        <div key={p.name} style={{ color: p.color }} className="font-semibold">
          {p.name}: ${p.value}
        </div>
      ))}
    </div>
  )
}

export default function AdminRevenue() {
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { adminAPI.revenue().then(r => setData(r.data)).finally(() => setLoading(false)) }, [])

  if (loading) return <div className="flex justify-center py-32"><Spinner size={32} /></div>

  const chartData = (data?.revenueByDay || []).slice(-14).map(d => ({
    date: d.date?.slice(5),
    revenue: parseFloat(d.revenue || 0)
  }))

  return (
    <div className="page-wrap">
      <div className="section-title mb-1">Revenue Analytics</div>
      <div className="section-sub mb-6">Financial performance overview</div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-7">
        <StatCard label="Total Revenue"   value={'$' + parseFloat(data?.totalRevenue   || 0).toFixed(2)} icon="💰" color="#7c5cfc" sub="All time" />
        <StatCard label="Today Revenue"   value={'$' + parseFloat(data?.todayRevenue   || 0).toFixed(2)} icon="📆" color="#f5c842" sub="Today" />
        <StatCard label="Monthly Revenue" value={'$' + parseFloat(data?.monthlyRevenue || 0).toFixed(2)} icon="📈" color="#4f8ef7" sub="This month" />
        <StatCard label="Total Bookings"  value={data?.totalBookings || 0}                               icon="📅" color="#22c55e" sub="All time" />
      </div>

      <div className="card p-5 mb-5">
        <div className="font-display font-bold text-sm mb-1">Revenue Trend</div>
        <div className="text-xs text-muted mb-5">Last 14 days</div>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#7c5cfc" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#7c5cfc" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="date" tick={{ fill: '#6b6b8a', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#6b6b8a', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => '$' + v} />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="revenue" name="revenue" stroke="#7c5cfc" strokeWidth={2.5}
              fill="url(#revGrad)" dot={{ r: 3, fill: '#7c5cfc', stroke: '#080810', strokeWidth: 2 }} activeDot={{ r: 5 }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {chartData.length === 0 && (
        <div className="card p-10 text-center text-muted text-sm">No revenue data yet. Bookings will populate this chart.</div>
      )}
    </div>
  )
}
