import { useMemo } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import PageLayout from '../components/PageLayout.jsx'

const DAYS_90 = 90

function daysBetween(a, b) {
  const one = new Date(a.getFullYear(), a.getMonth(), a.getDate())
  const two = new Date(b.getFullYear(), b.getMonth(), b.getDate())
  const diff = two.getTime() - one.getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24))
}

function UserDashboard() {
  const { user, profile, signOut } = useAuth()

  const userId = user?.id

  const { kycStatus, licence, examInfo } = useMemo(() => {
    if (!userId) {
      return {
        kycStatus: 'pending',
        licence: null,
        examInfo: null,
      }
    }
    const readJson = (key) => {
      try {
        const raw = window.localStorage.getItem(key)
        return raw ? JSON.parse(raw) : null
      } catch {
        return null
      }
    }
    const baseKey = (suffix) => `driveLicense:${userId}:${suffix}`

    const kyc = readJson(baseKey('kyc')) || {}
    const licenceData = readJson(baseKey('licence'))
    const exam = readJson(baseKey('exam'))

    return {
      kycStatus: kyc.status || 'pending', // pending | submitted | verified
      licence: licenceData,
      examInfo: exam,
    }
  }, [userId])

  let examMessage = 'You are eligible to book your first exam.'
  let examLocked = false
  let daysRemaining = null

  if (examInfo?.lastAttemptAt && examInfo?.lastStatus === 'failed') {
    const last = new Date(examInfo.lastAttemptAt)
    const now = new Date()
    const diff = daysBetween(last, now)
    if (diff < DAYS_90) {
      examLocked = true
      daysRemaining = DAYS_90 - diff
      examMessage = `You can retake the exam in ${daysRemaining} day${daysRemaining === 1 ? '' : 's'}.`
    }
  }

  if (examInfo?.lastStatus === 'passed' && licence?.expiresAt) {
    const expires = new Date(licence.expiresAt)
    const now = new Date()
    if (expires > now) {
      examLocked = true
      examMessage = 'You have already passed the exam. Exam is disabled until your licence expires.'
    }
  }

  const kycBlocking = kycStatus !== 'verified'
  const canGiveExam = !examLocked && !kycBlocking

  const licenceCategories = licence?.categories || []

  let examDateDisplay = '—'
  if (examInfo?.nextExamDate) {
    examDateDisplay = new Date(examInfo.nextExamDate).toLocaleDateString()
  } else if (licence?.issuedAt) {
    examDateDisplay = new Date(licence.issuedAt).toLocaleDateString()
  }

  return (
    <PageLayout>
      <div className="page page-dashboard user-dashboard">
        <div className="page-card">
          <h1 className="page-title">User Dashboard</h1>
          <p className="page-subtitle">
            Welcome, {profile?.first_name || user?.email}
          </p>

          <section className="dashboard-section">
            <h2 className="section-heading">Profile & KYC</h2>
            <div className="dashboard-info">
              <div className="info-row">
                <span className="info-label">Email</span>
                <span className="info-value">{user?.email}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Name</span>
                <span className="info-value">
                  {[profile?.first_name, profile?.middle_name, profile?.last_name]
                    .filter(Boolean)
                    .join(' ') || '—'}
                </span>
              </div>
              <div className="info-row">
                <span className="info-label">Phone</span>
                <span className="info-value">{profile?.phone || '—'}</span>
              </div>
              <div className="info-row">
                <span className="info-label">KYC Status</span>
                <span className={`badge badge--${kycStatus}`}>
                  {kycStatus === 'verified'
                    ? 'Verified'
                    : kycStatus === 'submitted'
                    ? 'Submitted / Pending verification'
                    : 'Incomplete'}
                </span>
              </div>
            </div>
            <div className="dashboard-actions">
              <button className="btn btn-secondary" disabled title="KYC feature coming soon">
                View / Complete KYC
              </button>
            </div>
          </section>

          <section className="dashboard-section">
            <h2 className="section-heading">Exam & Eligibility</h2>
            <div className="dashboard-info">
              <div className="info-row">
                <span className="info-label">Next exam date</span>
                <span className="info-value">{examDateDisplay}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Last result</span>
                <span className="info-value">
                  {examInfo?.lastStatus
                    ? examInfo.lastStatus === 'passed'
                      ? 'Passed'
                      : 'Failed'
                    : 'No attempts yet'}
                </span>
              </div>
              {daysRemaining != null && (
                <div className="info-row">
                  <span className="info-label">Days until next attempt</span>
                  <span className="info-value">{daysRemaining} day{daysRemaining === 1 ? '' : 's'}</span>
                </div>
              )}
              <div className="info-row">
                <span className="info-label">Can give exam now?</span>
                <span className="info-value">
                  {canGiveExam ? 'Yes' : 'No'}
                </span>
              </div>
            </div>
            <p className="dashboard-note">{examMessage}</p>
            <div className="dashboard-actions">
              <button className="btn btn-primary" disabled title="Exam feature coming soon">
                Go to Exam
              </button>
              <button className="btn btn-secondary" disabled title="Practice feature coming soon">
                Practice Demo Exam
              </button>
            </div>
          </section>

          <section className="dashboard-section">
            <h2 className="section-heading">Licence Card & Categories</h2>
            {licence ? (
              <>
                <div className="licence-card">
                  <div className="licence-header">
                    <span className="licence-country">नेपाल सरकार / Government of Nepal</span>
                    <span className="licence-title">Driving Licence</span>
                  </div>
                  <div className="licence-body">
                    <div className="licence-photo" />
                    <div className="licence-details">
                      <div className="licence-row">
                        <span className="licence-label">Name</span>
                        <span className="licence-value">
                          {[profile?.first_name, profile?.middle_name, profile?.last_name]
                            .filter(Boolean)
                            .join(' ') || '—'}
                        </span>
                      </div>
                      <div className="licence-row">
                        <span className="licence-label">Licence No.</span>
                        <span className="licence-value">{licence.cardNumber || '—'}</span>
                      </div>
                      <div className="licence-row">
                        <span className="licence-label">Valid till</span>
                        <span className="licence-value">
                          {licence.expiresAt
                            ? new Date(licence.expiresAt).toLocaleDateString()
                            : '—'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="dashboard-info">
                  <div className="info-row">
                    <span className="info-label">Categories</span>
                    <span className="info-value">
                      {licenceCategories.length
                        ? licenceCategories.join(', ')
                        : '—'}
                    </span>
                  </div>
                </div>
              </>
            ) : (
              <p className="dashboard-note">
                You do not have an active licence yet. After you pass the exam and your licence is issued,
                it will appear here.
              </p>
            )}
          </section>

          <section className="dashboard-section">
            <h2 className="section-heading">Traffic Information</h2>
            <ul className="traffic-list">
              <li>Always carry your licence and vehicle documents while driving.</li>
              <li>Follow lane discipline and traffic lights, especially at busy Kathmandu junctions.</li>
              <li>Wear helmets (for two-wheelers) and seat belts (for four-wheelers) at all times.</li>
              <li>Do not use mobile phones while driving; use hands-free only when absolutely necessary.</li>
            </ul>
          </section>

          <button type="button" className="btn btn-secondary btn-full" onClick={() => signOut()}>
            Sign Out
          </button>
        </div>
      </div>
    </PageLayout>
  )
}

export default UserDashboard
