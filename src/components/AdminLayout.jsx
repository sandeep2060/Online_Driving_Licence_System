import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import PageLayout from './PageLayout.jsx'

function AdminLayout({ children }) {
  const { user, profile, signOut } = useAuth()
  const location = useLocation()

  return (
    <PageLayout>
      <div className="page page-dashboard admin-dashboard admin-panel">
        <div className="page-card">
          <header className="admin-panel-header">
            <div className="admin-panel-title-wrap">
              <span className="admin-panel-icon">🛡️</span>
              <div>
                <h1 className="page-title">Admin Panel</h1>
                <p className="page-subtitle">Welcome, {profile?.first_name || user?.email}</p>
              </div>
            </div>
            <nav className="admin-panel-nav">
              <Link to="/admin/dashboard" className={`admin-nav-link ${location.pathname === '/admin/dashboard' ? 'active' : ''}`}>Dashboard</Link>
              <Link to="/admin/kyc" className={`admin-nav-link ${location.pathname === '/admin/kyc' ? 'active' : ''}`}>KYC</Link>
              <Link to="/admin/questions" className={`admin-nav-link ${location.pathname === '/admin/questions' ? 'active' : ''}`}>Questions</Link>
              <Link to="/admin/blog" className={`admin-nav-link ${location.pathname === '/admin/blog' ? 'active' : ''}`}>Blog</Link>
              <button type="button" className="btn btn-secondary" onClick={() => signOut()}>
                Sign Out
              </button>
            </nav>
          </header>
          {children}
        </div>
      </div>
    </PageLayout>
  )
}

export default AdminLayout
