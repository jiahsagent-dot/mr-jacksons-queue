export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL 
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY 

function getAdmin() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
}

// Convert time slot like "10:00" to minutes: 600
function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

// Booking duration in minutes (assume 1.5 hours per booking)
const BOOKING_DURATION = 90

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const date = searchParams.get('date')
  const time = searchParams.get('time')
  const partySize = parseInt(searchParams.get('party_size') || '2')

  if (!date || !time) {
    return NextResponse.json({ error: 'date and time required' }, { status: 400 })
  }

  const admin = getAdmin()

  // Get all tables
  const { data: allTables, error: tablesErr } = await admin
    .from('tables')
    .select('*')
    .order('table_number')

  if (tablesErr) return NextResponse.json({ error: tablesErr.message }, { status: 500 })

  // Get bookings for this date that overlap with the requested time
  const { data: bookings, error: bookingsErr } = await admin
    .from('bookings')
    .select('*')
    .eq('date', date)
    .in('status', ['confirmed', 'seated'])

  if (bookingsErr) return NextResponse.json({ error: bookingsErr.message }, { status: 500 })

  const requestedMinutes = timeToMinutes(time)

  // Find which tables are booked at this time (overlapping bookings)
  const bookedTableNumbers = new Set<number>()
  const bookingsByTable: Record<number, any[]> = {}

  for (const b of (bookings || [])) {
    if (!b.table_number) continue
    const bookingStart = timeToMinutes(b.time_slot)
    const bookingEnd = bookingStart + BOOKING_DURATION

    // Check overlap: requested slot [requestedMinutes, requestedMinutes + BOOKING_DURATION]
    // overlaps with [bookingStart, bookingEnd]
    if (requestedMinutes < bookingEnd && (requestedMinutes + BOOKING_DURATION) > bookingStart) {
      bookedTableNumbers.add(b.table_number)
    }

    if (!bookingsByTable[b.table_number]) bookingsByTable[b.table_number] = []
    bookingsByTable[b.table_number].push(b)
  }

  // Check if requested time is "now" (within 30 min) — if so, also consider currently occupied tables
  const now = new Date()
  const nowDate = now.toISOString().split('T')[0]
  const nowMinutes = now.getUTCHours() * 60 + now.getUTCMinutes()
  const isNearNow = date === nowDate && Math.abs(requestedMinutes - nowMinutes) < 30

  // Build availability list
  const tables = (allTables || []).map(table => {
    const isBooked = bookedTableNumbers.has(table.table_number)
    // If booking is for right now, also block tables that are currently occupied
    const isCurrentlyOccupied = isNearNow && table.status === 'occupied'
    const fitsParty = table.seats >= partySize
    return {
      ...table,
      available_at_time: !isBooked && !isCurrentlyOccupied,
      fits_party: fitsParty,
      bookings_today: bookingsByTable[table.table_number] || [],
    }
  })

  const availableTables = tables.filter(t => t.available_at_time && t.fits_party)

  return NextResponse.json({
    tables,
    available: availableTables,
    date,
    time,
    party_size: partySize,
  }, {
    headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0' }
  })
}
