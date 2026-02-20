import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLanguage } from '../context/LanguageContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { supabase } from '../lib/supabase.js'
import DashboardLayout from '../components/DashboardLayout.jsx'
import { translations } from '../translations.js'
import ProtectedRoute from '../components/ProtectedRoute.jsx'

const EXAM_DURATION_MINUTES = 30
const TOTAL_QUESTIONS = 25
const TAB_SWITCH_WARNINGS_MAX = 2

function shuffleArray(arr) {
  const copy = [...arr]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

function Exam() {
  const { language } = useLanguage()
  const { user } = useAuth()
  const navigate = useNavigate()
  const t = translations[language]?.exam || translations.en.exam

  const [questions, setQuestions] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState({})
  const [timeRemaining, setTimeRemaining] = useState(EXAM_DURATION_MINUTES * 60)
  const [examStarted, setExamStarted] = useState(false)
  const [examSubmitted, setExamSubmitted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [tabSwitchWarnings, setTabSwitchWarnings] = useState(0)
  const [showTabWarning, setShowTabWarning] = useState(false)
  const timerRef = useRef(null)
  const submitExamRef = useRef(null)

  useEffect(() => {
    loadQuestions()
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [language])

  useEffect(() => {
    if (!examStarted || examSubmitted) return

    const handleVisibilityChange = () => {
      if (document.hidden) {
        setTabSwitchWarnings((prev) => {
          const next = prev + 1
          if (next > TAB_SWITCH_WARNINGS_MAX) {
            submitExamRef.current?.()
            return next
          }
          setShowTabWarning(true)
          return next
        })
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [examStarted, examSubmitted])

  // Keep submit ref updated for visibility handler
  useEffect(() => {
    submitExamRef.current = submitExam
  })

  useEffect(() => {
    if (examStarted && !examSubmitted && timeRemaining > 0) {
      timerRef.current = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            submitExamRef.current?.()
            return 0
          }
          return prev - 1
        })
      }, 1000)
      return () => {
        if (timerRef.current) clearInterval(timerRef.current)
      }
    }
  }, [examStarted, examSubmitted, timeRemaining])

  const loadQuestions = async () => {
    try {
      setLoading(true)
      setError(null)
      const lang = language === 'ne' ? 'ne' : 'en'
      let { data, error: fetchError } = await supabase
        .from('questions')
        .select('*')
        .eq('language', lang)

      if (fetchError) throw fetchError
      // If no questions for current language, try the other (en/ne) then any language
      if (!data || data.length === 0) {
        const fallbackLang = lang === 'en' ? 'ne' : 'en'
        const res = await supabase.from('questions').select('*').eq('language', fallbackLang)
        if (!res.error && res.data?.length) {
          data = res.data
        }
      }
      if (!data || data.length === 0) {
        const res = await supabase.from('questions').select('*')
        if (!res.error && res.data?.length) {
          data = res.data
        }
      }
      if (!data || data.length === 0) {
        setError('No exam questions available. Please contact administrator.')
        return
      }
      const shuffled = shuffleArray(data)
      setQuestions(shuffled.slice(0, Math.min(TOTAL_QUESTIONS, shuffled.length)))
      setError(null)
    } catch (err) {
      console.error('Error loading questions:', err)
      setError('Failed to load exam questions. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleAnswerSelect = (questionId, optionIndex) => {
    setAnswers((prev) => ({ ...prev, [questionId]: optionIndex }))
  }

  const handleStartExam = () => {
    setExamStarted(true)
    setTimeRemaining(EXAM_DURATION_MINUTES * 60)
  }

  const handleAutoSubmit = async () => {
    if (examSubmitted) return
    await submitExam()
  }

  const handleSubmit = async () => {
    if (window.confirm(t.confirmSubmit)) {
      await submitExam()
    }
  }

  const submitExam = async () => {
    if (examSubmitted) return
    setExamSubmitted(true)
    submitExamRef.current = null
    if (timerRef.current) clearInterval(timerRef.current)

    let correct = 0
    questions.forEach((q) => {
      if (answers[q.id] === q.correct_index) {
        correct++
      }
    })

    const score = Math.round((correct / questions.length) * 100)
    const passed = score >= 70 // 70% passing score

    try {
      const { error: examError } = await supabase.from('exams').insert({
        user_id: user.id,
        status: passed ? 'passed' : 'failed',
        score,
        categories: [],
        completed_at: new Date().toISOString(),
      })

      if (examError) throw examError

      // If passed, create licence (admin will verify)
      if (passed) {
        // Licence creation handled by admin
      }

      navigate('/user/dashboard', { replace: true })
    } catch (err) {
      console.error('Error submitting exam:', err)
      alert('Error submitting exam. Please contact support.')
    }
  }

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="user-page gov-page gov-exam-page">
          <div className="gov-page-loading">
            <div className="spinner"></div>
            <p>{t.loading}</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="user-page gov-page gov-exam-page">
          <div className="gov-page-card gov-card--centered">
            <p className="gov-error-text">{error}</p>
            <button className="gov-btn gov-btn-primary" onClick={loadQuestions}>
              {t.retry}
            </button>
            <button className="gov-btn gov-btn-secondary" onClick={() => navigate('/user/dashboard')}>
              {t.backToDashboard}
            </button>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (!examStarted) {
    return (
      <DashboardLayout>
        <div className="user-page gov-page gov-exam-page">
          <div className="gov-page-card">
            <h1 className="page-title">{t.examRules}</h1>
            <div className="exam-rules">
              <ul>
                <li>{t.rule1}</li>
                <li>{t.rule2}</li>
                <li>{t.rule3}</li>
                <li>{t.rule4}</li>
                <li>{t.rule5}</li>
                <li>{t.rule6}</li>
                <li>{t.rule7}</li>
              </ul>
            </div>
            <div className="gov-form-actions gov-form-actions--col">
              <button className="gov-btn gov-btn-primary gov-btn-full" onClick={handleStartExam}>
                {t.startExam}
              </button>
              <button className="gov-btn gov-btn-secondary gov-btn-full" onClick={() => navigate('/user/dashboard')}>
                {t.cancel}
              </button>
            </div>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (examSubmitted) {
    return (
      <DashboardLayout>
        <div className="user-page gov-page gov-exam-page">
          <div className="gov-page-card">
            <h1 className="gov-page-title">{t.submitting}</h1>
            <p>{t.submittingMessage}</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  const currentQuestion = questions[currentIndex]
  const progress = ((currentIndex + 1) / questions.length) * 100
  const answeredCount = Object.keys(answers).length

  return (
    <DashboardLayout>
      <div className="user-page gov-page gov-exam-page">
        <div className="gov-page-card">
          <div className="exam-header">
            <div className="exam-timer">
              <span className={`timer-text ${timeRemaining < 300 ? 'timer-warning' : ''}`}>
                {formatTime(timeRemaining)}
              </span>
            </div>
            <div className="exam-progress">
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${progress}%` }} />
              </div>
              <span className="progress-text">
                {t.question} {currentIndex + 1} / {questions.length} ({answeredCount} {t.answered})
              </span>
            </div>
          </div>

          <div className="exam-question">
            <div className="question-content">
              {currentQuestion.question_text ? (
                <p className="question-text">{currentQuestion.question_text}</p>
              ) : (
                <img src={currentQuestion.question_image_url} alt="Question" className="question-image" />
              )}
            </div>

            <div className="question-options">
              {currentQuestion.options.map((option, idx) => {
                const optionText = typeof option === 'string' ? option : option.text
                const optionImage = typeof option === 'object' ? option.image : null
                return (
                  <label
                    key={idx}
                    className={`option-label ${answers[currentQuestion.id] === idx ? 'selected' : ''}`}
                  >
                    <input
                      type="radio"
                      name={`question-${currentQuestion.id}`}
                      value={idx}
                      checked={answers[currentQuestion.id] === idx}
                      onChange={() => handleAnswerSelect(currentQuestion.id, idx)}
                    />
                    <div className="option-content">
                      {optionImage ? (
                        <img src={optionImage} alt={`Option ${idx + 1}`} className="option-image" />
                      ) : (
                        <span>{optionText}</span>
                      )}
                    </div>
                  </label>
                )
              })}
            </div>
          </div>

          {showTabWarning && (
            <div className="exam-tab-warning-overlay">
              <div className="exam-tab-warning-modal">
                <h3>{t.tabWarningTitle}</h3>
                <p>{t.tabWarningMessage.replace('{{count}}', tabSwitchWarnings)}</p>
                <button className="gov-btn gov-btn-primary" onClick={() => setShowTabWarning(false)}>
                  {t.tabWarningAcknowledge}
                </button>
              </div>
            </div>
          )}

          <div className="exam-navigation">
            <button
              className="gov-btn gov-btn-secondary"
              onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
              disabled={currentIndex === 0}
            >
              {t.previous}
            </button>
            <div className="question-numbers">
              {questions.map((_, idx) => (
                <button
                  key={idx}
                  className={`question-number ${idx === currentIndex ? 'active' : ''} ${
                    answers[questions[idx].id] !== undefined ? 'answered' : ''
                  }`}
                  onClick={() => setCurrentIndex(idx)}
                >
                  {idx + 1}
                </button>
              ))}
            </div>
            {currentIndex === questions.length - 1 ? (
              <button className="gov-btn gov-btn-primary" onClick={handleSubmit}>
                {t.submit}
              </button>
            ) : (
              <button
                className="gov-btn gov-btn-primary"
                onClick={() => setCurrentIndex((prev) => Math.min(questions.length - 1, prev + 1))}
              >
                {t.next}
              </button>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

export default function ExamProtected() {
  return (
    <ProtectedRoute requiredRole="user">
      <Exam />
    </ProtectedRoute>
  )
}
