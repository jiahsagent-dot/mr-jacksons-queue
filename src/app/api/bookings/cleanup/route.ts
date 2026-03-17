export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://qducoenvjaotympjedrl.supabase.co' 
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFkdWNvZW52amFvdHltcGplZHJsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzAwNjY0OCwiZXhwIjoyMDg4NTgyNjQ4fQ.BFi8krTlin52yIMGBvdrHdh0Rjy-gGYxjCByqKi2_EU' 

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
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${auth}`,
      },
      body: JSON.stringify({
        messages: [{ source: 'cleanup', body, to: formatPhone(to), from: 'MrJackson' }],
      }),
    })
  } catch (err) {
    console.error('SMS send failed:', err)
  }
}

// GET /api/bookings/cleanup — called periodically to cancel no-shows
// Cancels bookings that are 15+ minutes past their time with no confirmation and no order
export async function GET() {
  const admin = getAdmin()
  const now = new Date()
  const local = new Date(now.toLocaleString('en-US', { timeZone: 'Australia/Melbourne' }))
  const todayDate = local.toISOString().split('T')[0]
  const currentMinutes = local.getHours() * 60 + local.getMinutes()

  // Get today's confirmed bookings (not yet seated or confirmed)
  const { data: bookings } = await admin
    .from('bookings')
    .select('*')
    .eq('date', todayDate)
    .eq('status', 'confirmed')

  if (!bookings || bookings.length === 0) {
    return NextResponse.json({ message: 'No bookings to check', cancelled: 0 })
  }

  // Check which bookings have an order placed ON OR AFTER their booking time today
  // Pre-orders placed earlier in the day do NOT count as arrival confirmation
  const phones = bookings.map(b => b.phone).filter(Boolean)
  const { data: orders } = await admin
    .from('orders')
    .select('phone, status, created_at')
    .in('phone', phones)
    .eq('date', todayDate)
    .neq('status', 'cancelled')

  // Build a map of phone → earliest valid order time per booking
  const phonesWithArrivalOrder = new Set<string>()
  for (const booking of bookings) {
    const [h, m] = booking.time_slot.split(':').map(Number)
    // Booking time as a UTC-comparable threshold (stored as Melbourne local, treat as local)
    const bookingLocalStr = `${todayDate}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`
    const bookingThreshold = new Date(bookingLocalStr).getTime() - (11 * 60 * 60 * 1000) // approx Melbourne offset
    const hasArrivalOrder = (orders || []).some((o: any) => {
      if (o.phone !== booking.phone) return false
      const orderTime = new Date(o.created_at).getTime()
      // Order must be placed within 30 min before to 15 min after booking time
      return orderTime >= bookingThreshold - (30 * 60 * 1000)
    })
    if (hasArrivalOrder) phonesWithArrivalOrder.add(booking.phone)
  }

  let cancelled = 0
  for (const booking of bookings) {
    const [h, m] = booking.time_slot.split(':').map(Number)
    const bookingMinutes = h * 60 + m
    const minutesPast = currentMinutes - bookingMinutes

    // Skip if booking time hasn't passed yet or less than 15 min past
    if (minutesPast < 15) continue

    // If they placed an order at/after their booking time → they arrived, don't cancel
    if (phonesWithArrivalOrder.has(booking.phone)) continue

    // Cancel the booking
    const { error: updateErr } = await admin
      .from('bookings')
      .update({ status: 'cancelled' })
      .eq('id', booking.id)
    
    if (updateErr) {
      console.error('Failed to cancel booking:', booking.id, updateErr)
      continue
    }

    // Free the table if one was assigned
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
      `Hi ${booking.customer_name}, your booking at Mr Jackson's for ${booking.time_slot} has been released as we didn't hear from you. ` +
      `If you'd still like to visit, please rebook at mr-jacksons.vercel.app or call 03 5909 8815.`
    )

    cancelled++
  }

  return NextResponse.json({ message: `Checked ${bookings.length} bookings`, cancelled, ts: new Date().toISOString() })
}
