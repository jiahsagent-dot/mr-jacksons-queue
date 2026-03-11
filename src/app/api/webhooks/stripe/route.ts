import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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
          from: 'MrJackson',
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

      if (orderId) {
        const admin = createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || SUPABASE_SERVICE_KEY)

        // Get order details
        const { data: order } = await admin.from('orders').select('*').eq('id', orderId).single()

        // Update order status
        await admin
          .from('orders')
          .update({ status: 'received', stripe_session_id: session.id, paid_at: new Date().toISOString() })
          .eq('id', orderId)

        const items = order?.items || []
        const total = items.reduce((sum: number, i: any) => sum + (i.price * i.quantity), 0)
        const receiptNum = orderId.slice(0, 8).toUpperCase()

        // Build SMS receipt
        const dineLabel = diningOption === 'takeaway' ? 'Takeaway' : 'Dine In'
        const itemsList = items.map((i: any) => `  ${i.quantity}x ${i.name} — $${(i.price * i.quantity).toFixed(2)}`).join('\n')

        let smsBody = `✅ MR JACKSON — ORDER CONFIRMED\n\n`
        smsBody += `Hi ${customerName}!\n\n`
        smsBody += `Receipt #${receiptNum}\n`
        smsBody += `─────────────\n`
        smsBody += `${itemsList}\n`
        smsBody += `─────────────\n`
        smsBody += `💰 TOTAL PAID: $${total.toFixed(2)}\n\n`
        smsBody += `📋 ${dineLabel}\n`
        if (date) smsBody += `📅 ${formatDate(date)}\n`
        if (timeSlot) smsBody += `⏰ ${formatTime(timeSlot)}\n`
        smsBody += `\n`
        smsBody += `Need to cancel or change your order?\n`
        smsBody += `📞 Call us: ${RESTAURANT_PHONE}\n\n`
        smsBody += `See you soon! 🙂\n`
        smsBody += `Mr Jackson, Mornington`

        // Send SMS receipt
        if (phone) {
          // Format AU numbers
          let formattedPhone = phone.trim()
          if (formattedPhone.startsWith('0')) {
            formattedPhone = '+61' + formattedPhone.slice(1)
          } else if (!formattedPhone.startsWith('+')) {
            formattedPhone = '+61' + formattedPhone
          }

          await sendSMS(formattedPhone, smsBody)
        }
      }
    }

    return NextResponse.json({ received: true })
  } catch (err: any) {
    console.error('Webhook error:', err.message)
    return NextResponse.json({ error: 'Webhook error' }, { status: 500 })
  }
}
