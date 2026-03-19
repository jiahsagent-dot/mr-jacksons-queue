export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { expireNoShows } from '@/lib/expireNoShows'

const SUPABASE_URL = 'https://qducoenvjaotympjedrl.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFkdWNvZW52amFvdHltcGplZHJsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzAwNjY0OCwiZXhwIjoyMDg4NTgyNjQ4fQ.BFi8krTlin52yIMGBvdrHdh0Rjy-gGYxjCByqKi2_EU'

async function dbGet(table: string, query: string): Promise<any[]> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
    cache: 'no-store',
  })
  return res.ok ? res.json() : []
}

export async function GET() {
  try {
    // Read no_show_minutes from settings using native fetch (avoids Supabase JS client caching)
    const settings = await dbGet('queue_settings', 'id=eq.1&select=no_show_minutes')
    const noShowMinutes = settings?.[0]?.no_show_minutes ?? 10

    // expireNoShows needs the Supabase client for its complex operations
    const admin = supabaseAdmin()
    const expired = await expireNoShows(admin, noShowMinutes)

    return NextResponse.json({ success: true, expired, noShowMinutes })
  } catch (err: any) {
    console.error('expire-all error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
