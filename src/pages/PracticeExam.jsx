import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLanguage } from '../context/LanguageContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { supabase } from '../lib/supabase.js'
import DashboardLayout from '../components/DashboardLayout.jsx'
import { translations } from '../translations.js'
import ProtectedRoute from '../components/ProtectedRoute.jsx'

const QUESTIONS_PER_PAGE = 5

function PracticeExam() {
  const { language } = useLanguage()
  const { user } = useAuth()
  const navigate = useNavigate()
  const t = translations[language]?.practiceExam || translations.en.practiceExam

  const [questions, setQuestions] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState({})
  const [showResults, setShowResults] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadQuestions()
  }, [language])

  const loadQuestions = async () => {
    try {
      setLoading(true)
      const { data, error: fetchError } = await supabase
        .from('questions')
        .select('*')
        .eq('language', language === 'ne' ? 'ne' : 'en')
        .limit(10) // Practice with 10 questions

      if (fetchError) throw fetchError
      setQuestions(data || [])
    } catch (err) {
      console.error('Error loading questions:', err)
      setError('Failed to load questions. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleAnswerSelect = (questionId, optionIndex) => {
    setAnswers((prev) => ({ ...prev, [questionId]: optionIndex }))
  }

  const handleSubmit = () => {
    setShowResults(true)
  }

  const calculateScore = () => {
    let correct = 0
    questions.forEach((q) => {
      if (answers[q.id] === q.correct_index) {
        correct++
      }
    })
    return { correct, total: questions.length, percentage: Math.round((correct / questions.length) * 100) }
  }

  const resetExam = () => {
    setAnswers({})
    setCurrentIndex(0)
    setShowResults(false)
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="user-page gov-page gov-exam-page">
          <div className="gov-page-loading">
            <div className="spinner"></div>
            <p>Loading questions...</p>
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
              Retry
            </button>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (questions.length === 0) {
    return (
      <DashboardLayout>
        <div className="user-page gov-page gov-exam-page">
          <div className="gov-page-card gov-card--centered">
            <p>No practice questions available yet.</p>
            <button className="gov-btn gov-btn-secondary" onClick={() => navigate('/user/dashboard')}>
              Back to Dashboard
            </button>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (showResults) {
    const { correct, total, percentage } = calculateScore()
    return (
      <DashboardLayout>
        <div className="user-page gov-page gov-exam-page">
          <div className="gov-page-card">
            <h1 className="page-title">{t.results}</h1>
            <div className="exam-results">
              <div className="result-score">
                <span className="score-value">{percentage}%</span>
                <span className="score-label">
                  {correct} / {total} {t.correct}
                </span>
              </div>
              <div className="result-details">
                {questions.map((q, idx) => {
                  const userAnswer = answers[q.id]
                  const isCorrect = userAnswer === q.correct_index
                  return (
                    <div key={q.id} className={`result-item ${isCorrect ? 'correct' : 'incorrect'}`}>
                      <div className="result-question">
                        <strong>Q{idx + 1}:</strong>{' '}
                        {q.question_text || <img src={q.question_image_url} alt="Question" />}
                      </div>
                      <div className="result-answer">
                        {isCorrect ? (
                          <span className="result-correct">✓ {t.correctAnswer}</span>
                        ) : (
                          <span className="result-incorrect">
                            ✗ {t.yourAnswer}: {q.options[userAnswer]?.text || 'Not answered'}
                            <br />
                            {t.correctAnswer}: {q.options[q.correct_index]?.text}
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
              <div className="gov-form-actions">
                <button className="gov-btn gov-btn-primary" onClick={resetExam}>
                  {t.tryAgain}
                </button>
                <button className="gov-btn gov-btn-secondary" onClick={() => navigate('/user/dashboard')}>
                  {t.backToDashboard}
                </button>
              </div>
            </div>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  const currentQuestion = questions[currentIndex]
  const progress = ((currentIndex + 1) / questions.length) * 100

  return (
    <DashboardLayout>
      <div className="user-page gov-page gov-exam-page">
        <div className="gov-page-card">
          <div className="exam-header">
            <h1 className="page-title">{t.title}</h1>
            <div className="exam-progress">
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${progress}%` }} />
              </div>
              <span className="progress-text">
                {t.question} {currentIndex + 1} / {questions.length}
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
              className="gov-btn gov-btn-secondary"
              onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
              disabled={currentIndex === 0}
            >
              {t.previous}
            </button>
            {currentIndex === questions.length - 1 ? (
              <button
                className="gov-btn gov-btn-primary"
                onClick={handleSubmit}
                disabled={Object.keys(answers).length < questions.length}
              >
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

          <div className="gov-form-actions">
            <button className="gov-btn gov-btn-secondary" onClick={() => navigate('/user/dashboard')}>
              {t.cancel}
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

export default function PracticeExamProtected() {
  return (
    <ProtectedRoute requiredRole="user">
      <PracticeExam />
    </ProtectedRoute>
  )
}
