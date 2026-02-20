import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { supabase } from '../lib/supabase.js'
import AdminLayout from '../components/AdminLayout.jsx'

function escapeCsvCell(val) {
  if (val == null) return ''
  const s = String(val)
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

function downloadCsv(rows, filename) {
  if (!rows.length) return
  const header = Object.keys(rows[0]).join(',')
  const body = rows.map((r) => Object.values(r).map(escapeCsvCell).join(',')).join('\n')
  const blob = new Blob([header + '\n' + body], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function AdminDashboard() {
  const { user } = useAuth()
  const [stats, setStats] = useState({
    kycPending: 0,
    kycVerified: 0,
    kycRejected: 0,
    totalExams: 0,
    passedExams: 0,
  })
  const [loading, setLoading] = useState(true)
  const [exportLoading, setExportLoading] = useState(null)

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    try {
      setLoading(true)
      const [kycResult, examsResult] = await Promise.all([
        supabase.from('kyc').select('status'),
        supabase.from('exams').select('status'),
      ])

      const kycData = kycResult.data || []
      const examsData = examsResult.data || []

      setStats({
        kycPending: kycData.filter((k) => k.status === 'submitted').length,
        kycVerified: kycData.filter((k) => k.status === 'verified').length,
        kycRejected: kycData.filter((k) => k.status === 'rejected').length,
        totalExams: examsData.length,
        passedExams: examsData.filter((e) => e.status === 'passed').length,
      })
    } catch (err) {
      console.error('Error loading stats:', err)
    } finally {
      setLoading(false)
    }
  }

  const passRate = stats.totalExams > 0 ? Math.round((stats.passedExams / stats.totalExams) * 100) : 0

  const handleExportVerifiedKYC = async () => {
    setExportLoading('kyc')
    try {
      const { data: kycData, error: kycErr } = await supabase
        .from('kyc')
        .select('*')
        .eq('status', 'verified')
        .order('submitted_at', { ascending: false })

      if (kycErr) throw kycErr
      if (!kycData?.length) {
        alert('No verified KYC users found.')
        return
      }

      const userIds = [...new Set(kycData.map((k) => k.user_id))]
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, first_name, middle_name, last_name, email, phone, date_of_birth, gender, blood_group')
        .in('id', userIds)

      const profileMap = (profilesData || []).reduce((acc, p) => {
        acc[p.id] = p
        return acc
      }, {})

      const rows = kycData.map((k) => {
        const p = profileMap[k.user_id] || {}
        const personal = k.personal || {}
        const address = k.address || {}
        return {
          user_id: k.user_id,
          email: p.email,
          first_name: p.first_name,
          middle_name: p.middle_name,
          last_name: p.last_name,
          phone: p.phone,
          date_of_birth: p.date_of_birth,
          gender: p.gender,
          blood_group: p.blood_group,
          citizenship_number: personal.citizenshipNumber || '',
          province: address.province || '',
          district: address.district || '',
          municipality: address.municipality || '',
          ward: address.ward || '',
          vehicle_types: (k.vehicle_types || []).join('; '),
          submitted_at: k.submitted_at,
          reviewed_at: k.reviewed_at || '',
        }
      })
      downloadCsv(rows, `verified_kyc_users_${new Date().toISOString().slice(0, 10)}.csv`)
    } catch (err) {
      console.error(err)
      alert('Failed to export verified KYC data.')
    } finally {
      setExportLoading(null)
    }
  }

  const handleExportPassedApplicants = async () => {
    setExportLoading('passed')
    try {
      const { data: examsData, error: examsErr } = await supabase
        .from('exams')
        .select('*')
        .eq('status', 'passed')
        .order('completed_at', { ascending: false })

      if (examsErr) throw examsErr
      if (!examsData?.length) {
        alert('No passed applicants found.')
        return
      }

      const userIds = [...new Set(examsData.map((e) => e.user_id))]
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, first_name, middle_name, last_name, email, phone, date_of_birth, gender')
        .in('id', userIds)

      const profileMap = (profilesData || []).reduce((acc, p) => {
        acc[p.id] = p
        return acc
      }, {})

      const rows = examsData.map((e) => {
        const p = profileMap[e.user_id] || {}
        return {
          user_id: e.user_id,
          email: p.email,
          first_name: p.first_name,
          middle_name: p.middle_name,
          last_name: p.last_name,
          phone: p.phone,
          date_of_birth: p.date_of_birth,
          gender: p.gender,
          score: e.score,
          completed_at: e.completed_at || e.attempted_at,
        }
      })
      downloadCsv(rows, `passed_applicants_${new Date().toISOString().slice(0, 10)}.csv`)
    } catch (err) {
      console.error(err)
      alert('Failed to export passed applicants.')
    } finally {
      setExportLoading(null)
    }
  }

  const handleExportFailedApplicants = async () => {
    setExportLoading('failed')
    try {
      const { data: examsData, error: examsErr } = await supabase
        .from('exams')
        .select('*')
        .eq('status', 'failed')
        .order('completed_at', { ascending: false })

      if (examsErr) throw examsErr
      if (!examsData?.length) {
        alert('No failed applicants found.')
        return
      }

      const userIds = [...new Set(examsData.map((e) => e.user_id))]
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, first_name, middle_name, last_name, email, phone, date_of_birth, gender')
        .in('id', userIds)

      const profileMap = (profilesData || []).reduce((acc, p) => {
        acc[p.id] = p
        return acc
      }, {})

      const rows = examsData.map((e) => {
        const p = profileMap[e.user_id] || {}
        return {
          user_id: e.user_id,
          email: p.email,
          first_name: p.first_name,
          middle_name: p.middle_name,
          last_name: p.last_name,
          phone: p.phone,
          date_of_birth: p.date_of_birth,
          gender: p.gender,
          score: e.score,
          completed_at: e.completed_at || e.attempted_at,
        }
      })
      downloadCsv(rows, `failed_applicants_${new Date().toISOString().slice(0, 10)}.csv`)
    } catch (err) {
      console.error(err)
      alert('Failed to export failed applicants.')
    } finally {
      setExportLoading(null)
    }
  }

  const totalKyc = stats.kycPending + stats.kycVerified + stats.kycRejected
  const verifiedRate = totalKyc > 0 ? Math.round((stats.kycVerified / totalKyc) * 100) : 0

  return (
    <AdminLayout>
      <div className="gov-dashboard">
        {/* Page Title */}
        <header className="gov-dashboard-header">
          <div className="gov-header-content">
            <div className="gov-header-badge">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5"/>
              </svg>
              <span>Government of Nepal</span>
            </div>
            <h1 className="gov-page-title">Admin Dashboard</h1>
            <p className="gov-page-subtitle">
              Manage driving licence applications, KYC verifications, and exam administration
            </p>
          </div>
        </header>

        {/* Stats Grid with Icons & Mini Charts */}
        <section className="gov-stats-grid">
          <div className="gov-stat-card gov-stat-kyc-pending">
            <div className="gov-stat-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <path d="M12 6v6l4 2"/>
              </svg>
            </div>
            <div className="gov-stat-body">
              <div className="gov-stat-value">{loading ? '—' : stats.kycPending}</div>
              <div className="gov-stat-label">Pending KYC</div>
              <div className="gov-stat-chart">
                <div className="gov-chart-bar" style={{ width: `${totalKyc ? (stats.kycPending / totalKyc) * 100 : 0}%` }}/>
              </div>
            </div>
          </div>

          <div className="gov-stat-card gov-stat-kyc-verified">
            <div className="gov-stat-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
            </div>
            <div className="gov-stat-body">
              <div className="gov-stat-value">{loading ? '—' : stats.kycVerified}</div>
              <div className="gov-stat-label">Verified KYC</div>
              <div className="gov-stat-chart">
                <div className="gov-chart-bar" style={{ width: `${verifiedRate}%` }}/>
              </div>
            </div>
          </div>

          <div className="gov-stat-card gov-stat-exams">
            <div className="gov-stat-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2"/>
              </svg>
            </div>
            <div className="gov-stat-body">
              <div className="gov-stat-value">{loading ? '—' : stats.totalExams}</div>
              <div className="gov-stat-label">Total Exams</div>
              <div className="gov-stat-chart">
                <div className="gov-chart-bar" style={{ width: stats.totalExams ? '100%' : '0%' }}/>
              </div>
            </div>
          </div>

          <div className="gov-stat-card gov-stat-passed">
            <div className="gov-stat-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 0 0 1.946-.806 3.42 3.42 0 0 1 4.438 0 3.42 3.42 0 0 0 1.946.806 3.42 3.42 0 0 1 3.138 3.138 3.42 3.42 0 0 0 .806 1.946 3.42 3.42 0 0 1 0 4.438 3.42 3.42 0 0 0-.806 1.946 3.42 3.42 0 0 1-3.138 3.138 3.42 3.42 0 0 0-1.946.806 3.42 3.42 0 0 1-4.438 0 3.42 3.42 0 0 0-1.946-.806 3.42 3.42 0 0 1-3.138-3.138 3.42 3.42 0 0 0-.806-1.946 3.42 3.42 0 0 1 0-4.438 3.42 3.42 0 0 0 .806-1.946 3.42 3.42 0 0 1 3.138-3.138z"/>
              </svg>
            </div>
            <div className="gov-stat-body">
              <div className="gov-stat-value">{loading ? '—' : stats.passedExams}</div>
              <div className="gov-stat-label">Passed ({passRate}%)</div>
              <div className="gov-stat-chart">
                <div className="gov-chart-bar" style={{ width: `${passRate}%` }}/>
              </div>
            </div>
          </div>
        </section>

        {/* Quick Actions */}
        <section className="gov-actions-section">
          <h2 className="gov-section-title">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
            Quick Actions
          </h2>
          <div className="gov-action-cards">
            <Link to="/admin/kyc" className="gov-action-card gov-action-kyc">
              <div className="gov-action-icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0z"/>
                  <path d="M12 14a7 7 0 0 0-7 7h14a7 7 0 0 0-7-7z"/>
                </svg>
              </div>
              <div className="gov-action-content">
                <h3>KYC Management</h3>
                <p>Review and approve citizen identity verification applications</p>
                <span className="gov-action-badge gov-badge-pending">{stats.kycPending} pending</span>
              </div>
              <div className="gov-action-arrow">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </div>
            </Link>

            <Link to="/admin/questions" className="gov-action-card gov-action-questions">
              <div className="gov-action-icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/>
                </svg>
              </div>
              <div className="gov-action-content">
                <h3>Question Bank</h3>
                <p>Manage exam questions and traffic rules content</p>
              </div>
              <div className="gov-action-arrow">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </div>
            </Link>

            <Link to="/admin/blog" className="gov-action-card gov-action-blog">
              <div className="gov-action-icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M19 20H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v1m2 13a2 2 0 0 1-2-2V7m2 13a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"/>
                </svg>
              </div>
              <div className="gov-action-content">
                <h3>Blog & Notices</h3>
                <p>Publish official announcements and driving safety notices</p>
              </div>
              <div className="gov-action-arrow">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </div>
            </Link>
          </div>
        </section>

        {/* CSV Export */}
        <section className="gov-actions-section">
          <h2 className="gov-section-title">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Export Data (CSV)
          </h2>
          <div className="gov-action-cards">
            <button
              className="gov-action-card gov-action-export"
              onClick={handleExportVerifiedKYC}
              disabled={exportLoading !== null}
            >
              <div className="gov-action-icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                  <circle cx="8.5" cy="7" r="4"/>
                  <polyline points="17 11 19 13 23 9"/>
                </svg>
              </div>
              <div className="gov-action-content">
                <h3>Verified KYC Users</h3>
                <p>Download details of all KYC-verified users</p>
                {exportLoading === 'kyc' && <span className="gov-action-badge gov-badge-pending">Exporting...</span>}
              </div>
              <div className="gov-action-arrow">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/>
                  <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
              </div>
            </button>

            <button
              className="gov-action-card gov-action-export"
              onClick={handleExportPassedApplicants}
              disabled={exportLoading !== null}
            >
              <div className="gov-action-icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 0 0 1.946-.806 3.42 3.42 0 0 1 4.438 0 3.42 3.42 0 0 0 1.946.806 3.42 3.42 0 0 1 3.138 3.138 3.42 3.42 0 0 0 .806 1.946 3.42 3.42 0 0 1 0 4.438 3.42 3.42 0 0 0-.806 1.946 3.42 3.42 0 0 1-3.138 3.138 3.42 3.42 0 0 0-1.946.806 3.42 3.42 0 0 1-4.438 0 3.42 3.42 0 0 0-1.946-.806 3.42 3.42 0 0 1-3.138-3.138 3.42 3.42 0 0 0-.806-1.946 3.42 3.42 0 0 1 0-4.438 3.42 3.42 0 0 0 .806-1.946 3.42 3.42 0 0 1 3.138-3.138z"/>
                </svg>
              </div>
              <div className="gov-action-content">
                <h3>Passed Applicants</h3>
                <p>Download details of all users who passed the exam</p>
                {exportLoading === 'passed' && <span className="gov-action-badge gov-badge-pending">Exporting...</span>}
              </div>
              <div className="gov-action-arrow">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/>
                  <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
              </div>
            </button>

            <button
              className="gov-action-card gov-action-export"
              onClick={handleExportFailedApplicants}
              disabled={exportLoading !== null}
            >
              <div className="gov-action-icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="15" y1="9" x2="9" y2="15"/>
                  <line x1="9" y1="9" x2="15" y2="15"/>
                </svg>
              </div>
              <div className="gov-action-content">
                <h3>Failed Applicants</h3>
                <p>Download details of all users who failed the exam</p>
                {exportLoading === 'failed' && <span className="gov-action-badge gov-badge-pending">Exporting...</span>}
              </div>
              <div className="gov-action-arrow">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/>
                  <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
              </div>
            </button>
          </div>
        </section>

        {/* Summary Info */}
        <section className="gov-summary-bar">
          <div className="gov-summary-item">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            <span>Last updated: {new Date().toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}</span>
          </div>
          <div className="gov-summary-item">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 15v2m-6 4h12a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2zm10-10V7a4 4 0 0 0-8 0v4h8z"/>
            </svg>
            <span>Secure Admin Portal</span>
          </div>
        </section>
      </div>
    </AdminLayout>
  )
}

export default AdminDashboard
