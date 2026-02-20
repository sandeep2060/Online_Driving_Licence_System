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
          .maybeSingle(),
        supabase
          .from('exams')
          .select('*')
          .eq('user_id', user.id)
          .order('attempted_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from('licences')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
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
          <div className="loading-spinner">
            <div className="spinner"></div>
            <p>Loading your dashboard...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="user-dashboard">
        {/* Header Section */}
        <header className="dashboard-hero">
          <div className="hero-content">
            <div className="greeting-section">
              <div className="user-dashboard-badge">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5"/>
                </svg>
                <span>Government of Nepal · Citizen Portal</span>
              </div>
              <h1 className="greeting-title">
                Welcome back, <span className="name-highlight">{profile?.first_name || 'there'}</span>
              </h1>
              <p className="greeting-subtitle">
                {canGiveExam
                  ? "Ready to take your exam? Let's get started!"
                  : kycBlocking
                  ? 'Complete your KYC verification to unlock exam access'
                  : examLocked
                  ? 'Your exam access will be available soon'
                  : "Here's your driving licence journey overview"}
              </p>
            </div>
            <div className="hero-actions">
              <Link to="/profile" className="action-link">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M10 12.5C11.3807 12.5 12.5 11.3807 12.5 10C12.5 8.61929 11.3807 7.5 10 7.5C8.61929 7.5 7.5 8.61929 7.5 10C7.5 11.3807 8.61929 12.5 10 12.5Z" stroke="currentColor" strokeWidth="1.5"/>
                  <path d="M10 2.5C8.625 2.5 7.5 3.625 7.5 5C7.5 6.375 8.625 7.5 10 7.5C11.375 7.5 12.5 6.375 12.5 5C12.5 3.625 11.375 2.5 10 2.5Z" stroke="currentColor" strokeWidth="1.5"/>
                  <path d="M10 12.5C8.625 12.5 7.5 13.625 7.5 15C7.5 16.375 8.625 17.5 10 17.5C11.375 17.5 12.5 16.375 12.5 15C12.5 13.625 11.375 12.5 10 12.5Z" stroke="currentColor" strokeWidth="1.5"/>
                </svg>
                <span>Settings</span>
              </Link>
            </div>
          </div>
        </header>

        {/* Quick Stats */}
        <section className="stats-section">
          <div className="stat-card-wrapper">
            <div className="stat-card kyc-stat">
              <div className="stat-card-inner">
                <div className="stat-header">
                  <div className="stat-icon-wrapper kyc-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <path d="M9 12L11 14L15 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <div className="stat-label">KYC Status</div>
                </div>
                <div className="stat-value-wrapper">
                  <div className="stat-value">
                    {kycStatus === 'verified'
                      ? 'Verified'
                      : kycStatus === 'submitted'
                      ? 'Pending Review'
                      : 'Incomplete'}
                  </div>
                  <div className="stat-badge" data-status={kycStatus}>
                    {kycStatus === 'verified' ? '✓' : kycStatus === 'submitted' ? '⏳' : '○'}
                  </div>
                </div>
                <div className="stat-progress-wrapper">
                  <div className="stat-progress-bar">
                    <div
                      className="stat-progress-fill"
                      style={{ width: `${kycProgress}%` }}
                    />
                  </div>
                  <span className="stat-progress-text">{kycProgress}%</span>
                </div>
              </div>
            </div>

            <div className="stat-card exam-stat">
              <div className="stat-card-inner">
                <div className="stat-header">
                  <div className="stat-icon-wrapper exam-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <path d="M9 5H7C5.89543 5 5 5.89543 5 7V19C5 20.1046 5.89543 21 7 21H17C18.1046 21 19 20.1046 19 19V7C19 5.89543 18.1046 5 17 5H15M9 5C9 6.10457 9.89543 7 11 7H13C14.1046 7 15 6.10457 15 5M9 5C9 3.89543 9.89543 3 11 3H13C14.1046 3 15 3.89543 15 5M9 12H15M9 16H15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                  </div>
                  <div className="stat-label">Exam Status</div>
                </div>
                <div className="stat-value-wrapper">
                  <div className="stat-value">
                    {lastExam
                      ? lastExam.status === 'passed'
                        ? 'Passed'
                        : `Failed (${lastExam.score || 0}%)`
                      : 'Not Attempted'}
                  </div>
                  <div className="stat-badge" data-status={lastExam?.status || 'none'}>
                    {lastExam?.status === 'passed' ? '✓' : lastExam?.status === 'failed' ? '✗' : '—'}
                  </div>
                </div>
                <div className="stat-progress-wrapper">
                  <div className="stat-progress-bar">
                    <div
                      className="stat-progress-fill"
                      style={{ width: `${examProgress}%` }}
                    />
                  </div>
                  <span className="stat-progress-text">{examProgress}%</span>
                </div>
              </div>
            </div>

            <div className="stat-card licence-stat">
              <div className="stat-card-inner">
                <div className="stat-header">
                  <div className="stat-icon-wrapper licence-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <path d="M10 2H14C15.1046 2 16 2.89543 16 4V20C16 21.1046 15.1046 22 14 22H10C8.89543 22 8 21.1046 8 20V4C8 2.89543 8.89543 2 10 2Z" stroke="currentColor" strokeWidth="2"/>
                      <path d="M12 6V10M12 14H12.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                  </div>
                  <div className="stat-label">Licence Status</div>
                </div>
                <div className="stat-value-wrapper">
                  <div className="stat-value">{licence ? 'Active' : 'Not Issued'}</div>
                  <div className="stat-badge" data-status={licence ? 'active' : 'none'}>
                    {licence ? '✓' : '○'}
                  </div>
                </div>
                {licence?.expires_at && (
                  <div className="stat-meta">
                    Expires {new Date(licence.expires_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </div>
                )}
              </div>
            </div>

            <div className="stat-card retake-stat">
              <div className="stat-card-inner">
                <div className="stat-header">
                  <div className="stat-icon-wrapper retake-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <path d="M12 8V12L15 15M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <div className="stat-label">Next Exam</div>
                </div>
                <div className="stat-value-wrapper">
                  <div className="stat-value">
                    {daysRemaining !== null
                      ? `${daysRemaining} day${daysRemaining === 1 ? '' : 's'}`
                      : canGiveExam
                      ? 'Available Now'
                      : 'Not Available'}
                  </div>
                  <div className="stat-badge" data-status={canGiveExam ? 'ready' : 'waiting'}>
                    {canGiveExam ? '✓' : '⏳'}
                  </div>
                </div>
                {daysRemaining !== null && (
                  <div className="stat-meta">Until retake allowed</div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Main Content */}
        <div className="dashboard-content-grid">
          {/* Left Column */}
          <div className="content-column">
            {/* Exam Card */}
            <article className="content-card exam-content-card">
              <div className="card-top">
                <div className="card-title-group">
                  <div className="card-icon-badge exam-badge">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <path d="M12 6.25278V19.2528M12 6.25278C10.8321 5.47686 9.24649 5 7.5 5C5.75351 5 4.16789 5.47686 3 6.25278V19.2528C4.16789 18.4769 5.75351 18 7.5 18C9.24649 18 10.8321 18.4769 12 19.2528M12 6.25278C13.1679 5.47686 14.7535 5 16.5 5C18.2465 5 19.8321 5.47686 21 6.25278V19.2528C19.8321 18.4769 18.2465 18 16.5 18C14.7535 18 13.1679 18.4769 12 19.2528" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <div>
                    <h2 className="card-title">Exam & Practice</h2>
                    <p className="card-subtitle">Test your knowledge and take the official exam</p>
                  </div>
                </div>
                <div className={`card-status ${canGiveExam ? 'status-ready' : 'status-locked'}`}>
                  {canGiveExam ? (
                    <>
                      <span className="status-dot"></span>
                      Ready
                    </>
                  ) : (
                    <>
                      <span className="status-dot locked"></span>
                      Locked
                    </>
                  )}
                </div>
              </div>

              <div className="card-body">
                <div className="info-grid">
                  <div className="info-box">
                    <div className="info-box-icon">
                      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                        <path d="M6 2V6M14 2V6M3 10H17M5 4H15C16.1046 4 17 4.89543 17 6V16C17 17.1046 16.1046 18 15 18H5C3.89543 18 3 17.1046 3 16V6C3 4.89543 3.89543 4 5 4Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                      </svg>
                    </div>
                    <div className="info-box-content">
                      <div className="info-box-label">Last Attempt</div>
                      <div className="info-box-value">
                        {lastExam
                          ? new Date(lastExam.attempted_at).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })
                          : 'No attempts yet'}
                      </div>
                    </div>
                  </div>

                  <div className="info-box">
                    <div className="info-box-icon">
                      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                        <path d="M10 18C14.4183 18 18 14.4183 18 10C18 5.58172 14.4183 2 10 2C5.58172 2 2 5.58172 2 10C2 14.4183 5.58172 18 10 18Z" stroke="currentColor" strokeWidth="1.5"/>
                        <path d="M10 6V10L13 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                      </svg>
                    </div>
                    <div className="info-box-content">
                      <div className="info-box-label">Last Score</div>
                      <div className="info-box-value">
                        {lastExam ? `${lastExam.score || 0}%` : '—'}
                      </div>
                    </div>
                  </div>

                  {daysRemaining !== null && (
                    <div className="info-box highlight">
                      <div className="info-box-icon">
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                          <path d="M10 18C14.4183 18 18 14.4183 18 10C18 5.58172 14.4183 2 10 2C5.58172 2 2 5.58172 2 10C2 14.4183 5.58172 18 10 18Z" stroke="currentColor" strokeWidth="1.5"/>
                          <path d="M10 6V10L13 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                        </svg>
                      </div>
                      <div className="info-box-content">
                        <div className="info-box-label">Days Until Retake</div>
                        <div className="info-box-value warning">{daysRemaining} days</div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="card-message">
                  <div className="message-icon">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <path d="M10 2C5.58172 2 2 5.58172 2 10C2 14.4183 5.58172 18 10 18C14.4183 18 18 14.4183 18 10C18 5.58172 14.4183 2 10 2Z" stroke="currentColor" strokeWidth="1.5"/>
                      <path d="M10 6V10M10 14H10.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                  </div>
                  <p>{examMessage}</p>
                </div>
              </div>

              <div className="card-footer">
                <Link
                  to="/exam"
                  className={`action-button primary ${!canGiveExam ? 'disabled' : ''}`}
                  aria-disabled={!canGiveExam}
                >
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M10 2V10L13 13M18 10C18 14.4183 14.4183 18 10 18C5.58172 18 2 14.4183 2 10C2 5.58172 5.58172 2 10 2C14.4183 2 18 5.58172 18 10Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span>Take Exam</span>
                </Link>
                <Link to="/practice" className="action-button secondary">
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M10 2C5.58172 2 2 5.58172 2 10C2 14.4183 5.58172 18 10 18C14.4183 18 18 14.4183 18 10C18 5.58172 14.4183 2 10 2Z" stroke="currentColor" strokeWidth="1.5"/>
                    <path d="M10 6V10L13 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                  <span>Practice Exam</span>
                </Link>
              </div>
            </article>

            {/* KYC Card */}
            <article className="content-card kyc-content-card">
              <div className="card-top">
                <div className="card-title-group">
                  <div className="card-icon-badge kyc-badge">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <path d="M16 7C16 9.20914 14.2091 11 12 11C9.79086 11 8 9.20914 8 7C8 4.79086 9.79086 3 12 3C14.2091 3 16 4.79086 16 7Z" stroke="currentColor" strokeWidth="2"/>
                      <path d="M12 14C8.13401 14 5 17.134 5 21H19C19 17.134 15.866 14 12 14Z" stroke="currentColor" strokeWidth="2"/>
                    </svg>
                  </div>
                  <div>
                    <h2 className="card-title">Profile & KYC</h2>
                    <p className="card-subtitle">Complete verification to unlock exam access</p>
                  </div>
                </div>
                <div className={`card-status status-${kycStatus}`}>
                  {kycStatus === 'verified' && (
                    <>
                      <span className="status-dot"></span>
                      Verified
                    </>
                  )}
                  {kycStatus === 'submitted' && (
                    <>
                      <span className="status-dot pending"></span>
                      Pending
                    </>
                  )}
                  {kycStatus === 'pending' && (
                    <>
                      <span className="status-dot incomplete"></span>
                      Incomplete
                    </>
                  )}
                </div>
              </div>

              <div className="card-body">
                <div className="kyc-progress-container">
                  <div className="progress-ring-wrapper">
                    <svg className="progress-ring" width="140" height="140" viewBox="0 0 140 140">
                      <circle
                        className="progress-ring-background"
                        cx="70"
                        cy="70"
                        r="60"
                        fill="none"
                        strokeWidth="8"
                      />
                      <circle
                        className="progress-ring-fill"
                        cx="70"
                        cy="70"
                        r="60"
                        fill="none"
                        strokeWidth="8"
                        strokeDasharray={`${(kycProgress / 100) * 376.99} 376.99`}
                        strokeDashoffset="0"
                      />
                    </svg>
                    <div className="progress-ring-text">
                      <span className="progress-percentage">{kycProgress}%</span>
                      <span className="progress-label">Complete</span>
                    </div>
                  </div>
                  <div className="kyc-info-list">
                    <div className="kyc-info-item">
                      <span className="kyc-info-label">Email</span>
                      <span className="kyc-info-value">{user?.email}</span>
                    </div>
                    <div className="kyc-info-item">
                      <span className="kyc-info-label">Full Name</span>
                      <span className="kyc-info-value">
                        {[profile?.first_name, profile?.middle_name, profile?.last_name]
                          .filter(Boolean)
                          .join(' ') || 'Not provided'}
                      </span>
                    </div>
                    <div className="kyc-info-item">
                      <span className="kyc-info-label">Phone</span>
                      <span className="kyc-info-value">{profile?.phone || 'Not provided'}</span>
                    </div>
                  </div>
                </div>

                {kycData?.rejection_reason && (
                  <div className="rejection-alert">
                    <div className="alert-icon">
                      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                        <path d="M10 18C14.4183 18 18 14.4183 18 10C18 5.58172 14.4183 2 10 2C5.58172 2 2 5.58172 2 10C2 14.4183 5.58172 18 10 18Z" stroke="currentColor" strokeWidth="1.5"/>
                        <path d="M10 6V10M10 14H10.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                      </svg>
                    </div>
                    <div className="alert-content">
                      <strong>Rejection Reason</strong>
                      <p>{kycData.rejection_reason}</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="card-footer">
                <Link to="/profile" className="action-button primary full-width">
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M11.25 3.75L16.25 8.75L11.25 13.75M5 3.75H14.1667C15.0871 3.75 15.9703 4.11607 16.6264 4.77124C17.2826 5.42641 17.6487 6.30956 17.6487 7.23V12.77C17.6487 13.6904 17.2826 14.5736 16.6264 15.2288C15.9703 15.8839 15.0871 16.25 14.1667 16.25H5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span>{kycData ? 'Update KYC' : 'Complete KYC'}</span>
                </Link>
              </div>
            </article>
          </div>

          {/* Right Column */}
          <div className="content-column">
            {/* Licence Card */}
            <article className="content-card licence-content-card">
              <div className="card-top">
                <div className="card-title-group">
                  <div className="card-icon-badge licence-badge">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <path d="M10 2H14C15.1046 2 16 2.89543 16 4V20C16 21.1046 15.1046 22 14 22H10C8.89543 22 8 21.1046 8 20V4C8 2.89543 8.89543 2 10 2Z" stroke="currentColor" strokeWidth="2"/>
                      <path d="M12 6V10M12 14H12.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                  </div>
                  <div>
                    <h2 className="card-title">Driving Licence</h2>
                    <p className="card-subtitle">Your official driving licence card</p>
                  </div>
                </div>
              </div>

              <div className="card-body">
                {licence ? (
                  <div className="licence-card-preview">
                    <div className="licence-card-front">
                      <div className="licence-card-header">
                        <div className="licence-emblem">
                          <div className="emblem-text">नेपाल</div>
                          <div className="emblem-text-en">NEPAL</div>
                        </div>
                        <div className="licence-title-main">Driving Licence</div>
                      </div>
                      <div className="licence-card-content">
                        <div className="licence-photo-section">
                          <div className="licence-photo-frame">
                            <div className="licence-photo">
                              {profile?.first_name?.[0]?.toUpperCase() || 'U'}
                            </div>
                          </div>
                        </div>
                        <div className="licence-details-section">
                          <div className="licence-detail-row">
                            <span className="licence-detail-label">Name</span>
                            <span className="licence-detail-value">
                              {[profile?.first_name, profile?.middle_name, profile?.last_name]
                                .filter(Boolean)
                                .join(' ') || '—'}
                            </span>
                          </div>
                          <div className="licence-detail-row">
                            <span className="licence-detail-label">Licence No</span>
                            <span className="licence-detail-value licence-number">
                              {licence.card_number || '—'}
                            </span>
                          </div>
                          <div className="licence-detail-row">
                            <span className="licence-detail-label">Valid Till</span>
                            <span className="licence-detail-value">
                              {licence.expires_at
                                ? new Date(licence.expires_at).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric',
                                  })
                                : '—'}
                            </span>
                          </div>
                          {licence.categories && licence.categories.length > 0 && (
                            <div className="licence-categories-row">
                              <span className="licence-detail-label">Categories</span>
                              <div className="licence-categories">
                                {licence.categories.map((cat, idx) => (
                                  <span key={idx} className="category-tag">
                                    {cat}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="empty-state">
                    <div className="empty-state-icon">
                      <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
                        <path d="M32 8C18.745 8 8 18.745 8 32C8 45.255 18.745 56 32 56C45.255 56 56 45.255 56 32C56 18.745 45.255 8 32 8Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                        <path d="M32 20V32L40 40" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                      </svg>
                    </div>
                    <h3 className="empty-state-title">No Licence Yet</h3>
                    <p className="empty-state-text">
                      Complete your exam successfully to get your driving licence issued.
                    </p>
                  </div>
                )}
              </div>
            </article>

            {/* Traffic Rules Card */}
            <article className="content-card traffic-content-card">
              <div className="card-top">
                <div className="card-title-group">
                  <div className="card-icon-badge traffic-badge">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <path d="M12 2V6M12 18V22M6 12H2M22 12H18M19.07 19.07L16.24 16.24M19.07 4.93L16.24 7.76M4.93 19.07L7.76 16.24M4.93 4.93L7.76 7.76" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                  </div>
                  <div>
                    <h2 className="card-title">Traffic Rules & Safety</h2>
                    <p className="card-subtitle">Important guidelines for safe driving</p>
                  </div>
                </div>
              </div>

              <div className="card-body">
                <ul className="traffic-rules">
                  <li className="traffic-rule-item">
                    <div className="rule-icon-wrapper">
                      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                        <path d="M10 2C5.58172 2 2 5.58172 2 10C2 14.4183 5.58172 18 10 18C14.4183 18 18 14.4183 18 10C18 5.58172 14.4183 2 10 2Z" stroke="currentColor" strokeWidth="1.5"/>
                        <path d="M10 6V10L13 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                      </svg>
                    </div>
                    <span>Always carry your licence and vehicle documents while driving</span>
                  </li>
                  <li className="traffic-rule-item">
                    <div className="rule-icon-wrapper">
                      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                        <path d="M10 2C5.58172 2 2 5.58172 2 10C2 14.4183 5.58172 18 10 18C14.4183 18 18 14.4183 18 10C18 5.58172 14.4183 2 10 2Z" stroke="currentColor" strokeWidth="1.5"/>
                        <path d="M10 6V10L13 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                      </svg>
                    </div>
                    <span>Follow lane discipline and traffic lights at busy junctions</span>
                  </li>
                  <li className="traffic-rule-item">
                    <div className="rule-icon-wrapper">
                      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                        <path d="M10 2C5.58172 2 2 5.58172 2 10C2 14.4183 5.58172 18 10 18C14.4183 18 18 14.4183 18 10C18 5.58172 14.4183 2 10 2Z" stroke="currentColor" strokeWidth="1.5"/>
                        <path d="M10 6V10L13 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                      </svg>
                    </div>
                    <span>Wear helmets (two-wheelers) and seat belts (four-wheelers)</span>
                  </li>
                  <li className="traffic-rule-item">
                    <div className="rule-icon-wrapper">
                      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                        <path d="M10 2C5.58172 2 2 5.58172 2 10C2 14.4183 5.58172 18 10 18C14.4183 18 18 14.4183 18 10C18 5.58172 14.4183 2 10 2Z" stroke="currentColor" strokeWidth="1.5"/>
                        <path d="M10 6V10L13 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                      </svg>
                    </div>
                    <span>Do not use mobile phones while driving</span>
                  </li>
                  <li className="traffic-rule-item">
                    <div className="rule-icon-wrapper">
                      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                        <path d="M10 2C5.58172 2 2 5.58172 2 10C2 14.4183 5.58172 18 10 18C14.4183 18 18 14.4183 18 10C18 5.58172 14.4183 2 10 2Z" stroke="currentColor" strokeWidth="1.5"/>
                        <path d="M10 6V10L13 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                      </svg>
                    </div>
                    <span>Maintain proper vehicle documents and insurance</span>
                  </li>
                </ul>
              </div>
            </article>
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
