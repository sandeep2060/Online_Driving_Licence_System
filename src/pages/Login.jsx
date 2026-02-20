import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useLanguage } from '../context/LanguageContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import PageLayout from '../components/PageLayout.jsx'
import { translations } from '../translations.js'
import Input from '../components/Input.jsx'

function Login() {
  const { language } = useLanguage()
  const { signIn, user, role, loading } = useAuth()
  const navigate = useNavigate()
  const t = translations[language]?.login || translations.en.login

  const [form, setForm] = useState({ email: '', password: '' })
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
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

  // Single unified navigation effect: handles both already-logged-in users and post-login navigation
  useEffect(() => {
    if (loading || !user || hasNavigated.current) return
    
    // Clear navigation timeout if navigation succeeds
    if (navigationTimeoutRef.current) {
      clearTimeout(navigationTimeoutRef.current)
      navigationTimeoutRef.current = null
    }
    
    // If user just logged in (pendingNavigate is set), wait a bit for profile to load
    if (pendingNavigate.current) {
      const timer = setTimeout(() => {
        if (hasNavigated.current) return
        hasNavigated.current = true
        pendingNavigate.current = false
        setSubmitting(false) // Reset submitting state when navigating
        const targetRole = role ?? 'user' // Default to 'user' if role is null
        if (targetRole === 'admin') {
          navigate('/admin/dashboard', { replace: true })
        } else {
          navigate('/user/dashboard', { replace: true })
        }
      }, 600) // Wait for profile to load
      return () => clearTimeout(timer)
    }
    
    // If user is already logged in (not from this login), navigate immediately
    if (!pendingNavigate.current) {
      hasNavigated.current = true
      setSubmitting(false)
      const targetRole = role ?? 'user' // Default to 'user' if role is null
      if (targetRole === 'admin') {
        navigate('/admin/dashboard', { replace: true })
      } else {
        navigate('/user/dashboard', { replace: true })
      }
    }
  }, [user, role, loading, navigate])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return
    
    // Clear any existing timeout
    if (navigationTimeoutRef.current) {
      clearTimeout(navigationTimeoutRef.current)
      navigationTimeoutRef.current = null
    }
    
    setSubmitting(true)
    setErrors({})
    hasNavigated.current = false
    pendingNavigate.current = false
    
    try {
      await signIn(form.email.trim(), form.password)
      pendingNavigate.current = true
      // onAuthStateChange will update user/role; useEffect above will navigate
      
      // Fallback: if navigation doesn't happen within 3 seconds, reset submitting
      navigationTimeoutRef.current = setTimeout(() => {
        if (!hasNavigated.current) {
          console.warn('Navigation timeout - resetting submitting state')
          setSubmitting(false)
          pendingNavigate.current = false
          // Try navigation anyway with default role if user exists
          if (user) {
            const targetRole = role ?? 'user'
            hasNavigated.current = true
            if (targetRole === 'admin') {
              navigate('/admin/dashboard', { replace: true })
            } else {
              navigate('/user/dashboard', { replace: true })
            }
          }
        }
        navigationTimeoutRef.current = null
      }, 3000)
    } catch (err) {
      console.error('Login error:', err)
      setErrors({ password: err.message || 'Invalid email or password' })
      pendingNavigate.current = false
      setSubmitting(false)
      
      // Clear timeout on error
      if (navigationTimeoutRef.current) {
        clearTimeout(navigationTimeoutRef.current)
        navigationTimeoutRef.current = null
      }
    }
  }
  
  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (navigationTimeoutRef.current) {
        clearTimeout(navigationTimeoutRef.current)
      }
    }
  }, [])

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
            id="login-email"
            name="email"
            value={form.email}
            onChange={(e) => update('email', e.target.value)}
            error={errors.email}
            placeholder="email@example.com"
            required
            autoComplete="email"
          />

          <Input
            label={t.password}
            type="password"
            id="login-password"
            name="password"
            value={form.password}
            onChange={(e) => update('password', e.target.value)}
            error={errors.password}
            placeholder="••••••••"
            required
            autoComplete="current-password"
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
