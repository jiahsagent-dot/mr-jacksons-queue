import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

export async function GET() {
  const admin = supabaseAdmin()

  const [waitingRes, calledRes, settingsRes] = await Promise.all([
    admin.from('queue_entries').select('*').eq('status', 'waiting').order('created_at', { ascending: true }),
    admin.from('queue_entries').select('*').eq('status', 'called').order('called_at', { ascending: false }).limit(20),
    admin.from('queue_settings').select('is_closed, estimated_wait').eq('id', 1).single(),
  ])

  return NextResponse.json({
    waiting: waitingRes.data || [],
    called: calledRes.data || [],
    is_closed: settingsRes.data?.is_closed ?? false,
    estimated_wait: settingsRes.data?.estimated_wait ?? 20,
  }, {
    headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0' }
  })
}
