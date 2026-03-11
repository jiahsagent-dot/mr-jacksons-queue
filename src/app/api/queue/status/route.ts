export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const admin = supabaseAdmin()

  const { data: entry, error } = await admin
    .from('queue_entries')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !entry) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Position in queue (only for waiting entries)
  let position = 0
  if (entry.status === 'waiting') {
    const { count } = await admin
      .from('queue_entries')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'waiting')
      .lte('created_at', entry.created_at)

    position = count ?? 1
  }

  // Get estimated wait from settings
  const { data: settings } = await admin
    .from('queue_settings')
    .select('estimated_wait')
    .eq('id', 1)
    .single()

  return NextResponse.json({
    entry,
    position,
    estimated_wait: settings?.estimated_wait ?? 20,
  })
}
