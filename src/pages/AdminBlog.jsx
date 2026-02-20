import { useState, useEffect } from 'react'
import { useLanguage } from '../context/LanguageContext.jsx'
import { supabase } from '../lib/supabase.js'
import PageLayout from '../components/PageLayout.jsx'
import Input from '../components/Input.jsx'
import { translations } from '../translations.js'
import ProtectedRoute from '../components/ProtectedRoute.jsx'
import Notification from '../components/Notification.jsx'

function AdminBlog() {
  const { language } = useLanguage()
  const t = translations[language]?.adminBlog || translations.en.adminBlog

  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingPost, setEditingPost] = useState(null)
  const [notification, setNotification] = useState(null)

  const [form, setForm] = useState({
    title: '',
    image_url: '',
    body: '',
  })

  useEffect(() => {
    loadPosts()
  }, [])

  const loadPosts = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase.from('blog_posts').select('*').order('created_at', { ascending: false })
      if (error) throw error
      setPosts(data || [])
    } catch (err) {
      console.error('Error loading posts:', err)
      setNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to load blog posts.',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.title.trim() || !form.body.trim()) {
      setNotification({
        type: 'error',
        title: 'Error',
        message: 'Please fill all required fields.',
      })
      return
    }

    try {
      if (editingPost) {
        const { error } = await supabase.from('blog_posts').update(form).eq('id', editingPost.id)
        if (error) throw error
        setNotification({
          type: 'success',
          title: 'Success',
          message: 'Post updated successfully.',
        })
      } else {
        const { error } = await supabase.from('blog_posts').insert(form)
        if (error) throw error
        setNotification({
          type: 'success',
          title: 'Success',
          message: 'Post added successfully.',
        })
      }

      resetForm()
      loadPosts()
    } catch (err) {
      console.error('Error saving post:', err)
      setNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to save post.',
      })
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this post?')) return
    try {
      const { error } = await supabase.from('blog_posts').delete().eq('id', id)
      if (error) throw error
      setNotification({
        type: 'success',
        title: 'Success',
        message: 'Post deleted successfully.',
      })
      loadPosts()
    } catch (err) {
      console.error('Error deleting post:', err)
      setNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to delete post.',
      })
    }
  }

  const resetForm = () => {
    setForm({
      title: '',
      image_url: '',
      body: '',
    })
    setEditingPost(null)
    setShowForm(false)
  }

  const startEdit = (post) => {
    setEditingPost(post)
    setForm({
      title: post.title,
      image_url: post.image_url || '',
      body: post.body || '',
    })
    setShowForm(true)
  }

  if (loading) {
    return (
      <PageLayout>
        <div className="page page-admin">
          <div className="page-card">
            <p>Loading posts...</p>
          </div>
        </div>
      </PageLayout>
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
      <PageLayout>
        <div className="page page-admin">
          <div className="page-card">
            <div className="admin-header">
              <h1 className="page-title">{t.title}</h1>
              <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
                {showForm ? t.cancel : t.addPost}
              </button>
            </div>

            {showForm && (
              <form onSubmit={handleSubmit} className="blog-form">
                <Input
                  label={t.title}
                  value={form.title}
                  onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                  required
                />
                <Input
                  label={t.imageUrl}
                  value={form.image_url}
                  onChange={(e) => setForm((prev) => ({ ...prev, image_url: e.target.value }))}
                />
                <label>
                  {t.body}
                  <textarea
                    value={form.body}
                    onChange={(e) => setForm((prev) => ({ ...prev, body: e.target.value }))}
                    rows={10}
                    required
                  />
                </label>
                <div className="form-actions">
                  <button type="button" className="btn btn-secondary" onClick={resetForm}>
                    {t.cancel}
                  </button>
                  <button type="submit" className="btn btn-primary">
                    {editingPost ? t.update : t.add}
                  </button>
                </div>
              </form>
            )}

            <div className="posts-list">
              {posts.length === 0 ? (
                <p className="empty-state">{t.noPosts}</p>
              ) : (
                posts.map((post) => (
                  <div key={post.id} className="post-item">
                    {post.image_url && <img src={post.image_url} alt={post.title} className="post-image" />}
                    <div className="post-content">
                      <h3>{post.title}</h3>
                      <p className="post-body">{post.body.substring(0, 200)}...</p>
                      <p className="post-meta">
                        Created: {new Date(post.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="post-actions">
                      <button className="btn btn-secondary" onClick={() => startEdit(post)}>
                        {t.edit}
                      </button>
                      <button className="btn btn-danger" onClick={() => handleDelete(post.id)}>
                        {t.delete}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </PageLayout>
    </>
  )
}

export default function AdminBlogProtected() {
  return (
    <ProtectedRoute requiredRole="admin">
      <AdminBlog />
    </ProtectedRoute>
  )
}
