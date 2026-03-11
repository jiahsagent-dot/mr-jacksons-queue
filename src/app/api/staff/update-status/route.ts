export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const { id, status } = await req.json()
  if (!id || !status) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const admin = supabaseAdmin()
  const update: Record<string, any> = { status }
  if (status === 'called') update.called_at = new Date().toISOString()
  if (status === 'seated') update.seated_at = new Date().toISOString()

  const { error } = await admin.from('queue_entries').update(update).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
