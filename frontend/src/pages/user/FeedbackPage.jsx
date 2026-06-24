import { useState } from 'react'
import { userAPI } from '../../api'
import toast from 'react-hot-toast'
import { CheckCircle2 } from 'lucide-react'

const LABELS = ['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent!']

const CATEGORIES = [
  'Court Quality',
  'Booking Experience',
  'Staff & Service',
  'Facilities',
  'Pricing',
  'General',
]

export default function FeedbackPage() {
  const [rating,     setRating]   = useState(0)
  const [hover,      setHover]    = useState(0)
  const [selected,   setSelected] = useState([])
  const [comment,    setComment]  = useState('')
  const [loading,    setLoading]  = useState(false)
  const [done,       setDone]     = useState(false)

  const toggleCategory = (cat) => {
    setSelected(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    )
  }

  const reset = () => {
    setRating(0)
    setSelected([])
    setComment('')
    setDone(false)
  }

  const submit = async e => {
    e.preventDefault()
    if (!rating) { toast.error('Please select a rating'); return }
    if (selected.length === 0) { toast.error('Please select at least one category'); return }
    setLoading(true)
    try {
      await userAPI.submitFeedback({
        category: selected.join(', '),
        comment,
        rating,
      })
      setDone(true)
    } catch { toast.error('Failed to submit feedback') }
    finally { setLoading(false) }
  }

  if (done) return (
    <div className="page-wrap flex flex-col items-center justify-center min-h-[50vh]">
      <div className="w-16 h-16 rounded-full bg-green-500/15 border border-green-500/25 flex items-center justify-center mb-5">
        <CheckCircle2 size={30} className="text-green-600" />
      </div>
      <h2 className="font-display text-2xl font-bold mb-2">Thank you!</h2>
      <p className="text-sm text-muted mb-8">Your feedback helps us improve the experience for everyone.</p>
      <button className="px-6 py-3 rounded-xl text-sm font-semibold bg-gradient-to-r from-accent to-a2 text-white" onClick={reset}>
        Submit Another
      </button>
    </div>
  )

  return (
    <div className="page-wrap">
      <div className="section-title mb-1">Share Your Experience</div>
      <div className="section-sub mb-6">Help us improve with your honest feedback</div>

      <div className="max-w-xl">
        <form onSubmit={submit} className="card p-6 space-y-6">

          {/* Star rating */}
          <div>
            <label className="text-xs font-bold text-muted uppercase tracking-wider block mb-3">Overall Rating</label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map(i => (
                <span key={i}
                  className="text-3xl cursor-pointer transition-transform hover:scale-110 select-none"
                  style={{ color: (hover || rating) >= i ? '#f5c842' : 'rgba(255,255,255,.15)' }}
                  onClick={() => setRating(i)}
                  onMouseEnter={() => setHover(i)}
                  onMouseLeave={() => setHover(0)}>
                  ★
                </span>
              ))}
            </div>
            {rating > 0 && (
              <p className="text-sm mt-2 font-semibold" style={{ color: '#f5c842' }}>{LABELS[rating]}</p>
            )}
          </div>

          {/* Category multi-select pills */}
          <div>
            <label className="text-xs font-bold text-muted uppercase tracking-wider block mb-3">
              Category
              <span className="ml-2 normal-case font-normal text-muted">(select all that apply)</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map(cat => {
                const active = selected.includes(cat)
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => toggleCategory(cat)}
                    className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-all ${
                      active
                        ? 'bg-accent/20 border-accent text-accent'
                        : 'bg-[#f8faff] border-[#dde8f8] text-muted hover:border-[#dde8f8] hover:text-[#0a1428]'
                    }`}>
                    {active && <span className="mr-1.5">✓</span>}
                    {cat}
                  </button>
                )
              })}
            </div>
            {selected.length > 0 && (
              <p className="text-xs text-accent mt-2">{selected.length} selected</p>
            )}
          </div>

          {/* Comment */}
          <div>
            <label className="text-xs font-bold text-muted uppercase tracking-wider block mb-1.5">Your Feedback</label>
            <textarea
              className="inp"
              rows={5}
              placeholder="Describe your experience…"
              value={comment}
              onChange={e => setComment(e.target.value)}
              required
            />
            <p className="text-xs text-muted text-right mt-1">{comment.length} characters</p>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button type="button"
              className="flex-1 py-3 rounded-xl text-sm font-semibold bg-[#f8faff] border border-[#dde8f8] hover:bg-[#f0f5ff] transition-all"
              onClick={reset}>
              Clear
            </button>
            <button type="submit" disabled={loading}
              className="flex-[2] btn-primary flex items-center justify-center gap-2">
              {loading
                ? <><span className="w-4 h-4 border-2 border-[#dde8f8] border-t-white rounded-full spin" />Submitting…</>
                : 'Submit Feedback ⭐'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
