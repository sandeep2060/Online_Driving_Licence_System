import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    '❌ Supabase credentials missing!\n' +
    'Please add your Supabase URL and anon key to the .env file:\n' +
    'VITE_SUPABASE_URL=https://your-project.supabase.co\n' +
    'VITE_SUPABASE_ANON_KEY=your-anon-key\n\n' +
    'Get them from: https://app.supabase.com → Your Project → Settings → API'
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
