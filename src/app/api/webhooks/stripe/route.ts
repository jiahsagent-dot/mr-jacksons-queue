import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { formatPhone } from '@/lib/phone'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://qducoenvjaotympjedrl.supabase.co' 
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFkdWNvZW52amFvdHltcGplZHJsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzAwNjY0OCwiZXhwIjoyMDg4NTgyNjQ4fQ.BFi8krTlin52yIMGBvdrHdh0Rjy-gGYxjCByqKi2_EU' 

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
        const admin = createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFkdWNvZW52amFvdHltcGplZHJsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzAwNjY0OCwiZXhwIjoyMDg4NTgyNjQ4fQ.BFi8krTlin52yIMGBvdrHdh0Rjy-gGYxjCByqKi2_EU' || SUPABASE_SERVICE_KEY)

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

        // Mark table as occupied after payment (dine-in and booking orders)
        if ((diningOption === 'dine_in' || diningOption === 'booking') && tableNumber) {
          const now = new Date()
          await admin
            .from('tables')
            .update({
              status: 'occupied',
              current_customer: customerName,
              occupied_at: now.toISOString(),
            })
            .eq('table_number', tableNumber)

          if (diningOption === 'booking') {
            // For booking orders — mark the existing booking as confirmed (arrived + ordered)
            // Never create a duplicate — the booking already exists in the DB
            if (orderId) {
              const { data: existingOrder } = await admin.from('orders').select('phone').eq('id', orderId).single()
              const bookingPhone = existingOrder?.phone || phone
              if (bookingPhone) {
                await admin
                  .from('bookings')
                  .update({ confirmed_at: now.toISOString() })
                  .eq('phone', bookingPhone)
                  .eq('status', 'confirmed')
                  .is('confirmed_at', null)
              }
            }
          } else {
            // For walk-in dine-in orders — create a booking record for staff timeline
            // Use Melbourne local time for accurate timeslot
            const local = new Date(now.toLocaleString('en-US', { timeZone: 'Australia/Melbourne' }))
            const todayDate = `${local.getFullYear()}-${String(local.getMonth() + 1).padStart(2, '0')}-${String(local.getDate()).padStart(2, '0')}`
            const currentMinutes = local.getHours() * 60 + local.getMinutes()
            const roundedMinutes = Math.floor(currentMinutes / 30) * 30
            const roundedHour = Math.floor(roundedMinutes / 60)
            const roundedMin = roundedMinutes % 60
            const slot = `${String(roundedHour).padStart(2, '0')}:${String(roundedMin).padStart(2, '0')}`
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
        smsBody += `Want to cancel or add to your order?\n`
        smsBody += `👉 mr-jacksons.vercel.app\n`
        smsBody += `Tap "Already have a booking?" and enter your phone number.\n\n`
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
