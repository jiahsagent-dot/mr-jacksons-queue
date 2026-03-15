export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Auto-cancel pending orders older than 30 minutes (abandoned before payment)
// Also frees tables that were reserved at checkout but payment never completed
export async function POST() {
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://qducoenvjaotympjedrl.supabase.co' , process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFkdWNvZW52amFvdHltcGplZHJsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzAwNjY0OCwiZXhwIjoyMDg4NTgyNjQ4fQ.BFi8krTlin52yIMGBvdrHdh0Rjy-gGYxjCByqKi2_EU' )
  const cutoff = new Date(Date.now() - 30 * 60 * 1000).toISOString()
  // Tighter cutoff for checkout-reserved tables (15 min is plenty to complete Stripe payment)
  const reserveCutoff = new Date(Date.now() - 15 * 60 * 1000).toISOString()

  // Cancel abandoned pending orders
  const { error } = await admin
    .from('orders')
    .update({ status: 'cancelled' })
    .eq('status', 'pending')
    .lt('created_at', cutoff)

  // Free tables that were reserved at checkout but no paid order exists against them
  // This handles customers who abandoned Stripe mid-payment
  const { data: staleTables } = await admin
    .from('tables')
    .select('table_number')
    .eq('status', 'reserved')
    .not('table_code', 'like', 'queue:%') // don't touch queue reservations — those are handled by expireNoShows
    .lt('occupied_at', reserveCutoff)

  if (staleTables && staleTables.length > 0) {
    for (const t of staleTables) {
      // Only free if there's no paid order for this table in the last 15 min
      const { data: paidOrders } = await admin
        .from('orders')
        .select('id')
        .eq('table_number', t.table_number)
        .eq('status', 'received')
        .gt('paid_at', reserveCutoff)
        .limit(1)

      if (!paidOrders || paidOrders.length === 0) {
        await admin
          .from('tables')
          .update({ status: 'available', current_customer: null, occupied_at: null })
          .eq('table_number', t.table_number)
          .eq('status', 'reserved')
      }
    }
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, freed_tables: staleTables?.length ?? 0 })
}
