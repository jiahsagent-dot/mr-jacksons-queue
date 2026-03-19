export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'

const SUPABASE_URL = 'https://qducoenvjaotympjedrl.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFkdWNvZW52amFvdHltcGplZHJsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzAwNjY0OCwiZXhwIjoyMDg4NTgyNjQ4fQ.BFi8krTlin52yIMGBvdrHdh0Rjy-gGYxjCByqKi2_EU'

const CLICKSEND_USER = 'jiahsagent@gmail.com'
const CLICKSEND_KEY = '6A27AE52-866F-25C1-158C-C1D17531DBA7'

async function dbGet(table: string, query: string): Promise<any[]> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
    cache: 'no-store',
  })
  return res.ok ? res.json() : []
}

async function dbPatch(table: string, query: string, body: any): Promise<any[]> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, {
    method: 'PATCH',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify(body),
    cache: 'no-store',
  })
  return res.ok ? res.json() : []
}

function formatPhone(phone: string): string {
  let p = phone.replace(/\s+/g, '')
  if (p.startsWith('04')) p = '+61' + p.slice(1)
  if (!p.startsWith('+')) p = '+61' + p
  return p
}

async function sendSMS(to: string, body: string) {
  try {
    const auth = Buffer.from(`${CLICKSEND_USER}:${CLICKSEND_KEY}`).toString('base64')
    await fetch('https://rest.clicksend.com/v3/sms/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Basic ${auth}` },
      body: JSON.stringify({ messages: [{ source: 'cleanup', body, to: formatPhone(to), from: 'MrJackson' }] }),
    })
  } catch (err) {
    console.error('SMS send failed:', err)
  }
}

function getMelbourneNow(): { todayDate: string; currentMinutes: number } {
  const now = new Date()
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Australia/Melbourne',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  })
  const parts = fmt.formatToParts(now)
  const get = (type: string) => parts.find(p => p.type === type)?.value ?? '0'
  const todayDate = `${get('year')}-${get('month')}-${get('day')}`
  const currentMinutes = parseInt(get('hour')) * 60 + parseInt(get('minute'))
  return { todayDate, currentMinutes }
}

function toMelbourneMinutes(utcDate: Date): number {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Australia/Melbourne',
    hour: '2-digit', minute: '2-digit', hour12: false,
  })
  const parts = fmt.formatToParts(utcDate)
  const get = (type: string) => parts.find(p => p.type === type)?.value ?? '0'
  return parseInt(get('hour')) * 60 + parseInt(get('minute'))
}

// GET /api/bookings/cleanup — cancel no-shows 15+ min after booking time with no order placed
export async function GET() {
  const { todayDate, currentMinutes } = getMelbourneNow()

  // Get today's confirmed bookings
  const bookings = await dbGet('bookings', `date=eq.${todayDate}&status=eq.confirmed&select=*`)

  if (!bookings || bookings.length === 0) {
    return NextResponse.json({ message: 'No bookings to check', cancelled: 0, todayDate, currentMinutes })
  }

  // Fetch today's PAID orders for those phones — only a completed payment counts as "arrived"
  // paid_at is set by the Stripe webhook when payment succeeds; pending/unpaid do NOT save the table
  const phones = Array.from(new Set(bookings.map((b: any) => b.phone).filter(Boolean)))
  const orders = phones.length > 0
    ? await dbGet('orders', `phone=in.(${phones.join(',')})&date=eq.${todayDate}&paid_at=not.is.null&status=neq.cancelled&select=phone,status,created_at,paid_at`)
    : []

  // Build set of phones that placed a PAID order today around their booking time
  const phonesWithArrivalOrder = new Set<string>()
  for (const booking of bookings) {
    const [h, m] = booking.time_slot.split(':').map(Number)
    const bookingMinutes = h * 60 + m

    const hasArrivalOrder = (orders || []).some((o: any) => {
      if (o.phone !== booking.phone) return false
      // Check order was created within a window: up to 2 hours before booking or up to 15 min after
      const orderMelbourneMinutes = toMelbourneMinutes(new Date(o.created_at))
      return orderMelbourneMinutes >= bookingMinutes - 120 && orderMelbourneMinutes <= bookingMinutes + 15
    })
    if (hasArrivalOrder) phonesWithArrivalOrder.add(booking.phone)
  }

  let cancelled = 0
  for (const booking of bookings) {
    const [h, m] = booking.time_slot.split(':').map(Number)
    const bookingMinutes = h * 60 + m
    const minutesPast = currentMinutes - bookingMinutes

    // Skip if booking time hasn't passed by 15 min yet
    if (minutesPast < 15) continue

    // Skip if they placed an order — they arrived
    if (phonesWithArrivalOrder.has(booking.phone)) continue

    // Cancel the booking
    await dbPatch('bookings', `id=eq.${booking.id}`, { status: 'cancelled' })

    // Free the table (may be 'reserved' or 'occupied' depending on timing)
    if (booking.table_number) {
      await dbPatch('tables',
        `table_number=eq.${booking.table_number}&status=in.(reserved,occupied)`,
        { status: 'available', current_customer: null, occupied_at: null, table_code: null })
    }

    // Send cancellation SMS
    sendSMS(
      booking.phone,
      `Hi ${booking.customer_name}, your ${booking.time_slot} table at Mr Jackson's has been automatically released — ` +
      `no paid order was placed within 15 minutes of your booking time. ` +
      `Walk-ins are always welcome, or rebook at mr-jacksons.vercel.app`
    )

    cancelled++
  }

  return NextResponse.json({
    message: `Checked ${bookings.length} booking${bookings.length !== 1 ? 's' : ''}`,
    cancelled,
    todayDate,
    currentMinutes,
  })
}
