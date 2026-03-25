export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

const STRIPE_KEY = process.env.STRIPE_SECRET_KEY || ''

export async function POST(req: NextRequest) {
  try {
    const { order_id, new_items } = await req.json()
    if (!order_id || !new_items) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

    const admin = supabaseAdmin()

    const { data: order, error } = await admin
      .from('orders')
      .select('*')
      .eq('id', order_id)
      .single()

    if (error || !order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    if (order.dining_option !== 'booking') return NextResponse.json({ error: 'Only booking orders can be edited' }, { status: 400 })

    const oldTotal = (order.items || []).reduce((sum: number, i: any) => sum + i.price * i.quantity, 0)
    const newTotal = new_items.reduce((sum: number, i: any) => sum + i.price * i.quantity, 0)
    const diff = Math.round((newTotal - oldTotal) * 100) // cents

    // Find removed items for refund note
    const oldItemNames = (order.items || []).map((i: any) => `${i.quantity}× ${i.name}`).join(', ')
    const removedItems = (order.items || []).filter((oldItem: any) => {
      const newItem = new_items.find((n: any) => n.id === oldItem.id)
      return !newItem || newItem.quantity < oldItem.quantity
    })

    // If items were removed — note it for staff to process refund
    const refundNote = removedItems.length > 0 && diff < 0
      ? `EDIT: Refund pending $${Math.abs(newTotal - oldTotal).toFixed(2)} — removed: ${removedItems.map((i: any) => i.name).join(', ')}`
      : null

    // Update order items in DB immediately
    await admin
      .from('orders')
      .update({
        items: new_items,
        notes: [order.notes, refundNote].filter(Boolean).join(' | ') || null,
        status: order.status, // keep existing status
      })
      .eq('id', order_id)

    // If additional items added — charge the difference via Stripe
    if (diff > 0) {
      // Build line items for added/increased items only
      const addedItems = new_items.filter((newItem: any) => {
        const oldItem = (order.items || []).find((o: any) => o.id === newItem.id)
        return !oldItem || newItem.quantity > oldItem.quantity
      }).map((newItem: any) => {
        const oldItem = (order.items || []).find((o: any) => o.id === newItem.id)
        const addedQty = newItem.quantity - (oldItem?.quantity || 0)
        return { ...newItem, quantity: addedQty }
      })

      const params = new URLSearchParams()
      params.append('mode', 'payment')
      params.append('success_url', `https://mr-jacksons.vercel.app/order/confirmation?order_id=${order_id}&session_id={CHECKOUT_SESSION_ID}`)
      params.append('cancel_url', `https://mr-jacksons.vercel.app/order/edit?order_id=${order_id}`)
      params.append('payment_method_types[0]', 'card')
      params.append('metadata[order_id]', order_id)
      params.append('metadata[customer_name]', order.customer_name)
      params.append('metadata[phone]', order.phone || '')
      params.append('metadata[dining_option]', 'booking_edit')

      addedItems.forEach((item: any, i: number) => {
        params.append(`line_items[${i}][price_data][currency]`, 'aud')
        params.append(`line_items[${i}][price_data][product_data][name]`, item.name)
        params.append(`line_items[${i}][price_data][unit_amount]`, String(Math.round(item.price * 100)))
        params.append(`line_items[${i}][quantity]`, String(item.quantity))
      })

      const stripeRes = await fetch('https://api.stripe.com/v1/checkout/sessions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${STRIPE_KEY}`, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
      })
      const session = await stripeRes.json()
      if (!stripeRes.ok) return NextResponse.json({ error: 'Stripe: ' + session.error?.message }, { status: 500 })

      return NextResponse.json({ checkout_url: session.url, refund_note: null })
    }

    return NextResponse.json({
      success: true,
      refund_pending: refundNote ? Math.abs(newTotal - oldTotal).toFixed(2) : null,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
