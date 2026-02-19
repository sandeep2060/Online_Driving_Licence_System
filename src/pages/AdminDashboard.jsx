import { useAuth } from '../context/AuthContext.jsx'
import PageLayout from '../components/PageLayout.jsx'

function AdminDashboard() {
  const { user, profile, signOut } = useAuth()

  return (
    <PageLayout>
      <div className="page page-dashboard admin-dashboard">
        <div className="page-card">
          <h1 className="page-title">Admin Dashboard</h1>
          <p className="page-subtitle">Welcome, {profile?.first_name || user?.email}</p>

          <div className="dashboard-stats">
            <div className="stat-card">
              <span className="stat-value">—</span>
              <span className="stat-label">Applications</span>
            </div>
            <div className="stat-card">
              <span className="stat-value">—</span>
              <span className="stat-label">Pending</span>
            </div>
            <div className="stat-card">
              <span className="stat-value">—</span>
              <span className="stat-label">Approved</span>
            </div>
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
