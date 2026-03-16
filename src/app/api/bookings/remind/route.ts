export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://qducoenvjaotympjedrl.supabase.co'
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFkdWNvZW52amFvdHltcGplZHJsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzAwNjY0OCwiZXhwIjoyMDg4NTgyNjQ4fQ.BFi8krTlin52yIMGBvdrHdh0Rjy-gGYxjCByqKi2_EU'

const CLICKSEND_USER = 'jiahsagent@gmail.com'
const CLICKSEND_KEY = '6A27AE52-866F-25C1-158C-C1D17531DBA7'

const BASE_URL = 'https://mr-jacksons.vercel.app'

// Send reminder SMS 15 minutes before booking (only if no paid order)
// Runs every minute via Vercel cron

function getAdmin() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
}

function formatPhone(phone: string): string {
  let p = phone.replace(/\s+/g, '')
  if (p.startsWith('04')) p = '+61' + p.slice(1)
  if (!p.startsWith('+')) p = '+61' + p
  return p
}

function formatTime(slot: string): string {
  const [h, m] = slot.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  return `${h > 12 ? h - 12 : h || 12}:${m.toString().padStart(2, '0')} ${ampm}`
}

async function sendSMS(to: string, body: string) {
  try {
    const auth = Buffer.from(`${CLICKSEND_USER}:${CLICKSEND_KEY}`).toString('base64')
    await fetch('https://rest.clicksend.com/v3/sms/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Basic ${auth}` },
      body: JSON.stringify({
        messages: [{ source: 'reminder', body, to: formatPhone(to), from: 'MrJackson' }],
      }),
    })
  } catch (err) {
    console.error('SMS send failed:', err)
  }
}

// GET /api/bookings/remind — called every minute by Vercel cron
export async function GET() {
  const admin = getAdmin()
  const now = new Date()
  const todayDate = now.toISOString().split('T')[0]
  const currentMinutes = now.getUTCHours() * 60 + now.getUTCMinutes()

  // Fetch confirmed bookings today that haven't been reminded yet and haven't checked in
  const { data: bookings, error } = await admin
    .from('bookings')
    .select('*')
    .eq('date', todayDate)
    .eq('status', 'confirmed')
    .is('reminded_at', null)

  if (error) {
    console.error('remind route error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!bookings || bookings.length === 0) {
    return NextResponse.json({ message: 'No bookings to remind', sent: 0 })
  }

  // Get phones of customers who have already paid (have a non-cancelled order)
  const phones = bookings.map((b: any) => b.phone).filter(Boolean)
  const { data: orders } = await admin
    .from('orders')
    .select('phone, status')
    .in('phone', phones)
  const phonesWithPaidOrders = new Set(
    (orders || []).filter((o: any) => o.status !== 'cancelled').map((o: any) => o.phone)
  )

  let sent = 0

  for (const booking of bookings) {
    const [h, m] = booking.time_slot.split(':').map(Number)
    const bookingMinutes = h * 60 + m
    const minutesUntil = bookingMinutes - currentMinutes

    // Send reminder when booking is 14–16 minutes away (catch the 15-min mark)
    if (minutesUntil < 14 || minutesUntil > 16) continue

    // Skip if they've already paid — they don't need to check in
    if (phonesWithPaidOrders.has(booking.phone)) {
      // Still mark as reminded so we don't check again
      await admin.from('bookings').update({ reminded_at: now.toISOString() }).eq('id', booking.id)
      continue
    }

    // Build a direct link to their booking manage page
    const phone = booking.phone.replace(/\D/g, '')
    const link = `${BASE_URL}/book/manage?phone=${phone}`

    const smsBody =
      `Hi ${booking.customer_name}! Your table at Mr Jackson's is in 15 minutes (${formatTime(booking.time_slot)}) 🍽️\n\n` +
      `Haven't paid yet? You MUST check in when you arrive or your table will be released.\n\n` +
      `👉 Tap here to check in when you're at the door:\n${link}\n\n` +
      `See you soon!`

    await sendSMS(booking.phone, smsBody)
    await admin.from('bookings').update({ reminded_at: now.toISOString() }).eq('id', booking.id)
    sent++
  }

  return NextResponse.json({ message: `Checked ${bookings.length} bookings`, sent })
}
