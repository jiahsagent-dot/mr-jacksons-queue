export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

async function dbGet(table: string, query: string): Promise<any[]> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
    cache: 'no-store',
  })
  return res.ok ? res.json() : []
}

async function dbPatch(table: string, query: string, body: any): Promise<any[]> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, {
    method: 'PATCH',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify(body),
    cache: 'no-store',
  })
  return res.ok ? res.json() : []
}

export async function GET() {
  const rows = await dbGet('owner_settings', 'id=eq.1&select=*')
  if (!rows.length) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const { password_hash: _, ...safe } = rows[0]
  return NextResponse.json(safe)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const allowed = ['weekly_labour_cost', 'monthly_rent', 'seats', 'hours_open_per_day', 'cogs_percent']
  const update: Record<string, any> = { updated_at: new Date().toISOString() }
  for (const key of allowed) {
    if (body[key] !== undefined) update[key] = body[key]
  }
  const rows = await dbPatch('owner_settings', 'id=eq.1', update)
  if (!rows.length) return NextResponse.json({ error: 'Update failed' }, { status: 500 })
  const { password_hash: _, ...safe } = rows[0]
  return NextResponse.json({ success: true, settings: safe })
}
