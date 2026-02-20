import { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useLanguage } from '../context/LanguageContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'

const menuItems = [
  { path: '/user/dashboard', icon: '🏠', label: 'Dashboard', key: 'dashboard' },
  { path: '/profile', icon: '👤', label: 'Profile & KYC', key: 'profile' },
  { path: '/practice', icon: '📚', label: 'Practice Exam', key: 'practice' },
  { path: '/exam', icon: '📝', label: 'Take Exam', key: 'exam' },
]

function DashboardLayout({ children }) {
  const { language, toggleLanguage } = useLanguage()
  const { user, profile, signOut } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024)

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1024
      setIsMobile(mobile)
      if (!mobile) {
        setSidebarOpen(true)
      } else {
        setSidebarOpen(false)
      }
    }
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const handleSignOut = async () => {
    await signOut()
    navigate('/')
  }

  const isActive = (path) => location.pathname === path

  return (
    <div className="dashboard-layout">
      {/* Vertical Sidebar */}
      <aside className={`dashboard-sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          <Link to="/user/dashboard" className="sidebar-logo">
            <div className="logo-icon-wrapper">
              <span className="logo-icon">🪪</span>
            </div>
            {sidebarOpen && (
              <div className="logo-text-wrapper">
                <span className="logo-text">DriveLicense</span>
                <span className="logo-tagline">Nepal</span>
              </div>
            )}
          </Link>
          {sidebarOpen && (
            <button
              className="sidebar-toggle"
              onClick={() => setSidebarOpen(false)}
              aria-label="Collapse sidebar"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M12.5 15L7.5 10L12.5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          )}
        </div>

        <nav className="sidebar-nav">
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`sidebar-nav-item ${isActive(item.path) ? 'active' : ''}`}
              onClick={() => isMobile && setSidebarOpen(false)}
            >
              <div className="nav-item-content">
                <span className="nav-icon">{item.icon}</span>
                {sidebarOpen && <span className="nav-label">{item.label}</span>}
              </div>
              {isActive(item.path) && <div className="nav-indicator" />}
            </Link>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="user-profile-card">
            <div className="user-avatar-wrapper">
              <div className="user-avatar">
                {profile?.first_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
              </div>
              {sidebarOpen && (
                <div className="user-status-indicator" />
              )}
            </div>
            {sidebarOpen && (
              <div className="user-info-wrapper">
                <div className="user-name">
                  {profile?.first_name || 'User'}
                </div>
                <div className="user-email">{user?.email}</div>
              </div>
            )}
          </div>
          {sidebarOpen && (
            <div className="sidebar-footer-actions">
              <button
                className="footer-action-btn"
                onClick={toggleLanguage}
                title={`Switch to ${language === 'en' ? 'Nepali' : 'English'}`}
              >
                <span>{language === 'en' ? 'ने' : 'EN'}</span>
              </button>
              <button
                className="footer-action-btn"
                onClick={handleSignOut}
                title="Sign Out"
              >
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path d="M7 16H3C2.46957 16 1.96086 15.7893 1.58579 15.4142C1.21071 15.0391 1 14.5304 1 14V4C1 3.46957 1.21071 2.96086 1.58579 2.58579C1.96086 2.21071 2.46957 2 3 2H7M12 13L17 9M17 9L12 5M17 9H7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Mobile Overlay */}
      {sidebarOpen && isMobile && (
        <div
          className="sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <main className="dashboard-main">
        {isMobile && !sidebarOpen && (
          <button
            className="mobile-menu-toggle"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open menu"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M3 12H21M3 6H21M3 18H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        )}
        <div className="dashboard-content">{children}</div>
      </main>
    </div>
  )
}

export default DashboardLayout
