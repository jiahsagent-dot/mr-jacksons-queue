export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

function getAdmin() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
}

// GET /api/bookings/lookup?code=MJ-1234
export async function GET(req: NextRequest) {
  const params = new URL(req.url).searchParams
  const code = params.get('code')?.trim().toUpperCase()

  if (!code) {
    return NextResponse.json({ error: 'Booking code is required' }, { status: 400 })
  }

  const admin = getAdmin()

  // Look up booking by code only
  const { data: booking, error } = await admin
    .from('bookings')
    .select('*')
    .eq('code', code)
    .in('status', ['confirmed', 'seated'])
    .single()

  if (error || !booking) {
    return NextResponse.json({ error: 'Booking not found. Check your code and try again.' }, { status: 404 })
  }

  // Mark as confirmed/seated on first check-in
  if (!booking.confirmed_at) {
    await admin
      .from('bookings')
      .update({ confirmed_at: new Date().toISOString(), status: 'seated' })
      .eq('id', booking.id)
  }

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
    }
  }, {
    headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0' }
  })
}
