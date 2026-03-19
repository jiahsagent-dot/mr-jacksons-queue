export const dynamic = 'force-dynamic'
export const revalidate = 0
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Force hardcoded keys — do NOT use env vars
const SUPABASE_URL = 'https://qducoenvjaotympjedrl.supabase.co'
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFkdWNvZW52amFvdHltcGplZHJsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzAwNjY0OCwiZXhwIjoyMDg4NTgyNjQ4fQ.BFi8krTlin52yIMGBvdrHdh0Rjy-gGYxjCByqKi2_EU' 

const CLICKSEND_USER = 'jiahsagent@gmail.com'
const CLICKSEND_KEY = '6A27AE52-866F-25C1-158C-C1D17531DBA7'

function getAdmin() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
}

function generateCode(): string {
  const num = Math.floor(1000 + Math.random() * 9000)
  return `MJ-${num}`
}

function formatTimeSlot(t: string): string {
  const [h, m] = t.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  return `${h > 12 ? h - 12 : h || 12}:${m.toString().padStart(2, '0')} ${ampm}`
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
        messages: [{
          source: 'booking',
          body,
          to: formatPhone(to),
          from: 'MrJackson',
        }],
      }),
    })
  } catch (err) {
    console.error('SMS send failed:', err)
  }
}

// POST — create booking
export async function POST(req: NextRequest) {
  try {
    const { name, phone, party_size, date, time_slot, table_number } = await req.json()

    if (!name || !phone || !party_size || !date || !time_slot) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 })
    }

    const admin = getAdmin()
    const code = generateCode()

    // If table_number provided, verify it's still available at that time
    if (table_number) {
      const { data: existing } = await admin
        .from('bookings')
        .select('*')
        .eq('date', date)
        .eq('table_number', table_number)
        .in('status', ['confirmed', 'seated'])

      const timeToMin = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m }
      const reqMin = timeToMin(time_slot)
      const hasConflict = (existing || []).some((b: any) => {
        const bMin = timeToMin(b.time_slot)
        return reqMin < bMin + 90 && reqMin + 90 > bMin
      })

      if (hasConflict) {
        return NextResponse.json({ error: 'This table is no longer available at that time. Please go back and choose another.' }, { status: 409 })
      }
    }

    const { data, error } = await admin
      .from('bookings')
      .insert({
        customer_name: name,
        phone,
        party_size: parseInt(party_size),
        date,
        time_slot,
        table_number: table_number || null,
        status: 'confirmed',
        code,
      })
      .select()
      .single()

    if (error) throw error

    // Send confirmation SMS with booking code
    const tableLabel = table_number ? ` · Table ${table_number}` : ''
    const manageLink = `https://mr-jacksons.vercel.app/book/manage?phone=${phone.replace(/\D/g, '')}`
    const calLink = `https://mr-jacksons.vercel.app/api/calendar/booking?phone=${phone.replace(/\D/g, '')}&date=${date}&time=${time_slot}`
    const manageUrl = `https://mr-jacksons.vercel.app/book/manage?code=${code}`
    const smsBody = `Hi ${name}! Your booking at Mr Jackson's is confirmed ✅\n\n` +
      `📅 ${date} at ${formatTimeSlot(time_slot)}\n` +
      `👥 ${party_size} people${tableLabel}\n\n` +
      `View booking, pre-order & cancel:\n${manageUrl}\n\n` +
      `Can't make it? Cancel anytime using the link above.`

    sendSMS(phone, smsBody)

    return NextResponse.json({ success: true, booking: { ...data, code } })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// PATCH — update booking status (staff action)
export async function PATCH(req: NextRequest) {
  try {
    const { id, status } = await req.json()
    if (!id || !status) return NextResponse.json({ error: 'id and status required' }, { status: 400 })

    const admin = getAdmin()
    const { error } = await admin.from('bookings').update({ status }).eq('id', id)
    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// DELETE — cancel a booking (staff action)
export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json()
    if (!id) return NextResponse.json({ error: 'Booking ID required' }, { status: 400 })

    const admin = getAdmin()

    // Get the booking first to send cancellation SMS
    const { data: booking } = await admin.from('bookings').select('*').eq('id', id).single()
    if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })

    // Update status to cancelled
    const { error } = await admin.from('bookings').update({ status: 'cancelled' }).eq('id', id)
    if (error) throw error

    // Send cancellation SMS
    if (booking.phone) {
      const smsBody = `Hi ${booking.customer_name}, your booking at Mr Jackson's on ${booking.date} at ${formatTimeSlot(booking.time_slot)} has been cancelled.\n\nIf this was a mistake, please call us on 03 5909 8815.`
      sendSMS(booking.phone, smsBody)
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// GET — fetch bookings (for staff) with order status
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const date = searchParams.get('date')

  const admin = getAdmin()
  let query = admin.from('bookings').select('*').order('time_slot', { ascending: true })

  if (date) query = query.eq('date', date)

  const { data: bookingsData, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const bookings = bookingsData || []

  // Fetch orders that match booking context
  const phones = bookings.map((b: any) => b.phone).filter(Boolean)
  let orders: any[] = []
  if (phones.length > 0) {
    const { data: ordersData } = await admin
      .from('orders')
      .select('id, customer_name, phone, status, items, order_context, table_number, created_at')
      .in('phone', phones)
    orders = ordersData || []
  }

  // Enrich bookings with order info
  const enriched = bookings.map((booking: any) => {
    const matchingOrders = orders.filter((o: any) => o.phone === booking.phone)
    const hasOrder = matchingOrders.length > 0
    const latestOrder = matchingOrders.sort((a: any, b: any) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )[0]

    return {
      ...booking,
      has_order: hasOrder,
      order_status: latestOrder?.status || null,
      order_items_count: latestOrder?.items?.length || 0,
      order_id: latestOrder?.id || null,
    }
  })

  return NextResponse.json({ bookings: enriched }, {
    headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0' }
  })
}
