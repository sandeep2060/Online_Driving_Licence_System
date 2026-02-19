import { useId } from 'react'

function Select({ label, options, error, placeholder, id, name, ...props }) {
  const generatedId = useId()
  const selectId = id || generatedId
  const selectName = name || selectId

  return (
    <div className="form-group">
      {label && (
        <label htmlFor={selectId} className="form-label">
          {label}
        </label>
      )}
      <select
        id={selectId}
        name={selectName}
        className={`form-input form-select ${error ? 'input-error' : ''}`}
        {...props}
      >
        {placeholder && (
          <option value="">{placeholder}</option>
        )}
        {options.map((opt) =>
          typeof opt === 'string' ? (
            <option key={opt} value={opt}>{opt}</option>
          ) : (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          )
        )}
      </select>
      {error && <p className="form-error">{error}</p>}
    </div>
  )
}

export default Select
