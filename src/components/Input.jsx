function Input({ label, error, ...props }) {
  return (
    <div className="form-group">
      {label && <label className="form-label">{label}</label>}
      <input className={`form-input ${error ? 'input-error' : ''}`} {...props} />
      {error && <p className="form-error">{error}</p>}
    </div>
  )
}

export default Input
