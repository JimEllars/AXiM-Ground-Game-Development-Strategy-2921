import { createClient } from '@supabase/supabase-js'

// Project ID will be auto-injected during deployment
const SUPABASE_URL = 'https://qcmlzjrrwiqsdltbkvtn.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFjbWx6anJyd2lxc2RsdGJrdnRuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA5NDI0NDcsImV4cCI6MjA3NjUxODQ0N30.dI9VvYqwkvatMCxBLv-zKdJls-jMDJ2vrBGB47BX5u0'

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error('Missing Supabase variables')
}

export default createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true
  }
})