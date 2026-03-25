import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

export async function GET() {
  const admin = supabaseAdmin()

  const { data } = await admin
    .from('queue_settings')
    .select('is_closed, estimated_wait, no_show_minutes')
    .eq('id', 1)
    .single()

  return NextResponse.json(data || { is_closed: false, estimated_wait: 20, no_show_minutes: 10 }, {
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
      'CDN-Cache-Control': 'no-store',
      'Surrogate-Control': 'no-store',
      'Vercel-CDN-Cache-Control': 'no-store',
    }
  })
}
