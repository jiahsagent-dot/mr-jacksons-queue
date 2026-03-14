export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'
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

// Status-specific SMS messages — minimal to save costs
// All status updates are shown live on the customer's order tracking page
function getStatusSMS(status: string, customerName: string, receiptNum: string, tableNumber?: number | null): string | null {
  switch (status) {
    case 'preparing':
      // Only send if they have a table assigned (queue customer who got seated)
      if (tableNumber) {
        return `👨‍🍳 Hi ${customerName}! Your food is now being prepared.\n\n🪑 Head to Table ${tableNumber} — it'll be ready soon!\n\n📍 Mr Jackson, Mornington`
      }
      return null

    case 'cancelled':
      return `❌ Hi ${customerName}, your order #${receiptNum} has been cancelled.\n\nIf you didn't request this, please call us immediately.\n\n📞 ${RESTAURANT_PHONE}`

    // All other statuses — shown on website only, no SMS
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
  return NextResponse.json({ orders: data || [] }, {
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
      'CDN-Cache-Control': 'no-store',
      'Surrogate-Control': 'no-store',
      'Vercel-CDN-Cache-Control': 'no-store',
    }
  })
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
    const smsBody = getStatusSMS(status, customerName, receiptNum, order.table_number)
    if (smsBody) {
      await sendSMS(formatPhone(phone), smsBody)
    }
  }

  return NextResponse.json({ success: true }, {
    headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0' }
  })
}
