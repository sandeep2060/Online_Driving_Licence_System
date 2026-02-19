import { useState, useEffect, useCallback } from 'react'
import NepaliDate from 'nepali-date-converter'

/**
 * Date input with auto BS/AD conversion.
 * User can enter in either format; the other updates automatically.
 */
import { useId } from 'react'

function DateInputBSAD({ value, onChange, required, id, name }) {
  const generatedId = useId()
  const inputId = id || generatedId
  const inputName = name || 'date_of_birth'
  const [inputMode, setInputMode] = useState('AD')
  const [inputValue, setInputValue] = useState('')
  const [convertedDisplay, setConvertedDisplay] = useState('')
  const [error, setError] = useState('')

  const formatISO = (year, month, day) =>
    `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`

  const parseAndConvert = useCallback((str, mode) => {
    if (!str?.trim()) return null
    const clean = str.trim().replace(/[\/\s]/g, '-')
    const parts = clean.split('-').map((p) => parseInt(p, 10))
    if (parts.length !== 3 || parts.some(isNaN)) return null

    let year = parts[0]
    let month = parts[1]
    let day = parts[2]
    if (month > 12 || day > 32 || day < 1) return null

    if (year < 100 && parts[2] > 100) {
      ;[year, day] = [parts[2], parts[0]]
    }

    try {
      if (mode === 'AD') {
        if (year < 1944 || year > 2040) return null
        const nd = NepaliDate.fromAD(new Date(year, month - 1, day))
        return {
          iso: formatISO(year, month, day),
          ad: formatISO(year, month, day),
          bs: formatISO(nd.getYear(), nd.getMonth() + 1, nd.getDate()),
        }
      } else {
        if (year < 2000 || year > 2090) return null
        const nd = new NepaliDate(year, month - 1, day)
        const d = nd.toJsDate()
        return {
          iso: formatISO(d.getFullYear(), d.getMonth() + 1, d.getDate()),
          ad: formatISO(d.getFullYear(), d.getMonth() + 1, d.getDate()),
          bs: formatISO(year, month, day),
        }
      }
    } catch {
      return null
    }
  }, [])

  useEffect(() => {
    if (value) {
      const parsed = parseAndConvert(value, 'AD')
      if (parsed) {
        setInputValue(parsed.ad)
        setConvertedDisplay(`BS: ${parsed.bs}`)
        setError('')
      }
    } else {
      setInputValue('')
      setConvertedDisplay('')
    }
  }, [value])

  const handleChange = (e) => {
    const str = e.target.value
    setInputValue(str)
    setError('')

    if (!str.trim()) {
      setConvertedDisplay('')
      onChange?.('')
      return
    }

    const parsed = parseAndConvert(str, inputMode)
    if (parsed) {
      setConvertedDisplay(inputMode === 'AD' ? `BS: ${parsed.bs}` : `AD: ${parsed.ad}`)
      onChange?.(parsed.iso)
    } else {
      setConvertedDisplay('')
      if (str.length >= 8) setError('Invalid date')
    }
  }

  const switchMode = () => {
    const newMode = inputMode === 'AD' ? 'BS' : 'AD'
    setInputMode(newMode)
    if (inputValue) {
      const parsed = parseAndConvert(inputValue, inputMode)
      if (parsed) {
        const newVal = newMode === 'AD' ? parsed.ad : parsed.bs
        setInputValue(newVal)
        setConvertedDisplay(newMode === 'AD' ? `BS: ${parsed.bs}` : `AD: ${parsed.ad}`)
      }
    } else {
      setConvertedDisplay('')
    }
  }

  return (
    <div className="date-input-bsad">
      <div className="date-input-row">
        <input
          type="text"
          id={inputId}
          name={inputName}
          value={inputValue}
          onChange={handleChange}
          placeholder={inputMode === 'AD' ? 'AD: YYYY-MM-DD' : 'BS: YYYY-MM-DD'}
          className={`form-input ${error ? 'input-error' : ''}`}
          required={required}
        />
        <button type="button" className="date-mode-btn" onClick={switchMode} title="Switch BS/AD">
          {inputMode === 'AD' ? 'BS' : 'AD'}
        </button>
      </div>
      {convertedDisplay && <p className="date-converted">{convertedDisplay}</p>}
      {error && <p className="form-error">{error}</p>}
    </div>
  )
}

export default DateInputBSAD
