import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { supabase } from '../lib/supabase.js'
import PageLayout from '../components/PageLayout.jsx'

function AdminDashboard() {
  const { user, profile, signOut } = useAuth()
  const [stats, setStats] = useState({
    kycPending: 0,
    kycVerified: 0,
    kycRejected: 0,
    totalExams: 0,
    passedExams: 0,
  })

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    try {
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
    }
  }

  return (
    <PageLayout>
      <div className="page page-dashboard admin-dashboard">
        <div className="page-card">
          <h1 className="page-title">Admin Dashboard</h1>
          <p className="page-subtitle">Welcome, {profile?.first_name || user?.email}</p>

          <div className="dashboard-stats">
            <div className="stat-card">
              <span className="stat-value">{stats.kycPending}</span>
              <span className="stat-label">Pending KYC</span>
            </div>
            <div className="stat-card">
              <span className="stat-value">{stats.kycVerified}</span>
              <span className="stat-label">Verified KYC</span>
            </div>
            <div className="stat-card">
              <span className="stat-value">{stats.totalExams}</span>
              <span className="stat-label">Total Exams</span>
            </div>
            <div className="stat-card">
              <span className="stat-value">{stats.passedExams}</span>
              <span className="stat-label">Passed Exams</span>
            </div>
          </div>

          <div className="admin-links">
            <Link to="/admin/kyc" className="admin-link-card">
              <h3>KYC Management</h3>
              <p>Review and approve KYC applications</p>
              <span className="badge badge--submitted">{stats.kycPending} pending</span>
            </Link>
            <Link to="/admin/questions" className="admin-link-card">
              <h3>Question Bank</h3>
              <p>Manage exam questions</p>
            </Link>
            <Link to="/admin/blog" className="admin-link-card">
              <h3>Blog & Notices</h3>
              <p>Manage blog posts and notices</p>
            </Link>
          </div>

          <button type="button" className="btn btn-secondary btn-full" onClick={() => signOut()}>
            Sign Out
          </button>
        </div>
      </div>
    </PageLayout>
  )
}

export default AdminDashboard
