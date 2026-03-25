export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

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
