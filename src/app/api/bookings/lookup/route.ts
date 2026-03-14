export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

function getAdmin() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
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

  let booking: any = null

  if (code) {
    // Look up by code
    const { data, error } = await admin
      .from('bookings')
      .select('*')
      .eq('code', code)
      .in('status', ['confirmed', 'seated'])
      .single()
    if (!error && data) booking = data
  } else if (phone) {
    // Look up by phone — find today's or upcoming confirmed booking
    const today = new Date().toISOString().split('T')[0]

    // Try exact match first
    const { data, error } = await admin
      .from('bookings')
      .select('*')
      .eq('phone', phone)
      .in('status', ['confirmed', 'seated'])
      .gte('date', today)
      .order('date', { ascending: true })
      .limit(1)

    if (!error && data && data.length > 0) {
      booking = data[0]
    } else {
      // Try matching without leading zero (e.g. user enters 0483... but DB has 483...)
      const altPhone = phone.startsWith('0') ? phone.slice(1) : '0' + phone
      const { data: altData } = await admin
        .from('bookings')
        .select('*')
        .eq('phone', altPhone)
        .in('status', ['confirmed', 'seated'])
        .gte('date', today)
        .order('date', { ascending: true })
        .limit(1)

      if (altData && altData.length > 0) booking = altData[0]
    }
  }

  if (!booking) {
    return NextResponse.json({ error: code ? 'Booking not found. Check your code and try again.' : 'No booking found for this phone number.' }, { status: 404 })
  }

  // Mark as confirmed/seated on first check-in
  if (!booking.confirmed_at) {
    await admin
      .from('bookings')
      .update({ confirmed_at: new Date().toISOString(), status: 'seated' })
      .eq('id', booking.id)
  }

  // Check if this customer already has an active order
  const bookingPhone = booking.phone
  const { data: orders } = await admin
    .from('orders')
    .select('id, status, items, created_at')
    .eq('phone', bookingPhone)
    .not('status', 'in', '(cancelled)')
    .order('created_at', { ascending: false })
    .limit(1)

  const activeOrder = orders && orders.length > 0 ? orders[0] : null

  return NextResponse.json({
    booking: {
      id: booking.id,
      customer_name: booking.customer_name,
      phone: booking.phone,
      party_size: booking.party_size,
      date: booking.date,
      time_slot: booking.time_slot,
      table_number: booking.table_number,
      status: 'seated',
      code: booking.code,
    },
    active_order: activeOrder ? {
      id: activeOrder.id,
      status: activeOrder.status,
      items_count: activeOrder.items?.length || 0,
    } : null,
  }, {
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
      'Vercel-CDN-Cache-Control': 'no-store',
    }
  })
}
