export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL 
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY 

function getAdmin() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
}

function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

const BOOKING_DURATION = 90

export async function GET() {
  try {
    const admin = getAdmin()
    const now = new Date()
    const todayDate = now.toISOString().split('T')[0]
    const currentMinutes = now.getUTCHours() * 60 + now.getUTCMinutes()

    // Get all tables and bookings for today in parallel
    const [tablesRes, bookingsRes] = await Promise.all([
      admin.from('tables').select('*').order('table_number', { ascending: true }),
      admin.from('bookings').select('*').eq('date', todayDate).in('status', ['confirmed', 'seated']),
    ])

    if (tablesRes.error) throw tablesRes.error

    const tables = tablesRes.data || []
    const bookings = bookingsRes.data || []

    // Find tables that have a booking overlapping with right now
    const bookedNowTableNumbers = new Set<number>()
    for (const b of bookings) {
      if (!b.table_number) continue
      const bMin = timeToMinutes(b.time_slot)
      if (currentMinutes < bMin + BOOKING_DURATION && currentMinutes + BOOKING_DURATION > bMin) {
        bookedNowTableNumbers.add(b.table_number)
      }
    }

    // Mark tables as unavailable if occupied OR booked right now
    const enrichedTables = tables.map(t => ({
      ...t,
      status: t.status === 'available' && bookedNowTableNumbers.has(t.table_number) ? 'reserved' : t.status,
      booking_info: bookedNowTableNumbers.has(t.table_number)
        ? bookings.find(b => b.table_number === t.table_number)
        : null,
    }))

    const available = enrichedTables.filter((t: any) => t.status === 'available')

    return NextResponse.json({
      tables: enrichedTables,
      available_count: available.length,
      total_count: tables.length,
      has_availability: available.length > 0,
    }, {
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0' }
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
