export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://qducoenvjaotympjedrl.supabase.co'
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFkdWNvZW52amFvdHltcGplZHJsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzAwNjY0OCwiZXhwIjoyMDg4NTgyNjQ4fQ.BFi8krTlin52yIMGBvdrHdh0Rjy-gGYxjCByqKi2_EU'

export async function POST(req: NextRequest) {
  try {
    const { order_id } = await req.json()
    if (!order_id) {
      return NextResponse.json({ error: 'Order ID required' }, { status: 400 })
    }

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      auth: { persistSession: false },
    })

    // Get the order
    const { data: order, error: fetchErr } = await admin
      .from('orders')
      .select('*')
      .eq('id', order_id)
      .single()

    if (fetchErr || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Only allow cancellation if order is still in "received" status
    if (order.status !== 'received') {
      return NextResponse.json({
        error: 'Order is already being prepared — please contact staff to cancel'
      }, { status: 400 })
    }

    // Cancel the order
    const { error } = await admin
      .from('orders')
      .update({ status: 'cancelled' })
      .eq('id', order_id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Free up the table if it was dine-in
    if (order.table_number && order.dining_option === 'dine_in') {
      await admin
        .from('tables')
        .update({ status: 'available', current_customer: null, occupied_at: null })
        .eq('table_number', order.table_number)
    }

    return NextResponse.json({ success: true }, {
      headers: {
        'Cache-Control': 'no-store',
        'Vercel-CDN-Cache-Control': 'no-store',
      }
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
