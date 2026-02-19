import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

function ProtectedRoute({ children, requiredRole }) {
  const { user, role, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="page-layout">
        <div className="loading-spinner">
          <p>Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // Role-based redirects:
  // - Admin route: only admins allowed; others go to user dashboard
  // - User route: admins are redirected to admin dashboard; other authenticated users are allowed
  if (requiredRole === 'admin' && role !== 'admin') {
    return <Navigate to="/user/dashboard" replace />
  }

  if (requiredRole === 'user' && role === 'admin') {
    return <Navigate to="/admin/dashboard" replace />
  }

  return children
}

export default ProtectedRoute
