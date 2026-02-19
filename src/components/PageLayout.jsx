import { Link } from 'react-router-dom'
import { useLanguage } from '../context/LanguageContext.jsx'
import { translations } from '../translations.js'

function PageLayout({ children, showLangSwitch = true }) {
  const { language, toggleLanguage } = useLanguage()
  const t = translations[language]?.nav || translations.en.nav

  return (
    <div className={`page-layout ${language === 'ne' ? 'lang-ne' : ''}`}>
      <header className="page-header">
        <nav className="page-nav">
          <Link to="/" className="page-logo">
            <span className="logo-icon">🪪</span>
            <span className="logo-text">DriveLicense</span>
          </Link>
          <div className="page-nav-links">
            {showLangSwitch && (
              <button
                type="button"
                className="lang-switcher"
                onClick={toggleLanguage}
              >
                {language === 'en' ? 'नेपाली' : 'English'}
              </button>
            )}
            <Link to="/" className="page-nav-link">Home</Link>
            <Link to="/login" className="btn-login">{t.signIn}</Link>
            <Link to="/signup" className="btn btn-primary btn-sm">Sign Up</Link>
          </div>
        </nav>
      </header>
      <main className="page-main">
        {children}
      </main>
    </div>
  )
}

export default PageLayout
