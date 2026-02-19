function Checkbox({ label, description, error, ...props }) {
  return (
    <div className="form-group form-checkbox-group">
      <label className="checkbox-label">
        <input type="checkbox" className="form-checkbox" {...props} />
        <span className="checkbox-text">
          {label}
          {description && <span className="checkbox-desc">{description}</span>}
        </span>
      </label>
      {error && <p className="form-error">{error}</p>}
    </div>
  )
}

export default Checkbox
