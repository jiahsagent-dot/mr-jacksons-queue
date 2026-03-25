export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const { order_id } = await req.json()
    if (!order_id) {
      return NextResponse.json({ error: 'Order ID required' }, { status: 400 })
    }

    const admin = supabaseAdmin()

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
