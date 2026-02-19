function Notification({ type = 'success', title, message, onClose }) {
  const icon =
    type === 'success' ? '✓' : type === 'error' ? '✕' : '!'

  return (
    <div className="notification-overlay" onClick={onClose}>
      <div
        className={`notification notification--${type}`}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="notification-close"
          onClick={onClose}
          aria-label="Close"
        >
          ×
        </button>
        <div className="notification-icon">{icon}</div>
        {title && <h2 className="notification-title">{title}</h2>}
        {message && <p className="notification-message">{message}</p>}
      </div>
    </div>
  )
}

export default Notification

