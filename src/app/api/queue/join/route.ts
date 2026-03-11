export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const { name, party_size, phone } = await req.json()

  if (!name || !party_size || !phone) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const admin = supabaseAdmin()

  // Check if queue is closed
  const { data: settings } = await admin
    .from('queue_settings')
    .select('is_closed')
    .eq('id', 1)
    .single()

  if (settings?.is_closed) {
    return NextResponse.json({ error: 'Queue is currently closed' }, { status: 403 })
  }

  const { data, error } = await admin
    .from('queue_entries')
    .insert({ name, party_size, phone, status: 'waiting' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ id: data.id })
}
