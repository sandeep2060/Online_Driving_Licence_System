import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useLanguage } from '../context/LanguageContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import PageLayout from '../components/PageLayout.jsx'
import { translations } from '../translations.js'
import Input from '../components/Input.jsx'

function AdminLogin() {
  const { language } = useLanguage()
  const { signIn, user, role, loading } = useAuth()
  const navigate = useNavigate()
  const t = translations[language]?.adminLogin || translations.en.adminLogin

  const [form, setForm] = useState({ email: '', password: '' })
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [notAdminError, setNotAdminError] = useState(false)
  const pendingNavigate = useRef(false)
  const hasNavigated = useRef(false)
  const navigationTimeoutRef = useRef(null)

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

  // When user is set after admin login, redirect only if role is admin
  useEffect(() => {
    if (loading || !user || hasNavigated.current) return

    if (navigationTimeoutRef.current) {
      clearTimeout(navigationTimeoutRef.current)
      navigationTimeoutRef.current = null
    }

    if (pendingNavigate.current) {
      const timer = setTimeout(() => {
        if (hasNavigated.current) return
        hasNavigated.current = true
        pendingNavigate.current = false
        setSubmitting(false)
        if (role === 'admin') {
          navigate('/admin/dashboard', { replace: true })
        } else {
          setNotAdminError(true)
        }
      }, 600)
      return () => clearTimeout(timer)
    }

    if (!pendingNavigate.current && user) {
      hasNavigated.current = true
      setSubmitting(false)
      if (role === 'admin') {
        navigate('/admin/dashboard', { replace: true })
      } else if (role) {
        setNotAdminError(true)
      }
    }
  }, [user, role, loading, navigate])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return

    if (navigationTimeoutRef.current) {
      clearTimeout(navigationTimeoutRef.current)
      navigationTimeoutRef.current = null
    }

    setSubmitting(true)
    setErrors({})
    setNotAdminError(false)
    hasNavigated.current = false
    pendingNavigate.current = false

    try {
      await signIn(form.email.trim(), form.password)
      pendingNavigate.current = true

      navigationTimeoutRef.current = setTimeout(() => {
        if (!hasNavigated.current) {
          setSubmitting(false)
          pendingNavigate.current = false
          setNotAdminError(true)
        }
        navigationTimeoutRef.current = null
      }, 2000)
    } catch (err) {
      console.error('Admin login error:', err)
      setErrors({ password: err.message || 'Invalid email or password' })
      pendingNavigate.current = false
      setSubmitting(false)
      if (navigationTimeoutRef.current) {
        clearTimeout(navigationTimeoutRef.current)
        navigationTimeoutRef.current = null
      }
    }
  }

  useEffect(() => {
    return () => {
      if (navigationTimeoutRef.current) clearTimeout(navigationTimeoutRef.current)
    }
  }, [])

  // If already logged in as admin, redirect to admin dashboard
  useEffect(() => {
    if (!loading && user && role === 'admin' && !pendingNavigate.current) {
      navigate('/admin/dashboard', { replace: true })
    }
  }, [user, role, loading, navigate])

  return (
    <PageLayout>
      <div className="page page-login page-admin-login">
        <div className="page-card admin-login-card">
          <div className="admin-login-header">
            <span className="admin-login-icon">🛡️</span>
            <h1 className="page-title">{t.title}</h1>
            <p className="page-subtitle">{t.subtitle}</p>
          </div>

          <form className="login-form" onSubmit={handleSubmit}>
            <Input
              label={t.email}
              type="email"
              id="admin-login-email"
              name="email"
              value={form.email}
              onChange={(e) => update('email', e.target.value)}
              error={errors.email}
              placeholder="admin@example.com"
              required
              autoComplete="email"
            />

            <Input
              label={t.password}
              type="password"
              id="admin-login-password"
              name="password"
              value={form.password}
              onChange={(e) => update('password', e.target.value)}
              error={errors.password}
              placeholder="••••••••"
              required
              autoComplete="current-password"
            />

            {notAdminError && (
              <div className="admin-login-error">
                <span className="error-icon">⚠️</span>
                <p>{t.notAdmin}</p>
                <Link to="/login" className="btn btn-secondary btn-full">
                  {t.userSignIn}
                </Link>
              </div>
            )}

            <button type="submit" className="btn btn-primary btn-full" disabled={submitting}>
              {submitting ? t.signingIn : t.submit}
            </button>
          </form>

          <div className="admin-login-footer">
            <p className="page-footer">
              {t.userLogin} <Link to="/login">{t.userSignIn}</Link>
            </p>
            <p className="page-footer">
              <Link to="/">← {t.backToHome}</Link>
            </p>
          </div>
        </div>
      </div>
    </PageLayout>
  )
}

export default AdminLogin
