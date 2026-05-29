// src/components/common/Spinner.jsx
export default function Spinner({ size = 20, color = '#7c5cfc' }) {
  return (
    <div
      style={{ width: size, height: size, border: `3px solid ${color}30`, borderTopColor: color, borderRadius: '50%' }}
      className="spin"
    />
  )
}
