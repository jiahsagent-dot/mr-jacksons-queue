export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'

const SUPABASE_URL = 'https://qducoenvjaotympjedrl.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFkdWNvZW52amFvdHltcGplZHJsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzAwNjY0OCwiZXhwIjoyMDg4NTgyNjQ4fQ.BFi8krTlin52yIMGBvdrHdh0Rjy-gGYxjCByqKi2_EU'

const CLICKSEND_USER = 'jiahsagent@gmail.com'
const CLICKSEND_KEY = '6A27AE52-866F-25C1-158C-C1D17531DBA7'

const BASE_URL = 'https://mr-jacksons.vercel.app'

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
      body: JSON.stringify({ messages: [{ source: 'reminder', body, to: formatPhone(to), from: 'MrJackson' }] }),
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

// GET /api/bookings/remind — called every minute by Vercel cron
export async function GET() {
  const { todayDate, currentMinutes } = getMelbourneNow()

  // Fetch confirmed bookings today that haven't been reminded yet
  const bookings = await dbGet('bookings',
    `date=eq.${todayDate}&status=eq.confirmed&reminded_at=is.null&select=*`)

  if (!bookings || bookings.length === 0) {
    return NextResponse.json({ message: 'No bookings to remind', sent: 0 })
  }

  // Get phones of customers who have a paid order TODAY
  const phones = Array.from(new Set(bookings.map((b: any) => b.phone).filter(Boolean)))
  const orders = phones.length > 0
    ? await dbGet('orders', `phone=in.(${phones.join(',')})&date=eq.${todayDate}&status=not.in.(cancelled,pending)&select=phone`)
    : []
  const phonesWithPaidOrders = new Set((orders || []).map((o: any) => o.phone))

  let sent = 0
  const now = new Date()

  for (const booking of bookings) {
    const [h, m] = booking.time_slot.split(':').map(Number)
    const bookingMinutes = h * 60 + m
    const minutesUntil = bookingMinutes - currentMinutes

    // Send reminder any time within 20 minutes of booking (wide window so cron never misses)
    if (minutesUntil < 0 || minutesUntil > 20) continue

    // Skip if they've already paid today — they don't need to check in
    if (phonesWithPaidOrders.has(booking.phone)) {
      await dbPatch('bookings', `id=eq.${booking.id}`, { reminded_at: now.toISOString() })
      continue
    }

    const phone = booking.phone.replace(/\D/g, '')
    const manageUrl = booking.code
      ? `${BASE_URL}/book/manage?code=${booking.code}`
      : `${BASE_URL}/book/manage?phone=${phone}`

    // Calculate the deadline time (booking time + 15 min) for the SMS
    const [bh, bm] = booking.time_slot.split(':').map(Number)
    const deadlineTotal = bh * 60 + bm + 15
    const dh = Math.floor(deadlineTotal / 60) % 24
    const dm = deadlineTotal % 60
    const ampm = dh >= 12 ? 'PM' : 'AM'
    const deadlineStr = `${dh > 12 ? dh - 12 : dh || 12}:${String(dm).padStart(2, '0')} ${ampm}`

    const smsBody =
      `Hi ${booking.customer_name}! ⏰ Your Mr Jackson's table is in ${minutesUntil} minutes.\n\n` +
      `⚠️ IMPORTANT: Once seated, you must place & pay for your order by ${deadlineStr} (15 minutes from your booking time). ` +
      `If no paid order is placed by then, your table will be automatically released and your booking cancelled.\n\n` +
      `Pre-order now or manage your booking:\n${manageUrl}`

    await sendSMS(booking.phone, smsBody)
    await dbPatch('bookings', `id=eq.${booking.id}`, { reminded_at: now.toISOString() })
    sent++
  }

  return NextResponse.json({ message: `Checked ${bookings.length} bookings`, sent })
}
