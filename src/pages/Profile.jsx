import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLanguage } from '../context/LanguageContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { supabase } from '../lib/supabase.js'
import PageLayout from '../components/PageLayout.jsx'
import Input from '../components/Input.jsx'
import Select from '../components/Select.jsx'
import { translations } from '../translations.js'
import ProtectedRoute from '../components/ProtectedRoute.jsx'
import Notification from '../components/Notification.jsx'

const VEHICLE_TYPES = [
  { id: 'motorcycle', label: 'Motorcycle (A)', icon: '🏍️' },
  { id: 'car', label: 'Car (B)', icon: '🚗' },
  { id: 'truck', label: 'Truck (C)', icon: '🚚' },
  { id: 'bus', label: 'Bus (D)', icon: '🚌' },
  { id: 'tractor', label: 'Tractor (E)', icon: '🚜' },
]

function Profile() {
  const { language } = useLanguage()
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const t = translations[language]?.profile || translations.en.profile

  const [kycData, setKycData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [notification, setNotification] = useState(null)
  const [activeSection, setActiveSection] = useState('personal')

  const [form, setForm] = useState({
    // Personal Details
    firstName: '',
    middleName: '',
    lastName: '',
    nepaliName: '',
    dob: '',
    gender: '',
    bloodGroup: '',
    phone: '',
    email: '',
    citizenshipNumber: '',
    // Address Details
    province: '',
    district: '',
    municipality: '',
    ward: '',
    tole: '',
    // Document Details
    citizenshipPhoto: null,
    photo: null,
    // Vehicle Types
    vehicleTypes: [],
  })

  useEffect(() => {
    loadProfileData()
  }, [user])

  const loadProfileData = async () => {
    if (!user) return
    try {
      setLoading(true)
      // Load profile data
      if (profile) {
        setForm((prev) => ({
          ...prev,
          firstName: profile.first_name || '',
          middleName: profile.middle_name || '',
          lastName: profile.last_name || '',
          phone: profile.phone || '',
          email: profile.email || '',
          dob: profile.date_of_birth || '',
          gender: profile.gender || '',
          bloodGroup: profile.blood_group || '',
        }))
      }

      // Load KYC data
      const { data: kyc, error } = await supabase
        .from('kyc')
        .select('*')
        .eq('user_id', user.id)
        .order('submitted_at', { ascending: false })
        .limit(1)
        .single()

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading KYC:', error)
      } else if (kyc) {
        setKycData(kyc)
        if (kyc.personal) {
          setForm((prev) => ({ ...prev, ...kyc.personal }))
        }
        if (kyc.address) {
          setForm((prev) => ({ ...prev, ...kyc.address }))
        }
        if (kyc.vehicle_types) {
          setForm((prev) => ({ ...prev, vehicleTypes: kyc.vehicle_types || [] }))
        }
      }
    } catch (err) {
      console.error('Error loading profile:', err)
    } finally {
      setLoading(false)
    }
  }

  const update = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleVehicleTypeToggle = (vehicleId) => {
    setForm((prev) => {
      const current = prev.vehicleTypes || []
      if (current.includes(vehicleId)) {
        return { ...prev, vehicleTypes: current.filter((id) => id !== vehicleId) }
      } else {
        return { ...prev, vehicleTypes: [...current, vehicleId] }
      }
    })
  }

  const handleFileChange = (field, file) => {
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setForm((prev) => ({ ...prev, [field]: reader.result }))
      }
      reader.readAsDataURL(file)
    }
  }

  const validate = () => {
    const errors = {}
    if (!form.firstName?.trim()) errors.firstName = 'Required'
    if (!form.lastName?.trim()) errors.lastName = 'Required'
    if (!form.dob) errors.dob = 'Required'
    if (!form.gender) errors.gender = 'Required'
    if (!form.bloodGroup) errors.bloodGroup = 'Required'
    if (!form.phone?.trim()) errors.phone = 'Required'
    if (!form.citizenshipNumber?.trim()) errors.citizenshipNumber = 'Required'
    if (!form.province?.trim()) errors.province = 'Required'
    if (!form.district?.trim()) errors.district = 'Required'
    if (!form.municipality?.trim()) errors.municipality = 'Required'
    if (!form.ward?.trim()) errors.ward = 'Required'
    if (form.vehicleTypes.length === 0) errors.vehicleTypes = 'Select at least one vehicle type'
    return errors
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const errors = validate()
    if (Object.keys(errors).length > 0) {
      setNotification({
        type: 'error',
        title: 'Validation Error',
        message: 'Please fill all required fields.',
      })
      return
    }

    setSubmitting(true)
    try {
      const personalData = {
        firstName: form.firstName,
        middleName: form.middleName,
        lastName: form.lastName,
        nepaliName: form.nepaliName,
        dob: form.dob,
        gender: form.gender,
        bloodGroup: form.bloodGroup,
        phone: form.phone,
        email: form.email,
        citizenshipNumber: form.citizenshipNumber,
      }

      const addressData = {
        province: form.province,
        district: form.district,
        municipality: form.municipality,
        ward: form.ward,
        tole: form.tole,
      }

      const documentData = {
        citizenshipPhoto: form.citizenshipPhoto,
        photo: form.photo,
      }

      const kycPayload = {
        user_id: user.id,
        personal: personalData,
        address: addressData,
        documents: documentData,
        vehicle_types: form.vehicleTypes,
        status: kycData?.status === 'rejected' ? 'pending' : 'submitted',
      }

      let result
      if (kycData) {
        // Update existing KYC
        const { data, error } = await supabase
          .from('kyc')
          .update(kycPayload)
          .eq('id', kycData.id)
          .select()
          .single()
        if (error) throw error
        result = data
      } else {
        // Create new KYC
        const { data, error } = await supabase.from('kyc').insert(kycPayload).select().single()
        if (error) throw error
        result = data
      }

      setKycData(result)
      setNotification({
        type: 'success',
        title: 'KYC Submitted',
        message: 'Your KYC has been submitted successfully. It will be reviewed by an administrator.',
      })
    } catch (err) {
      console.error('Error submitting KYC:', err)
      setNotification({
        type: 'error',
        title: 'Submission Failed',
        message: err.message || 'Failed to submit KYC. Please try again.',
      })
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <PageLayout>
        <div className="page page-profile">
          <div className="page-card">
            <p>Loading profile...</p>
          </div>
        </div>
      </PageLayout>
    )
  }

  const kycStatus = kycData?.status || 'pending'

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
        <div className="page page-profile">
          <div className="page-card">
            <h1 className="page-title">{t.title}</h1>
            <p className="page-subtitle">{t.subtitle}</p>

            <div className="kyc-status">
              <span className={`badge badge--${kycStatus}`}>
                {kycStatus === 'verified'
                  ? '✓ Verified'
                  : kycStatus === 'submitted'
                  ? '⏳ Submitted / Pending Review'
                  : kycStatus === 'rejected'
                  ? '✗ Rejected - Please resubmit'
                  : '📝 Incomplete'}
              </span>
              {kycData?.rejection_reason && (
                <p className="rejection-reason">Reason: {kycData.rejection_reason}</p>
              )}
            </div>

            <form onSubmit={handleSubmit} className="kyc-form">
              {/* Section Navigation */}
              <div className="kyc-sections">
                <button
                  type="button"
                  className={`section-tab ${activeSection === 'personal' ? 'active' : ''}`}
                  onClick={() => setActiveSection('personal')}
                >
                  {t.personalDetails}
                </button>
                <button
                  type="button"
                  className={`section-tab ${activeSection === 'address' ? 'active' : ''}`}
                  onClick={() => setActiveSection('address')}
                >
                  {t.addressDetails}
                </button>
                <button
                  type="button"
                  className={`section-tab ${activeSection === 'documents' ? 'active' : ''}`}
                  onClick={() => setActiveSection('documents')}
                >
                  {t.documents}
                </button>
                <button
                  type="button"
                  className={`section-tab ${activeSection === 'vehicles' ? 'active' : ''}`}
                  onClick={() => setActiveSection('vehicles')}
                >
                  {t.vehicleTypes}
                </button>
              </div>

              {/* Personal Details Section */}
              {activeSection === 'personal' && (
                <div className="form-section">
                  <h2 className="section-heading">{t.personalDetails}</h2>
                  <div className="form-row form-row-3">
                    <Input
                      label={t.firstName}
                      value={form.firstName}
                      onChange={(e) => update('firstName', e.target.value)}
                      required
                      disabled={kycStatus === 'verified'}
                    />
                    <Input
                      label={t.middleName}
                      value={form.middleName}
                      onChange={(e) => update('middleName', e.target.value)}
                      disabled={kycStatus === 'verified'}
                    />
                    <Input
                      label={t.lastName}
                      value={form.lastName}
                      onChange={(e) => update('lastName', e.target.value)}
                      required
                      disabled={kycStatus === 'verified'}
                    />
                  </div>
                  <Input
                    label={t.nepaliName}
                    value={form.nepaliName}
                    onChange={(e) => update('nepaliName', e.target.value)}
                    disabled={kycStatus === 'verified'}
                  />
                  <Input
                    label={t.dob}
                    type="date"
                    value={form.dob}
                    onChange={(e) => update('dob', e.target.value)}
                    required
                    disabled={kycStatus === 'verified'}
                  />
                  <div className="form-row form-row-2">
                    <Select
                      label={t.gender}
                      value={form.gender}
                      onChange={(e) => update('gender', e.target.value)}
                      options={[
                        { value: 'male', label: 'Male' },
                        { value: 'female', label: 'Female' },
                        { value: 'other', label: 'Other' },
                      ]}
                      required
                      disabled={kycStatus === 'verified'}
                    />
                    <Select
                      label={t.bloodGroup}
                      value={form.bloodGroup}
                      onChange={(e) => update('bloodGroup', e.target.value)}
                      options={['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']}
                      required
                      disabled={kycStatus === 'verified'}
                    />
                  </div>
                  <Input
                    label={t.phone}
                    type="tel"
                    value={form.phone}
                    onChange={(e) => update('phone', e.target.value)}
                    required
                    disabled={kycStatus === 'verified'}
                  />
                  <Input
                    label={t.email}
                    type="email"
                    value={form.email}
                    onChange={(e) => update('email', e.target.value)}
                    required
                    disabled
                  />
                  <Input
                    label={t.citizenshipNumber}
                    value={form.citizenshipNumber}
                    onChange={(e) => update('citizenshipNumber', e.target.value)}
                    required
                    disabled={kycStatus === 'verified'}
                  />
                </div>
              )}

              {/* Address Details Section */}
              {activeSection === 'address' && (
                <div className="form-section">
                  <h2 className="section-heading">{t.addressDetails}</h2>
                  <Select
                    label={t.province}
                    value={form.province}
                    onChange={(e) => update('province', e.target.value)}
                    options={[
                      'Province 1',
                      'Madhesh Province',
                      'Bagmati Province',
                      'Gandaki Province',
                      'Lumbini Province',
                      'Karnali Province',
                      'Sudurpashchim Province',
                    ]}
                    required
                    disabled={kycStatus === 'verified'}
                  />
                  <Input
                    label={t.district}
                    value={form.district}
                    onChange={(e) => update('district', e.target.value)}
                    required
                    disabled={kycStatus === 'verified'}
                  />
                  <Input
                    label={t.municipality}
                    value={form.municipality}
                    onChange={(e) => update('municipality', e.target.value)}
                    required
                    disabled={kycStatus === 'verified'}
                  />
                  <div className="form-row form-row-2">
                    <Input
                      label={t.ward}
                      value={form.ward}
                      onChange={(e) => update('ward', e.target.value)}
                      required
                      disabled={kycStatus === 'verified'}
                    />
                    <Input
                      label={t.tole}
                      value={form.tole}
                      onChange={(e) => update('tole', e.target.value)}
                      disabled={kycStatus === 'verified'}
                    />
                  </div>
                </div>
              )}

              {/* Documents Section */}
              {activeSection === 'documents' && (
                <div className="form-section">
                  <h2 className="section-heading">{t.documents}</h2>
                  <div className="file-upload">
                    <label>{t.citizenshipPhoto}</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileChange('citizenshipPhoto', e.target.files[0])}
                      disabled={kycStatus === 'verified'}
                    />
                    {form.citizenshipPhoto && (
                      <img src={form.citizenshipPhoto} alt="Citizenship" className="upload-preview" />
                    )}
                  </div>
                  <div className="file-upload">
                    <label>{t.photo}</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileChange('photo', e.target.files[0])}
                      disabled={kycStatus === 'verified'}
                    />
                    {form.photo && <img src={form.photo} alt="Photo" className="upload-preview" />}
                  </div>
                </div>
              )}

              {/* Vehicle Types Section */}
              {activeSection === 'vehicles' && (
                <div className="form-section">
                  <h2 className="section-heading">{t.vehicleTypes}</h2>
                  <p className="section-description">{t.selectVehicleTypes}</p>
                  <div className="vehicle-types-grid">
                    {VEHICLE_TYPES.map((vehicle) => (
                      <label
                        key={vehicle.id}
                        className={`vehicle-type-card ${form.vehicleTypes.includes(vehicle.id) ? 'selected' : ''}`}
                      >
                        <input
                          type="checkbox"
                          checked={form.vehicleTypes.includes(vehicle.id)}
                          onChange={() => handleVehicleTypeToggle(vehicle.id)}
                          disabled={kycStatus === 'verified'}
                        />
                        <div className="vehicle-icon">{vehicle.icon}</div>
                        <div className="vehicle-label">{vehicle.label}</div>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div className="form-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => navigate('/user/dashboard')}
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting || kycStatus === 'verified'}
                >
                  {submitting ? t.submitting : kycData ? t.updateKYC : t.submitKYC}
                </button>
              </div>
            </form>
          </div>
        </div>
      </PageLayout>
    </>
  )
}

export default function ProfileProtected() {
  return (
    <ProtectedRoute requiredRole="user">
      <Profile />
    </ProtectedRoute>
  )
}
