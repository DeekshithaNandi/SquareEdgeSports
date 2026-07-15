const MAP = {
  CONFIRMED:   'badge-green',
  AWAITING_PAYMENT: 'badge-yellow',
  ACTIVE:      'badge-green',
  active:      'badge-green',
  PAID:        'badge-green',
  COMPLETED:   'badge-blue',
  CANCELLED:   'badge-red',
  inactive:    'badge-yellow',
  PENDING:     'badge-yellow',
  REFUNDED:      'badge-blue',
  PARTIAL_REFUND:'badge-yellow',
  IN_PROGRESS: 'badge-blue',
  NO_SHOW:     'badge-red',
  MAINTENANCE: 'badge-yellow',
  FAILED:      'badge-red',
  SUPER_ADMIN:    'badge-purple',
  ADMINISTRATOR:  'badge-blue',
  EMPLOYEE:       'badge-yellow',
  PLAYER:         'badge-green',
}

export default function Badge({ value }) {
  const cls = MAP[value] || 'badge-blue'
  return <span className={cls}>{value?.replace(/_/g, ' ')}</span>
}
