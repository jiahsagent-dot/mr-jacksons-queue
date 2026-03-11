import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET() {
  const admin = supabaseAdmin()
  const { data } = await admin
    .from('queue_settings')
    .select('is_closed, estimated_wait')
    .eq('id', 1)
    .single()

  return NextResponse.json(data || { is_closed: false, estimated_wait: 20 })
}
