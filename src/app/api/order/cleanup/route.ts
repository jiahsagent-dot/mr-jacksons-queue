export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://qducoenvjaotympjedrl.supabase.co'
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFkdWNvZW52amFvdHltcGplZHJsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzAwNjY0OCwiZXhwIjoyMDg4NTgyNjQ4fQ.BFi8krTlin52yIMGBvdrHdh0Rjy-gGYxjCByqKi2_EU'

// Auto-cancel pending orders older than 30 minutes (abandoned/payment failed)
// Also cancels pending orders with 0 items immediately (glitched orders)
async function runCleanup() {
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
  const cutoff = new Date(Date.now() - 30 * 60 * 1000).toISOString()

  // Cancel old pending orders (>30 mins)
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
  const result = await runCleanup()
  return NextResponse.json({ success: true, ...result })
}

export async function POST() {
  const result = await runCleanup()
  return NextResponse.json({ success: true, ...result })
}
