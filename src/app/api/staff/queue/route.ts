import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { expireNoShows } from '@/lib/expireNoShows'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

const DEFAULT_NO_SHOW_MINUTES = 10

export async function GET() {
  const admin = supabaseAdmin()

  const [waitingRes, calledRes, settingsRes] = await Promise.all([
    admin.from('queue_entries').select('*').eq('status', 'waiting').order('created_at', { ascending: true }),
    admin.from('queue_entries').select('*').eq('status', 'called').order('called_at', { ascending: true }),
    admin.from('queue_settings').select('is_closed, estimated_wait').eq('id', 1).single(),
  ])

  // Fetch no_show_minutes separately — column may not exist yet (migration pending)
  let noShowMinutes: number = DEFAULT_NO_SHOW_MINUTES
  try {
    const { data: nsData } = await admin
      .from('queue_settings')
      .select('no_show_minutes')
      .eq('id', 1)
      .single()
    if ((nsData as any)?.no_show_minutes) noShowMinutes = (nsData as any).no_show_minutes
  } catch { /* column doesn't exist yet — use default */ }

  // Auto-expire no-shows on every poll (staff page polls every 10s)
  const expiredNames = await expireNoShows(admin, noShowMinutes)

  // Re-fetch called list if we expired anyone (the list changed)
  let calledEntries = calledRes.data || []
  if (expiredNames.length > 0) {
    const { data: freshCalled } = await admin
      .from('queue_entries')
      .select('*')
      .eq('status', 'called')
      .order('called_at', { ascending: true })
    calledEntries = freshCalled || []
  }

  return NextResponse.json({
    waiting: waitingRes.data || [],
    called: calledEntries,
    is_closed: settingsRes.data?.is_closed ?? false,
    estimated_wait: settingsRes.data?.estimated_wait ?? 20,
    no_show_minutes: noShowMinutes,
    expired: expiredNames, // so staff page can toast them
  }, {
    headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0' }
  })
}
