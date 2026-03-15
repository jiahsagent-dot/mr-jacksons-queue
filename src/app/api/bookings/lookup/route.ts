export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://qducoenvjaotympjedrl.supabase.co'
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFkdWNvZW52amFvdHltcGplZHJsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzAwNjY0OCwiZXhwIjoyMDg4NTgyNjQ4fQ.BFi8krTlin52yIMGBvdrHdh0Rjy-gGYxjCByqKi2_EU'

function getAdmin() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
}

function formatTime(slot: string) {
  if (!slot) return ''
  const [h, m] = slot.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const hour = h > 12 ? h - 12 : h === 0 ? 12 : h
  return `${hour}:${m.toString().padStart(2, '0')} ${ampm}`
}

function formatDate(d: string) {
  if (!d) return ''
  return new Date(d + 'T00:00:00').toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })
}

// GET /api/bookings/lookup?code=MJ-1234  OR  ?phone=0412345678
export async function GET(req: NextRequest) {
  const params = new URL(req.url).searchParams
  const code = params.get('code')?.trim().toUpperCase()
  const phone = params.get('phone')?.trim().replace(/\D/g, '')

  if (!code && !phone) {
    return NextResponse.json({ error: 'Booking code or phone number is required' }, { status: 400 })
  }

  const admin = getAdmin()
  const today = new Date().toISOString().split('T')[0]

  if (code) {
    // Code lookup — always returns exactly one booking
    const { data, error } = await admin
      .from('bookings')
      .select('*')
      .eq('code', code)
      .in('status', ['confirmed', 'seated'])
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Booking not found. Check your code and try again.' }, { status: 404 })
    }

    const booking = data
    const activeOrder = await getActiveOrder(admin, booking.phone)

    return NextResponse.json({
      bookings: null, // single result, no selection needed
      booking: formatBooking(booking),
      active_order: activeOrder,
    }, { headers: noCache() })
  }

  // Phone lookup — may return multiple bookings
  let bookings: any[] = []

  const { data, error } = await admin
    .from('bookings')
    .select('*')
    .eq('phone', phone)
    .in('status', ['confirmed', 'seated'])
    .gte('date', today)
    .order('date', { ascending: true })

  if (!error && data && data.length > 0) {
    bookings = data
  } else {
    // Try alt phone format
    const altPhone = phone!.startsWith('0') ? phone!.slice(1) : '0' + phone
    const { data: altData } = await admin
      .from('bookings')
      .select('*')
      .eq('phone', altPhone)
      .in('status', ['confirmed', 'seated'])
      .gte('date', today)
      .order('date', { ascending: true })

    if (altData && altData.length > 0) bookings = altData
  }

  if (bookings.length === 0) {
    return NextResponse.json({ error: 'No booking found for this phone number.' }, { status: 404 })
  }

  // Single booking — resolve directly
  if (bookings.length === 1) {
    const booking = bookings[0]
    const activeOrder = await getActiveOrder(admin, booking.phone)
    return NextResponse.json({
      bookings: null,
      booking: formatBooking(booking),
      active_order: activeOrder,
    }, { headers: noCache() })
  }

  // Multiple bookings — return list for customer to choose
  return NextResponse.json({
    bookings: bookings.map(b => ({
      ...formatBooking(b),
      display: `${formatDate(b.date)} at ${formatTime(b.time_slot)} · ${b.party_size} ${b.party_size === 1 ? 'person' : 'people'}`,
    })),
    booking: null,
    active_order: null,
  }, { headers: noCache() })
}

async function getActiveOrder(admin: any, phone: string) {
  const { data: orders } = await admin
    .from('orders')
    .select('id, status, items, created_at')
    .eq('phone', phone)
    .not('status', 'in', '(cancelled)')
    .order('created_at', { ascending: false })
    .limit(1)
  const o = orders && orders.length > 0 ? orders[0] : null
  return o ? { id: o.id, status: o.status, items_count: o.items?.length || 0 } : null
}

function formatBooking(b: any) {
  return {
    id: b.id,
    customer_name: b.customer_name,
    phone: b.phone,
    party_size: b.party_size,
    date: b.date,
    time_slot: b.time_slot,
    table_number: b.table_number,
    status: b.status,
    code: b.code,
  }
}

function noCache() {
  return {
    'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
    'Vercel-CDN-Cache-Control': 'no-store',
  }
}
