import { useState, useEffect } from 'react'
import { useLanguage } from '../context/LanguageContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { supabase } from '../lib/supabase.js'
import AdminLayout from '../components/AdminLayout.jsx'
import { translations } from '../translations.js'
import ProtectedRoute from '../components/ProtectedRoute.jsx'
import Notification from '../components/Notification.jsx'

function AdminKYC() {
  const { language } = useLanguage()
  const { user } = useAuth()
  const t = translations[language]?.adminKYC || translations.en.adminKYC

  const [kycList, setKycList] = useState([])
  const [filter, setFilter] = useState('all') // all, pending, verified, rejected
  const [selectedKYC, setSelectedKYC] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [notification, setNotification] = useState(null)
  const [rejectionReason, setRejectionReason] = useState('')

  useEffect(() => {
    loadKYC()
  }, [filter])

  const loadKYC = async () => {
    try {
      setLoading(true)
      let query = supabase.from('kyc').select('*')

      if (filter !== 'all') {
        query = query.eq('status', filter)
      }

      const { data: kycData, error } = await query.order('submitted_at', { ascending: false })

      if (error) throw error

      if (!kycData || kycData.length === 0) {
        setKycList([])
        return
      }

      const userIds = [...new Set(kycData.map((k) => k.user_id))]
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email')
        .in('id', userIds)

      const profileMap = (profileData || []).reduce((acc, p) => {
        acc[p.id] = p
        return acc
      }, {})

      const merged = kycData.map((kyc) => ({
        ...kyc,
        profiles: profileMap[kyc.user_id] || null,
      }))

      setKycList(merged)
    } catch (err) {
      console.error('Error loading KYC:', err)
      setNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to load KYC applications.',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleReview = async (kycId, status) => {
    if (status === 'rejected' && !rejectionReason.trim()) {
      setNotification({
        type: 'error',
        title: 'Error',
        message: 'Please provide a rejection reason.',
      })
      return
    }

    setSubmitting(true)
    try {
      const updateData = {
        status,
        reviewed_at: new Date().toISOString(),
        reviewed_by: user.id,
      }

      if (status === 'rejected') {
        updateData.rejection_reason = rejectionReason
      }

      const { error } = await supabase.from('kyc').update(updateData).eq('id', kycId)

      if (error) throw error

      setNotification({
        type: 'success',
        title: 'Success',
        message: `KYC ${status === 'verified' ? 'approved' : 'rejected'} successfully.`,
      })

      setSelectedKYC(null)
      setRejectionReason('')
      loadKYC()
    } catch (err) {
      console.error('Error reviewing KYC:', err)
      setNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to update KYC status.',
      })
    } finally {
      setSubmitting(false)
    }
  }

  const getKYCUser = (kyc) => {
    const profile = kyc.profiles
    if (profile) {
      return `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || profile.email
    }
    return 'Unknown User'
  }

  if (loading) {
    return (
      <AdminLayout>
        <div className="gov-page">
          <div className="gov-page-loading">
            <div className="spinner"></div>
            <p>Loading KYC applications...</p>
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
          <header className="gov-page-header">
            <h1 className="gov-page-title">{t.title}</h1>
            <p className="gov-page-subtitle">Review and verify citizen KYC applications</p>
          </header>

          <div className="gov-filters">
              <button
                className={`gov-filter-btn ${filter === 'all' ? 'active' : ''}`}
                onClick={() => setFilter('all')}
              >
                {t.all}
              </button>
              <button
                className={`gov-filter-btn ${filter === 'submitted' ? 'active' : ''}`}
                onClick={() => setFilter('submitted')}
              >
                {t.pending}
              </button>
              <button
                className={`gov-filter-btn ${filter === 'verified' ? 'active' : ''}`}
                onClick={() => setFilter('verified')}
              >
                {t.verified}
              </button>
              <button
                className={`gov-filter-btn ${filter === 'rejected' ? 'active' : ''}`}
                onClick={() => setFilter('rejected')}
              >
                {t.rejected}
              </button>
            </div>

            <div className="gov-list gov-kyc-list">
              {kycList.length === 0 ? (
                <div className="gov-empty-state">
                  <p>{t.noApplications}</p>
                </div>
              ) : (
                kycList.map((kyc) => (
                  <div key={kyc.id} className="gov-list-card gov-kyc-card">
                    <div className="gov-card-header">
                      <div>
                        <h3>{getKYCUser(kyc)}</h3>
                        <p className="gov-card-meta">
                          Submitted: {new Date(kyc.submitted_at).toLocaleDateString()}
                        </p>
                      </div>
                      <span className={`gov-badge gov-badge--${kyc.status}`}>
                        {kyc.status === 'verified'
                          ? '✓ Verified'
                          : kyc.status === 'rejected'
                          ? '✗ Rejected'
                          : '⏳ Pending'}
                      </span>
                    </div>
                    <div className="gov-card-actions">
                      <button
                        className="gov-btn gov-btn-secondary"
                        onClick={() => setSelectedKYC(kyc)}
                      >
                        {t.viewDetails}
                      </button>
                      {kyc.status === 'submitted' && (
                        <>
                          <button
                            className="gov-btn gov-btn-primary"
                            onClick={() => handleReview(kyc.id, 'verified')}
                            disabled={submitting}
                          >
                            {t.approve}
                          </button>
                          <button
                            className="gov-btn gov-btn-danger"
                            onClick={() => {
                              setSelectedKYC(kyc)
                              setRejectionReason(kyc.rejection_reason || '')
                            }}
                            disabled={submitting}
                          >
                            {t.reject}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* KYC Detail Modal */}
            {selectedKYC && (
              <div className="gov-modal-overlay" onClick={() => setSelectedKYC(null)}>
                <div className="gov-modal" onClick={(e) => e.stopPropagation()}>
                  <div className="gov-modal-header">
                    <h2>{t.kycDetails}</h2>
                    <button className="gov-modal-close" onClick={() => setSelectedKYC(null)}>
                      ×
                    </button>
                  </div>
                  <div className="gov-modal-body">
                    <div className="kyc-detail-section">
                      <h3>{t.personalDetails}</h3>
                      {selectedKYC.personal && (
                        <div className="detail-grid">
                          <div>
                            <strong>Name:</strong> {selectedKYC.personal.firstName}{' '}
                            {selectedKYC.personal.lastName}
                          </div>
                          <div>
                            <strong>DOB:</strong> {selectedKYC.personal.dob}
                          </div>
                          <div>
                            <strong>Gender:</strong> {selectedKYC.personal.gender}
                          </div>
                          <div>
                            <strong>Phone:</strong> {selectedKYC.personal.phone}
                          </div>
                          <div>
                            <strong>Citizenship:</strong> {selectedKYC.personal.citizenshipNumber}
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="kyc-detail-section">
                      <h3>{t.addressDetails}</h3>
                      {selectedKYC.address && (
                        <div className="detail-grid">
                          <div>
                            <strong>Province:</strong> {selectedKYC.address.province}
                          </div>
                          <div>
                            <strong>District:</strong> {selectedKYC.address.district}
                          </div>
                          <div>
                            <strong>Municipality:</strong> {selectedKYC.address.municipality}
                          </div>
                          <div>
                            <strong>Ward:</strong> {selectedKYC.address.ward}
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="kyc-detail-section">
                      <h3>{t.vehicleTypes}</h3>
                      <div className="vehicle-tags">
                        {selectedKYC.vehicle_types?.map((vt) => (
                          <span key={vt} className="vehicle-tag">
                            {vt}
                          </span>
                        ))}
                      </div>
                    </div>
                    {selectedKYC.documents && (
                      <div className="kyc-detail-section">
                        <h3>{t.documents}</h3>
                        {selectedKYC.documents.citizenshipPhoto && (
                          <img
                            src={selectedKYC.documents.citizenshipPhoto}
                            alt="Citizenship"
                            className="document-preview"
                          />
                        )}
                        {selectedKYC.documents.photo && (
                          <img
                            src={selectedKYC.documents.photo}
                            alt="Photo"
                            className="document-preview"
                          />
                        )}
                      </div>
                    )}
                    {selectedKYC.status === 'submitted' && (
                      <div className="gov-modal-actions">
                        <div className="rejection-form">
                          <label>
                            {t.rejectionReason}
                            <textarea
                              value={rejectionReason}
                              onChange={(e) => setRejectionReason(e.target.value)}
                              placeholder={t.rejectionReasonPlaceholder}
                            />
                          </label>
                        </div>
                        <div className="gov-form-actions">
                          <button
                            className="gov-btn gov-btn-primary"
                            onClick={() => handleReview(selectedKYC.id, 'verified')}
                            disabled={submitting}
                          >
                            {t.approve}
                          </button>
                          <button
                            className="gov-btn gov-btn-danger"
                            onClick={() => handleReview(selectedKYC.id, 'rejected')}
                            disabled={submitting || !rejectionReason.trim()}
                          >
                            {t.reject}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
        </div>
      </AdminLayout>
    </>
  )
}

export default function AdminKYCProtected() {
  return (
    <ProtectedRoute requiredRole="admin">
      <AdminKYC />
    </ProtectedRoute>
  )
}
