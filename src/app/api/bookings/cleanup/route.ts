export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'

const SUPABASE_URL = 'https://qducoenvjaotympjedrl.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFkdWNvZW52amFvdHltcGplZHJsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzAwNjY0OCwiZXhwIjoyMDg4NTgyNjQ4fQ.BFi8krTlin52yIMGBvdrHdh0Rjy-gGYxjCByqKi2_EU'

const CLICKSEND_USER = 'jiahsagent@gmail.com'
const CLICKSEND_KEY = '6A27AE52-866F-25C1-158C-C1D17531DBA7'

// How long after a booking's time slot we consider the meal "done" and auto-free
const POST_MEAL_FREE_MINUTES = 90

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

async function dbDelete(table: string, query: string): Promise<void> {
  await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, {
    method: 'DELETE',
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
    cache: 'no-store',
  })
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
  } catch {}
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

async function freeTable(tableNumber: number) {
  await dbPatch('tables',
    `table_number=eq.${tableNumber}&status=in.(reserved,occupied)`,
    { status: 'available', current_customer: null, occupied_at: null, table_code: null })
}

export async function GET() {
  const { todayDate, currentMinutes } = getMelbourneNow()

  const settings = await dbGet('queue_settings', 'id=eq.1&select=booking_cancel_minutes')
  const cancelAfterMinutes: number = settings?.[0]?.booking_cancel_minutes ?? 15

  // ── 1. STALE TABLES FROM PAST DAYS ───────────────────────────────────────
  // Find any reserved/occupied tables that have a booking from a PREVIOUS day
  // (cron missed cleanup, staff forgot to free the table)
  const pastBookings = await dbGet('bookings',
    `date=lt.${todayDate}&status=in.(confirmed,seated)&table_number=not.is.null&select=id,table_number,customer_name,date,time_slot,status`)

  let staleDays = 0
  for (const b of pastBookings) {
    await freeTable(b.table_number)
    // Mark the booking as completed so it doesn't show up again
    await dbPatch('bookings', `id=eq.${b.id}`, { status: 'completed' })
    staleDays++
  }

  // ── 2. POST-MEAL AUTO-FREE (today — booking time + 90 min has passed) ────
  // Customer arrived, was served, but staff never hit "Free Table"
  const servedBookings = await dbGet('bookings',
    `date=eq.${todayDate}&status=in.(confirmed,seated)&table_number=not.is.null&select=id,table_number,customer_name,time_slot,phone`)

  let servedFreed = 0
  for (const b of servedBookings) {
    const [h, m] = b.time_slot.split(':').map(Number)
    const bookingMinutes = h * 60 + m
    const minutesPast = currentMinutes - bookingMinutes

    // Only act if booking time + POST_MEAL_FREE_MINUTES has elapsed
    if (minutesPast < POST_MEAL_FREE_MINUTES) continue

    // Check if there's a paid order for this booking (meaning they arrived)
    const orders = await dbGet('orders',
      `phone=eq.${b.phone}&date=eq.${todayDate}&paid_at=not.is.null&status=in.(served,completed,ready)&select=id,status`)

    if (orders.length === 0) continue // no served order — let no-show logic handle it

    // They were served and enough time has passed — auto-free the table
    await freeTable(b.table_number)
    await dbPatch('bookings', `id=eq.${b.id}`, { status: 'completed' })
    servedFreed++
  }

  // ── 3. NO-SHOW CLEANUP (today — booking passed but no paid order) ─────────
  const bookings = await dbGet('bookings',
    `date=eq.${todayDate}&status=eq.confirmed&select=*`)

  const phones = Array.from(new Set(bookings.map((b: any) => b.phone).filter(Boolean)))
  const orders = phones.length > 0
    ? await dbGet('orders',
        `phone=in.(${phones.join(',')})&date=eq.${todayDate}&paid_at=not.is.null&status=neq.cancelled&select=phone,status,created_at,paid_at`)
    : []

  const phonesWithArrivalOrder = new Set<string>()
  for (const booking of bookings) {
    const [h, m] = booking.time_slot.split(':').map(Number)
    const bookingMinutes = h * 60 + m
    const hasArrivalOrder = (orders || []).some((o: any) => {
      if (o.phone !== booking.phone) return false
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

    if (minutesPast < cancelAfterMinutes) continue
    if (phonesWithArrivalOrder.has(booking.phone)) continue

    await dbDelete('bookings', `id=eq.${booking.id}`)

    if (booking.table_number) {
      await freeTable(booking.table_number)
    }

    sendSMS(booking.phone,
      `Hi ${booking.customer_name}, your ${booking.time_slot} table at Mr Jackson's has been automatically released — ` +
      `no paid order was placed within ${cancelAfterMinutes} minutes of your booking time. ` +
      `Walk-ins are always welcome, or rebook at mr-jacksons.vercel.app`)

    cancelled++
  }

  return NextResponse.json({
    message: `Cleanup complete`,
    staleDaysFreed: staleDays,
    servedAutoFreed: servedFreed,
    noShowsCancelled: cancelled,
    cancelAfterMinutes,
    todayDate,
    currentMinutes,
  })
}
