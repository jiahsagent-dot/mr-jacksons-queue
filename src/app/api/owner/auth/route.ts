export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'

const SUPABASE_URL = 'https://qducoenvjaotympjedrl.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFkdWNvZW52amFvdHltcGplZHJsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzAwNjY0OCwiZXhwIjoyMDg4NTgyNjQ4fQ.BFi8krTlin52yIMGBvdrHdh0Rjy-gGYxjCByqKi2_EU'

export async function POST(req: NextRequest) {
  const { password } = await req.json()
  const res = await fetch(`${SUPABASE_URL}/rest/v1/owner_settings?id=eq.1&select=password_hash`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
    cache: 'no-store',
  })
  const rows = res.ok ? await res.json() : []
  const stored = rows?.[0]?.password_hash
  if (!stored || password !== stored) {
    return NextResponse.json({ error: 'Invalid password' }, { status: 401 })
  }
  return NextResponse.json({ token: `owner_${stored}_tok` })
}
