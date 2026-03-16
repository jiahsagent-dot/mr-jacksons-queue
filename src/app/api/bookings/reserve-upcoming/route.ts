export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://qducoenvjaotympjedrl.supabase.co'
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFkdWNvZW52amFvdHltcGplZHJsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzAwNjY0OCwiZXhwIjoyMDg4NTgyNjQ4fQ.BFi8krTlin52yIMGBvdrHdh0Rjy-gGYxjCByqKi2_EU'

const RESERVE_AHEAD_MINUTES = 45

function getAdmin() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
}

// GET /api/bookings/reserve-upcoming
// Called every minute via Vercel cron.
// Marks tables as 'reserved' 45 minutes before their booking time
// so walk-ins can't be seated there and staff can see what's coming.
export async function GET() {
  const admin = getAdmin()
  const now = new Date()
  const todayDate = now.toISOString().split('T')[0]
  const currentMinutes = now.getUTCHours() * 60 + now.getUTCMinutes()

  // Fetch confirmed (not yet seated) bookings today that have a table assigned
  const { data: bookings, error } = await admin
    .from('bookings')
    .select('*')
    .eq('date', todayDate)
    .eq('status', 'confirmed')
    .not('table_number', 'is', null)

  if (error) {
    console.error('reserve-upcoming error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!bookings || bookings.length === 0) {
    return NextResponse.json({ message: 'No upcoming bookings to reserve', reserved: 0 })
  }

  let reserved = 0

  for (const booking of bookings) {
    const [h, m] = booking.time_slot.split(':').map(Number)
    const bookingMinutes = h * 60 + m
    const minutesUntil = bookingMinutes - currentMinutes

    // Only act when the booking is within the next RESERVE_AHEAD_MINUTES
    // and hasn't already passed (minutesUntil >= 0)
    if (minutesUntil < 0 || minutesUntil > RESERVE_AHEAD_MINUTES) continue

    // Only update if the table is currently 'available' (don't interrupt occupied tables)
    const { data: updated } = await admin
      .from('tables')
      .update({
        status: 'reserved',
        current_customer: booking.customer_name,
      })
      .eq('table_number', booking.table_number)
      .eq('status', 'available')
      .select()

    if (updated && updated.length > 0) reserved++
  }

  return NextResponse.json({
    message: `Checked ${bookings.length} bookings`,
    reserved,
  })
}
