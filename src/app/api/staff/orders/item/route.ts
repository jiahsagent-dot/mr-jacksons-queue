export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// Update individual item status within an order
export async function PATCH(req: NextRequest) {
  const { order_id, item_index, item_done } = await req.json()

  if (!order_id || item_index === undefined) {
    return NextResponse.json({ error: 'Missing order_id or item_index' }, { status: 400 })
  }

  const admin = supabaseAdmin()

  // Fetch order
  const { data: order, error: fetchErr } = await admin
    .from('orders')
    .select('items')
    .eq('id', order_id)
    .single()

  if (fetchErr || !order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  }

  // Update the specific item's done status
  const items = order.items || []
  if (item_index >= items.length) {
    return NextResponse.json({ error: 'Invalid item index' }, { status: 400 })
  }

  items[item_index] = { ...items[item_index], done: item_done }

  const { error } = await admin
    .from('orders')
    .update({ items })
    .eq('id', order_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
