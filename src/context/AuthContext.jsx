import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'

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
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        await fetchProfile(session.user.id)
      } else {
        setProfile(null)
      }
      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        await fetchProfile(session.user.id)
      } else {
        setProfile(null)
      }
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signUp = async ({ email, password, ...metadata }) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            ...metadata,
            role: 'user',
          },
        },
      })
      if (error) {
        console.error('Sign up error:', error)
        throw new Error(error.message || 'Failed to sign up. Please check your Supabase configuration.')
      }
      
      // If email confirmation is required, the user won't be signed in immediately
      // The profile will be created by the trigger when they confirm their email
      if (data.user) {
        // User is signed in immediately (email confirmation disabled)
        // Profile will be created by handle_new_user trigger
      }
      
      return data
    } catch (err) {
      if (err.message) throw err
      throw new Error('Failed to sign up. Please check your Supabase configuration.')
    }
  }

  const signIn = async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        console.error('Sign in error:', error)
        throw new Error(error.message || 'Invalid email or password')
      }
      // Don't update state here—onAuthStateChange is the single source of truth.
      // Listener will fetch profile and update context; we just return success.
      // Wait a moment for the auth state change to propagate
      await new Promise(resolve => setTimeout(resolve, 100))
      return { user: data.user }
    } catch (err) {
      if (err.message) throw err
      throw new Error('Failed to sign in. Please check your Supabase configuration.')
    }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
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
