export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { notifyNextInQueue } from '@/lib/notifyQueue'
import { formatPhone } from '@/lib/phone'

const CLICKSEND_USERNAME = process.env.CLICKSEND_USERNAME || 'jiahsagent@gmail.com'
const CLICKSEND_API_KEY = process.env.CLICKSEND_API_KEY || '6A27AE52-866F-25C1-158C-C1D17531DBA7'
const RESTAURANT_PHONE = '03 5909 8815'

async function sendSMS(to: string, body: string) {
  try {
    const credentials = Buffer.from(`${CLICKSEND_USERNAME}:${CLICKSEND_API_KEY}`).toString('base64')
    await fetch('https://rest.clicksend.com/v3/sms/send', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [{ source: 'mr-jacksons', to, body }],
      }),
    })
  } catch (err: any) {
    console.error('SMS failed:', err.message)
  }
}

// Status-specific SMS messages
function getStatusSMS(status: string, customerName: string, receiptNum: string): string | null {
  switch (status) {
    case 'received':
      return `✅ Hi ${customerName}! Your order #${receiptNum} has been ACCEPTED by Mr Jackson's kitchen.\n\nWe'll let you know when we start preparing it.\n\n📞 Questions? Call ${RESTAURANT_PHONE}`

    case 'preparing':
      return `👨‍🍳 Great news ${customerName}! Your order #${receiptNum} is now being PREPARED.\n\nOur kitchen is working on your food right now!\n\n📞 Need to change anything? Call ${RESTAURANT_PHONE}`

    case 'ready':
      return `🎉 ${customerName}, your order #${receiptNum} is READY!\n\nYour food is freshly prepared and waiting for you.\n\n📞 ${RESTAURANT_PHONE}`

    case 'served':
      return `😋 Enjoy your meal ${customerName}!\n\nOrder #${receiptNum} has been served. We hope you love it!\n\nThank you for dining at Mr Jackson's 🙂\n📍 1/45 Main St, Mornington`

    case 'cancelled':
      return `❌ Hi ${customerName}, your order #${receiptNum} has been cancelled.\n\nIf you didn't request this, please call us immediately.\n\n📞 ${RESTAURANT_PHONE}`

    default:
      return null
  }
}

export async function GET() {
  const admin = supabaseAdmin()
  const { data, error } = await admin
    .from('orders')
    .select('*')
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ orders: data || [] })
}

export async function PATCH(req: NextRequest) {
  const { id, status } = await req.json()
  if (!id || !status) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const admin = supabaseAdmin()

  // Get the order first so we have the customer's phone
  const { data: order, error: fetchErr } = await admin
    .from('orders')
    .select('*')
    .eq('id', id)
    .single()

  if (fetchErr || !order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  }

  // Update the status
  const { error } = await admin.from('orders').update({ status }).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // When a dine-in order is marked served, free the table and notify next in queue
  if (status === 'served' && order.dining_option === 'dine_in' && order.table_number) {
    await admin
      .from('tables')
      .update({ status: 'available', current_customer: null, occupied_at: null })
      .eq('table_number', order.table_number)

    await notifyNextInQueue(admin, order.table_number)
  }

  // Send SMS notification
  const phone = order.phone
  const customerName = order.customer_name || 'Customer'
  const receiptNum = id.slice(0, 8).toUpperCase()

  if (phone) {
    const smsBody = getStatusSMS(status, customerName, receiptNum)
    if (smsBody) {
      await sendSMS(formatPhone(phone), smsBody)
    }
  }

  return NextResponse.json({ success: true })
}
