export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://qducoenvjaotympjedrl.supabase.co'
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFkdWNvZW52amFvdHltcGplZHJsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzAwNjY0OCwiZXhwIjoyMDg4NTgyNjQ4fQ.BFi8krTlin52yIMGBvdrHdh0Rjy-gGYxjCByqKi2_EU'

const CLICKSEND_USER = 'jiahsagent@gmail.com'
const CLICKSEND_KEY = '6A27AE52-866F-25C1-158C-C1D17531DBA7'

function getAdmin() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
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
      body: JSON.stringify({
        messages: [{ source: 'cleanup', body, to: formatPhone(to), from: 'MrJackson' }],
      }),
    })
  } catch (err) {
    console.error('SMS send failed:', err)
  }
}

/** Get Melbourne date + time components reliably using Intl (works on all Node/Vercel envs) */
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

/** Convert a UTC timestamp to Melbourne local minutes-of-day */
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
  const admin = getAdmin()
  const { todayDate, currentMinutes } = getMelbourneNow()

  // Get today's confirmed bookings
  const { data: bookings, error: bookingsError } = await admin
    .from('bookings')
    .select('*')
    .eq('date', todayDate)
    .eq('status', 'confirmed')

  if (bookingsError) {
    console.error('Bookings query error:', bookingsError)
    return NextResponse.json({ error: bookingsError.message }, { status: 500 })
  }

  if (!bookings || bookings.length === 0) {
    return NextResponse.json({ message: 'No bookings to check', cancelled: 0, todayDate, currentMinutes })
  }

  // Fetch today's non-cancelled orders for those phones
  const phones = bookings.map((b: any) => b.phone).filter(Boolean)
  const { data: orders } = await admin
    .from('orders')
    .select('phone, status, created_at')
    .in('phone', phones)
    .eq('date', todayDate)
    .neq('status', 'cancelled')

  // Build set of phones that placed an order at/within 30 min before their booking time
  const phonesWithArrivalOrder = new Set<string>()
  for (const booking of bookings) {
    const [h, m] = booking.time_slot.split(':').map(Number)
    const bookingMinutes = h * 60 + m

    const hasArrivalOrder = (orders || []).some((o: any) => {
      if (o.phone !== booking.phone) return false
      // Convert order timestamp to Melbourne minutes and check if it's within the window
      const orderMelbourneMinutes = toMelbourneMinutes(new Date(o.created_at))
      return orderMelbourneMinutes >= bookingMinutes - 30
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
    await admin
      .from('bookings')
      .update({ status: 'cancelled' })
      .eq('id', booking.id)

    // Free the table
    if (booking.table_number) {
      await admin
        .from('tables')
        .update({ status: 'available', current_customer: null, occupied_at: null })
        .eq('table_number', booking.table_number)
        .eq('status', 'reserved')
    }

    // Send cancellation SMS
    sendSMS(
      booking.phone,
      `Hi ${booking.customer_name}, your booking at Mr Jackson's for ${booking.time_slot} has been released as we didn't see you arrive. ` +
      `If you'd still like to visit, please rebook at mr-jacksons.vercel.app or call 03 5909 8815.`
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
// redeploy Wed Mar 18 06:29:06 AM UTC 2026
