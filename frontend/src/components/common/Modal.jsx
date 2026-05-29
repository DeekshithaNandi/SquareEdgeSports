export default function Modal({ open, onClose, title, children, footer, size = 'md' }) {
  if (!open) return null
  const maxW = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-2xl', xl: 'max-w-4xl' }[size]
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose?.()}>
      <div className={`modal-box ${maxW} fade-in`}>
        {title && <h3 className="font-display text-lg font-bold mb-5">{title}</h3>}
        {children}
        {footer && <div className="flex gap-3 justify-end mt-6">{footer}</div>}
      </div>
    </div>
  )
}
