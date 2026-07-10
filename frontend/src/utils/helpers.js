// ── Time ──────────────────────────────────────────────────────────────────────
export const fmtTime = (t) => {
  if (!t) return ''
  const [h, m] = t.toString().split(':')
  const hour = parseInt(h)
  return `${hour % 12 || 12}:${m} ${hour >= 12 ? 'PM' : 'AM'}`
}

// ── Currency ──────────────────────────────────────────────────────────────────
export const formatCurrency = (amount) => {
  const n = parseFloat(amount || 0)
  return '$' + n.toFixed(2)
}

// ── Date ──────────────────────────────────────────────────────────────────────
export const fmtLocal = (d) => {
  const dt = d instanceof Date ? d : new Date()
  return (
    dt.getFullYear() + '-' +
    String(dt.getMonth() + 1).padStart(2, '0') + '-' +
    String(dt.getDate()).padStart(2, '0')
  )
}

// ── Cancellation refund helper ─────────────────────────────────────────────────
export const getRefundInfo = (bookingDate, startTime) => {
  if (!bookingDate || !startTime) return { label: 'Refund depends on timing', pct: null }
  const sessionStart = new Date(`${bookingDate}T${startTime}`)
  const hoursUntil = (sessionStart - new Date()) / 36e5
  if (hoursUntil > 24) return { label: 'Full refund (>24 hrs away)', pct: 100 }
  if (hoursUntil > 1)  return { label: '50% refund (1–24 hrs away)', pct: 50  }
  return { label: 'No refund (<1 hr away)', pct: 0 }
}

// ── Address formatter ─────────────────────────────────────────────────────────
export const formatFullAddress = (addr) => {
  if (!addr) return ''
  return [addr.addressLine1, addr.addressLine2, addr.city, addr.state, addr.zipCode, addr.country]
    .filter(Boolean)
    .join(', ')
}

// ── Google Places address parser ───────────────────────────────────────────────
export const parseAddressComponents = (place) => {
  if (!place || !place.address_components) return {}
  const get = (types) => {
    const comp = place.address_components.find(c => types.some(t => c.types.includes(t)))
    return comp ? comp.long_name : ''
  }
  const getShort = (types) => {
    const comp = place.address_components.find(c => types.some(t => c.types.includes(t)))
    return comp ? comp.short_name : ''
  }
  return {
    addressLine1: [get(['street_number']), get(['route'])].filter(Boolean).join(' '),
    city:         get(['locality', 'administrative_area_level_2']),
    state:        get(['administrative_area_level_1']),
    country:      get(['country']),
    zipCode:      get(['postal_code']),
    countryCode:  getShort(['country']),
    lat:          place.geometry?.location?.lat?.() ?? null,
    lng:          place.geometry?.location?.lng?.() ?? null,
    formattedAddress: place.formatted_address || '',
  }
}
