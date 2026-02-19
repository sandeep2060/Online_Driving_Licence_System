import { useAuth } from '../context/AuthContext.jsx'
import PageLayout from '../components/PageLayout.jsx'

function UserDashboard() {
  const { user, profile, signOut } = useAuth()

  return (
    <PageLayout>
      <div className="page page-dashboard user-dashboard">
        <div className="page-card">
          <h1 className="page-title">User Dashboard</h1>
          <p className="page-subtitle">
            Welcome, {profile?.first_name || user?.email}
          </p>

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
          </div>

          <button type="button" className="btn btn-secondary btn-full" onClick={() => signOut()}>
            Sign Out
          </button>
        </div>
      </div>
    </PageLayout>
  )
}

export default UserDashboard
