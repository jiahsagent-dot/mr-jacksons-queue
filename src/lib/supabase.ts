import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

export const supabaseAdmin = () =>
  createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

export type QueueEntry = {
  id: string
  created_at: string
  name: string
  party_size: number
  phone: string
  status: 'waiting' | 'called' | 'seated' | 'left'
  called_at?: string
  seated_at?: string
  estimated_wait?: number
}

export type QueueSettings = {
  id: number
  is_closed: boolean
  estimated_wait: number
  updated_at: string
}
