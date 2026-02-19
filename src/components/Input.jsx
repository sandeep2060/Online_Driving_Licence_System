import { useId } from 'react'

function Input({ label, error, id, name, ...props }) {
  const generatedId = useId()
  const inputId = id || generatedId
  const inputName = name || (props.type === 'email' ? 'email' : props.type === 'password' ? 'password' : inputId)

  return (
    <div className="form-group">
      {label && (
        <label htmlFor={inputId} className="form-label">
          {label}
        </label>
      )}
      <input
        id={inputId}
        name={inputName}
        className={`form-input ${error ? 'input-error' : ''}`}
        {...props}
      />
      {error && <p className="form-error">{error}</p>}
    </div>
  )
}

export default Input
