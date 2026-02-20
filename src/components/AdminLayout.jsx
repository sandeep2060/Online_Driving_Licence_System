import { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import PageLayout from './PageLayout.jsx'

const adminNavItems = [
  {
    path: '/admin/dashboard',
    label: 'Dashboard',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="9" rx="1"/>
        <rect x="14" y="3" width="7" height="5" rx="1"/>
        <rect x="14" y="12" width="7" height="9" rx="1"/>
        <rect x="3" y="16" width="7" height="5" rx="1"/>
      </svg>
    ),
  },
  {
    path: '/admin/kyc',
    label: 'KYC Management',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0z"/>
        <path d="M12 14a7 7 0 0 0-7 7h14a7 7 0 0 0-7-7z"/>
      </svg>
    ),
  },
  {
    path: '/admin/questions',
    label: 'Question Bank',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2"/>
        <path d="M9 12h6M9 16h6"/>
      </svg>
    ),
  },
  {
    path: '/admin/blog',
    label: 'Blog & Notices',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M19 20H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v1m2 13a2 2 0 0 1-2-2V7m2 13a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"/>
      </svg>
    ),
  },
]

function AdminLayout({ children }) {
  const { user, profile, signOut } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1024
      setIsMobile(mobile)
      if (!mobile) setSidebarOpen(true)
      else setSidebarOpen(false)
    }
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const handleSignOut = async () => {
    await signOut()
    navigate('/')
  }

  return (
    <PageLayout>
      <div className="gov-admin-layout">
        {/* Government Admin Sidebar */}
        <aside className={`gov-admin-sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
          <div className="gov-sidebar-header">
            <Link to="/admin/dashboard" className="gov-sidebar-logo">
              <div className="gov-logo-badge">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5"/>
                </svg>
              </div>
              {sidebarOpen && (
                <div className="gov-logo-text">
                  <span className="gov-logo-title">नागरिकता विभाग</span>
                  <span className="gov-logo-sub">Driving Licence System</span>
                </div>
              )}
            </Link>
            {sidebarOpen && (
              <button className="gov-sidebar-toggle" onClick={() => setSidebarOpen(false)} aria-label="Collapse">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M15 18l-6-6 6-6"/>
                </svg>
              </button>
            )}
          </div>

          <div className="gov-admin-badge">
            {sidebarOpen && (
              <div className="gov-admin-role">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 15v2m-6 4h12a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2zm10-10V7a4 4 0 0 0-8 0v4h8z"/>
                </svg>
                <span>Administrator</span>
              </div>
            )}
          </div>

          <nav className="gov-sidebar-nav">
            {adminNavItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`gov-nav-item ${location.pathname === item.path ? 'active' : ''}`}
                onClick={() => isMobile && setSidebarOpen(false)}
              >
                <span className="gov-nav-icon">{item.icon}</span>
                {sidebarOpen && <span className="gov-nav-label">{item.label}</span>}
                {location.pathname === item.path && <div className="gov-nav-indicator"/>}
              </Link>
            ))}
          </nav>

          <div className="gov-sidebar-footer">
            <div className="gov-user-card">
              <div className="gov-user-avatar">
                {profile?.first_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'A'}
              </div>
              {sidebarOpen && (
                <div className="gov-user-info">
                  <div className="gov-user-name">{profile?.first_name || 'Admin'}</div>
                  <div className="gov-user-email">{user?.email}</div>
                </div>
              )}
            </div>
            <button className="gov-signout-btn" onClick={handleSignOut}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>
              </svg>
              {sidebarOpen && <span>Sign Out</span>}
            </button>
          </div>
        </aside>

        {sidebarOpen && isMobile && (
          <div className="gov-sidebar-overlay" onClick={() => setSidebarOpen(false)}/>
        )}

        <main className="gov-admin-main">
          {isMobile && !sidebarOpen && (
            <button className="gov-mobile-toggle" onClick={() => setSidebarOpen(true)} aria-label="Menu">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 12h18M3 6h18M3 18h18"/>
              </svg>
            </button>
          )}
          <div className="gov-admin-content">{children}</div>
        </main>
      </div>
    </PageLayout>
  )
}

export default AdminLayout
