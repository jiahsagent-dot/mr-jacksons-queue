export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'

const SUPABASE_URL = 'https://qducoenvjaotympjedrl.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFkdWNvZW52amFvdHltcGplZHJsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzAwNjY0OCwiZXhwIjoyMDg4NTgyNjQ4fQ.BFi8krTlin52yIMGBvdrHdh0Rjy-gGYxjCByqKi2_EU'

const RESERVE_AHEAD_MINUTES = 75

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

export async function GET() {
  const { todayDate, currentMinutes } = getMelbourneNow()

  // Fetch confirmed bookings today with a table assigned
  const bookings = await dbGet('bookings',
    `date=eq.${todayDate}&status=eq.confirmed&table_number=not.is.null&select=*`)

  if (!bookings || bookings.length === 0) {
    return NextResponse.json({ message: 'No upcoming bookings to reserve', reserved: 0, occupied: 0, todayDate, currentMinutes })
  }

  let reserved = 0
  let occupied = 0

  for (const booking of bookings) {
    const [h, m] = booking.time_slot.split(':').map(Number)
    const bookingMinutes = h * 60 + m
    const minutesUntil = bookingMinutes - currentMinutes

    if (minutesUntil > RESERVE_AHEAD_MINUTES) continue // too far away

    if (minutesUntil >= 0) {
      // Booking coming up — mark table reserved if still available
      const updated = await dbPatch('tables',
        `table_number=eq.${booking.table_number}&status=eq.available`,
        { status: 'reserved', current_customer: booking.customer_name })
      if (updated.length > 0) reserved++

    } else if (minutesUntil >= -15) {
      // Booking time just passed — auto-occupy the table
      const updated = await dbPatch('tables',
        `table_number=eq.${booking.table_number}&status=in.(reserved,available)`,
        { status: 'occupied', current_customer: booking.customer_name, occupied_at: new Date().toISOString() })
      if (updated.length > 0) occupied++
    }
  }

  return NextResponse.json({
    message: `Checked ${bookings.length} bookings`,
    reserved,
    occupied,
    todayDate,
    currentMinutes,
  })
}
