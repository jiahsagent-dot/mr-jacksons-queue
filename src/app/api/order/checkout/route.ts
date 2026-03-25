import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

const STRIPE_KEY = process.env.STRIPE_SECRET_KEY!

export async function POST(req: NextRequest) {
  try {
    const admin = supabaseAdmin()
    const { name, phone, email, date, time_slot, items, dining_option, order_id, table_number, queue_entry_id, notes } = await req.json()

    const needsDateTime = dining_option === 'booking'
    if (!name || !phone || !items?.length) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }
    if (needsDateTime && (!date || !time_slot)) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    let order: any
    let dbError: any

    if (order_id) {
      // Update existing pending order with full details
      const result = await admin
        .from('orders')
        .update({
          customer_name: name,
          phone,
          email: email || null,
          date: date || null,
          time_slot: time_slot || null,
          items,
          notes: notes || null,
          dining_option: dining_option || 'dine_in',
          status: 'pending',
          ...(queue_entry_id ? { queue_entry_id } : {}),
        })
        .eq('id', order_id)
        .select()
        .single()
      order = result.data
      dbError = result.error
    } else {
      // Create new order (takeaway / queue / booking flow)
      const result = await admin
        .from('orders')
        .insert({
          customer_name: name,
          phone,
          email: email || null,
          date: date || null,
          time_slot: time_slot || null,
          items,
          notes: notes || null,
          dining_option: dining_option || 'dine_in',
          status: 'pending',
          ...(queue_entry_id ? { queue_entry_id } : {}),
        })
        .select()
        .single()
      order = result.data
      dbError = result.error
    }

    if (dbError) {
      return NextResponse.json({ error: 'DB error: ' + dbError.message }, { status: 500 })
    }

    const stripeKey = process.env.STRIPE_SECRET_KEY || STRIPE_KEY

    const params = new URLSearchParams()
    params.append('mode', 'payment')
    params.append('success_url', `https://mr-jacksons.vercel.app/order/confirmation?order_id=${order.id}&session_id={CHECKOUT_SESSION_ID}`)
    params.append('cancel_url', 'https://mr-jacksons.vercel.app/order/new')
    params.append('payment_method_types[0]', 'card')
    // Pre-fill email so Stripe never asks for it again
    if (email) params.append('customer_email', email)
    params.append('metadata[order_id]', order.id)
    params.append('metadata[customer_name]', name)
    params.append('metadata[phone]', phone)
    if (time_slot) params.append('metadata[time_slot]', time_slot)
    params.append('metadata[dining_option]', dining_option || 'dine_in')
    if (table_number) params.append('metadata[table_number]', String(table_number))
    if (email) params.append('metadata[email]', email)
    if (date) params.append('metadata[date]', date)

    items.forEach((item: any, i: number) => {
      params.append(`line_items[${i}][price_data][currency]`, 'aud')
      params.append(`line_items[${i}][price_data][product_data][name]`, item.name)
      params.append(`line_items[${i}][price_data][unit_amount]`, String(Math.round(item.price * 100)))
      params.append(`line_items[${i}][quantity]`, String(item.quantity))
    })

    const stripeRes = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${stripeKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    })

    const session = await stripeRes.json()

    if (!stripeRes.ok) {
      return NextResponse.json({ error: 'Stripe: ' + (session.error?.message || 'unknown') }, { status: 500 })
    }

    return NextResponse.json({ checkout_url: session.url })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Checkout failed' }, { status: 500 })
  }
}
