import { createContext, useContext, useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const profileRequestRef = useRef(new Map())

  const role = profile?.role || null

  const fetchProfile = async (userId) => {
    if (!userId) return null

    // If a request for this user is already pending, return that promise
    if (profileRequestRef.current.has(userId)) {
      return profileRequestRef.current.get(userId)
    }

    const promise = (async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single()
        if (error) {
          console.error('Error fetching profile:', error)
          setProfile(null)
          return null
        }
        setProfile(data)
        return data
      } catch (err) {
        console.error('Error fetching profile:', err)
        setProfile(null)
        return null
      } finally {
        profileRequestRef.current.delete(userId)
      }
    })()

    profileRequestRef.current.set(userId, promise)
    return promise
  }

  useEffect(() => {
    let isMounted = true
    const timeoutId = setTimeout(async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!isMounted) return
        
        setUser(session?.user ?? null)
        if (session?.user) {
          await fetchProfile(session.user.id)
        } else {
          setProfile(null)
        }
      } catch (err) {
        console.error('Error in getSession:', err)
        if (isMounted) {
          setUser(null)
          setProfile(null)
        }
      } finally {
        if (isMounted) setLoading(false)
      }
    }, 0)

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!isMounted) return
      
      try {
        setUser(session?.user ?? null)
        if (session?.user) {
          await fetchProfile(session.user.id)
        } else {
          setProfile(null)
        }
        setLoading(false)
      } catch (err) {
        console.error('Error in auth state change:', err)
        if (isMounted) {
          setUser(null)
          setProfile(null)
          setLoading(false)
        }
      }
    })

    return () => {
      isMounted = false
      clearTimeout(timeoutId)
      subscription?.unsubscribe()
    }
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
      if (error) throw error
      return data
    } catch (err) {
      console.error('Sign up error:', err)
      throw err
    }
  }

  const signIn = async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      
      // Longer delay to ensure lock is properly released and session is stable
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      if (data?.user?.id) {
        const prof = await fetchProfile(data.user.id)
        return { user: data.user, profile: prof }
      }
      return { user: data.user, profile: null }
    } catch (err) {
      console.error('Sign in error:', err)
      throw err
    }
  }

  const signOut = async () => {
    try {
      await supabase.auth.signOut()
    } catch (err) {
      console.error('Sign out error:', err)
    } finally {
      setUser(null)
      setProfile(null)
      profileRequestRef.current.clear()
    }
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
