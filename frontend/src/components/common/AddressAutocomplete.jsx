import { useState, useRef, useEffect, useCallback } from 'react'
import { MapPin, Loader, X, ChevronRight, CheckCircle } from 'lucide-react'

const MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY

// -- Google Maps script loader (singleton) ------------------------------------
let _mapsPromise = null
function loadGoogleMaps() {
  if (_mapsPromise) return _mapsPromise
  if (window.google?.maps?.places?.AutocompleteSuggestion) {
    _mapsPromise = Promise.resolve()
    return _mapsPromise
  }
  _mapsPromise = new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.src     = `https://maps.googleapis.com/maps/api/js?key=${MAPS_KEY}&libraries=places&v=beta`
    s.async   = true
    s.defer   = true
    s.onload  = resolve
    s.onerror = () => { _mapsPromise = null; reject(new Error('Google Maps failed to load')) }
    document.head.appendChild(s)
  })
  return _mapsPromise
}

const getComp = (components, types) => {
  const c = components?.find(c => types.some(t => c.types.includes(t)))
  return c ? c.longText : ''
}

const extractPincode = (q) => {
  const match = q.match(/\b(\d{6})\b/)
  return match ? match[1] : null
}

// -- Component ----------------------------------------------------------------
export default function AddressAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder = 'Type door no., street, area…'
}) {
  const [query,       setQuery]       = useState(value || '')
  const [suggestions, setSuggestions] = useState([])
  const [loading,     setLoading]     = useState(false)
  const [open,        setOpen]        = useState(false)
  const [highlighted, setHighlighted] = useState(-1)
  const [confirmed,   setConfirmed]   = useState(!!value)
  const [ready,       setReady]       = useState(false)
  const [error,       setError]       = useState(false)

  const debounceRef  = useRef(null)
  const containerRef = useRef(null)
  const inputRef     = useRef(null)
  const sessionToken = useRef(null)

  // -- Initialise Google Maps (new Places API) ---------------------------------
  useEffect(() => {
    loadGoogleMaps()
      .then(() => {
        sessionToken.current = new window.google.maps.places.AutocompleteSessionToken()
        setReady(true)
      })
      .catch(() => setError(true))
  }, [])

  useEffect(() => {
    setQuery(value || '')
    if (!value) setConfirmed(false)
  }, [value])

  useEffect(() => {
    const h = e => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  // -- Fetch suggestions using new AutocompleteSuggestion API ------------------
  const fetchSuggestions = useCallback(async (q) => {
    if (!q || q.length < 3 || !ready) { setSuggestions([]); setOpen(false); return }
    setLoading(true)
    try {
      const { suggestions: results } =
        await window.google.maps.places.AutocompleteSuggestion.fetchAutocompleteSuggestions({
          input: q,
          includedRegionCodes: ['in', 'us'],
          sessionToken: sessionToken.current,
        })

      if (!results?.length) { setSuggestions([]); setOpen(false); setLoading(false); return }

      setSuggestions(results.map(s => ({
        prediction: s.placePrediction,
        primary:    s.placePrediction.mainText?.text    || s.placePrediction.text?.text || '',
        secondary:  s.placePrediction.secondaryText?.text || '',
      })))
      setOpen(true)
      setHighlighted(-1)
    } catch {
      setSuggestions([])
      setOpen(false)
    } finally {
      setLoading(false)
    }
  }, [ready])

  const handleInput = e => {
    const q = e.target.value
    setQuery(q)
    setConfirmed(false)
    onChange?.(q)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => fetchSuggestions(q), 300)
  }

  // -- Selection using new Place API -------------------------------------------
  const handleSelect = async (item) => {
    // Use the suggestion's full text as Address Line 1 so the field reflects
    // what was selected, not just what was typed.
    const selectedText = item.prediction.text?.text ||
      (item.secondary ? `${item.primary}, ${item.secondary}` : item.primary)
    const line1 = selectedText.trim()

    setQuery(line1)
    setLoading(true)
    setOpen(false)
    setSuggestions([])

    try {
      const place = item.prediction.toPlace()
      await place.fetchFields({
        fields: ['addressComponents'],
        sessionToken: sessionToken.current,
      })
      // Refresh session token after a completed session
      sessionToken.current = new window.google.maps.places.AutocompleteSessionToken()

      const comps      = place.addressComponents || []
      const serviceZip = getComp(comps, ['postal_code'])

      setConfirmed(true)
      onChange?.(line1)
      onSelect?.({
        addressLine1: line1,
        addressLine2: '',
        city:    getComp(comps, ['locality', 'administrative_area_level_3', 'administrative_area_level_2']),
        state:   getComp(comps, ['administrative_area_level_1']),
        zipCode: extractPincode(line1) || serviceZip,
        country: getComp(comps, ['country']) || ['India','USA'],
      })
    } catch {
      // Details fetch failed — still set what we have
      setConfirmed(true)
      onChange?.(line1)
      onSelect?.({ addressLine1: line1, addressLine2: '', city: '', state: '', zipCode: '', country: ['India','USA'] })
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = e => {
    if (!open || !suggestions.length) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setHighlighted(h => Math.min(h + 1, suggestions.length - 1)) }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setHighlighted(h => Math.max(h - 1, 0)) }
    if (e.key === 'Enter' && highlighted >= 0) { e.preventDefault(); handleSelect(suggestions[highlighted]) }
    if (e.key === 'Escape')    { setOpen(false); setHighlighted(-1) }
  }

  const clear = () => {
    setQuery(''); setConfirmed(false)
    onChange?.('')
    onSelect?.({ addressLine1: '', addressLine2: '', city: '', state: '', zipCode: '', country: '' })
    setSuggestions([]); setOpen(false)
    inputRef.current?.focus()
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <MapPin size={14} className={`absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none z-10 transition-colors ${
          confirmed ? 'text-green-700' : 'text-muted'
        }`} />
        <input
          ref={inputRef}
          type="text"
          className={`inp pl-8 pr-8 transition-all ${confirmed ? 'border-green-500/40 bg-green-500/[0.04]' : ''}`}
          placeholder={error ? 'Google Maps unavailable — type address manually' : placeholder}
          value={query}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          autoComplete="off"
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {loading   && <Loader size={13} className="text-muted spin" />}
          {confirmed && !loading && <CheckCircle size={13} className="text-green-700" />}
          {query && !loading && (
            <button type="button" onClick={clear}
              className="text-muted hover:text-[#0a1428] transition-colors ml-0.5">
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      {open && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1.5 bg-bg border border-[#dde8f8] rounded-xl shadow-2xl overflow-hidden">

          <div className="px-4 py-2.5 bg-accent/[0.06] border-b border-[#dde8f8]">
            <div className="text-[10px] text-muted uppercase tracking-wider mb-0.5">
              Your address line 1 (door no. preserved)
            </div>
            <div className="text-xs font-semibold text-accent truncate">"{query}"</div>
          </div>

          <div className="text-[10px] text-muted uppercase tracking-wider px-4 pt-2 pb-1">
            Select area to auto-fill city, state &amp; pincode
          </div>

          {suggestions.map((item, i) => (
            <button
              key={i}
              type="button"
              onMouseDown={e => { e.preventDefault(); handleSelect(item) }}
              onMouseEnter={() => setHighlighted(i)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-left border-t border-[#dde8f8] transition-colors ${
                highlighted === i ? 'bg-accent/10' : 'hover:bg-[#f8faff]'
              }`}
            >
              <MapPin size={12} className={`flex-shrink-0 ${highlighted === i ? 'text-accent' : 'text-muted'}`} />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{item.primary}</div>
                {item.secondary && (
                  <div className="text-[11px] text-muted truncate mt-0.5">{item.secondary}</div>
                )}
              </div>
              <ChevronRight size={12} className="text-muted flex-shrink-0" />
            </button>
          ))}

          <div className="px-4 py-1.5 border-t border-[#dde8f8] bg-[#f8faff] text-[10px] text-muted">
            🗺 Powered by Google Maps · Door number preserved as typed
          </div>
        </div>
      )}
    </div>
  )
}
