import { useState, useEffect } from 'react'
import { useLanguage } from '../context/LanguageContext.jsx'
import { supabase } from '../lib/supabase.js'
import AdminLayout from '../components/AdminLayout.jsx'
import Input from '../components/Input.jsx'
import Select from '../components/Select.jsx'
import { translations } from '../translations.js'
import ProtectedRoute from '../components/ProtectedRoute.jsx'
import Notification from '../components/Notification.jsx'

function AdminQuestions() {
  const { language } = useLanguage()
  const t = translations[language]?.adminQuestions || translations.en.adminQuestions

  const [questions, setQuestions] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingQuestion, setEditingQuestion] = useState(null)
  const [notification, setNotification] = useState(null)

  const [form, setForm] = useState({
    language: 'en',
    question_text: '',
    question_image_url: '',
    options: ['', '', '', ''],
    correct_index: 0,
    category: '',
  })

  useEffect(() => {
    loadQuestions()
  }, [])

  const loadQuestions = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase.from('questions').select('*').order('created_at', { ascending: false })
      if (error) throw error
      setQuestions(data || [])
    } catch (err) {
      console.error('Error loading questions:', err)
      setNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to load questions.',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.question_text && !form.question_image_url) {
      setNotification({
        type: 'error',
        title: 'Error',
        message: 'Please provide question text or image.',
      })
      return
    }
    if (form.options.some((opt) => !opt.trim())) {
      setNotification({
        type: 'error',
        title: 'Error',
        message: 'Please fill all 4 options.',
      })
      return
    }

    try {
      const optionsData = form.options.map((opt) => ({ text: opt }))
      const payload = {
        language: form.language,
        question_text: form.question_text || null,
        question_image_url: form.question_image_url || null,
        options: optionsData,
        correct_index: form.correct_index,
        category: form.category || null,
      }

      if (editingQuestion) {
        const { error } = await supabase.from('questions').update(payload).eq('id', editingQuestion.id)
        if (error) throw error
        setNotification({
          type: 'success',
          title: 'Success',
          message: 'Question updated successfully.',
        })
      } else {
        const { error } = await supabase.from('questions').insert(payload)
        if (error) throw error
        setNotification({
          type: 'success',
          title: 'Success',
          message: 'Question added successfully.',
        })
      }

      resetForm()
      loadQuestions()
    } catch (err) {
      console.error('Error saving question:', err)
      setNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to save question.',
      })
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this question?')) return
    try {
      const { error } = await supabase.from('questions').delete().eq('id', id)
      if (error) throw error
      setNotification({
        type: 'success',
        title: 'Success',
        message: 'Question deleted successfully.',
      })
      loadQuestions()
    } catch (err) {
      console.error('Error deleting question:', err)
      setNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to delete question.',
      })
    }
  }

  const resetForm = () => {
    setForm({
      language: 'en',
      question_text: '',
      question_image_url: '',
      options: ['', '', '', ''],
      correct_index: 0,
      category: '',
    })
    setEditingQuestion(null)
    setShowForm(false)
  }

  const startEdit = (question) => {
    setEditingQuestion(question)
    setForm({
      language: question.language,
      question_text: question.question_text || '',
      question_image_url: question.question_image_url || '',
      options: question.options.map((opt) => (typeof opt === 'string' ? opt : opt.text)),
      correct_index: question.correct_index,
      category: question.category || '',
    })
    setShowForm(true)
  }

  if (loading) {
    return (
      <AdminLayout>
        <div className="gov-page">
          <div className="gov-page-loading">
            <div className="spinner"></div>
            <p>Loading questions...</p>
          </div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <>
      {notification && (
        <Notification
          type={notification.type}
          title={notification.title}
          message={notification.message}
          onClose={() => setNotification(null)}
        />
      )}
      <AdminLayout>
        <div className="gov-page">
          <header className="gov-page-header gov-page-header--row">
            <div>
              <h1 className="gov-page-title">{t.title}</h1>
              <p className="gov-page-subtitle">Manage exam questions and traffic rules</p>
            </div>
            <button className="gov-btn gov-btn-primary" onClick={() => setShowForm(!showForm)}>
              {showForm ? t.cancel : t.addQuestion}
            </button>
          </header>

            {showForm && (
              <form onSubmit={handleSubmit} className="gov-form gov-question-form">
                <Select
                  label={t.language}
                  value={form.language}
                  onChange={(e) => setForm((prev) => ({ ...prev, language: e.target.value }))}
                  options={[
                    { value: 'en', label: 'English' },
                    { value: 'ne', label: 'Nepali' },
                    { value: 'image', label: 'Image' },
                  ]}
                  required
                />
                {form.language !== 'image' ? (
                  <Input
                    label={t.questionText}
                    value={form.question_text}
                    onChange={(e) => setForm((prev) => ({ ...prev, question_text: e.target.value }))}
                    required
                  />
                ) : (
                  <Input
                    label={t.questionImageUrl}
                    value={form.question_image_url}
                    onChange={(e) => setForm((prev) => ({ ...prev, question_image_url: e.target.value }))}
                    required
                  />
                )}
                {form.options.map((opt, idx) => (
                  <Input
                    key={idx}
                    label={`${t.option} ${idx + 1}`}
                    value={opt}
                    onChange={(e) => {
                      const newOptions = [...form.options]
                      newOptions[idx] = e.target.value
                      setForm((prev) => ({ ...prev, options: newOptions }))
                    }}
                    required
                  />
                ))}
                <Select
                  label={t.correctAnswer}
                  value={form.correct_index.toString()}
                  onChange={(e) => setForm((prev) => ({ ...prev, correct_index: parseInt(e.target.value) }))}
                  options={[
                    { value: '0', label: `${t.option} 1` },
                    { value: '1', label: `${t.option} 2` },
                    { value: '2', label: `${t.option} 3` },
                    { value: '3', label: `${t.option} 4` },
                  ]}
                  required
                />
                <Input
                  label={t.category}
                  value={form.category}
                  onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))}
                />
                <div className="gov-form-actions">
                  <button type="button" className="gov-btn gov-btn-secondary" onClick={resetForm}>
                    {t.cancel}
                  </button>
                  <button type="submit" className="gov-btn gov-btn-primary">
                    {editingQuestion ? t.update : t.add}
                  </button>
                </div>
              </form>
            )}

            <div className="gov-list gov-questions-list">
              {questions.length === 0 ? (
                <div className="gov-empty-state">
                  <p>{t.noQuestions}</p>
                </div>
              ) : (
                questions.map((q) => (
                  <div key={q.id} className="gov-list-card gov-question-card">
                    <div className="question-content">
                      <div className="question-header">
                        <span className="question-language">{q.language.toUpperCase()}</span>
                        {q.category && <span className="question-category">{q.category}</span>}
                      </div>
                      <p className="question-text">
                        {q.question_text || <img src={q.question_image_url} alt="Question" />}
                      </p>
                      <div className="question-options-list">
                        {q.options.map((opt, idx) => (
                          <div
                            key={idx}
                            className={`option-item ${idx === q.correct_index ? 'correct' : ''}`}
                          >
                            {idx + 1}. {typeof opt === 'string' ? opt : opt.text}
                            {idx === q.correct_index && ' ✓'}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="gov-card-actions">
                      <button className="gov-btn gov-btn-secondary" onClick={() => startEdit(q)}>
                        {t.edit}
                      </button>
                      <button className="gov-btn gov-btn-danger" onClick={() => handleDelete(q.id)}>
                        {t.delete}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
        </div>
      </AdminLayout>
    </>
  )
}

export default function AdminQuestionsProtected() {
  return (
    <ProtectedRoute requiredRole="admin">
      <AdminQuestions />
    </ProtectedRoute>
  )
}
