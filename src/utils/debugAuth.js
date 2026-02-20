// Debug utility for authentication issues
import { supabase } from '../lib/supabase.js'

export async function testSupabaseConnection() {
  console.log('🔍 Testing Supabase Connection...')
  
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY
  
  console.log('📋 Environment Variables:')
  console.log('  VITE_SUPABASE_URL:', supabaseUrl ? '✅ Set' : '❌ Missing')
  console.log('  VITE_SUPABASE_ANON_KEY:', supabaseKey ? '✅ Set' : '❌ Missing')
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Supabase credentials are missing!')
    console.error('Please add them to your .env file')
    return false
  }
  
  try {
    // Test connection by checking auth
    const { data, error } = await supabase.auth.getSession()
    
    if (error) {
      console.error('❌ Supabase connection error:', error)
      return false
    }
    
    console.log('✅ Supabase connection successful!')
    console.log('  Current session:', data.session ? 'Active' : 'None')
    return true
  } catch (err) {
    console.error('❌ Failed to connect to Supabase:', err)
    return false
  }
}

export function logAuthError(context, error) {
  console.group(`🔴 Auth Error: ${context}`)
  console.error('Error:', error)
  console.error('Message:', error?.message)
  console.error('Code:', error?.code)
  console.error('Status:', error?.status)
  console.groupEnd()
}
