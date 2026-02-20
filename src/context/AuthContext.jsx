import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'
import { testSupabaseConnection, logAuthError } from '../utils/debugAuth.js'
import { 
  saveTokens, 
  clearTokens, 
  getAccessToken,
  isTokenExpired,
  getRemainingSessionTime 
} from '../utils/tokenStorage.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  const role = profile?.role || null

  const fetchProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()
      if (error) {
        // Profile might not exist yet (e.g., during signup before trigger runs)
        // This is OK - it will be created by the trigger
        if (error.code !== 'PGRST116') { // PGRST116 = no rows returned
          console.error('Error fetching profile:', error)
        }
        setProfile(null)
        return null
      }
      setProfile(data)
      return data
    } catch (err) {
      console.error('Error fetching profile:', err)
      setProfile(null)
      return null
    }
  }

  useEffect(() => {
    // Test connection on mount
    testSupabaseConnection().catch(console.error)
    
    // Only clear localStorage tokens if they exist and are expired (avoids clearing on every load)
    const checkStoredSession = () => {
      if (getAccessToken() && isTokenExpired()) {
        console.log('⏰ Stored session expired, clearing tokens...')
        clearTokens()
      }
    }
    
    checkStoredSession()
    
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        // Save tokens to localStorage
        if (session.access_token && session.refresh_token) {
          saveTokens(session.access_token, session.refresh_token)
        }
        setLoading(false)
        fetchProfile(session.user.id).catch(console.error)
      } else {
        setProfile(null)
        clearTokens()
        setLoading(false)
      }
    }).catch((err) => {
      console.error('Error getting session:', err)
      logAuthError('getSession', err)
      clearTokens()
      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        // Save tokens to localStorage whenever auth state changes
        if (session.access_token && session.refresh_token) {
          saveTokens(session.access_token, session.refresh_token)
        }
        // Set loading false immediately so Login can navigate; fetch profile in background
        setLoading(false)
        fetchProfile(session.user.id).catch(console.error)
      } else {
        setProfile(null)
        clearTokens()
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const signUp = async ({ email, password, ...metadata }) => {
    try {
      // Validate email format
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        throw new Error('Please enter a valid email address.')
      }

      // Validate password
      if (!password || password.length < 6) {
        throw new Error('Password must be at least 6 characters long.')
      }

      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            ...metadata,
            role: 'user',
          },
          // Enable email confirmation can be disabled for testing
          // For production, set this based on your Supabase settings
        },
      })
      
      if (error) {
        logAuthError('signUp', error)
        
        // Provide user-friendly error messages
        let errorMessage = error.message || 'Failed to sign up. Please check your Supabase configuration.'
        
        if (error.message?.includes('already registered') || error.message?.includes('already exists')) {
          errorMessage = 'An account with this email already exists. Please sign in instead.'
        } else if (error.message?.includes('invalid email')) {
          errorMessage = 'Please enter a valid email address.'
        } else if (error.message?.includes('password')) {
          errorMessage = 'Password does not meet requirements. Please use at least 6 characters.'
        } else if (error.message?.includes('Invalid API key') || error.message?.includes('JWT')) {
          errorMessage = 'Supabase configuration error. Please check your .env file.'
        }
        
        throw new Error(errorMessage)
      }
      
      if (!data?.user) {
        throw new Error('Account creation failed. Please try again.')
      }
      
      // Save tokens to localStorage if session exists
      if (data.session?.access_token && data.session?.refresh_token) {
        saveTokens(data.session.access_token, data.session.refresh_token)
      }
      
      // Profile will be created by handle_new_user trigger automatically
      return data
    } catch (err) {
      if (err.message) throw err
      throw new Error('Failed to sign up. Please check your Supabase configuration.')
    }
  }

  const signIn = async (email, password) => {
    try {
      // Validate inputs
      if (!email || !email.trim()) {
        throw new Error('Please enter your email address.')
      }
      if (!password) {
        throw new Error('Please enter your password.')
      }

      const { data, error } = await supabase.auth.signInWithPassword({ 
        email: email.trim(), 
        password 
      })
      
      if (error) {
        logAuthError('signIn', error)
        
        // Provide user-friendly error messages
        let errorMessage = error.message || 'Invalid email or password'
        
        if (error.message?.includes('Invalid login credentials') || 
            error.message?.includes('invalid') ||
            error.message?.includes('Email not confirmed')) {
          errorMessage = 'Invalid email or password. Please check your credentials and try again.'
        } else if (error.message?.includes('Email rate limit')) {
          errorMessage = 'Too many login attempts. Please try again later.'
        } else if (error.message?.includes('Invalid API key') || error.message?.includes('JWT')) {
          errorMessage = 'Supabase configuration error. Please check your .env file.'
        }
        
        throw new Error(errorMessage)
      }
      
      if (!data?.user) {
        throw new Error('Login failed. Please try again.')
      }
      
      // Save tokens to localStorage
      if (data.session?.access_token && data.session?.refresh_token) {
        saveTokens(data.session.access_token, data.session.refresh_token)
        const remaining = getRemainingSessionTime()
        const hours = Math.floor(remaining / (60 * 60 * 1000))
        console.log(`✅ Login successful! Session valid for ${hours} hours`)
      }
      
      // Don't update state here—onAuthStateChange is the single source of truth.
      // Listener will fetch profile and update context; we just return success.
      // Wait a moment for the auth state change to propagate
      await new Promise(resolve => setTimeout(resolve, 200))
      return { user: data.user }
    } catch (err) {
      if (err.message) throw err
      throw new Error('Failed to sign in. Please check your Supabase configuration.')
    }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    clearTokens()
    setUser(null)
    setProfile(null)
  }

  const value = {
    user,
    profile,
    role,
    loading,
    signUp,
    signIn,
    signOut,
    fetchProfile,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
