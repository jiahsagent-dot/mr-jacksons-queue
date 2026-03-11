import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://qducoenvjaotympjedrl.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFkdWNvZW52amFvdHltcGplZHJsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwMDY2NDgsImV4cCI6MjA4ODU4MjY0OH0.JR1tgobklKZNUy49ip01SW9MPD54A6DD27jR8NIW3_8'
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFkdWNvZW52amFvdHltcGplZHJsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzAwNjY0OCwiZXhwIjoyMDg4NTgyNjQ4fQ.BFi8krTlin52yIMGBvdrHdh0Rjy-gGYxjCByqKi2_EU'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// Always use hardcoded service key — env var on Vercel can be wrong
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
