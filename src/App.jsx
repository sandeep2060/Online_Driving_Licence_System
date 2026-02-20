import { Link } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import { useLanguage } from './context/LanguageContext.jsx'
import { translations } from './translations.js'
import { supabase } from './lib/supabase.js'

const NEPAL_TRAFFIC_IMAGES = [
  {
    id: 1,
    src: 'https://risingnepaldaily.com/storage/media/8543/police.jpg',
    alt: 'Kathmandu street scene with traffic',
  },
  {
    id: 2,
    src: 'https://annapurnaexpress.prixacdn.net/media/albums/bike-accident_20190917032220_20200117173401_upUZcuXI2p.jpg',
    alt: 'Control by traffic police',
  },
  {
    id: 3,
    src: 'https://assets-api.kathmandupost.com/thumb.php?src=https://assets-cdn.kathmandupost.com/uploads/source/news/2021/news/traffic-1629485617.png&w=900&height=601',
    alt: 'Bus accident',
  },
  {
    id: 4,
    src: 'https://republicaimg.nagariknewscdn.com/shared/web/uploads/media/W3J2iwsHh6ZzSsQdtNtuW1P401KPuPr89XMyUiHP.jpg',
    alt: 'Drink and drive',
  },
  {
    id: 5,
    src: 'https://assets-api.kathmandupost.com/thumb.php?src=https://assets-cdn.kathmandupost.com/uploads/source/news/2021/news/24-1640919283.jpg&w=900&height=601',
    alt: 'safety checks to curb drink driving'
  }


]

export default function App() {
  const { language, toggleLanguage } = useLanguage()
  const t = translations[language]
  const [navOpen, setNavOpen] = useState(false)
  const [slideIndex, setSlideIndex] = useState(0)

  const images = useMemo(() => NEPAL_TRAFFIC_IMAGES, [])
  const slideCount = images.length
  const [blogPosts, setBlogPosts] = useState([])

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 768) setNavOpen(false)
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  useEffect(() => {
    if (slideCount <= 1) return undefined
    const id = window.setInterval(() => {
      setSlideIndex((prev) => (prev + 1) % slideCount)
    }, 3500)
    return () => window.clearInterval(id)
  }, [slideCount])

  useEffect(() => {
    async function fetchBlogPosts() {
      const { data } = await supabase
        .from('blog_posts')
        .select('id, title, image_url, body, created_at')
        .order('created_at', { ascending: false })
        .limit(6)
      setBlogPosts(data || [])
    }
    fetchBlogPosts()
  }, [])

  const services = [
    {
      id: 1,
      title: t.services.apply.title,
      description: t.services.apply.description,
      icon: '🚗',
      color: 'var(--accent-teal)',
      cta: t.services.apply.cta,
    },
    {
      id: 2,
      title: t.services.renew.title,
      description: t.services.renew.description,
      icon: '🔄',
      color: 'var(--accent-amber)',
      cta: t.services.renew.cta,
    },
    {
      id: 3,
      title: t.services.replace.title,
      description: t.services.replace.description,
      icon: '📄',
      color: 'var(--accent-coral)',
      cta: t.services.replace.cta,
    },
  ]

  return (
    <div className={`app ${language === 'ne' ? 'lang-ne' : ''}`}>
      <header className="header">
        <nav className="nav">
          <div className="logo">
            <span className="logo-icon">🪪</span>
            <span className="logo-text">Likhit Exam</span>
          </div>
          <button
            type="button"
            className="nav-toggle"
            aria-label="Toggle navigation"
            aria-expanded={navOpen}
            onClick={() => setNavOpen((v) => !v)}
          >
            <span className="nav-toggle-bar" />
            <span className="nav-toggle-bar" />
            <span className="nav-toggle-bar" />
          </button>

          <ul className={`nav-links ${navOpen ? 'open' : ''}`}>
            <li><a href="#services">{t.nav.services}</a></li>
            <li><a href="#blog">{t.nav.blog}</a></li>
            <li><a href="#emergency">{t.nav.emergency}</a></li>
            <li><a href="#contact">{t.nav.contact}</a></li>
            <li>
              <button
                type="button"
                className="lang-switcher"
                onClick={toggleLanguage}
                title={t.langSwitch}
                aria-label={t.langSwitch}
              >
                {language === 'en' ? 'ने' : 'En'}
                </button>
            </li>
            <li><Link to="/login" className="btn-login">{t.nav.signIn}</Link></li>
          </ul>
        </nav>
      </header>

      {navOpen && <button type="button" className="nav-backdrop" aria-label="Close navigation" onClick={() => setNavOpen(false)} />}

      <main>
        <section className="hero">
          <div className="hero-content">
            <div className="hero-copy">
              <span className="hero-badge">{t.hero.badge}</span>
              <h1 className="hero-title">
                <span className="hero-title-line">{t.hero.title} <span className="highlight">{t.hero.titleHighlight}</span></span>
                <span className="hero-title-line hero-title-end">{t.hero.titleEnd}</span>
              </h1>
              <p className="hero-subtitle">{t.hero.subtitle}</p>
              <div className="hero-actions">
                <Link to="/signup" className="btn btn-primary">{t.hero.getStarted}</Link>
              </div>
            </div>
          </div>
          <div className="hero-visual">
            <div className="card-mockup">
              <div className="card-strip"></div>
              <div className="card-details">
                <div className="card-photo"></div>
                <div className="card-info">
                  <div className="card-line"></div>
                  <div className="card-line short"></div>
                  <div className="card-line shorter"></div>
                  <div className="card-chip">💳</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="services" className="services">
          <h2 className="section-title">{t.services.title}</h2>
          <p className="section-subtitle">{t.services.subtitle}</p>
          <div className="services-grid">
            {services.map((service) => (
              <div key={service.id} className="service-card">
                <div className="service-icon" style={{ background: service.color }}>
                  {service.icon}
                </div>
                <h3>{service.title}</h3>
                <p>{service.description}</p>
                <a href="#" className="service-link">{service.cta} →</a>
              </div>
            ))}
          </div>
        </section>

        <section id="blog" className="blog-section">
          <h2 className="section-title">{t.blog.title}</h2>
          <p className="section-subtitle">{t.blog.subtitle}</p>
          <div className="blog-grid">
            {blogPosts.length === 0 ? (
              <p className="blog-empty">{t.blog.noPosts}</p>
            ) : (
              blogPosts.map((post) => {
                const plain = post.body ? String(post.body).replace(/<[^>]+>/g, '').trim() : ''
                const excerpt = plain.slice(0, 120) + (plain.length > 120 ? '…' : '')
                const date = post.created_at ? new Date(post.created_at).toLocaleDateString(language === 'ne' ? 'ne-NP' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : ''
                return (
                  <article key={post.id} className="blog-card">
                    <div className="blog-card-image">
                      {post.image_url ? (
                        <img src={post.image_url} alt={post.title} loading="lazy" />
                      ) : (
                        <div className="blog-card-placeholder" aria-hidden="true" />
                      )}
                      <span className="blog-card-date">{date}</span>
                    </div>
                    <div className="blog-card-body">
                      <h3 className="blog-card-title">{post.title}</h3>
                      {excerpt && <p className="blog-card-excerpt">{excerpt}</p>}
                      <span className="blog-card-link">{t.blog.readMore} →</span>
                    </div>
                  </article>
                )
              })
            )}
          </div>
        </section>

        <section id="gallery" className="gallery">
          <h2 className="section-title">{t.gallery.title}</h2>
          <p className="section-subtitle">{t.gallery.subtitle}</p>
          <div className="slider">
            <div className="slider-window slider-window--two">
              <div
                className="slider-track"
                style={{ transform: `translateX(calc(-${slideIndex} * (50% + 2.5px)))` }}
              >
                {images.map((img) => (
                  <div key={img.id} className="slider-slide slider-slide--half">
                    <img src={img.src} alt={img.alt} loading="lazy" />
                  </div>
                ))}
              </div>
            </div>

            <div className="slider-controls">
              <button
                type="button"
                className="slider-btn"
                aria-label="Previous"
                onClick={() => setSlideIndex((i) => (i <= 0 ? slideCount - 1 : i - 1))}
              >
                ‹
              </button>

              <div className="slider-dots" role="tablist" aria-label="Image slider">
                {images.map((img, i) => (
                  <button
                    key={img.id}
                    type="button"
                    className={`slider-dot ${i === slideIndex ? 'active' : ''}`}
                    aria-label={`Go to slide ${i + 1}`}
                    aria-pressed={i === slideIndex}
                    onClick={() => setSlideIndex(i)}
                  />
                ))}
              </div>

              <button
                type="button"
                className="slider-btn"
                aria-label="Next"
                onClick={() => setSlideIndex((i) => (i + 1) % slideCount)}
              >
                ›
              </button>
            </div>
          </div>
        </section>

        <section id="emergency" className="emergency-contacts">
          <h2 className="section-title">{t.emergency.title}</h2>
          <p className="section-subtitle">{t.emergency.subtitle}</p>
          <div className="emergency-grid">
            <a href="tel:103" className="emergency-card">
              <span className="emergency-icon" aria-hidden="true">🚦</span>
              <span className="emergency-label">{t.emergency.trafficPolice}</span>
              <span className="emergency-number">{t.emergency.trafficNumber}</span>
            </a>
            <a href="tel:100" className="emergency-card">
              <span className="emergency-icon" aria-hidden="true">🚔</span>
              <span className="emergency-label">{t.emergency.police}</span>
              <span className="emergency-number">{t.emergency.policeNumber}</span>
            </a>
            <a href="tel:102" className="emergency-card">
              <span className="emergency-icon" aria-hidden="true">🚑</span>
              <span className="emergency-label">{t.emergency.ambulance}</span>
              <span className="emergency-number">{t.emergency.ambulanceNumber}</span>
            </a>
            <a href="tel:101" className="emergency-card">
              <span className="emergency-icon" aria-hidden="true">🚒</span>
              <span className="emergency-label">{t.emergency.fire}</span>
              <span className="emergency-number">{t.emergency.fireNumber}</span>
            </a>
            <a href="tel:1144" className="emergency-card">
              <span className="emergency-icon" aria-hidden="true">🛂</span>
              <span className="emergency-label">{t.emergency.touristPolice}</span>
              <span className="emergency-number">{t.emergency.touristNumber}</span>
            </a>
            <div className="emergency-card emergency-card--radio">
              <span className="emergency-icon" aria-hidden="true">📻</span>
              <span className="emergency-label">{t.emergency.trafficRadio}</span>
              <span className="emergency-detail">{t.emergency.trafficRadioDetail}</span>
            </div>
          </div>
          <p className="emergency-note">{t.emergency.dialNote}</p>
        </section>

        <footer id="contact" className="footer">
          <div className="footer-content">
            <div className="footer-brand">
              <span className="logo-icon">🪪</span>
              <span>admin@gmail.com</span>
            </div>
            <div className="footer-links">
              <a href="#">{t.footer.privacy}</a>
              <a href="#">{t.footer.terms}</a>
              <a href="#">{t.footer.help}</a>
            </div>
            <p className="footer-copy">© {new Date().getFullYear()} {t.footer.copyright}</p>
          </div>
        </footer>
      </main>
    </div>
  )
}

