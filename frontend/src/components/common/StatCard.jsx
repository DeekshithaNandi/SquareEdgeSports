export default function StatCard({ title, label, value, icon, color, sub }) {
  const displayLabel = title || label

  // color can be a hex like '#7c5cfc' or a name like 'accent'
  const colorNameMap = {
    accent: '#7c5cfc',
    green:  '#22c55e',
    yellow: '#f5c842',
    purple: '#a855f7',
    blue:   '#4f8ef7',
    red:    '#ef4444',
  }
  const resolvedColor = (color && color.startsWith('#')) ? color : (colorNameMap[color] || '#7c5cfc')

  // icon can be a React component (lucide) or an emoji string
  const isComponent = icon && typeof icon !== 'string'
  const Icon = isComponent ? icon : null

  return (
    <div className="stat-card">
      <div
        className="absolute top-0 right-0 w-20 h-20 rounded-full -translate-y-4 translate-x-4 opacity-15"
        style={{ background: resolvedColor }}
      />
      <div
        className="absolute top-4 right-4 w-9 h-9 rounded-xl bg-[#f8faff] flex items-center justify-center text-lg"
        style={{ color: resolvedColor }}
      >
        {Icon ? <Icon size={18} /> : icon}
      </div>
      <div className="text-xs text-muted font-semibold uppercase tracking-widest mb-2">{displayLabel}</div>
      <div className="font-display text-3xl font-bold leading-none">{value ?? '—'}</div>
      {sub && <div className="text-xs text-muted mt-1.5">{sub}</div>}
    </div>
  )
}
