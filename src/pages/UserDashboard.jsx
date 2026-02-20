import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { supabase } from '../lib/supabase.js'
import DashboardLayout from '../components/DashboardLayout.jsx'
import ProtectedRoute from '../components/ProtectedRoute.jsx'

const DAYS_90 = 90

function daysBetween(a, b) {
  const one = new Date(a.getFullYear(), a.getMonth(), a.getDate())
  const two = new Date(b.getFullYear(), b.getMonth(), b.getDate())
  const diff = two.getTime() - one.getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24))
}

function UserDashboard() {
  const { user, profile } = useAuth()
  const [kycData, setKycData] = useState(null)
  const [examData, setExamData] = useState(null)
  const [licenceData, setLicenceData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      loadDashboardData()
    }
  }, [user])

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      const [kycResult, examResult, licenceResult] = await Promise.all([
        supabase
          .from('kyc')
          .select('*')
          .eq('user_id', user.id)
          .order('submitted_at', { ascending: false })
          .limit(1)
          .single(),
        supabase
          .from('exams')
          .select('*')
          .eq('user_id', user.id)
          .order('attempted_at', { ascending: false })
          .limit(1)
          .single(),
        supabase
          .from('licences')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single(),
      ])

      if (kycResult.data) setKycData(kycResult.data)
      if (examResult.data) setExamData(examResult.data)
      if (licenceResult.data) setLicenceData(licenceResult.data)
    } catch (err) {
      console.error('Error loading dashboard data:', err)
    } finally {
      setLoading(false)
    }
  }

  const kycStatus = kycData?.status || 'pending'
  const lastExam = examData
  const licence = licenceData

  let examMessage = 'You are eligible to book your first exam.'
  let examLocked = false
  let daysRemaining = null
  let canGiveExam = false

  if (lastExam?.status === 'failed') {
    const lastAttempt = new Date(lastExam.attempted_at)
    const now = new Date()
    const diff = daysBetween(lastAttempt, now)
    if (diff < DAYS_90) {
      examLocked = true
      daysRemaining = DAYS_90 - diff
      examMessage = `You can retake the exam in ${daysRemaining} day${daysRemaining === 1 ? '' : 's'}.`
    } else {
      examMessage = 'You are eligible to retake the exam.'
    }
  }

  if (lastExam?.status === 'passed' && licence?.expires_at) {
    const expires = new Date(licence.expires_at)
    const now = new Date()
    if (expires > now) {
      examLocked = true
      examMessage = 'You have already passed the exam. Exam is disabled until your licence expires.'
    }
  }

  const kycBlocking = kycStatus !== 'verified'
  canGiveExam = !examLocked && !kycBlocking

  const examProgress = lastExam
    ? lastExam.status === 'passed'
      ? 100
      : lastExam.score || 0
    : 0

  const kycProgress =
    kycStatus === 'verified'
      ? 100
      : kycStatus === 'submitted'
      ? 75
      : kycStatus === 'pending'
      ? 25
      : 0

  if (loading) {
    return (
      <DashboardLayout>
        <div className="dashboard-loading">
          <div className="loading-spinner-large">Loading...</div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="advanced-dashboard">
        {/* Welcome Header */}
        <div className="dashboard-header">
          <div className="welcome-section">
            <h1 className="welcome-title">
              Welcome back, <span className="highlight">{profile?.first_name || 'User'}</span>! 👋
            </h1>
            <p className="welcome-subtitle">Here's your driving licence journey overview</p>
          </div>
          <div className="header-actions">
            <Link to="/profile" className="btn-icon">
              <span>⚙️</span>
              <span>Settings</span>
            </Link>
          </div>
        </div>

        {/* Quick Stats Cards */}
        <div className="stats-grid">
          <div className="stat-card stat-primary">
            <div className="stat-icon">📋</div>
            <div className="stat-content">
              <div className="stat-label">KYC Status</div>
              <div className="stat-value">
                {kycStatus === 'verified'
                  ? 'Verified ✓'
                  : kycStatus === 'submitted'
                  ? 'Pending ⏳'
                  : 'Incomplete'}
              </div>
              <div className="stat-progress">
                <div className="progress-bar-mini">
                  <div
                    className="progress-fill-mini"
                    style={{ width: `${kycProgress}%` }}
                  />
                </div>
                <span className="progress-text-mini">{kycProgress}%</span>
              </div>
            </div>
          </div>

          <div className="stat-card stat-success">
            <div className="stat-icon">📝</div>
            <div className="stat-content">
              <div className="stat-label">Exam Status</div>
              <div className="stat-value">
                {lastExam
                  ? lastExam.status === 'passed'
                    ? 'Passed ✓'
                    : `Failed (${lastExam.score}%)`
                  : 'Not Attempted'}
              </div>
              <div className="stat-progress">
                <div className="progress-bar-mini">
                  <div
                    className="progress-fill-mini"
                    style={{ width: `${examProgress}%` }}
                  />
                </div>
                <span className="progress-text-mini">{examProgress}%</span>
              </div>
            </div>
          </div>

          <div className="stat-card stat-info">
            <div className="stat-icon">🪪</div>
            <div className="stat-content">
              <div className="stat-label">Licence Status</div>
              <div className="stat-value">
                {licence ? 'Active' : 'Not Issued'}
              </div>
              {licence?.expires_at && (
                <div className="stat-meta">
                  Expires: {new Date(licence.expires_at).toLocaleDateString()}
                </div>
              )}
            </div>
          </div>

          <div className="stat-card stat-warning">
            <div className="stat-icon">⏰</div>
            <div className="stat-content">
              <div className="stat-label">Next Exam</div>
              <div className="stat-value">
                {daysRemaining !== null
                  ? `${daysRemaining} days`
                  : canGiveExam
                  ? 'Available Now'
                  : 'Not Available'}
              </div>
              {daysRemaining !== null && (
                <div className="stat-meta">Until retake allowed</div>
              )}
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="dashboard-grid">
          {/* Left Column */}
          <div className="dashboard-column">
            {/* Exam Section */}
            <div className="dashboard-card exam-card">
              <div className="card-header">
                <div className="card-header-left">
                  <span className="card-icon">📚</span>
                  <h2 className="card-title">Exam & Practice</h2>
                </div>
                <div className={`status-badge ${canGiveExam ? 'success' : 'warning'}`}>
                  {canGiveExam ? 'Ready' : 'Locked'}
                </div>
              </div>

              <div className="exam-info-section">
                <div className="info-item">
                  <span className="info-icon">📅</span>
                  <div className="info-content">
                    <div className="info-label">Last Attempt</div>
                    <div className="info-value">
                      {lastExam
                        ? new Date(lastExam.attempted_at).toLocaleDateString()
                        : 'No attempts yet'}
                    </div>
                  </div>
                </div>

                <div className="info-item">
                  <span className="info-icon">📊</span>
                  <div className="info-content">
                    <div className="info-label">Last Score</div>
                    <div className="info-value">
                      {lastExam ? `${lastExam.score || 0}%` : '—'}
                    </div>
                  </div>
                </div>

                {daysRemaining !== null && (
                  <div className="info-item">
                    <span className="info-icon">⏳</span>
                    <div className="info-content">
                      <div className="info-label">Days Until Retake</div>
                      <div className="info-value highlight-warning">{daysRemaining} days</div>
                    </div>
                  </div>
                )}
              </div>

              <div className="exam-message-box">
                <span className="message-icon">💡</span>
                <p>{examMessage}</p>
              </div>

              <div className="card-actions">
                <Link
                  to="/exam"
                  className={`btn btn-primary btn-full ${!canGiveExam ? 'btn-disabled' : ''}`}
                  aria-disabled={!canGiveExam}
                >
                  <span>📝</span>
                  <span>Take Exam</span>
                </Link>
                <Link to="/practice" className="btn btn-secondary btn-full">
                  <span>📚</span>
                  <span>Practice Exam</span>
                </Link>
              </div>
            </div>

            {/* KYC Section */}
            <div className="dashboard-card kyc-card">
              <div className="card-header">
                <div className="card-header-left">
                  <span className="card-icon">👤</span>
                  <h2 className="card-title">Profile & KYC</h2>
                </div>
                <div className={`status-badge badge--${kycStatus}`}>
                  {kycStatus === 'verified'
                    ? '✓ Verified'
                    : kycStatus === 'submitted'
                    ? '⏳ Pending'
                    : '📝 Incomplete'}
                </div>
              </div>

              <div className="kyc-progress-section">
                <div className="progress-circle-container">
                  <svg className="progress-circle" viewBox="0 0 100 100">
                    <circle
                      className="progress-circle-bg"
                      cx="50"
                      cy="50"
                      r="45"
                    />
                    <circle
                      className="progress-circle-fill"
                      cx="50"
                      cy="50"
                      r="45"
                      strokeDasharray={`${kycProgress * 2.827} 282.7`}
                    />
                  </svg>
                  <div className="progress-circle-text">{kycProgress}%</div>
                </div>
                <div className="kyc-details">
                  <div className="detail-item">
                    <span className="detail-label">Email</span>
                    <span className="detail-value">{user?.email}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Name</span>
                    <span className="detail-value">
                      {[profile?.first_name, profile?.middle_name, profile?.last_name]
                        .filter(Boolean)
                        .join(' ') || '—'}
                    </span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Phone</span>
                    <span className="detail-value">{profile?.phone || '—'}</span>
                  </div>
                </div>
              </div>

              {kycData?.rejection_reason && (
                <div className="rejection-notice">
                  <span className="notice-icon">⚠️</span>
                  <div>
                    <strong>Rejection Reason:</strong>
                    <p>{kycData.rejection_reason}</p>
                  </div>
                </div>
              )}

              <div className="card-actions">
                <Link to="/profile" className="btn btn-primary btn-full">
                  <span>✏️</span>
                  <span>{kycData ? 'Update KYC' : 'Complete KYC'}</span>
                </Link>
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="dashboard-column">
            {/* Licence Card */}
            <div className="dashboard-card licence-card-large">
              <div className="card-header">
                <div className="card-header-left">
                  <span className="card-icon">🪪</span>
                  <h2 className="card-title">Driving Licence</h2>
                </div>
              </div>

              {licence ? (
                <div className="licence-display">
                  <div className="licence-card-visual">
                    <div className="licence-header-visual">
                      <div className="licence-country">नेपाल सरकार</div>
                      <div className="licence-country-en">Government of Nepal</div>
                      <div className="licence-title-visual">Driving Licence</div>
                    </div>
                    <div className="licence-body-visual">
                      <div className="licence-photo-placeholder">
                        {profile?.first_name?.[0]?.toUpperCase() || 'U'}
                      </div>
                      <div className="licence-info-visual">
                        <div className="licence-info-row">
                          <span className="licence-info-label">Name:</span>
                          <span className="licence-info-value">
                            {[profile?.first_name, profile?.middle_name, profile?.last_name]
                              .filter(Boolean)
                              .join(' ') || '—'}
                          </span>
                        </div>
                        <div className="licence-info-row">
                          <span className="licence-info-label">Licence No:</span>
                          <span className="licence-info-value">{licence.card_number || '—'}</span>
                        </div>
                        <div className="licence-info-row">
                          <span className="licence-info-label">Valid Till:</span>
                          <span className="licence-info-value">
                            {licence.expires_at
                              ? new Date(licence.expires_at).toLocaleDateString()
                              : '—'}
                          </span>
                        </div>
                        {licence.categories && licence.categories.length > 0 && (
                          <div className="licence-categories-visual">
                            {licence.categories.map((cat, idx) => (
                              <span key={idx} className="category-badge">
                                {cat}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="empty-licence">
                  <div className="empty-icon">🪪</div>
                  <h3>No Licence Yet</h3>
                  <p>Complete your exam to get your driving licence issued.</p>
                </div>
              )}
            </div>

            {/* Traffic Information */}
            <div className="dashboard-card traffic-info-card">
              <div className="card-header">
                <div className="card-header-left">
                  <span className="card-icon">🚦</span>
                  <h2 className="card-title">Traffic Rules & Safety</h2>
                </div>
              </div>
              <ul className="traffic-rules-list">
                <li>
                  <span className="rule-icon">📱</span>
                  <span>Always carry your licence and vehicle documents while driving</span>
                </li>
                <li>
                  <span className="rule-icon">🚥</span>
                  <span>Follow lane discipline and traffic lights at busy junctions</span>
                </li>
                <li>
                  <span className="rule-icon">🪖</span>
                  <span>Wear helmets (two-wheelers) and seat belts (four-wheelers)</span>
                </li>
                <li>
                  <span className="rule-icon">📵</span>
                  <span>Do not use mobile phones while driving</span>
                </li>
                <li>
                  <span className="rule-icon">⛽</span>
                  <span>Maintain proper vehicle documents and insurance</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

export default function UserDashboardProtected() {
  return (
    <ProtectedRoute requiredRole="user">
      <UserDashboard />
    </ProtectedRoute>
  )
}
