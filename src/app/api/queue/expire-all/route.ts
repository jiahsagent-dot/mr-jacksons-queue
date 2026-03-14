export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { expireNoShows } from '@/lib/expireNoShows'

export async function GET() {
  try {
    const admin = supabaseAdmin()

    // Read no_show_minutes from settings
    const { data: settings } = await admin
      .from('queue_settings')
      .select('no_show_minutes')
      .eq('id', 1)
      .maybeSingle()
    const noShowMinutes = (settings as any)?.no_show_minutes ?? 10

    const expired = await expireNoShows(admin, noShowMinutes)

    return NextResponse.json({ success: true, expired })
  } catch (err: any) {
    console.error('expire-all error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
