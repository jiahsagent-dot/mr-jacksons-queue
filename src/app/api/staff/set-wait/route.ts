export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const admin = supabaseAdmin()

  // Only update the fields that were sent — never wipe other columns
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (body.minutes !== undefined) update.estimated_wait = body.minutes
  if (body.is_closed !== undefined) update.is_closed = body.is_closed
  if (body.no_show_minutes !== undefined) update.no_show_minutes = body.no_show_minutes

  const { data, error } = await admin
    .from('queue_settings')
    .update(update)
    .eq('id', 1)
    .select()

  if (error) {
    // If error is due to missing column (migration not yet run), retry without that field
    if (error.code === '42703' && update.no_show_minutes !== undefined) {
      const { no_show_minutes: _, ...safeUpdate } = update
      const { data: d2, error: e2 } = await admin
        .from('queue_settings').update(safeUpdate).eq('id', 1).select()
      if (e2) return NextResponse.json({ error: e2.message }, { status: 500 })
      return NextResponse.json({ success: true, settings: d2?.[0], note: 'no_show_minutes not persisted — run DB migration' })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  if (!data || data.length === 0) {
    return NextResponse.json({ error: 'No rows updated' }, { status: 500 })
  }

  return NextResponse.json({ success: true, settings: data[0] })
}
