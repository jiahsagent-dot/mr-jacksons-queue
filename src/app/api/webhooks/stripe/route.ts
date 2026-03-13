import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { formatPhone } from '@/lib/phone'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

const CLICKSEND_USERNAME = process.env.CLICKSEND_USERNAME || 'jiahsagent@gmail.com'
const CLICKSEND_API_KEY = process.env.CLICKSEND_API_KEY || '6A27AE52-866F-25C1-158C-C1D17531DBA7'
const RESTAURANT_PHONE = '03 5909 8815'

function formatTime(slot: string): string {
  if (!slot) return ''
  const [h, m] = slot.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const hour12 = h > 12 ? h - 12 : h === 0 ? 12 : h
  return `${hour12}:${m.toString().padStart(2, '0')} ${ampm}`
}

function formatDate(dateStr: string): string {
  if (!dateStr) return ''
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })
}

async function sendSMS(to: string, body: string) {
  try {
    const credentials = Buffer.from(`${CLICKSEND_USERNAME}:${CLICKSEND_API_KEY}`).toString('base64')

    const response = await fetch('https://rest.clicksend.com/v3/sms/send', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [{
          source: 'mr-jacksons',

          to,
          body,
        }],
      }),
    })

    const result = await response.json()
    if (!response.ok) {
      console.error('ClickSend error:', JSON.stringify(result))
    } else {
      console.log('SMS sent to', to)
    }
  } catch (err: any) {
    console.error('SMS send failed:', err.message)
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.text()
    let event
    try { event = JSON.parse(body) } catch { return NextResponse.json({ error: 'Invalid' }, { status: 400 }) }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object
      const orderId = session.metadata?.order_id
      const phone = session.metadata?.phone
      const customerName = session.metadata?.customer_name || 'Customer'
      const timeSlot = session.metadata?.time_slot
      const date = session.metadata?.date
      const diningOption = session.metadata?.dining_option || 'dine_in'
      const tableNumber = session.metadata?.table_number ? parseInt(session.metadata.table_number) : null

      if (orderId) {
        const admin = createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || SUPABASE_SERVICE_KEY)

        // Get order details
        const { data: order } = await admin.from('orders').select('*').eq('id', orderId).single()

        // Idempotency check — if already processed, skip entirely (prevents duplicate SMS on Stripe retries)
        if (order?.stripe_session_id === session.id) {
          return NextResponse.json({ received: true, skipped: 'already processed' })
        }

        // Update order status — also write phone back to DB so staff SMS works
        await admin
          .from('orders')
          .update({
            status: 'received',
            stripe_session_id: session.id,
            paid_at: new Date().toISOString(),
            ...(phone ? { phone } : {}),
          })
          .eq('id', orderId)

        // Mark table as occupied after payment (dine-in only)
        if (diningOption === 'dine_in' && tableNumber) {
          const now = new Date()
          await admin
            .from('tables')
            .update({
              status: 'occupied',
              current_customer: customerName,
              occupied_at: now.toISOString(),
            })
            .eq('table_number', tableNumber)

          // Create booking record for staff timeline
          const todayDate = now.toISOString().split('T')[0]
          const currentMinutes = now.getUTCHours() * 60 + now.getUTCMinutes()
          const roundedMinutes = Math.floor(currentMinutes / 30) * 30
          const roundedHour = Math.floor(roundedMinutes / 60)
          const roundedMin = roundedMinutes % 60
          const slot = `${roundedHour.toString().padStart(2, '0')}:${roundedMin.toString().padStart(2, '0')}`
          await admin.from('bookings').insert({
            customer_name: customerName,
            phone: phone || '',
            party_size: 2,
            date: todayDate,
            time_slot: slot,
            table_number: tableNumber,
            status: 'seated',
          }) // non-fatal if this fails
        }

        const items = order?.items || []
        const total = items.reduce((sum: number, i: any) => sum + (i.price * i.quantity), 0)
        const orderRef = orderId.replace(/-/g, '').slice(0, 6).toUpperCase()

        // Build SMS receipt
        const dineLabel = diningOption === 'takeaway' ? 'Takeaway' : 'Dine In'
        const itemsList = items.map((i: any) => `  ${i.quantity}x ${i.name} — $${(i.price * i.quantity).toFixed(2)}`).join('\n')

        let smsBody = `✅ MR JACKSON — ORDER CONFIRMED\n\n`
        smsBody += `Hi ${customerName}! Your order is in.\n\n`
        smsBody += `ORDER #${orderRef}\n`
        smsBody += `─────────────\n`
        smsBody += `${itemsList}\n`
        smsBody += `─────────────\n`
        smsBody += `TOTAL PAID: $${total.toFixed(2)}\n\n`
        smsBody += `${dineLabel}`
        if (tableNumber) smsBody += ` · Table ${tableNumber}`
        smsBody += `\n`
        if (date) smsBody += `${formatDate(date)}\n`
        if (timeSlot) smsBody += `${formatTime(timeSlot)}\n`
        smsBody += `\n`
        smsBody += `Questions? Call us: ${RESTAURANT_PHONE}\n`
        smsBody += `Mr Jackson, Mornington`

        // Send SMS receipt
        if (phone) {
          await sendSMS(formatPhone(phone), smsBody)
        }
      }
    }

    return NextResponse.json({ received: true })
  } catch (err: any) {
    console.error('Webhook error:', err.message)
    return NextResponse.json({ error: 'Webhook error' }, { status: 500 })
  }
}
