import { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useLanguage } from '../context/LanguageContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { translations } from '../translations.js'

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
    handleResize() // Initial check
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
          <div className="sidebar-logo">
            <span className="logo-icon">🪪</span>
            <span className="logo-text">DriveLicense</span>
          </div>
          <button
            className="sidebar-toggle"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label="Toggle sidebar"
          >
            {sidebarOpen ? '←' : '→'}
          </button>
        </div>

        <nav className="sidebar-nav">
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`sidebar-nav-item ${isActive(item.path) ? 'active' : ''}`}
            >
              <span className="nav-icon">{item.icon}</span>
              {sidebarOpen && <span className="nav-label">{item.label}</span>}
            </Link>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="user-profile">
            <div className="user-avatar">
              {profile?.first_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
            </div>
            {sidebarOpen && (
              <div className="user-info">
                <div className="user-name">
                  {profile?.first_name || 'User'}
                </div>
                <div className="user-email">{user?.email}</div>
              </div>
            )}
          </div>
          <div className="sidebar-actions">
            <button
              className="sidebar-action-btn"
              onClick={toggleLanguage}
              title="Switch Language"
            >
              <span>{language === 'en' ? 'ने' : 'EN'}</span>
            </button>
            <button
              className="sidebar-action-btn"
              onClick={handleSignOut}
              title="Sign Out"
            >
              <span>🚪</span>
            </button>
          </div>
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
        {isMobile && (
          <button
            className="mobile-menu-toggle"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open menu"
          >
            ☰
          </button>
        )}
        <div className="dashboard-content">{children}</div>
      </main>
    </div>
  )
}

export default DashboardLayout
