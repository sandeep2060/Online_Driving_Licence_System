import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useLanguage } from '../context/LanguageContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import PageLayout from '../components/PageLayout.jsx'
import { translations } from '../translations.js'
import Input from '../components/Input.jsx'

function Login() {
  const { language } = useLanguage()
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const t = translations[language]?.login || translations.en.login

  const [form, setForm] = useState({ email: '', password: '' })
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)

  const update = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: '' }))
  }

  const validate = () => {
    const e = {}
    if (!form.email?.trim()) e.email = 'Required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Invalid email'
    if (!form.password) e.password = 'Required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return
    setSubmitting(true)
    setErrors({})
    try {
      const { profile } = await signIn(form.email, form.password)
      if (profile?.role === 'admin') {
        navigate('/admin/dashboard')
      } else {
        navigate('/user/dashboard')
      }
    } catch (err) {
      setErrors({ password: err.message || 'Invalid email or password' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <PageLayout>
    <div className="page page-login">
      <div className="page-card">
        <h1 className="page-title">{t.title}</h1>
        <p className="page-subtitle">Enter credentials. Role is determined from your account.</p>

        <form className="login-form" onSubmit={handleSubmit}>
          <Input
            label={t.email}
            type="email"
            value={form.email}
            onChange={(e) => update('email', e.target.value)}
            error={errors.email}
            placeholder="email@example.com"
            required
          />

          <Input
            label={t.password}
            type="password"
            value={form.password}
            onChange={(e) => update('password', e.target.value)}
            error={errors.password}
            placeholder="••••••••"
            required
          />

          <button type="submit" className="btn btn-primary btn-full" disabled={submitting}>
            {submitting ? 'Signing in...' : t.submit}
          </button>
        </form>

        <p className="page-footer">
          {t.noAccount} <Link to="/signup">{t.signUp}</Link>
        </p>
      </div>
    </div>
    </PageLayout>
  )
}

export default Login
