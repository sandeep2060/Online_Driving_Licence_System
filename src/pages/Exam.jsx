import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLanguage } from '../context/LanguageContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { supabase } from '../lib/supabase.js'
import PageLayout from '../components/PageLayout.jsx'
import { translations } from '../translations.js'
import ProtectedRoute from '../components/ProtectedRoute.jsx'

const EXAM_DURATION_MINUTES = 30
const TOTAL_QUESTIONS = 20

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
  const timerRef = useRef(null)

  useEffect(() => {
    loadQuestions()
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [language])

  useEffect(() => {
    if (examStarted && !examSubmitted && timeRemaining > 0) {
      timerRef.current = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            handleAutoSubmit()
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
      const { data, error: fetchError } = await supabase
        .from('questions')
        .select('*')
        .eq('language', language === 'ne' ? 'ne' : 'en')
        .limit(TOTAL_QUESTIONS)

      if (fetchError) throw fetchError
      if (!data || data.length === 0) {
        setError('No exam questions available. Please contact administrator.')
        return
      }
      setQuestions(data)
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
      <PageLayout>
        <div className="page page-exam">
          <div className="page-card">
            <p>{t.loading}</p>
          </div>
        </div>
      </PageLayout>
    )
  }

  if (error) {
    return (
      <PageLayout>
        <div className="page page-exam">
          <div className="page-card">
            <p className="error-message">{error}</p>
            <button className="btn btn-primary" onClick={loadQuestions}>
              {t.retry}
            </button>
            <button className="btn btn-secondary" onClick={() => navigate('/user/dashboard')}>
              {t.backToDashboard}
            </button>
          </div>
        </div>
      </PageLayout>
    )
  }

  if (!examStarted) {
    return (
      <PageLayout>
        <div className="page page-exam">
          <div className="page-card">
            <h1 className="page-title">{t.examRules}</h1>
            <div className="exam-rules">
              <ul>
                <li>{t.rule1}</li>
                <li>{t.rule2}</li>
                <li>{t.rule3}</li>
                <li>{t.rule4}</li>
                <li>{t.rule5}</li>
              </ul>
            </div>
            <div className="exam-actions">
              <button className="btn btn-primary btn-full" onClick={handleStartExam}>
                {t.startExam}
              </button>
              <button className="btn btn-secondary btn-full" onClick={() => navigate('/user/dashboard')}>
                {t.cancel}
              </button>
            </div>
          </div>
        </div>
      </PageLayout>
    )
  }

  if (examSubmitted) {
    return (
      <PageLayout>
        <div className="page page-exam">
          <div className="page-card">
            <h1 className="page-title">{t.submitting}</h1>
            <p>{t.submittingMessage}</p>
          </div>
        </div>
      </PageLayout>
    )
  }

  const currentQuestion = questions[currentIndex]
  const progress = ((currentIndex + 1) / questions.length) * 100
  const answeredCount = Object.keys(answers).length

  return (
    <PageLayout>
      <div className="page page-exam">
        <div className="page-card">
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

          <div className="exam-navigation">
            <button
              className="btn btn-secondary"
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
              <button className="btn btn-primary" onClick={handleSubmit}>
                {t.submit}
              </button>
            ) : (
              <button
                className="btn btn-primary"
                onClick={() => setCurrentIndex((prev) => Math.min(questions.length - 1, prev + 1))}
              >
                {t.next}
              </button>
            )}
          </div>
        </div>
      </div>
    </PageLayout>
  )
}

export default function ExamProtected() {
  return (
    <ProtectedRoute requiredRole="user">
      <Exam />
    </ProtectedRoute>
  )
}
