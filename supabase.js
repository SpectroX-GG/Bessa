import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
// Publishable key is intended for browser apps. Legacy anon key remains supported.
const publicKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY

export const isConfigured = Boolean(url && publicKey)
export const supabase = isConfigured ? createClient(url, publicKey) : null
