// Token storage utility with 90-hour expiration
const TOKEN_KEY = 'driveLicense_auth_token'
const REFRESH_TOKEN_KEY = 'driveLicense_refresh_token'
const TOKEN_EXPIRY_KEY = 'driveLicense_token_expiry'
const SESSION_DURATION_MS = 90 * 60 * 60 * 1000 // 90 hours in milliseconds

/**
 * Save authentication tokens to localStorage
 * @param {string} accessToken - JWT access token
 * @param {string} refreshToken - Refresh token
 */
export function saveTokens(accessToken, refreshToken) {
  try {
    const expiryTime = Date.now() + SESSION_DURATION_MS
    
    localStorage.setItem(TOKEN_KEY, accessToken)
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken)
    localStorage.setItem(TOKEN_EXPIRY_KEY, expiryTime.toString())
    
    console.log('✅ Tokens saved. Expires in 90 hours.')
  } catch (error) {
    console.error('Error saving tokens:', error)
  }
}

/**
 * Get stored access token
 * @returns {string|null}
 */
export function getAccessToken() {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch (error) {
    console.error('Error getting access token:', error)
    return null
  }
}

/**
 * Get stored refresh token
 * @returns {string|null}
 */
export function getRefreshToken() {
  try {
    return localStorage.getItem(REFRESH_TOKEN_KEY)
  } catch (error) {
    console.error('Error getting refresh token:', error)
    return null
  }
}

/**
 * Check if token is expired
 * @returns {boolean}
 */
export function isTokenExpired() {
  try {
    const expiryTime = localStorage.getItem(TOKEN_EXPIRY_KEY)
    if (!expiryTime) return true
    
    return Date.now() >= parseInt(expiryTime, 10)
  } catch (error) {
    console.error('Error checking token expiry:', error)
    return true
  }
}

/**
 * Get remaining session time in milliseconds
 * @returns {number}
 */
export function getRemainingSessionTime() {
  try {
    const expiryTime = localStorage.getItem(TOKEN_EXPIRY_KEY)
    if (!expiryTime) return 0
    
    const remaining = parseInt(expiryTime, 10) - Date.now()
    return Math.max(0, remaining)
  } catch (error) {
    console.error('Error getting remaining session time:', error)
    return 0
  }
}

/**
 * Clear all stored tokens
 */
export function clearTokens() {
  try {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(REFRESH_TOKEN_KEY)
    localStorage.removeItem(TOKEN_EXPIRY_KEY)
    console.log('✅ Tokens cleared.')
  } catch (error) {
    console.error('Error clearing tokens:', error)
  }
}

/**
 * Check if user has valid session
 * @returns {boolean}
 */
export function hasValidSession() {
  const token = getAccessToken()
  const refreshToken = getRefreshToken()
  const expired = isTokenExpired()
  
  return !!(token && refreshToken && !expired)
}

/**
 * Get session info for debugging
 * @returns {object}
 */
export function getSessionInfo() {
  const remaining = getRemainingSessionTime()
  const hours = Math.floor(remaining / (60 * 60 * 1000))
  const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000))
  
  return {
    hasToken: !!getAccessToken(),
    hasRefreshToken: !!getRefreshToken(),
    isExpired: isTokenExpired(),
    remainingHours: hours,
    remainingMinutes: minutes,
    remainingMs: remaining,
  }
}
