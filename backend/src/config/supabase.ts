import { createClient } from '@supabase/supabase-js'
import { config } from './env'

// Anon key client — for auth operations (signUp, signIn, resetPassword)
export const supabaseAnon = createClient(
  config.SUPABASE_URL,
  config.SUPABASE_ANON_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
)

// Service role client — bypasses RLS, used only server-side
export const supabaseAdmin = createClient(
  config.SUPABASE_URL,
  config.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
)
