import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useLanguage } from '../context/LanguageContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import PageLayout from '../components/PageLayout.jsx'
import { translations } from '../translations.js'
import Input from '../components/Input.jsx'
import Select from '../components/Select.jsx'
import Checkbox from '../components/Checkbox.jsx'
import DateInputBSAD from '../components/DateInputBSAD.jsx'
import Notification from '../components/Notification.jsx'

const GENDER_OPTIONS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
]

const BLOOD_GROUP_OPTIONS = [
  'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-',
]

function SignUp() {
  const { language } = useLanguage()
  const { signUp } = useAuth()
  const navigate = useNavigate()
  const t = translations[language]?.signUp || translations.en.signUp
    const [submitting, setSubmitting] = useState(false)
const [notification, setNotification] = useState(null)

  const [form, setForm] = useState({
    firstName: '',
    middleName: '',
    lastName: '',
    nepaliName: '',
    dob: '',
    gender: '',
    bloodGroup: '',
    phone: '',
    email: '',
    password: '',
    confirmPassword: '',
    termsExam: false,
    termsSystem: false,
  })

  const [errors, setErrors] = useState({})

  const update = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: '' }))
  }

  const validate = () => {
    const e = {}
    if (!form.firstName?.trim()) e.firstName = 'Required'
    if (!form.lastName?.trim()) e.lastName = 'Required'
    if (!form.dob?.trim()) {
      e.dob = 'Required'
    } else {
      // Age validation: must be at least 18 years
      const parts = form.dob.split('-').map((p) => parseInt(p, 10))
      if (parts.length === 3 && !parts.some(Number.isNaN)) {
        const [year, month, day] = parts
        const today = new Date()
        const dobDate = new Date(year, month - 1, day)
        if (!Number.isNaN(dobDate.getTime())) {
          let age = today.getFullYear() - year
          const beforeBirthday =
            today.getMonth() < month - 1 ||
            (today.getMonth() === month - 1 && today.getDate() < day)
          if (beforeBirthday) age -= 1

          if (age < 18) {
            e.dob = 'You must be at least 18 years old.'
            const remaining = Math.max(1, 18 - age)
            const yearsText = remaining === 1 ? 'year' : 'years'
            setNotification({
              type: 'warning',
              title: 'Age requirement not met',
              message: `You need ${remaining} more ${yearsText} to be eligible to create an account.`,
            })
          }
        }
      }
    }
    if (!form.gender) e.gender = 'Required'
    if (!form.bloodGroup) e.bloodGroup = 'Required'
    if (!form.phone?.trim()) e.phone = 'Required'
    if (!form.email?.trim()) e.email = 'Required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Invalid email'
    if (!form.password) e.password = 'Required'
    else if (form.password.length < 6) e.password = 'Min 6 characters'
    if (form.password !== form.confirmPassword) e.confirmPassword = 'Passwords do not match'
    if (!form.termsExam) e.termsExam = 'Required'
    if (!form.termsSystem) e.termsSystem = 'Required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
if (!validate()) return
    setSubmitting(true)
        try {
      await signUp({
email: form.email,
password: form.password,
        first_name: form.firstName,
        middle_name: form.middleName || undefined,
        last_name: form.lastName,
        nepali_name: form.nepaliName || undefined,
        date_of_birth: form.dob,
        gender: form.gender,
        blood_group: form.bloodGroup,
        phone: form.phone,
        role: 'user',
      })
      setNotification({
        type: 'success',
        title: 'Account created',
        message: 'Your account was created successfully. Redirecting to login…',
      })
      setTimeout(() => navigate('/login', { replace: true }), 2000)
    } catch (err) {
      setErrors({ email: err.message || 'Sign up failed' })
      setNotification({
        type: 'error',
        title: 'Sign up failed',
        message: err.message || 'Something went wrong while creating your account.',
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
    {notification && (
      <Notification
        type={notification.type}
        title={notification.title}
        message={notification.message}
        onClose={() => setNotification(null)}
      />
    )}
    <PageLayout>
    <div className="page page-signup">
      <div className="page-card">
        <h1 className="page-title">{t.title}</h1>
        <p className="page-subtitle">{t.subtitle}</p>

        <form className="signup-form" onSubmit={handleSubmit}>
          <div className="form-row form-row-3">
            <Input
              label={t.firstName}
              id="signup-firstname"
              name="first_name"
              value={form.firstName}
              onChange={(e) => update('firstName', e.target.value)}
              error={errors.firstName}
              required
              placeholder="John"
              autoComplete="given-name"
            />
            <Input
              label={t.middleName}
              id="signup-middlename"
              name="middle_name"
              value={form.middleName}
              onChange={(e) => update('middleName', e.target.value)}
              placeholder="Optional"
              autoComplete="additional-name"
            />
            <Input
              label={t.lastName}
              id="signup-lastname"
              name="last_name"
              value={form.lastName}
              onChange={(e) => update('lastName', e.target.value)}
              error={errors.lastName}
              required
              placeholder="Doe"
              autoComplete="family-name"
            />
          </div>

          <Input
            label={t.nepaliName}
            id="signup-nepaliname"
            name="nepali_name"
            value={form.nepaliName}
            onChange={(e) => update('nepaliName', e.target.value)}
            placeholder={language === 'ne' ? 'पूर्ण नाम नेपालीमा' : 'e.g. रमेश केसी'}
          />

          <div className="form-group">
            <label htmlFor="signup-dob" className="form-label">{t.dob}</label>
            <DateInputBSAD
              id="signup-dob"
              name="date_of_birth"
              value={form.dob}
              onChange={(v) => update('dob', v)}
              required
            />
            {errors.dob && <p className="form-error">{errors.dob}</p>}
          </div>

          <div className="form-row form-row-2">
            <Select
              label={t.gender}
              id="signup-gender"
              name="gender"
              value={form.gender}
              onChange={(e) => update('gender', e.target.value)}
              options={GENDER_OPTIONS}
              error={errors.gender}
              placeholder="Select gender"
              required
            />
            <Select
              label={t.bloodGroup}
              id="signup-bloodgroup"
              name="blood_group"
              value={form.bloodGroup}
              onChange={(e) => update('bloodGroup', e.target.value)}
              options={BLOOD_GROUP_OPTIONS}
              error={errors.bloodGroup}
              placeholder="Select blood group"
              required
            />
          </div>

          <Input
            label={t.phone}
            type="tel"
            id="signup-phone"
            name="phone"
            value={form.phone}
            onChange={(e) => update('phone', e.target.value)}
            error={errors.phone}
            placeholder="+977 98XXXXXXXX"
            required
            autoComplete="tel"
          />

          <Input
            label={t.email}
          type="email"
          id="signup-email"
            name="email"
          value={form.email}
          onChange={(e) => update('email', e.target.value)}
error={errors.email}
            placeholder="john@example.com"
          required
          autoComplete="email"
        />
        
          <div className="form-row form-row-2">
            <Input
              label={t.password}
          type="password"
          id="signup-password"
              name="password"
          value={form.password}
          onChange={(e) => update('password', e.target.value)}
error={errors.password}
              placeholder="Min 6 characters"
          required
          autoComplete="new-password"
            />
            <Input
              label={t.confirmPassword}
              type="password"
              id="signup-confirmpassword"
              name="confirm_password"
              value={form.confirmPassword}
              onChange={(e) => update('confirmPassword', e.target.value)}
              error={errors.confirmPassword}
              placeholder="Re-enter password"
              required
              autoComplete="new-password"
            />
          </div>

          <Checkbox
            label={t.termsExam}
            id="signup-termsexam"
            name="terms_exam"
            checked={form.termsExam}
            onChange={(e) => update('termsExam', e.target.checked)}
            error={errors.termsExam}
          />

          <Checkbox
            label={t.termsSystem}
            id="signup-termssystem"
            name="terms_system"
            checked={form.termsSystem}
            onChange={(e) => update('termsSystem', e.target.checked)}
            error={errors.termsSystem}
          />

        <button type="submit" className="btn btn-primary btn-full" disabled={submitting}>
          {submitting ? 'Signing up...' : t.submit}
        </button>
      </form>
      
        <p className="page-footer">
          {t.haveAccount} <Link to="/login">{translations[language]?.auth?.signIn || 'Sign In'}</Link>
        </p>
      </div>
    </div>
</PageLayout>
    </>
  )
}

export default SignUp
