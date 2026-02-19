import { useId } from 'react'

function Checkbox({ label, description, error, id, name, ...props }) {
  const generatedId = useId()
  const checkboxId = id || generatedId
  const checkboxName = name || checkboxId

  return (
    <div className="form-group form-checkbox-group">
      <label htmlFor={checkboxId} className="checkbox-label">
        <input
          type="checkbox"
          id={checkboxId}
          name={checkboxName}
          className="form-checkbox"
          {...props}
        />
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
