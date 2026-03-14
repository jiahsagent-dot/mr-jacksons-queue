export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const admin = supabaseAdmin()

  const update: Record<string, unknown> = { id: 1, updated_at: new Date().toISOString() }
  if (body.minutes !== undefined) update.estimated_wait = body.minutes
  if (body.is_closed !== undefined) update.is_closed = body.is_closed
  if (body.no_show_minutes !== undefined) update.no_show_minutes = body.no_show_minutes

  // Try upsert (insert or update) so it works even if row doesn't exist yet
  const { data, error } = await admin
    .from('queue_settings')
    .upsert(update, { onConflict: 'id' })
    .select()

  if (error) {
    // no_show_minutes column may not exist yet — retry without it
    if (error.code === '42703' && update.no_show_minutes !== undefined) {
      const { no_show_minutes: _, ...safeUpdate } = update
      const { error: e2 } = await admin
        .from('queue_settings')
        .upsert(safeUpdate, { onConflict: 'id' })
        .select()
      if (e2) return NextResponse.json({ error: e2.message }, { status: 500 })
      return NextResponse.json({ success: true, note: 'no_show_minutes column missing — run DB migration' })
    }
    console.error('set-wait error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, settings: data?.[0] })
}
