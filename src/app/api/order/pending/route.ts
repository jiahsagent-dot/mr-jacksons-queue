export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getAdmin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

// POST — create a pending order (no items yet) and return order_id + short ref
export async function POST(req: NextRequest) {
  try {
    const { name, phone, table_number, dining_option } = await req.json()

    if (!name) {
      return NextResponse.json({ error: 'Name required' }, { status: 400 })
    }

    const admin = getAdmin()

    const { data: order, error } = await admin
      .from('orders')
      .insert({
        customer_name: name,
        phone: phone || null,
        table_number: table_number || null,
        dining_option: dining_option || 'dine_in',
        items: [],
        status: 'pending',
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: 'DB error: ' + error.message }, { status: 500 })
    }

    // Short reference = first 6 chars of UUID uppercase e.g. "8A11B8"
    const order_ref = order.id.replace(/-/g, '').slice(0, 6).toUpperCase()

    return NextResponse.json({ order_id: order.id, order_ref })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to create order' }, { status: 500 })
  }
}
