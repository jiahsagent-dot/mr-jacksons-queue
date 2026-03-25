export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// Auto-cancel pending orders older than 30 minutes (abandoned/payment failed)
// Also cancels pending orders with 0 items immediately (glitched orders)
async function runCleanup() {
  const cutoff = new Date(Date.now() - 30 * 60 * 1000).toISOString()

  // Cancel old pending orders (>30 mins)
  const admin = supabaseAdmin()

  const { data: old } = await admin
    .from('orders')
    .update({ status: 'cancelled' })
    .eq('status', 'pending')
    .lt('created_at', cutoff)
    .select('id')

  // Cancel 0-item pending orders immediately (glitched)
  const { data: all } = await admin.from('orders').select('id, items').eq('status', 'pending')
  const empty = (all || []).filter(o => !o.items || o.items.length === 0).map(o => o.id)
  if (empty.length > 0) {
    await admin.from('orders').update({ status: 'cancelled' }).in('id', empty)
  }

  return { cancelled_old: old?.length || 0, cancelled_empty: empty.length }
}

export async function GET() {
  const admin = supabaseAdmin()
  const result = await runCleanup()
  return NextResponse.json({ success: true, ...result })
}

export async function POST() {
  const admin = supabaseAdmin()
  const result = await runCleanup()
  return NextResponse.json({ success: true, ...result })
}
